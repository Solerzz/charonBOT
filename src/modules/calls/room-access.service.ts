import { OverwriteType, PermissionFlagsBits as P, PermissionsBitField, type OverwriteData } from 'discord.js';

import type { RoomVisibility } from '../../generated/prisma/client.js';
import { discordIdSchema } from '../setup/setup.schemas.js';
import { currentOwnedRoom, safeRoomAction } from './room-mutation.js';
import type { RoomStateRepository } from './room-state.repository.js';
import type { RoomCoordinator } from './room.coordinator.js';
import { projectModerationAccess, sameRoomBlocks } from './room-moderation.permissions.js';
import { RoomActionError, type RoomAccessPolicy, type RoomActor, type RoomChanged, type RoomDiscordGateway, type RoomSnapshot, type RoomState } from './room.types.js';

const allowedUnion = (state: RoomState, snapshot: RoomSnapshot, allowed = state.allowedMemberIds): string[] =>
  [...new Set([...(state.room.ownerDiscordId ? [state.room.ownerDiscordId] : []), ...snapshot.members.map(({ memberDiscordId }) => memberDiscordId), ...allowed])]
    .filter(id => !state.memberBlocks.some(block => block.memberDiscordId === id && block.state === 'BLOCKED'));
const sameIds = (a: string[], b: string[]) => [...a].sort().join(',') === [...b].sort().join(',');
const sameAuthority = (a: RoomState, b: RoomState) => a.room.id === b.room.id && a.room.guildDiscordId === b.room.guildDiscordId
  && a.room.channelDiscordId === b.room.channelDiscordId && a.room.status === b.room.status
  && a.room.controlVersion === b.room.controlVersion && a.room.ownerDiscordId === b.room.ownerDiscordId && a.controlsEnabled === b.controlsEnabled;
const sameAccess = (a: RoomState, b: RoomState) => a.room.visibility === b.room.visibility && a.room.isLocked === b.room.isLocked && sameIds(a.allowedMemberIds, b.allowedMemberIds)
  && sameRoomBlocks(a.memberBlocks, b.memberBlocks);

function safePrevious(previous: OverwriteData[], allowed: string[], restricted: boolean): OverwriteData[] {
  const mask = P.ViewChannel | P.Connect | P.SendMessages;
  const restored = new Map<string, OverwriteData>();
  for (const entry of previous) {
    const id = typeof entry.id === 'string' ? entry.id : entry.id.id;
    const allow = new PermissionsBitField(entry.allow).bitfield;
    const deny = new PermissionsBitField(entry.deny).bitfield;
    if (entry.type === OverwriteType.Member && !allowed.includes(id) && (allow & mask) === mask && !(deny & mask)) {
      if ((allow & ~mask) || deny) restored.set(id, { ...entry, allow: allow & ~mask });
    } else restored.set(id, entry);
  }
  if (restricted) for (const id of allowed) {
    const entry = restored.get(id);
    restored.set(id, { id, type: OverwriteType.Member,
      allow: new PermissionsBitField(entry?.allow).bitfield | mask, deny: new PermissionsBitField(entry?.deny).bitfield & ~mask });
  }
  return [...restored.values()];
}

function assertSnapshot(state: RoomState, snapshot: RoomSnapshot | null): asserts snapshot is RoomSnapshot {
  if (!snapshot || snapshot.guildDiscordId !== state.room.guildDiscordId || snapshot.channelDiscordId !== state.room.channelDiscordId) {
    throw new RoomActionError('ROOM_UNAVAILABLE');
  }
}

export class RoomAccessService {
  private readonly uncertain = new Set<string>();
  private readonly unsettled = new Map<string, number>();
  constructor(private readonly store: RoomStateRepository, private readonly coordinator: RoomCoordinator,
    private readonly onInvalidated?: (roomId: string) => void) {}

  isUncertain(roomId: string): boolean { return this.uncertain.has(roomId); }
  markUncertain(roomId: string): void { this.uncertain.add(roomId); }
  markUnsettled(roomId: string, attemptedVersion: number): void {
    this.markUncertain(roomId); this.unsettled.set(roomId, attemptedVersion);
  }

