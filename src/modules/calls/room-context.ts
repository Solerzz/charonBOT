import type { RoomStateRepository } from './room-state.repository.js';
import { RoomActionError, type RoomActor, type RoomDiscordGateway, type RoomSnapshot, type RoomState } from './room.types.js';

export async function requireActiveRoom(
  store: Pick<RoomStateRepository, 'read'>, actor: RoomActor, gateway: RoomDiscordGateway,
): Promise<{ state: RoomState; snapshot: RoomSnapshot }> {
  const state = await store.read(actor.roomId);
  if (!state || state.room.id !== actor.roomId || state.room.guildDiscordId !== actor.guildDiscordId || state.room.status !== 'ACTIVE') {
    throw new RoomActionError('ROOM_UNAVAILABLE');
  }
  if (!state.controlsEnabled) throw new RoomActionError('CONTROLS_DISABLED');
  if (state.room.controlVersion !== actor.controlVersion) throw new RoomActionError('STALE_CONTROLS');
  const snapshot = await gateway.snapshot(state.room.channelDiscordId);
  if (!snapshot || snapshot.guildDiscordId !== actor.guildDiscordId || snapshot.channelDiscordId !== state.room.channelDiscordId) {
    throw new RoomActionError('ROOM_UNAVAILABLE');
  }
  if (!snapshot.members.some((member) => member.memberDiscordId === actor.memberDiscordId && !member.isBot)) {
    throw new RoomActionError('NOT_PRESENT');
  }
  return { state, snapshot };
}

export async function requireOwnedRoom(
  store: Pick<RoomStateRepository, 'read'>, actor: RoomActor, gateway: RoomDiscordGateway,
): Promise<{ state: RoomState; snapshot: RoomSnapshot }> {
  const context = await requireActiveRoom(store, actor, gateway);
  if (context.state.room.ownerDiscordId !== actor.memberDiscordId) throw new RoomActionError('NOT_OWNER');
  return context;
}
