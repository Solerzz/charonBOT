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
  const access = new RoomAccessService(store, coordinator);
  const lifecycle = new PrismaTemporaryRoomRepository(database);
  const reconcileDeparturesLocked = async (roomId: string): Promise<void> => {
    let state = await store.read(roomId);
    if (!state) return;
    const { guildDiscordId, channelDiscordId } = state.room;
    for (const departure of coordinator.pendingDepartures(guildDiscordId, channelDiscordId)) {
      // Break only this member's continuity, retaining a verified online return
      // instant when known. The final live observation still owns the roster.
      await store.syncPresence(roomId, state.presences.filter((p) => p.memberDiscordId !== departure.memberId), new Date(), false);
      if (departure.returnedAt) {
        await store.syncPresence(roomId, [...state.presences.filter((p) => p.memberDiscordId !== departure.memberId),
          { memberDiscordId: departure.memberId, isBot: departure.isBot }], departure.returnedAt, false);
      }
      if (coordinator.isCurrentDeparture(guildDiscordId, channelDiscordId, departure, state.room)) {
        const pending = state.transfer;
        if (pending && [pending.ownerDiscordId, pending.targetDiscordId].includes(departure.memberId)) {
          await store.discardTransfer(pending.id);
          timers.cancel(`transfer:${roomId}`);
        }
        if (state.room.ownerDiscordId === departure.memberId) {
          const version = state.room.controlVersion;
          await coordinator.changeOwnership(guildDiscordId, channelDiscordId, version, null,
            () => store.changeOwner(roomId, version, departure.memberId, null));
        } else if (state.room.ownerDiscordId === null && state.room.priorityMemberDiscordId === departure.memberId
          && state.room.priorityExpiresAt !== null && state.room.priorityExpiresAt > departure.leftAt) {
          await store.savePriority(roomId, state.room.controlVersion, null, null);
        }
      }
      coordinator.acknowledgeDeparture(guildDiscordId, channelDiscordId, departure);
      state = await store.read(roomId);
      if (!state) return;
    }
    transfers.synchronizePrompt(roomId, state.transfer?.id ?? null);
  };
  let stopped = false;
  let starting: Promise<void> | undefined;
  let guildResolver: RoomGuildResolver | undefined;
  const cancelRoomTimers = (roomId: string) => {
    timers.cancel(`transfer:${roomId}`);
    timers.cancel(`countdown:${roomId}`);
    timers.cancel(`priority:${roomId}`);
    transfers.synchronizePrompt(roomId, null);
  };
  const onChangedLocked: RoomChanged = async (roomId, gateway) => {
    const state = await store.read(roomId);
    if (!state || state.room.status === 'CLOSED') { cancelRoomTimers(roomId); return; }
    transfers.synchronizePrompt(roomId, state.controlsEnabled ? state.transfer?.id ?? null : null);
    if (!state.transfer || !state.controlsEnabled) {
      timers.cancel(`transfer:${roomId}`);
      timers.cancel(`countdown:${roomId}`);
    }
    const snapshot = await gateway.snapshot(state.room.channelDiscordId);
    if (!snapshot) throw new RoomActionError('ROOM_UNAVAILABLE');
    await access.synchronizeLocked(state, snapshot, gateway);
    await panels.synchronizeLocked(roomId, gateway);
  };
  const ownership = new OwnershipService({ store, coordinator, timers, onChangedLocked, reconcileDeparturesLocked });
  const transfers = new TransferService({ store, coordinator, timers, onChangedLocked, reconcileDeparturesLocked });
  const controls = new RoomControlsService({ store, coordinator, access, onChangedLocked });
  const observeLocked: RoomChanged = async (roomId, gateway) => {
    await reconcileDeparturesLocked(roomId);
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
  return { store, coordinator, panels, access, controls, ownership, transfers, timers, observeLocked, reconcileDeparturesLocked,
    async synchronizeCreator(creatorId: string): Promise<{ synced: number; failed: number }> {
      const resolveGuild = guildResolver;
      if (!resolveGuild) throw new RoomActionError('ROOM_UNAVAILABLE');
      // Include due callbacks still awaiting the room lock. Capture before the
      // first enumeration/read await, not only before guild resolution.
      const scheduled = timers.scheduledDeadlines();
      // The setup transaction has already invalidated SQL operations. Cancel
      // process-local futures under the same per-room coordinator, even after row deletion.
      for (const room of await store.listForCreator(creatorId)) {
        await coordinator.room(room.guildDiscordId, room.channelDiscordId, async () => {
          const state = await store.read(room.id);
          transfers.synchronizePrompt(room.id, state?.controlsEnabled ? state.transfer?.id ?? null : null);
          if (!state?.transfer || !state.controlsEnabled) {
            timers.cancel(`transfer:${room.id}`);
            timers.cancel(`countdown:${room.id}`);
          }
          if (state?.room.status === 'ACTIVE' && state.room.ownerDiscordId === null
            && state.room.priorityExpiresAt !== null && (state.room.priorityExpiresAt > new Date()
              || scheduled.get(`priority:${room.id}`)?.getTime() === state.room.priorityExpiresAt.getTime())) {
            const guild = await resolveGuild(room.guildDiscordId);
            if (!guild || guild.id !== room.guildDiscordId) throw new RoomActionError('ROOM_UNAVAILABLE');
            // Setup bumped the generation, not the reservation's candidate/deadline.
            ownership.rebindPriorityLocked(state, new DiscordRoomGateway(guild));
          } else timers.cancel(`priority:${room.id}`);
        });
      }
      return panels.synchronizeCreator(creatorId, resolveGuild);
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
      transfers.stopPrompts();
      return Promise.all([draining, starting?.catch(() => undefined)]).then(() => undefined);
    },
  };
}