  async settleLocked(roomId: string): Promise<RoomState | null> {
    const attemptedVersion = this.unsettled.get(roomId);
    if (attemptedVersion === undefined) return safeRoomAction(() => this.store.read(roomId));
    this.onInvalidated?.(roomId);
    const settled = await safeRoomAction(() => this.store.settleAccess(roomId, attemptedVersion));
    this.unsettled.delete(roomId);
    return settled;
  }

  // Only a confirmed SQL read/lifecycle result may retire these obligations.
  // CREATING/CLOSING can still recover: neither is a terminal state.
  retireConfirmedLocked(roomId: string, status: RoomState['room']['status'] | null): boolean {
    if (status !== null && status !== 'CLOSED') return false;
    this.uncertain.delete(roomId); this.unsettled.delete(roomId);
    return true;
  }

  // Caller holds the existing room coordinator; never acquire another lock.
  // Recovery must publish the fenced generation before final actor/CAS checks.
  async recoverLocked(roomId: string, gateway: RoomDiscordGateway, publish: RoomChanged): Promise<void> {
    if (!this.isUncertain(roomId)) return;
    const state = await this.settleLocked(roomId);
    if (this.retireConfirmedLocked(roomId, state?.room.status ?? null)) return;
    const snapshot = await safeRoomAction(() => gateway.snapshot(state!.room.channelDiscordId), 'DISCORD_FAILURE');
    assertSnapshot(state!, snapshot);
    await this.synchronizeLocked(state!, snapshot, gateway);
    try { await safeRoomAction(() => publish(roomId, gateway), 'DISCORD_FAILURE'); }
    catch (error) {
      // Native confirmation alone does not confirm publication of the fence.
      this.markUncertain(roomId);
      throw error;
    }
  }

  setVisibilityLocked(actor: RoomActor, state: RoomState, visibility: RoomVisibility, gateway: RoomDiscordGateway): Promise<void> {
    return this.applySettingsLocked(actor, state, { visibility }, gateway);
  }

  async applySettingsLocked(actor: RoomActor, state: RoomState, patch: Partial<RoomAccessPolicy>, gateway: RoomDiscordGateway): Promise<void> {
    const policy = { isLocked: state.room.isLocked, visibility: state.room.visibility, ...patch };
    if (typeof policy.isLocked !== 'boolean' || !['PUBLIC', 'PRIVATE'].includes(policy.visibility)) throw new RangeError('Invalid room access policy');
    const desired = { ...state, room: { ...state.room, ...policy } };
    await this.changeAccess(actor, state, desired, gateway, () => this.store.updateSettings(state.room.id, actor.controlVersion, patch));
  }

  async setAllowedLocked(actor: RoomActor, state: RoomState, memberId: string, allowed: boolean, gateway: RoomDiscordGateway): Promise<void> {
    discordIdSchema.parse(memberId);
    if (allowed && state.memberBlocks.some(block => block.memberDiscordId === memberId)) throw new RoomActionError('MEMBER_BLOCKED');
    const member = await safeRoomAction(() => gateway.resolveMember(memberId), 'DISCORD_FAILURE');
    if (!member || member.memberDiscordId !== memberId) throw new RoomActionError('UNKNOWN_MEMBER');
    const desired = { ...state, allowedMemberIds: [...new Set([...state.allowedMemberIds.filter((id) => id !== memberId), ...(allowed ? [memberId] : [])])] };
    await this.changeAccess(actor, state, desired, gateway, () => this.store.setAllowed(state.room.id, actor.controlVersion, memberId, allowed));
  }

