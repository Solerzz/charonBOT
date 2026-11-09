import type { Logger } from 'pino';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { KeyedMutex } from '../../shared/keyed-mutex.js';
import { OwnershipService } from '../ownership/ownership.service.js';
import { OwnershipTimers } from '../ownership/ownership.timers.js';
import { TransferService } from '../ownership/transfer.service.js';
import { RoomAccessService } from './room-access.service.js';
import { RoomControlsService } from './room-controls.service.js';
import { RoomPanelService } from './room-panel.service.js';
import { PrismaRoomStateRepository } from './room-state.repository.js';
import { RoomCoordinator } from './room.coordinator.js';
import { PrismaTemporaryRoomRepository } from './call.repository.js';
import { DiscordRoomGateway } from './room.discord.js';
import { RoomActionError } from './room.types.js';
import type { RoomChanged, RoomGuildResolver } from './room.types.js';

export type RoomRuntime = ReturnType<typeof createRoomRuntime>;

export function createRoomRuntime(database: PrismaClient, logger: Logger) {
  const store = new PrismaRoomStateRepository(database);
  const coordinator = new RoomCoordinator(new KeyedMutex());
  const timers = new OwnershipTimers(logger);
  const panels = new RoomPanelService({ store, coordinator, logger });
  const access = new RoomAccessService(store);
  const lifecycle = new PrismaTemporaryRoomRepository(database);
  let stopped = false;
  let starting: Promise<void> | undefined;
  let guildResolver: RoomGuildResolver | undefined;
  const cancelRoomTimers = (roomId: string) => {
    timers.cancel(`transfer:${roomId}`);
    timers.cancel(`countdown:${roomId}`);
    timers.cancel(`priority:${roomId}`);
  };
  const onChangedLocked: RoomChanged = async (roomId, gateway) => {
    const state = await store.read(roomId);
    if (!state || state.room.status === 'CLOSED') { cancelRoomTimers(roomId); return; }
    if (!state.transfer || !state.controlsEnabled) {
      timers.cancel(`transfer:${roomId}`);
      timers.cancel(`countdown:${roomId}`);
    }
    const snapshot = await gateway.snapshot(state.room.channelDiscordId);
    if (!snapshot) throw new RoomActionError('ROOM_UNAVAILABLE');
    await access.synchronizeLocked(state, snapshot, gateway);
    await panels.synchronizeLocked(roomId, gateway);
  };
  const ownership = new OwnershipService({ store, coordinator, timers, onChangedLocked });
  const transfers = new TransferService({ store, coordinator, timers, onChangedLocked });
  const controls = new RoomControlsService({ store, coordinator, access, onChangedLocked });
  const observeLocked: RoomChanged = async (roomId, gateway) => {
    const state = await store.read(roomId);
    if (!state || state.room.status === 'CLOSED') { cancelRoomTimers(roomId); return; }
    const snapshot = await gateway.snapshot(state.room.channelDiscordId);
    if (!snapshot || snapshot.guildDiscordId !== state.room.guildDiscordId || snapshot.channelDiscordId !== state.room.channelDiscordId) throw new RoomActionError('ROOM_UNAVAILABLE');
    const pending = state.transfer;
    if (pending && (!state.controlsEnabled || pending.controlVersion !== state.room.controlVersion
      || !snapshot.members.some((m) => !m.isBot && m.memberDiscordId === pending.ownerDiscordId)
      || !snapshot.members.some((m) => !m.isBot && m.memberDiscordId === pending.targetDiscordId))) {
      await transfers.cancelForRoomLocked(roomId);
    }
    await ownership.observeLocked(roomId, snapshot, gateway);
    await onChangedLocked(roomId, gateway);
  };
  return { store, coordinator, panels, access, controls, ownership, transfers, timers, observeLocked,
    async synchronizeCreator(creatorId: string): Promise<{ synced: number; failed: number }> {
      if (!guildResolver) throw new RoomActionError('ROOM_UNAVAILABLE');
      // The setup transaction has already invalidated SQL operations. Cancel
      // process-local futures under the same per-room coordinator, even after row deletion.
      for (const room of await store.listForCreator(creatorId)) {
        await coordinator.room(room.guildDiscordId, room.channelDiscordId, async () => {
          const state = await store.read(room.id);
          if (!state?.transfer || !state.controlsEnabled) {
            timers.cancel(`transfer:${room.id}`);
            timers.cancel(`countdown:${room.id}`);
          }
        });
      }
      return panels.synchronizeCreator(creatorId, guildResolver);
    },
    start(resolveGuild: RoomGuildResolver): Promise<void> {
      guildResolver = resolveGuild;
      starting ??= (async () => {
        if (stopped) return;
        await store.cancelPreviousRunTransfers();
        const tracked = await store.listTracked();
        const observedAt = new Date();
        for (const room of tracked) {
          if (stopped) return;
          await coordinator.room(room.guildDiscordId, room.channelDiscordId, async () => {
            if (stopped) return;
            // Invalidate before uncertain Discord I/O: old menus never regain authority.
            if (!await store.invalidateControls(room.id, room.controlVersion)) throw new RoomActionError('STALE_CONTROLS');
            // Drop unverifiable offline continuity even if the upcoming fetch fails.
            // A later live observation starts every current join at its own observation instant.
            await store.syncPresence(room.id, [], observedAt, true);
            try {
              const guild = await resolveGuild(room.guildDiscordId);
              if (!guild || guild.id !== room.guildDiscordId) throw new RoomActionError('ROOM_UNAVAILABLE');
              const gateway = new DiscordRoomGateway(guild);
              const snapshot = await gateway.snapshot(room.channelDiscordId);
              if (stopped) return;
              if (!snapshot) {
                cancelRoomTimers(room.id);
                await lifecycle.beginClosing(room.id);
                await lifecycle.markClosed(room.id);
                return;
              }
              await ownership.observeLocked(room.id, snapshot, gateway, true, observedAt);
              await onChangedLocked(room.id, gateway);
            } catch (error: unknown) {
              logger.warn({ roomId: room.id, code: error instanceof RoomActionError ? error.code : 'PERSISTENCE_FAILURE' }, 'Tracked room reconciliation unconfirmed');
            }
          });
        }
      })();
      return starting;
    },
    stop(): Promise<void> {
      stopped = true;
      // Close admission before awaiting start/locks; callers release their locks while this drains.
      const draining = timers.stop();
      return Promise.all([draining, starting?.catch(() => undefined)]).then(() => undefined);
    },
  };
}
