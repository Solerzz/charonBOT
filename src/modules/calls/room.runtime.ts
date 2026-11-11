import type { Logger } from 'pino';
import type { Client, Guild } from 'discord.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { KeyedMutex } from '../../shared/keyed-mutex.js';
import { OwnershipService } from '../ownership/ownership.service.js';
import { OwnershipTimers } from '../ownership/ownership.timers.js';
import { TransferService } from '../ownership/transfer.service.js';
import { RoomAccessService } from './room-access.service.js';
import { CallPrivateWorkspace } from './call-workspace.js';
import { RoomControlsService } from './room-controls.service.js';
import { RoomPanelService } from './room-panel.service.js';
import { PrismaRoomStateRepository } from './room-state.repository.js';
import { RoomCoordinator } from './room.coordinator.js';
import { PrismaTemporaryRoomRepository } from './call.repository.js';
import { DiscordRoomGateway } from './room.discord.js';
import { RoomModerationService } from './room-moderation.service.js';
import { createRoomModerationTransport, type RoomModerationTransport } from './room-moderation.transport.js';
import { RoomActionError } from './room.types.js';
import type { RoomChanged, RoomDiscordGateway, RoomGuildResolver } from './room.types.js';

export type RoomRuntime = ReturnType<typeof createRoomRuntime>;