  private async changeAccess(actor: RoomActor, state: RoomState, desired: RoomState, gateway: RoomDiscordGateway, commit: () => Promise<boolean>): Promise<void> {
    const channelId = state.room.channelDiscordId;
    const previous = await safeRoomAction(() => gateway.readAccess(channelId), 'DISCORD_FAILURE');
    const current = await currentOwnedRoom(this.store, actor, gateway, state);
    let projected = allowedUnion(current.state, current.snapshot, desired.allowedMemberIds);
    let attemptedCommit = false;
    let committed = false;
    let rejectedCommit = false;
    try {
      await safeRoomAction(() => gateway.setRoomAccess(channelId, desired.room, projected, current.state.memberBlocks), 'DISCORD_FAILURE');
    } catch (error) {
      // A rejected REST response can itself be lost after the write applied.
      this.markUncertain(state.room.id);
      throw error;
    }
    try {
      projected = await this.reconcileProjection(actor, state, desired, projected, gateway);
      this.coordinator.assertContinuous(actor.guildDiscordId, channelId, [actor.memberDiscordId]);
      attemptedCommit = true;
      committed = await safeRoomAction(commit);
      rejectedCommit = !committed;
      if (!committed) throw new RoomActionError('STALE_CONTROLS');
      // SQL may yield too: do not acknowledge a superseded owner or leave a
      // participant's temporary grant behind while its departure is queued.
      const receipts = this.departures(state);
      projected = await this.reconcileProjection(actor, desired, desired, projected, gateway);
      const confirmed = await safeRoomAction(() => this.store.read(state.room.id));
      if (!confirmed || !sameAuthority(desired, confirmed) || !sameAccess(desired, confirmed)) throw new RoomActionError('STALE_CONTROLS');
      this.assertRosterCurrent(state, projected, receipts);
      this.coordinator.assertContinuous(actor.guildDiscordId, channelId, [actor.memberDiscordId]);
    } catch (error) {
      if (attemptedCommit && !committed && !rejectedCommit) {
        // A transport rejection does not settle the server-side writer. Fence
        // its version before read-back or REST; retain the obligation if the
        // barrier itself cannot be confirmed, including across later controls.
        this.markUnsettled(state.room.id, actor.controlVersion);
        try { await this.synchronizeLocked(state, current.snapshot, gateway); }
        catch { throw new RoomActionError('PERSISTENCE_FAILURE'); }
        // Fencing invalidates this attempt's authority, even if it committed.
        throw new RoomActionError('PERSISTENCE_FAILURE');
      }
      let confirmed: RoomState | null;
      try { confirmed = await safeRoomAction(() => this.store.read(state.room.id)); }
      catch { this.markUncertain(state.room.id); throw new RoomActionError('PERSISTENCE_FAILURE'); }
      if (!confirmed || !sameAuthority(state, confirmed)) {
        this.markUncertain(state.room.id);
        throw attemptedCommit && !rejectedCommit ? new RoomActionError('PERSISTENCE_FAILURE') : error;
      }
      if (committed) {
        // A confirmed SQL commit must not be undone after a later read fails.
        this.markUncertain(state.room.id);
        try {
          await currentOwnedRoom(this.store, actor, gateway, desired);
          await this.synchronizeLocked(confirmed, current.snapshot, gateway);
          const receipts = this.departures(state);
          const recovery = await currentOwnedRoom(this.store, actor, gateway, desired);
          const latest = await safeRoomAction(() => this.store.read(state.room.id));
          if (!latest || !sameAuthority(desired, latest) || !sameAccess(desired, latest)) throw new RoomActionError('STALE_CONTROLS');
          this.assertRosterCurrent(state, recovery.snapshot.members.map((member) => member.memberDiscordId), receipts);
          this.coordinator.assertContinuous(actor.guildDiscordId, channelId, [actor.memberDiscordId]);
        } catch (confirmationError) { this.markUncertain(state.room.id); throw confirmationError; }
        throw error;
      }
      if (!sameAccess(state, confirmed)) { this.markUncertain(state.room.id); throw new RoomActionError('PERSISTENCE_FAILURE'); }
      try {
        const receipts = this.departures(state);
        const live = await safeRoomAction(() => gateway.snapshot(channelId), 'DISCORD_FAILURE');
        assertSnapshot(confirmed, live);
        // Saved member grants are not durable authorization: revoke departed
        // occupants/old owners, retaining unrelated bits and current occupants.
        const allowed = allowedUnion(confirmed, live);
        // Refresh authority after the live REST read, before compensation.
        const latest = await safeRoomAction(() => this.store.read(state.room.id));
        if (!latest || !sameAuthority(confirmed, latest) || !sameAccess(confirmed, latest)) {
          this.markUncertain(state.room.id); throw error;
        }
        this.assertRosterCurrent(state, live.members.map((member) => member.memberDiscordId), receipts);
        const restricted = state.room.isLocked || state.room.visibility === 'PRIVATE';
        await gateway.restoreAccess(channelId, projectModerationAccess(safePrevious(previous, allowed, restricted), latest.room, allowed, latest.memberBlocks));
        const restoredReceipts = this.departures(state);
        const restoredLive = await safeRoomAction(() => gateway.snapshot(channelId), 'DISCORD_FAILURE');
        assertSnapshot(latest, restoredLive);
        if (restricted && !sameIds(allowed, allowedUnion(latest, restoredLive))) throw error;
        const restored = await safeRoomAction(() => this.store.read(state.room.id));
        if (!restored || !sameAuthority(latest, restored) || !sameAccess(latest, restored)) {
          this.markUncertain(state.room.id); throw error;
        }
        this.assertRosterCurrent(state, restoredLive.members.map((member) => member.memberDiscordId), restoredReceipts);
      } catch {
        this.markUncertain(state.room.id);
        console.error('Room mutation compensation failed', { roomId: state.room.id, guildDiscordId: state.room.guildDiscordId, channelDiscordId: channelId });
        throw new RoomActionError('PERSISTENCE_FAILURE');
      }
      throw error;
    }
  }

