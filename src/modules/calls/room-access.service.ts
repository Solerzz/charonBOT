import type { RoomVisibility } from '../../generated/prisma/client.js';
import { discordIdSchema } from '../setup/setup.schemas.js';
import { commitRoomMutation, currentOwnedRoom, safeRoomAction } from './room-mutation.js';
import type { RoomStateRepository } from './room-state.repository.js';
import type { RoomCoordinator } from './room.coordinator.js';
import { RoomActionError, type RoomActor, type RoomDiscordGateway, type RoomSnapshot, type RoomState } from './room.types.js';

const allowedUnion = (state: RoomState, snapshot: RoomSnapshot, allowed = state.allowedMemberIds): string[] =>
  [...new Set([...(state.room.ownerDiscordId ? [state.room.ownerDiscordId] : []), ...snapshot.members.map(({ memberDiscordId }) => memberDiscordId), ...allowed])];

function assertSnapshot(state: RoomState, snapshot: RoomSnapshot | null): asserts snapshot is RoomSnapshot {
  if (!snapshot || snapshot.guildDiscordId !== state.room.guildDiscordId || snapshot.channelDiscordId !== state.room.channelDiscordId) {
    throw new RoomActionError('ROOM_UNAVAILABLE');
  }
}

export class RoomAccessService {
  constructor(private readonly store: RoomStateRepository, private readonly coordinator?: RoomCoordinator) {}

  async setVisibilityLocked(actor: RoomActor, state: RoomState, visibility: RoomVisibility, gateway: RoomDiscordGateway): Promise<void> {
    if (visibility !== 'PUBLIC' && visibility !== 'PRIVATE') throw new RangeError('Invalid room visibility');
    const channelId = state.room.channelDiscordId;
    const previous = await safeRoomAction(() => gateway.readAccess(channelId), 'DISCORD_FAILURE');
    // Capture/eligibility awaits precede the final live authority/roster check.
    const current = await currentOwnedRoom(this.store, actor, gateway, state);
    const projected = allowedUnion(current.state, current.snapshot);
    await commitRoomMutation(state,
      () => visibility === 'PRIVATE' ? gateway.setPrivateAccess(channelId, projected) : gateway.setPublicAccess(channelId),
      async () => {
        if (visibility === 'PRIVATE') await this.reconcilePrivate(actor, state, projected, current.state.allowedMemberIds, gateway);
        else await currentOwnedRoom(this.store, actor, gateway, state);
        this.coordinator?.assertContinuous(actor.guildDiscordId, channelId, [actor.memberDiscordId]);
        if (!await this.store.updateSettings(state.room.id, actor.controlVersion, { visibility })) throw new RoomActionError('STALE_CONTROLS');
      },
      () => gateway.restoreAccess(channelId, previous));
  }

  async setAllowedLocked(actor: RoomActor, state: RoomState, memberId: string, allowed: boolean, gateway: RoomDiscordGateway): Promise<void> {
    discordIdSchema.parse(memberId);
    const member = await safeRoomAction(() => gateway.resolveMember(memberId), 'DISCORD_FAILURE');
    if (!member || member.memberDiscordId !== memberId) throw new RoomActionError('UNKNOWN_MEMBER');
    const channelId = state.room.channelDiscordId;
    const previous = state.room.visibility === 'PRIVATE' ? await safeRoomAction(() => gateway.readAccess(channelId), 'DISCORD_FAILURE') : null;
    const current = await currentOwnedRoom(this.store, actor, gateway, state);
    const next = [...new Set([...current.state.allowedMemberIds.filter((id) => id !== memberId), ...(allowed ? [memberId] : [])])];
    const commit = async () => {
      this.coordinator?.assertContinuous(actor.guildDiscordId, channelId, [actor.memberDiscordId]);
      if (!await this.store.setAllowed(state.room.id, actor.controlVersion, memberId, allowed)) throw new RoomActionError('STALE_CONTROLS');
    };
    if (previous === null) return safeRoomAction(commit);
    const projected = allowedUnion(current.state, current.snapshot, next);
    await commitRoomMutation(state,
      () => gateway.setPrivateAccess(channelId, projected),
      async () => { await this.reconcilePrivate(actor, state, projected, next, gateway); await commit(); },
      () => gateway.restoreAccess(channelId, previous));
  }

  private async reconcilePrivate(actor: RoomActor, state: RoomState, projected: string[], allowed: string[], gateway: RoomDiscordGateway): Promise<void> {
    // A REST write can yield while participants change. Reproject a changed
    // union before CAS, with a bounded retry so sustained churn fails closed.
    for (let attempt = 0; attempt < 3; attempt++) {
      const current = await currentOwnedRoom(this.store, actor, gateway, state);
      const next = allowedUnion(current.state, current.snapshot, allowed);
      if ([...next].sort().join(',') === [...projected].sort().join(',')) return;
      if (attempt === 2) throw new RoomActionError('ROOM_UNAVAILABLE');
      await safeRoomAction(() => gateway.setPrivateAccess(state.room.channelDiscordId, next), 'DISCORD_FAILURE');
      projected = next;
    }
  }

  async synchronizeLocked(state: RoomState, snapshot: RoomSnapshot, gateway: RoomDiscordGateway): Promise<void> {
    assertSnapshot(state, snapshot);
    // Background projection is independent of interactive controls. Refresh both
    // inputs: queued voice changes and owner/allowlist changes may precede us.
    let projected: string[] | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      const current = await safeRoomAction(() => this.store.read(state.room.id));
      if (!current || current.room.status !== 'ACTIVE') return;
      assertSnapshot(current, snapshot);
      if (current.room.visibility !== 'PRIVATE') return;
      const live = await safeRoomAction(() => gateway.snapshot(current.room.channelDiscordId), 'DISCORD_FAILURE');
      assertSnapshot(current, live);
      const next = allowedUnion(current, live);
      if (projected && [...next].sort().join(',') === [...projected].sort().join(',')) return;
      if (attempt === 3) throw new RoomActionError('ROOM_UNAVAILABLE');
      await safeRoomAction(() => gateway.setPrivateAccess(current.room.channelDiscordId, next), 'DISCORD_FAILURE');
      projected = next;
    }
  }
}