export function createRoomRuntime(database: PrismaClient, logger: Logger) {
  let client: Client | undefined;
  let transport: RoomModerationTransport | undefined;
  let transportStopped = false;
  const gatewayFor = (guild: Guild): RoomDiscordGateway => {
    if (client && guild.client !== client) throw new RoomActionError('ROOM_UNAVAILABLE');
    // Health-only doubles need no Client. A gateway without a transport fails
    // closed on disconnect; production guilds all bind the one shared Client.
    if (!transportStopped && guild.client && !transport) {
      client = guild.client;
      transport = createRoomModerationTransport(client);
    }
    return new DiscordRoomGateway(guild, transport);
  };
  const store = new PrismaRoomStateRepository(database);
  const coordinator = new RoomCoordinator(new KeyedMutex());
  const timers = new OwnershipTimers(logger);
  const workspaces = new CallPrivateWorkspace();
  // Retire delivery generations synchronously before authority-changing SQL,
  // including lost acknowledgements. Cleanup is tracked/drained by the workspace;
  // never add an await between a service's final live checks and its CAS/fence.
  const invalidateWorkspace = (roomId: string): void => { void workspaces.reconcile(roomId, null); };
  const panels = new RoomPanelService({ store, coordinator, logger });
  const access = new RoomAccessService(store, coordinator, invalidateWorkspace);
  const lifecycle = new PrismaTemporaryRoomRepository(database);
  const readState = async (roomId: string) => {
    const state = await store.read(roomId);
    access.retireConfirmedLocked(roomId, state?.room.status ?? null);
    await workspaces.reconcile(roomId, state);
    return state;
  };
  const reconcileDeparturesLocked = async (roomId: string, preserveAccessReceipts = false): Promise<void> => {
    let state = await readState(roomId);
    if (!state) return;
    if (state.room.status === 'CLOSED') {
      coordinator.retireRoom(state.room.guildDiscordId, state.room.channelDiscordId);
      return;
    }
    const { guildDiscordId, channelDiscordId } = state.room;
    const departures = coordinator.pendingDepartures(guildDiscordId, channelDiscordId);
    // BLOCKED occupants were excluded from native grants. Their expected
    // removal receipts still break presence continuity, not access certainty.
    const blocked = new Set(state.memberBlocks.filter(block => block.state === 'BLOCKED').map(block => block.memberDiscordId));
    if (departures.some(departure => !blocked.has(departure.memberId))) access.markUncertain(roomId);
    for (const departure of departures) {
      if (state.room.ownerDiscordId === departure.memberId
        && coordinator.isCurrentDeparture(guildDiscordId, channelDiscordId, departure, state.room)) {
        await workspaces.reconcile(roomId, null);
      }
      // Break only this member's continuity, retaining a verified online return
      // instant when known. The final live observation still owns the roster.
      await store.syncPresence(roomId, state.presences.filter((p) => p.memberDiscordId !== departure.memberId), new Date(), false);
      if (departure.returnedAt) {
        await store.syncPresence(roomId, [...state.presences.filter((p) => p.memberDiscordId !== departure.memberId),
          { memberDiscordId: departure.memberId, isBot: departure.isBot }], departure.returnedAt, false);
      }
      let attempts = 0;
      for (;;) {
        let confirmed = true;
        if (coordinator.isCurrentDeparture(guildDiscordId, channelDiscordId, departure, state.room)) {
          const pending = state.transfer;
          if (pending && [pending.ownerDiscordId, pending.targetDiscordId].includes(departure.memberId)) {
            await store.discardTransfer(pending.id);
            timers.cancel(`transfer:${roomId}`);
          }
          if (state.room.ownerDiscordId === departure.memberId) {
            if (attempts++ === 3) throw new RoomActionError('STALE_CONTROLS');
            const version = state.room.controlVersion;
            confirmed = await coordinator.changeOwnership(guildDiscordId, channelDiscordId, version, null,
              () => store.changeOwner(roomId, version, departure.memberId, null));
          } else if (state.room.ownerDiscordId === null && state.room.priorityMemberDiscordId === departure.memberId
            && state.room.priorityExpiresAt !== null && state.room.priorityExpiresAt > departure.leftAt) {
            if (attempts++ === 3) throw new RoomActionError('STALE_CONTROLS');
            confirmed = await store.savePriority(roomId, state.room.controlVersion, null, null);
          }
        }
        if (confirmed) break;
        // Setup writes outside this mutex. A false CAS is not ownership
        // supersession: re-read and retry boundedly, retaining the receipt on failure.
        state = await readState(roomId);
        if (!state) return;
      }
      // Moderation's final roster/actor checks still need evidence of a new
      // departure, even after this callback reconciles presence and revocation.
      // Only expected BLOCKED removals are safe to acknowledge inside it.
      if (!preserveAccessReceipts || state.memberBlocks.some(block => block.memberDiscordId === departure.memberId && block.state === 'BLOCKED')) {
        coordinator.acknowledgeDeparture(guildDiscordId, channelDiscordId, departure);
      }
      state = await readState(roomId);
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
  const publishLocked: RoomChanged = async (roomId, gateway) => {
    await workspaces.reconcile(roomId, await store.read(roomId));
    await panels.synchronizeLocked(roomId, gateway);
  };
  const recoverRoomLocked: RoomChanged = async (roomId, gateway) => {
    let state = await readState(roomId);
    if (!state || state.room.status === 'CLOSED') {
      if (state) coordinator.retireRoom(state.room.guildDiscordId, state.room.channelDiscordId);
      cancelRoomTimers(roomId); return;
    }
    transfers.synchronizePrompt(roomId, state.controlsEnabled ? state.transfer?.id ?? null : null);
    if (!state.transfer || !state.controlsEnabled) {
      timers.cancel(`transfer:${roomId}`);
      timers.cancel(`countdown:${roomId}`);
    }
    if (!access.isUncertain(roomId) && !state.memberBlocks.length) return;
    try {
      // A lost stage reply may still have an admitted SQL writer. Choose the
      // recovery path only AFTER its fence reveals the durable intent.
      state = await access.settleLocked(roomId);
      if (access.retireConfirmedLocked(roomId, state?.room.status ?? null)) return;
      if (state!.memberBlocks.length) {
        await moderation.reconcileLocked(roomId, gateway);
        await publishLocked(roomId, gateway);
      } else await access.recoverLocked(roomId, gateway, publishLocked);
    } catch (error) {
      access.markUncertain(roomId);
      throw error;
    }
  };
  const onChangedLocked: RoomChanged = async (roomId, gateway) => {
    access.markUncertain(roomId);
    await recoverRoomLocked(roomId, gateway);
  };
  const recoverAccessLocked = recoverRoomLocked;
  const ownership = new OwnershipService({ store, coordinator, timers, onChangedLocked, reconcileDeparturesLocked, invalidateWorkspace, recoverAccessLocked });
  const transfers = new TransferService({ store, coordinator, timers, onChangedLocked, reconcileDeparturesLocked, invalidateWorkspace, recoverAccessLocked });
  const afterRemovalLocked: RoomChanged = async (roomId, gateway) => {
    await reconcileDeparturesLocked(roomId, true);
    const state = await store.read(roomId);
    if (!state || state.room.status === 'CLOSED') return;
    const snapshot = await gateway.snapshot(state.room.channelDiscordId);
    if (!snapshot || snapshot.guildDiscordId !== state.room.guildDiscordId || snapshot.channelDiscordId !== state.room.channelDiscordId) throw new RoomActionError('ROOM_UNAVAILABLE');
    await ownership.observeLocked(roomId, snapshot, gateway);
  };
  const moderation = new RoomModerationService({ store, coordinator, access, invalidateWorkspace, publishLocked, afterRemovalLocked });
  const controls = new RoomControlsService({ store, coordinator, access, onChangedLocked, recoverRoomLocked });
  const observeLocked: RoomChanged = async (roomId, gateway) => {
    await reconcileDeparturesLocked(roomId);
    const state = await readState(roomId);
    if (!state || state.room.status === 'CLOSED') { cancelRoomTimers(roomId); return; }
    const snapshot = await gateway.snapshot(state.room.channelDiscordId);
    if (!snapshot || snapshot.guildDiscordId !== state.room.guildDiscordId || snapshot.channelDiscordId !== state.room.channelDiscordId) throw new RoomActionError('ROOM_UNAVAILABLE');
    const pending = state.transfer;
    if (pending && (!state.controlsEnabled || pending.controlVersion !== state.room.controlVersion
      || !snapshot.members.some((m) => !m.isBot && m.memberDiscordId === pending.ownerDiscordId)
      || !snapshot.members.some((m) => !m.isBot && m.memberDiscordId === pending.targetDiscordId)
      || state.memberBlocks.some(block => [pending.ownerDiscordId, pending.targetDiscordId].includes(block.memberDiscordId)))) {
      await transfers.cancelForRoomLocked(roomId);
    }
    await ownership.observeLocked(roomId, snapshot, gateway);
    await onChangedLocked(roomId, gateway);
  };
  let stopping: Promise<void> | undefined;
  return { store, coordinator, panels, access, controls, moderation, ownership, transfers, timers, workspaces, observeLocked, reconcileDeparturesLocked,
    recoverRoomLocked, publishLocked, gatewayFor,
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
          await workspaces.reconcile(room.id, null);
          const state = await readState(room.id);
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
            ownership.rebindPriorityLocked(state, gatewayFor(guild));
          } else timers.cancel(`priority:${room.id}`);
        });
      }
      return panels.synchronizeCreator(creatorId, resolveGuild, async (roomId, guild) => {
        const state = await readState(roomId);
        const gateway = gatewayFor(guild);
        // Setup alone changes the control generation, not access. Keep due
        // ownership observations single-shot; durable moderation still applies
        // when controls/panels are disabled.
        if (state?.memberBlocks.length) await recoverRoomLocked(roomId, gateway);
        else await publishLocked(roomId, gateway);
      });
    },
    start(resolveGuild: RoomGuildResolver): Promise<void> {
      guildResolver = resolveGuild;
      starting ??= (async () => {
        if (stopped) return;
        await store.purgeClosedRoomBlocks();
        await store.cancelPreviousRunTransfers();
        const tracked = await store.listTracked();
        const observedAt = new Date();
        for (const room of tracked) {
          if (stopped) return;
          await coordinator.room(room.guildDiscordId, room.channelDiscordId, async () => {
            if (stopped) return;
            // Startup has no confirmed native projection yet. A failed fetch
            // must not let even non-access controls bypass reconciliation.
            access.markUncertain(room.id);
            await workspaces.reconcile(room.id, null);
            // Invalidate before uncertain Discord I/O: old menus never regain authority.
            if (!await store.invalidateControls(room.id, room.controlVersion)) throw new RoomActionError('STALE_CONTROLS');
            // Drop unverifiable offline continuity even if the upcoming fetch fails.
            // A later live observation starts every current join at its own observation instant.
            await store.syncPresence(room.id, [], observedAt, true);
            try {
              const guild = await resolveGuild(room.guildDiscordId);
              if (!guild || guild.id !== room.guildDiscordId) throw new RoomActionError('ROOM_UNAVAILABLE');
              const gateway = gatewayFor(guild);
              const snapshot = await gateway.snapshot(room.channelDiscordId);
              if (stopped) return;
              if (!snapshot) {
                cancelRoomTimers(room.id);
                await lifecycle.beginClosing(room.id);
                const closed = await lifecycle.markClosed(room.id);
                access.retireConfirmedLocked(room.id, closed.status);
                coordinator.retireRoom(room.guildDiscordId, room.channelDiscordId);
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
    stop(acceptedWork?: Promise<unknown>): Promise<void> {
      if (stopping) return stopping;
      stopped = true;
      // Close admission before awaiting start/locks; callers release their locks while this drains.
      const draining = timers.stop();
      const workspacesDrained = workspaces.stop();
      transfers.stopPrompts();
      stopping = Promise.allSettled([draining, workspacesDrained, starting, acceptedWork]).then(async () => {
        // Accepted application dispatches may still need this transport after
        // timer/workspace admission closes. Never destroy their shared Client.
        transportStopped = true;
        await transport?.stop();
      });
      return stopping;
    },
  };
}
