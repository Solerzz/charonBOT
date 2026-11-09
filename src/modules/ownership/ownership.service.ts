import type { RoomCoordinator } from '../calls/room.coordinator.js';
import { requireActiveRoom } from '../calls/room-context.js';
import type { RoomStateRepository } from '../calls/room-state.repository.js';
import { RoomActionError, type RoomActor, type RoomChanged, type RoomDiscordGateway, type RoomSnapshot, type RoomState } from '../calls/room.types.js';
import type { OwnershipTimers } from './ownership.timers.js';

type OwnershipDependencies = { store: RoomStateRepository; coordinator: RoomCoordinator; timers: OwnershipTimers; onChangedLocked: RoomChanged };
type PriorityGeneration = Pick<RoomState['room'], 'guildDiscordId' | 'channelDiscordId' | 'controlVersion' | 'priorityMemberDiscordId' | 'priorityExpiresAt'>;

const matchesSnapshot = (state: RoomState | null, snapshot: RoomSnapshot): state is RoomState =>
  state !== null && state.room.status !== 'CLOSED'
  && state.room.guildDiscordId === snapshot.guildDiscordId && state.room.channelDiscordId === snapshot.channelDiscordId;
const matchesGeneration = (room: PriorityGeneration, expected: PriorityGeneration) =>
  room.guildDiscordId === expected.guildDiscordId && room.channelDiscordId === expected.channelDiscordId
  && room.controlVersion === expected.controlVersion && room.priorityMemberDiscordId === expected.priorityMemberDiscordId
  && room.priorityExpiresAt?.getTime() === expected.priorityExpiresAt?.getTime();

export class OwnershipService {
  constructor(private readonly dependencies: OwnershipDependencies) {}

  async observeLocked(roomId: string, snapshot: RoomSnapshot, gateway: RoomDiscordGateway, resetJoinedAt = false): Promise<void> {
    await this.observeConfirmedLocked(roomId, snapshot, gateway, resetJoinedAt);
  }