  private departures(state: RoomState) {
    return this.coordinator.pendingDepartures(state.room.guildDiscordId, state.room.channelDiscordId);
  }

  private assertRosterCurrent(state: RoomState, members: string[], before: ReturnType<RoomAccessService['departures']>): void {
    // Existing receipts may describe a return already reflected by this live
    // snapshot. A new receipt across its awaits invalidates that observation.
    if (this.departures(state).some((receipt) => !before.includes(receipt) && members.includes(receipt.memberId))) {
      throw new RoomActionError('STALE_CONTROLS');
    }
  }

  private async reconcileProjection(actor: RoomActor, expected: RoomState, desired: RoomState, projected: string[], gateway: RoomDiscordGateway): Promise<string[]> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const current = await currentOwnedRoom(this.store, actor, gateway, expected);
      const next = allowedUnion(current.state, current.snapshot, desired.allowedMemberIds);
      if (sameIds(next, projected)) return projected;
      if (attempt === 2) throw new RoomActionError('ROOM_UNAVAILABLE');
      await safeRoomAction(() => gateway.setRoomAccess(expected.room.channelDiscordId, desired.room, next, current.state.memberBlocks), 'DISCORD_FAILURE');
      projected = next;
    }
    throw new RoomActionError('ROOM_UNAVAILABLE');
  }

  async synchronizeLocked(state: RoomState, snapshot: RoomSnapshot, gateway: RoomDiscordGateway): Promise<void> {
    assertSnapshot(state, snapshot);
    this.markUncertain(state.room.id);
    if (this.unsettled.has(state.room.id)) {
      const settled = await this.settleLocked(state.room.id);
      if (this.retireConfirmedLocked(state.room.id, settled?.room.status ?? null)) return;
    }
    let projected: { state: RoomState; allowed: string[] } | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      const current = await safeRoomAction(() => this.store.read(state.room.id));
      if (this.retireConfirmedLocked(state.room.id, current?.room.status ?? null)) return;
      if (!current || current.room.status !== 'ACTIVE') return;
      assertSnapshot(current, snapshot);
      const receipts = this.departures(current);
      const live = await safeRoomAction(() => gateway.snapshot(current.room.channelDiscordId), 'DISCORD_FAILURE');
      assertSnapshot(current, live);
      // A state read preceding REST is not confirmation of current authority.
      const confirmed = await safeRoomAction(() => this.store.read(state.room.id));
      if (!confirmed || !sameAuthority(current, confirmed) || !sameAccess(current, confirmed)) continue;
      this.assertRosterCurrent(current, live.members.map((member) => member.memberDiscordId), receipts);
      const next = allowedUnion(confirmed, live);
      if (projected && sameAuthority(projected.state, confirmed) && sameAccess(projected.state, confirmed) && sameIds(next, projected.allowed)) {
        this.uncertain.delete(state.room.id); return;
      }
      if (attempt === 3) break;
      await safeRoomAction(() => gateway.setRoomAccess(current.room.channelDiscordId, confirmed.room, next, confirmed.memberBlocks), 'DISCORD_FAILURE');
      projected = { state: confirmed, allowed: next };
    }
    throw new RoomActionError('ROOM_UNAVAILABLE');
  }
}
