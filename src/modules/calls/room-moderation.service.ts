import { z } from 'zod';

import { discordIdSchema } from '../setup/setup.schemas.js';
import type { RoomAccessService } from './room-access.service.js';
import type { RoomCoordinator } from './room.coordinator.js';
import { moderationDeniedBefore, sameRoomBlocks } from './room-moderation.permissions.js';
import { currentOwnedRoom, safeRoomAction } from './room-mutation.js';
import type { RoomStateRepository } from './room-state.repository.js';
import { RoomActionError, type RoomActor, type RoomBlockWrite, type RoomChanged, type RoomDiscordGateway, type RoomMemberBlock, type RoomModerationTarget, type RoomSnapshot, type RoomState } from './room.types.js';

export type ModerationResult = { actor: RoomActor; kind: 'blocked' | 'unblocked'; memberDiscordId: string; removedFromRoom: boolean };
type Dependencies = { store: RoomStateRepository; coordinator: RoomCoordinator; access: RoomAccessService;
  invalidateWorkspace: (roomId: string) => void; publishLocked: RoomChanged; afterRemovalLocked: RoomChanged };

const sameState = (a: RoomState, b: RoomState) => a.room.id === b.room.id && a.room.guildDiscordId === b.room.guildDiscordId
  && a.room.channelDiscordId === b.room.channelDiscordId && a.room.status === b.room.status && a.controlsEnabled === b.controlsEnabled
  && a.room.ownerDiscordId === b.room.ownerDiscordId && a.room.controlVersion === b.room.controlVersion
  && a.room.visibility === b.room.visibility && a.room.isLocked === b.room.isLocked
  && [...a.allowedMemberIds].sort().join(',') === [...b.allowedMemberIds].sort().join(',')
  && a.transfer?.id === b.transfer?.id && sameRoomBlocks(a.memberBlocks, b.memberBlocks);
const accessMembers = (state: RoomState, snapshot: RoomSnapshot) =>
  [...new Set([...(state.room.ownerDiscordId ? [state.room.ownerDiscordId] : []), ...state.allowedMemberIds, ...snapshot.members.map(member => member.memberDiscordId)])]
    .filter(id => !state.memberBlocks.some(block => block.memberDiscordId === id && block.state === 'BLOCKED')).sort().join(',');

function assertSnapshot(state: RoomState, snapshot: RoomSnapshot | null): asserts snapshot is RoomSnapshot {
  if (!snapshot || snapshot.guildDiscordId !== state.room.guildDiscordId || snapshot.channelDiscordId !== state.room.channelDiscordId) throw new RoomActionError('ROOM_UNAVAILABLE');
}

export class RoomModerationService {
  constructor(private readonly dependencies: Dependencies) {}

  list(actor: RoomActor, gateway: RoomDiscordGateway): Promise<RoomMemberBlock[]> {
    // Read-only even in quarantine: this view is not mutation authorization.
    return this.withRoom(actor, async channelId => (await this.ownedLocked(actor, channelId, gateway)).state.memberBlocks);
  }

  async block(actor: RoomActor, targetId: string, gateway: RoomDiscordGateway): Promise<ModerationResult> {
    discordIdSchema.parse(targetId);
    return this.mutate(actor, targetId, 'blocked', gateway);
  }

  async unblock(actor: RoomActor, blockId: string, gateway: RoomDiscordGateway): Promise<ModerationResult> {
    z.uuid().parse(blockId);
    return this.mutate(actor, blockId, 'unblocked', gateway);
  }

