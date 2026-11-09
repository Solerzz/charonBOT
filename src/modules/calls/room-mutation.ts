import { requireOwnedRoom } from './room-context.js';
import type { RoomStateRepository } from './room-state.repository.js';
import { RoomActionError, type RoomActor, type RoomDiscordGateway, type RoomState } from './room.types.js';

export async function safeRoomAction<T>(work: () => Promise<T>, code: 'DISCORD_FAILURE' | 'PERSISTENCE_FAILURE' = 'PERSISTENCE_FAILURE'): Promise<T> {
  try { return await work(); } catch (error) {
    throw error instanceof RoomActionError ? error : new RoomActionError(code);
  }
}

export async function currentOwnedRoom(store: RoomStateRepository, actor: RoomActor, gateway: RoomDiscordGateway, expected?: RoomState) {
  const context = await safeRoomAction(() => requireOwnedRoom(store, actor, {
    ...gateway, snapshot: (id) => safeRoomAction(() => gateway.snapshot(id), 'DISCORD_FAILURE'),
  }));
  if (expected) {
    const { room } = context.state;
    if (room.channelDiscordId !== expected.room.channelDiscordId) throw new RoomActionError('ROOM_UNAVAILABLE');
    // Settings do not bump the ownership/control version. Detect setting/list
    // drift as well, rather than committing a projection of a stale state.
    if (room.name !== expected.room.name || room.userLimit !== expected.room.userLimit || room.visibility !== expected.room.visibility
      || [...context.state.allowedMemberIds].sort().join(',') !== [...expected.allowedMemberIds].sort().join(',')) {
      throw new RoomActionError('STALE_CONTROLS');
    }
  }
  return context;
}

export async function commitRoomMutation(
  state: RoomState, apply: () => Promise<void>, commit: () => Promise<void>, restore: () => Promise<void>,
): Promise<void> {
  await safeRoomAction(apply, 'DISCORD_FAILURE');
  try {
    await safeRoomAction(commit);
  } catch (error) {
    try { await restore(); } catch {
      // No exception/payload/name/allowlist logging and no public fallback.
      console.error('Room mutation compensation failed', {
        roomId: state.room.id, guildDiscordId: state.room.guildDiscordId, channelDiscordId: state.room.channelDiscordId,
      });
      throw new RoomActionError('PERSISTENCE_FAILURE');
    }
    throw error;
  }
}
