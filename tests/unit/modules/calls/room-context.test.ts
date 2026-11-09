import { describe, expect, it, vi } from 'vitest';

import { requireActiveRoom, requireOwnedRoom } from '../../../../src/modules/calls/room-context.js';
import type { RoomActor, RoomState } from '../../../../src/modules/calls/room.types.js';
import { lifecycleFixture, room } from './call.fixtures.js';

function fixture() {
  const actor: RoomActor = { roomId: room.id, guildDiscordId: room.guildDiscordId, memberDiscordId: room.ownerDiscordId!, controlVersion: 0 };
  const state: RoomState = { room: { ...room }, controlsEnabled: true, presences: [], allowedMemberIds: [], transfer: null };
  const snapshot = { guildDiscordId: room.guildDiscordId, channelDiscordId: room.channelDiscordId, name: 'Game', userLimit: 0, members: [{ memberDiscordId: actor.memberDiscordId, isBot: false }] };
  const store = { read: vi.fn(async (_id: string) => state as RoomState | null) };
  const gateway = { ...lifecycleFixture().gateway, snapshot: vi.fn(async (_id: string) => snapshot) };
  return { actor, state, snapshot, store, gateway };
}

describe('room guards', () => {
  it('returns the current persisted state and live roster, not stored presences', async () => {
    const f = fixture();
    expect(await requireOwnedRoom(f.store, f.actor, f.gateway)).toEqual({ state: f.state, snapshot: f.snapshot });
    expect(f.gateway.snapshot).toHaveBeenCalledExactlyOnceWith(room.channelDiscordId);
  });
  it.each(['missing', 'foreign guild', 'wrong room', 'closed', 'creating', 'closing', 'wrong snapshot guild', 'wrong snapshot channel'] as const)('rejects unavailable context: %s', async (kind) => {
    const f = fixture();
    if (kind === 'missing') f.store.read.mockResolvedValueOnce(null);
    if (kind === 'foreign guild') f.actor.guildDiscordId = '82345678901234567';
    if (kind === 'wrong room') f.state.room.id = 'another-room';
    if (kind === 'closed') f.state.room.status = 'CLOSED';
    if (kind === 'creating') f.state.room.status = 'CREATING';
    if (kind === 'closing') f.state.room.status = 'CLOSING';
    if (kind === 'wrong snapshot guild') f.snapshot.guildDiscordId = '82345678901234567';
    if (kind === 'wrong snapshot channel') f.snapshot.channelDiscordId = '82345678901234567';
    await expect(requireActiveRoom(f.store, f.actor, f.gateway)).rejects.toMatchObject({ code: 'ROOM_UNAVAILABLE' });
  });
  it.each(['disabled', 'version', 'departed', 'bot', 'owner'] as const)('rejects unauthorized action: %s', async (kind) => {
    const f = fixture();
    if (kind === 'disabled') f.state.controlsEnabled = false;
    if (kind === 'version') f.actor.controlVersion = 1;
    if (kind === 'departed') f.snapshot.members = [];
    if (kind === 'bot') f.snapshot.members[0]!.isBot = true;
    if (kind === 'owner') f.state.room.ownerDiscordId = null;
    const code = { disabled: 'CONTROLS_DISABLED', version: 'STALE_CONTROLS', departed: 'NOT_PRESENT', bot: 'NOT_PRESENT', owner: 'NOT_OWNER' }[kind];
    await expect(requireOwnedRoom(f.store, f.actor, f.gateway)).rejects.toMatchObject({ code });
  });
  it('permits an active nonowner for claim context but not owner context', async () => {
    const f = fixture(); f.state.room.ownerDiscordId = null;
    await expect(requireActiveRoom(f.store, f.actor, f.gateway)).resolves.toMatchObject({ state: f.state });
  });
  it('rejects a missing live channel even when the database room is active', async () => {
    const f = fixture(); f.gateway.snapshot.mockResolvedValueOnce(null as never);
    await expect(requireActiveRoom(f.store, f.actor, f.gateway)).rejects.toMatchObject({ code: 'ROOM_UNAVAILABLE' });
  });
});