  private mutate(actor: RoomActor, id: string, kind: ModerationResult['kind'], gateway: RoomDiscordGateway): Promise<ModerationResult> {
    return this.withRoom(actor, async channelId => {
      const { store, access, invalidateWorkspace, publishLocked } = this.dependencies;
      let attempted = false; let published = false;
      try {
        let { state, snapshot } = await this.ownedLocked(actor, channelId, gateway);
        if (state.transfer) throw new RoomActionError('TRANSFER_PENDING');
        const previous = kind === 'unblocked' ? state.memberBlocks.find(block => block.id === id) : undefined;
        if (kind === 'unblocked' && !previous) throw new RoomActionError('STALE_CONTROLS');
        const targetId = previous?.memberDiscordId ?? id;
        let deniedBefore = 0n;
        if (kind === 'blocked') {
          this.assertTarget(state, targetId, await safeRoomAction(() => gateway.resolveModerationTarget(targetId), 'DISCORD_FAILURE'));
          await safeRoomAction(() => gateway.assertModerationPermissions(channelId, targetId), 'DISCORD_FAILURE');
          deniedBefore = moderationDeniedBefore(await safeRoomAction(() => gateway.readAccess(channelId), 'DISCORD_FAILURE'), targetId);
        }
        // Never infer a rollback from absence while a SQL writer can still run.
        await access.settleLocked(actor.roomId);
        ({ state, snapshot } = await this.ownedLocked(actor, channelId, gateway));
        if (state.transfer) throw new RoomActionError('TRANSFER_PENDING');
        if (kind === 'blocked' && access.isUncertain(actor.roomId)) {
          await access.synchronizeLocked(state, snapshot, gateway);
          ({ state } = await this.ownedLocked(actor, channelId, gateway));
        }
        if (kind === 'blocked') {
          this.assertTarget(state, targetId, await safeRoomAction(() => gateway.resolveModerationTarget(targetId), 'DISCORD_FAILURE'));
          await safeRoomAction(() => gateway.assertModerationPermissions(channelId, targetId), 'DISCORD_FAILURE');
        }
        // The final target/permission read may yield too. Keep actor continuity
        // and the SQL generation current immediately before intent admission.
        ({ state, snapshot } = await this.ownedLocked(actor, channelId, gateway));
        // Corrective unblock skips only the old projection: SQL settlement and
        // fresh owner/epoch/controls validation above are never bypassed.
        let write: RoomBlockWrite | null;
        attempted = true;
        try {
          write = kind === 'blocked' ? await store.stageRoomBlock(actor, targetId, deniedBefore) : await store.stageRoomUnblock(actor, id);
        } catch {
          access.markUnsettled(actor.roomId, actor.controlVersion); invalidateWorkspace(actor.roomId);
          const settled = await access.settleLocked(actor.roomId);
          const block = settled?.memberBlocks.find(b => kind === 'blocked' ? b.memberDiscordId === targetId && b.state === 'BLOCKED' : b.id === id && b.state === 'UNBLOCK_PENDING');
          if (!block) throw new RoomActionError('MODERATION_INCOMPLETE');
          // The fence may itself bump a duplicate's epoch. Never adopt an
          // unrelated later generation as the old actor's authority.
          write = { block, changed: true, controlVersion: actor.controlVersion + 1 };
        }
        if (!write) { attempted = false; throw new RoomActionError('STALE_CONTROLS'); }
        if (write.changed) invalidateWorkspace(actor.roomId);
        const durable = await safeRoomAction(() => store.read(actor.roomId));
        if (!durable?.memberBlocks.some(block => block.id === write.block.id && block.memberDiscordId === targetId && block.state === write.block.state)) throw new RoomActionError('MODERATION_INCOMPLETE');
        const nextActor = { ...actor, controlVersion: write.controlVersion };
        const removed = await this.reconcileIntentLocked(actor.roomId, gateway);
        const confirmed = await this.ownedLocked(nextActor, channelId, gateway);
        published = true;
        await safeRoomAction(() => publishLocked(actor.roomId, gateway), 'DISCORD_FAILURE');
        const final = await this.ownedLocked(nextActor, channelId, gateway);
        if (!sameState(confirmed.state, final.state) || accessMembers(durable, snapshot) !== accessMembers(final.state, final.snapshot)) throw new RoomActionError('MODERATION_INCOMPLETE');
        if (kind === 'blocked'
          ? !final.state.memberBlocks.some(block => block.id === write.block.id && block.state === 'BLOCKED') || final.snapshot.members.some(member => member.memberDiscordId === targetId)
          : final.state.memberBlocks.some(block => block.memberDiscordId === targetId)) throw new RoomActionError('MODERATION_INCOMPLETE');
        return { actor: nextActor, kind, memberDiscordId: targetId, removedFromRoom: removed.has(targetId) };
      } catch (error) {
        if (attempted || access.isUncertain(actor.roomId)) {
          access.markUncertain(actor.roomId);
          // Publication has no access/removal side effects. In particular, do
          // not reconcile again after any indeterminate native response.
          if (!published) { try { await publishLocked(actor.roomId, gateway); } catch { /* Keep quarantine. */ } }
          if (attempted) throw new RoomActionError('MODERATION_INCOMPLETE');
        }
        throw error;
      }
    });
  }

  async reconcileLocked(roomId: string, gateway: RoomDiscordGateway): Promise<void> {
    await this.reconcileIntentLocked(roomId, gateway);
  }