  private async observeConfirmedLocked(
    roomId: string, snapshot: RoomSnapshot, gateway: RoomDiscordGateway, resetJoinedAt: boolean, expected?: PriorityGeneration,
  ): Promise<RoomState | null> {
    const { store } = this.dependencies;
    const initial = await store.read(roomId);
    if (!matchesSnapshot(initial, snapshot) || (expected && !matchesGeneration(initial.room, expected))) return null;
    await store.syncPresence(roomId, snapshot.members, new Date(), resetJoinedAt);
    let state = await store.read(roomId);
    if (!matchesSnapshot(state, snapshot) || state.room.controlVersion !== initial.room.controlVersion) return null;
    const owner = state.room.ownerDiscordId;
    if (owner !== null && !snapshot.members.some((member) => member.memberDiscordId === owner && !member.isBot)) {
      const version = state.room.controlVersion;
      if (!await store.changeOwner(roomId, version, owner, null)) return null;
      state = await store.read(roomId);
      if (!matchesSnapshot(state, snapshot) || state.room.controlVersion !== version + 1) return null;
    }
    if (state.room.ownerDiscordId !== null || state.room.status !== 'ACTIVE') {
      this.dependencies.timers.cancel(`priority:${roomId}`);
      return state;
    }
    // An elapsed deadline is the durable open-claim marker, even if its member left.
    if (state.room.priorityExpiresAt !== null && state.room.priorityExpiresAt <= new Date()) {
      this.schedulePriority(state, gateway);
      return state;
    }
    const presentHumans = new Set(snapshot.members.filter((member) => !member.isBot).map((member) => member.memberDiscordId));
    const ordered = [...state.presences].filter((member) => !member.isBot && presentHumans.has(member.memberDiscordId))
      .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime() || (a.memberDiscordId < b.memberDiscordId ? -1 : a.memberDiscordId > b.memberDiscordId ? 1 : 0));
    let candidate: string | null = null;
    for (const member of ordered) {
      if (!await store.findOwnedRoom(state.room.guildDiscordId, member.memberDiscordId)) {
        candidate = member.memberDiscordId;
        break;
      }
    }
    const expiresAt = candidate === null ? null : candidate === state.room.priorityMemberDiscordId && state.room.priorityExpiresAt !== null
      ? state.room.priorityExpiresAt : new Date(Date.now() + 300_000);
    if (candidate !== state.room.priorityMemberDiscordId || expiresAt?.getTime() !== state.room.priorityExpiresAt?.getTime()) {
      if (!await store.savePriority(roomId, state.room.controlVersion, candidate, expiresAt)) return null;
      state.room.priorityMemberDiscordId = candidate;
      state.room.priorityExpiresAt = expiresAt;
    }
    this.schedulePriority(state, gateway);
    return state;
  }

  async claim(actor: RoomActor, gateway: RoomDiscordGateway): Promise<void> {
    const { store, coordinator, timers, onChangedLocked } = this.dependencies;
    await coordinator.member(actor.guildDiscordId, actor.memberDiscordId, async () => {
      const initial = await store.read(actor.roomId);
      if (!initial || initial.room.guildDiscordId !== actor.guildDiscordId) throw new RoomActionError('ROOM_UNAVAILABLE');
      await coordinator.room(actor.guildDiscordId, initial.room.channelDiscordId, async () => {
        const context = await requireActiveRoom(store, actor, gateway);
        if (context.state.room.channelDiscordId !== initial.room.channelDiscordId) throw new RoomActionError('ROOM_UNAVAILABLE');
        if (await store.findOwnedRoom(actor.guildDiscordId, actor.memberDiscordId)) throw new RoomActionError('ALREADY_OWNS_ROOM');
        // Eligibility checks can await I/O: confirm authorization and live presence again at the mutation boundary.
        const { state, snapshot } = await requireActiveRoom(store, actor, gateway);
        if (state.room.channelDiscordId !== initial.room.channelDiscordId) throw new RoomActionError('ROOM_UNAVAILABLE');
        if (state.room.ownerDiscordId !== null) throw new RoomActionError('ROOM_UNAVAILABLE');
        const current = await this.observeConfirmedLocked(actor.roomId, snapshot, gateway, false, state.room);
        if (!current || current.room.controlVersion !== actor.controlVersion) throw new RoomActionError('STALE_CONTROLS');
        const { priorityMemberDiscordId, priorityExpiresAt } = current.room;
        if (priorityExpiresAt !== null && priorityExpiresAt > new Date() && priorityMemberDiscordId !== actor.memberDiscordId) {
          throw new RoomActionError('PRIORITY_RESERVED');
        }
        if (!await store.changeOwner(actor.roomId, actor.controlVersion, null, actor.memberDiscordId)) throw new RoomActionError('STALE_CONTROLS');
        timers.cancel(`priority:${actor.roomId}`);
        await onChangedLocked(actor.roomId, gateway);
      });
    });
  }

  async refreshPriority(roomId: string, gateway: RoomDiscordGateway): Promise<void> {
    await this.refresh(roomId, gateway);
  }

  private schedulePriority(state: RoomState, gateway: RoomDiscordGateway): void {
    const { room } = state;
    const key = `priority:${room.id}`;
    if (room.priorityExpiresAt === null || room.priorityExpiresAt <= new Date()) {
      this.dependencies.timers.cancel(key);
      return;
    }
    const expected = { ...room };
    this.dependencies.timers.schedule(key, room.priorityExpiresAt, () => this.refresh(room.id, gateway, expected));
  }

  private async refresh(roomId: string, gateway: RoomDiscordGateway, expected?: PriorityGeneration): Promise<void> {
    const { store, coordinator, onChangedLocked } = this.dependencies;
    const initial = await store.read(roomId);
    if (!initial) return;
    await coordinator.room(initial.room.guildDiscordId, initial.room.channelDiscordId, async () => {
      const current = await store.read(roomId);
      if (!current || current.room.status !== 'ACTIVE' || current.room.guildDiscordId !== initial.room.guildDiscordId
        || current.room.channelDiscordId !== initial.room.channelDiscordId) return;
      if (expected && (current.room.ownerDiscordId !== null || !matchesGeneration(current.room, expected))) return;
      const snapshot = await gateway.snapshot(current.room.channelDiscordId);
      if (!snapshot || !matchesSnapshot(current, snapshot)) return;
      // Carry the generation across Discord I/O; a late snapshot must not clear a later owner.
      const updated = await this.observeConfirmedLocked(roomId, snapshot, gateway, false, current.room);
      if (updated?.controlsEnabled && updated.room.status === 'ACTIVE') await onChangedLocked(roomId, gateway);
    });
  }
}