  // Caller owns the room coordinator. No locking, publication, recursion or
  // reauthorization here: committed intent outlives the initiating owner.
  private async reconcileIntentLocked(roomId: string, gateway: RoomDiscordGateway): Promise<Set<string>> {
    const { store, access, afterRemovalLocked } = this.dependencies;
    const removed = new Set<string>();
    try {
      const state = await access.settleLocked(roomId);
      if (access.retireConfirmedLocked(roomId, state?.room.status ?? null)) return removed;
      if (!state || state.room.status !== 'ACTIVE') throw new RoomActionError('ROOM_UNAVAILABLE');
      const snapshot = await safeRoomAction(() => gateway.snapshot(state.room.channelDiscordId), 'DISCORD_FAILURE');
      assertSnapshot(state, snapshot);
      await access.synchronizeLocked(state, snapshot, gateway);
      await this.confirmLocked(state);
      for (const block of state.memberBlocks.filter(b => b.state === 'UNBLOCK_PENDING')) {
        let complete: boolean;
        try { complete = await store.completeRoomUnblock(roomId, state.room.controlVersion, block.id); }
        catch {
          access.markUnsettled(roomId, state.room.controlVersion);
          await access.settleLocked(roomId);
          // No replay, even if the completion committed but lost its reply.
          throw new RoomActionError('MODERATION_INCOMPLETE');
        }
        if (!complete) throw new RoomActionError('MODERATION_INCOMPLETE');
      }
      const projected = { ...state, memberBlocks: state.memberBlocks.filter(b => b.state === 'BLOCKED') };
      await this.confirmLocked(projected);
      let observedRemoval = false;
      for (const block of projected.memberBlocks) {
        const live = await safeRoomAction(() => gateway.snapshot(state.room.channelDiscordId), 'DISCORD_FAILURE');
        assertSnapshot(projected, live);
        if (!live.members.some(member => member.memberDiscordId === block.memberDiscordId)) continue;
        const target = await safeRoomAction(() => gateway.resolveModerationTarget(block.memberDiscordId), 'DISCORD_FAILURE');
        this.assertTarget(projected, block.memberDiscordId, target);
        if (target!.channelDiscordId !== state.room.channelDiscordId) continue;
        await safeRoomAction(() => gateway.assertModerationPermissions(state.room.channelDiscordId, block.memberDiscordId), 'DISCORD_FAILURE');
        // Last SQL check, after all preceding REST awaits. The gateway supplies
        // the final native protection/channel check immediately before HTTP.
        await this.confirmLocked(projected);
        const result = await safeRoomAction(() => gateway.disconnectFromRoom(state.room.channelDiscordId, block.memberDiscordId), 'DISCORD_FAILURE');
        const after = await safeRoomAction(() => gateway.snapshot(state.room.channelDiscordId), 'DISCORD_FAILURE');
        assertSnapshot(projected, after);
        if (after.members.some(member => member.memberDiscordId === block.memberDiscordId)) throw new RoomActionError('MODERATION_INCOMPLETE');
        observedRemoval = true;
        if (result === 'disconnected') removed.add(block.memberDiscordId);
      }
      if (observedRemoval) await safeRoomAction(() => afterRemovalLocked(roomId, gateway));
      const final = await safeRoomAction(() => gateway.snapshot(state.room.channelDiscordId), 'DISCORD_FAILURE');
      assertSnapshot(projected, final);
      await this.confirmLocked(projected);
      if (projected.memberBlocks.some(block => final.members.some(member => member.memberDiscordId === block.memberDiscordId))) throw new RoomActionError('MODERATION_INCOMPLETE');
      // SQL finalization/removal/publication can yield after access confirmation.
      // Do not acknowledge temporary grants whose occupants have since left.
      if (accessMembers(state, snapshot) !== accessMembers(projected, final)) throw new RoomActionError('MODERATION_INCOMPLETE');
      return removed;
    } catch {
      access.markUncertain(roomId);
      throw new RoomActionError('MODERATION_INCOMPLETE');
    }
  }

  private assertTarget(state: RoomState, id: string, target: RoomModerationTarget | null): void {
    if (id === state.room.ownerDiscordId) throw new RoomActionError('PROTECTED_MEMBER');
    if (!target || target.memberDiscordId !== id) throw new RoomActionError('UNKNOWN_MEMBER');
    if (target.isBot || target.isAdministrator || target.isGuildOwner) throw new RoomActionError('PROTECTED_MEMBER');
  }

  private async confirmLocked(expected: RoomState): Promise<void> {
    const current = await safeRoomAction(() => this.dependencies.store.read(expected.room.id));
    if (!current || !sameState(expected, current)) throw new RoomActionError('STALE_CONTROLS');
  }

  private async ownedLocked(actor: RoomActor, channelId: string, gateway: RoomDiscordGateway) {
    const context = await currentOwnedRoom(this.dependencies.store, actor, gateway);
    if (context.state.room.channelDiscordId !== channelId) throw new RoomActionError('ROOM_UNAVAILABLE');
    await this.confirmLocked(context.state);
    this.dependencies.coordinator.assertContinuous(actor.guildDiscordId, channelId, [actor.memberDiscordId]);
    return context;
  }

  private withRoom<T>(actor: RoomActor, work: (channelId: string) => Promise<T>): Promise<T> {
    const { store, coordinator } = this.dependencies;
    return safeRoomAction(() => coordinator.member(actor.guildDiscordId, actor.memberDiscordId, async () => {
      const initial = await store.read(actor.roomId);
      if (!initial || initial.room.guildDiscordId !== actor.guildDiscordId) throw new RoomActionError('ROOM_UNAVAILABLE');
      return coordinator.room(actor.guildDiscordId, initial.room.channelDiscordId, () => work(initial.room.channelDiscordId));
    }));
  }
}
