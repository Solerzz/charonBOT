import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { deferred } from '../calls/call.fixtures.js';
import { human, OLDEST, OTHER, OWNER, ownershipFixture, ROOM_ID } from './ownership.fixtures.js';

describe('OwnershipService', () => {
  const fixtures: ReturnType<typeof ownershipFixture>[] = [];
  const fixture = () => { const f = ownershipFixture(); fixtures.push(f); return f; };
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(0)); });
  afterEach(async () => { for (const f of fixtures.splice(0)) { await f.timers.stop(); expect(f.timerErrors).not.toHaveBeenCalled(); } vi.useRealTimers(); });

  it('reserves five minutes for the oldest human, then admits another human at exactly 300,000ms', async () => {
    const f = fixture();
    f.live.snapshot!.members.reverse();
    await f.observe();
    expect(f.state().room.priorityMemberDiscordId).toBe(OLDEST);
    expect(f.state().room.priorityExpiresAt).toEqual(new Date(300_000));
    expect(f.refreshes).toEqual([]);
    await vi.advanceTimersByTimeAsync(299_999);
    await expect(f.service.claim(f.actor(), f.gateway)).rejects.toMatchObject({ code: 'PRIORITY_RESERVED' });
    await vi.advanceTimersByTimeAsync(1);
    expect(f.refreshes).toHaveLength(1);
    expect(f.refreshes[0]!.room.priorityExpiresAt).toEqual(new Date(300_000));
    await f.service.claim(f.actor(), f.gateway);
    expect((await f.store.read(ROOM_ID))!.room).toMatchObject({ ownerDiscordId: OTHER, controlVersion: 1, priorityMemberDiscordId: null, priorityExpiresAt: null });
    expect(f.refreshes).toHaveLength(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('lets the priority candidate claim immediately', async () => {
    const f = fixture(); await f.observe();
    await f.service.claim(f.actor(OLDEST), f.gateway);
    expect(f.state().room.ownerDiscordId).toBe(OLDEST);
    expect(f.refreshes).toHaveLength(1);
  });

  it('orders by continuous joinedAt, not snapshot order, and preserves joins/deadlines on mute-only observations', async () => {
    const f = fixture();
    f.state().room.ownerDiscordId = OWNER;
    f.live.snapshot!.members = [human(OWNER), human(OTHER)]; await f.observe();
    await vi.advanceTimersByTimeAsync(10_000);
    f.live.snapshot!.members = [human(OLDEST), human(OTHER), human(OWNER)]; await f.observe();
    await vi.advanceTimersByTimeAsync(10_000);
    f.live.snapshot!.members = [human(OLDEST), human(OTHER)]; await f.observe();
    expect(f.state().room).toMatchObject({ ownerDiscordId: null, controlVersion: 1, priorityMemberDiscordId: OTHER, priorityExpiresAt: new Date(320_000) });
    await vi.advanceTimersByTimeAsync(30_000); await f.observe(); await f.observe();
    expect(f.state().presences).toEqual(expect.arrayContaining([expect.objectContaining({ roomId: ROOM_ID, ...human(OTHER), joinedAt: new Date(0) }), expect.objectContaining({ roomId: ROOM_ID, ...human(OLDEST), joinedAt: new Date(10_000) })]));
    expect(f.state().room.priorityExpiresAt).toEqual(new Date(320_000));
  });

  it('gives the next eligible member a new window on departure at 100,000ms; rejoining starts new presence', async () => {
    const f = fixture(); await f.observe(); await vi.advanceTimersByTimeAsync(100_000);
    f.live.snapshot!.members = [human(OTHER)]; await f.observe();
    expect(f.state().room).toMatchObject({ priorityMemberDiscordId: OTHER, priorityExpiresAt: new Date(400_000) });
    f.live.snapshot!.members.push(human(OLDEST)); await f.observe();
    expect(f.state().presences.find((p) => p.memberDiscordId === OLDEST)!.joinedAt).toEqual(new Date(100_000));
    await vi.advanceTimersByTimeAsync(200_000); expect(f.refreshes).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(100_000); expect(f.refreshes).toHaveLength(1);
  });

  it('keeps an elapsed open-claim marker even after everyone leaves and a new participant joins', async () => {
    const f = fixture(); await f.observe(); await vi.advanceTimersByTimeAsync(300_000);
    await vi.advanceTimersByTimeAsync(1);
    f.live.snapshot!.members = []; await f.observe();
    f.live.snapshot!.members = [human(OTHER)]; await f.observe();
    expect(f.state().room).toMatchObject({ priorityMemberDiscordId: OLDEST, priorityExpiresAt: new Date(300_000) });
    await f.service.claim(f.actor(), f.gateway); expect(f.state().room.ownerDiscordId).toBe(OTHER);
  });

  it('treats the original owner returning as a new participant and invalidates the departed owner transfer', async () => {
    const f = fixture();
    f.state().room.ownerDiscordId = OWNER;
    f.state().transfer = { id: 'transfer', roomId: ROOM_ID, ownerDiscordId: OWNER, targetDiscordId: OTHER, controlVersion: 0, expiresAt: null };
    await f.observe();
    expect(f.state()).toMatchObject({ room: { ownerDiscordId: null, controlVersion: 1, priorityMemberDiscordId: OLDEST }, transfer: null });
    await vi.advanceTimersByTimeAsync(100_000); f.live.snapshot!.members.push(human(OWNER)); await f.observe();
    await expect(f.service.claim(f.actor(OWNER), f.gateway)).rejects.toMatchObject({ code: 'PRIORITY_RESERVED' });
    expect(f.state().presences.find((p) => p.memberDiscordId === OWNER)!.joinedAt).toEqual(new Date(100_000));
  });

  it.each(['CREATING', 'ACTIVE', 'CLOSING'] as const)('skips a human owning another %s room in the guild', async (status) => {
    const f = fixture(); f.ownElsewhere(OLDEST, status); await f.observe();
    expect(f.state().room.priorityMemberDiscordId).toBe(OTHER);
    await expect(f.service.claim(f.actor(OLDEST), f.gateway)).rejects.toMatchObject({ code: 'ALREADY_OWNS_ROOM' });
  });

  it('allows closed history and ownership in another guild', async () => {
    const f = fixture(); f.ownElsewhere(OLDEST, 'CLOSED'); f.ownElsewhere(OTHER, 'ACTIVE', 'another-guild');
    await f.observe(); await f.service.claim(f.actor(OLDEST), f.gateway);
    expect(f.state().room.ownerDiscordId).toBe(OLDEST);
  });

  it('does not select bots or ineligible humans and starts no timer without a candidate', async () => {
    const f = fixture(); f.ownElsewhere(OLDEST); f.live.snapshot!.members = [human(OLDEST), { memberDiscordId: OTHER, isBot: true }];
    await f.observe();
    expect(f.state().room).toMatchObject({ priorityMemberDiscordId: null, priorityExpiresAt: null });
    expect(vi.getTimerCount()).toBe(0);
    await expect(f.service.claim(f.actor(), f.gateway)).rejects.toMatchObject({ code: 'NOT_PRESENT' });
  });

  it.each(['absent', 'bot', 'wrong-guild', 'wrong-channel', 'unknown-channel'] as const)('rejects %s live claimants without changing possession', async (kind) => {
    const f = fixture();
    if (kind === 'absent') f.live.snapshot!.members = [human(OLDEST)];
    if (kind === 'bot') f.live.snapshot!.members = [{ memberDiscordId: OTHER, isBot: true }];
    if (kind === 'wrong-guild') f.live.snapshot!.guildDiscordId = 'wrong';
    if (kind === 'wrong-channel') f.live.snapshot!.channelDiscordId = 'wrong';
    if (kind === 'unknown-channel') f.live.snapshot = null;
    await expect(f.service.claim(f.actor(), f.gateway)).rejects.toMatchObject({ code: kind === 'absent' || kind === 'bot' ? 'NOT_PRESENT' : 'ROOM_UNAVAILABLE' });
    expect(f.state().room.ownerDiscordId).toBeNull(); expect(f.refreshes).toEqual([]);
  });

  it.each(['CREATING', 'CLOSING', 'CLOSED'] as const)('rejects claims in %s rooms', async (status) => {
    const f = fixture(); f.state().room.status = status;
    await expect(f.service.claim(f.actor(), f.gateway)).rejects.toMatchObject({ code: 'ROOM_UNAVAILABLE' });
    expect(f.state().room.ownerDiscordId).toBeNull();
  });

  it('keeps background priority advancing with controls off; reenabling does not restart exclusivity', async () => {
    const f = fixture(); f.state().controlsEnabled = false; await f.observe();
    expect(f.state().room.priorityExpiresAt).toEqual(new Date(300_000));
    await expect(f.service.claim(f.actor(OLDEST), f.gateway)).rejects.toMatchObject({ code: 'CONTROLS_DISABLED' });
    f.live.snapshot!.members = [human(OTHER)];
    await vi.advanceTimersByTimeAsync(300_000);
    expect(f.state().room.priorityExpiresAt).toEqual(new Date(300_000));
    expect(f.state().presences.map((p) => p.memberDiscordId)).toEqual([OTHER]);
    f.state().controlsEnabled = true; await f.observe();
    await f.service.claim(f.actor(), f.gateway); expect(f.state().room.ownerDiscordId).toBe(OTHER);
  });

  it('clears a departed owner with controls off using the new CAS version for priority', async () => {
    const f = fixture(); f.state().room.ownerDiscordId = OWNER; f.state().controlsEnabled = false; await f.observe();
    expect(f.state().room).toMatchObject({ controlVersion: 1, ownerDiscordId: null, priorityMemberDiscordId: OLDEST, priorityExpiresAt: new Date(300_000) });
  });

  it('preserves confirmed presence and priority when a refresh has no confirmed matching snapshot', async () => {
    const f = fixture(); await f.observe(); const before = structuredClone(f.state());
    f.live.snapshot = null; await f.service.refreshPriority(ROOM_ID, f.gateway); expect(f.state()).toEqual(before);
    f.live.snapshot = { guildDiscordId: 'wrong', channelDiscordId: before.room.channelDiscordId, name: 'Room', userLimit: 0, members: [] };
    await f.observe(); expect(f.state()).toEqual(before);
    await vi.advanceTimersByTimeAsync(300_000); expect(f.state()).toEqual(before); expect(f.refreshes).toEqual([]);
  });

  it('resets joinedAt only when restart explicitly requests it, preserving the existing priority deadline', async () => {
    const f = fixture(); await f.observe(); await vi.advanceTimersByTimeAsync(100_000); await f.observe(true);
    expect(f.state().presences.every((p) => p.joinedAt.getTime() === 100_000)).toBe(true);
    expect(f.state().room.priorityExpiresAt).toEqual(new Date(300_000));
  });

  it('serializes concurrent open claims to one winner using member then room locks', async () => {
    const f = fixture(); await f.observe(); await vi.advanceTimersByTimeAsync(300_000); f.locks.length = 0;
    const attempts = await Promise.allSettled([f.service.claim(f.actor(OLDEST), f.gateway), f.service.claim(f.actor(), f.gateway)]);
    expect(attempts.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect([OLDEST, OTHER]).toContain(f.state().room.ownerDiscordId); expect(f.state().room.controlVersion).toBe(1);
    expect(f.locks.slice(0, 2)).toEqual([`${f.state().room.guildDiscordId}:${OLDEST}`, `${f.state().room.guildDiscordId}:${OTHER}`]);
    expect(f.locks.slice(2)).toEqual([`room:${f.state().room.guildDiscordId}:${f.state().room.channelDiscordId}`, `room:${f.state().room.guildDiscordId}:${f.state().room.channelDiscordId}`]);
    expect(f.refreshes).toHaveLength(2);
  });

  it('observes under an existing room lock without acquiring or reentering any lock', async () => {
    const f = fixture(); await f.observe();
    expect(f.locks).toEqual([`room:${f.state().room.guildDiscordId}:${f.state().room.channelDiscordId}`]);
  });

  it('leaves a CAS winner and its new transfer untouched when clearing an absent owner loses', async () => {
    const f = fixture(); f.state().room.ownerDiscordId = OWNER;
    f.hooks.beforeOwnerChange = async () => {
      f.state().room.ownerDiscordId = OTHER; f.state().room.controlVersion = 1;
      f.state().transfer = { id: 'winner-transfer', roomId: ROOM_ID, ownerDiscordId: OTHER, targetDiscordId: OLDEST, controlVersion: 1, expiresAt: null };
    };
    await f.observe();
    expect(f.state().room).toMatchObject({ ownerDiscordId: OTHER, controlVersion: 1, priorityMemberDiscordId: null });
    expect(f.state().transfer?.id).toBe('winner-transfer');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not schedule a deadline when the priority CAS loses to ownership acquisition', async () => {
    const f = fixture();
    f.hooks.beforePrioritySave = async () => { f.state().room.ownerDiscordId = OTHER; f.state().room.controlVersion = 1; };
    await f.observe();
    expect(f.state().room).toMatchObject({ ownerDiscordId: OTHER, priorityMemberDiscordId: null }); expect(vi.getTimerCount()).toBe(0);
  });

  it('reports a lost claim CAS without refreshing or overwriting the winner', async () => {
    const f = fixture(); await f.observe();
    f.hooks.beforeOwnerChange = async () => { f.state().room.ownerDiscordId = OTHER; f.state().room.controlVersion = 1; };
    await expect(f.service.claim(f.actor(OLDEST), f.gateway)).rejects.toMatchObject({ code: 'STALE_CONTROLS' });
    expect(f.state().room.ownerDiscordId).toBe(OTHER); expect(f.refreshes).toEqual([]);
  });

  it('revalidates live presence immediately before claim mutation', async () => {
    const f = fixture(); await f.observe();
    f.store.findOwnedRoom.mockImplementationOnce(async () => { f.live.snapshot!.members = [human(OTHER)]; return null; });
    await expect(f.service.claim(f.actor(OLDEST), f.gateway)).rejects.toMatchObject({ code: 'NOT_PRESENT' });
    expect(f.state().room.ownerDiscordId).toBeNull();
  });

  it('a queued expired callback cannot refresh or mutate a later version of the room', async () => {
    const f = fixture(); await f.observe(); const gate = deferred(); const started = deferred();
    const held = f.coordinator.room(f.state().room.guildDiscordId, f.state().room.channelDiscordId, async () => { started.resolve(); await gate.promise; });
    await started.promise; await vi.advanceTimersByTimeAsync(300_000);
    f.state().room.controlVersion = 1; f.state().room.priorityMemberDiscordId = OTHER; f.state().room.priorityExpiresAt = new Date(600_000);
    gate.resolve(); await held; await f.timers.stop();
    expect(f.state().room.priorityExpiresAt).toEqual(new Date(600_000)); expect(f.refreshes).toEqual([]);
  });

  it('a timer snapshot in flight cannot clear a later owner or its transfer', async () => {
    const f = fixture(); await f.observe();
    f.hooks.beforeSnapshot = async () => {
      f.state().room.ownerDiscordId = OWNER; f.state().room.controlVersion = 1;
      f.state().transfer = { id: 'new-transfer', roomId: ROOM_ID, ownerDiscordId: OWNER, targetDiscordId: OTHER, controlVersion: 1, expiresAt: null };
    };
    await vi.advanceTimersByTimeAsync(300_000);
    expect(f.state()).toMatchObject({ room: { ownerDiscordId: OWNER, controlVersion: 1 }, transfer: { id: 'new-transfer' } });
    expect(f.refreshes).toEqual([]);
  });

  it.each([1, 2])('claim snapshot %s in flight cannot clear a later owner', async (snapshotNumber) => {
    const f = fixture();
    let calls = 0;
    f.hooks.beforeSnapshot = async () => { if (++calls === snapshotNumber) { f.state().room.ownerDiscordId = OWNER; f.state().room.controlVersion = 1; } };
    const actor = f.actor(OLDEST);
    await expect(f.service.claim(actor, f.gateway)).rejects.toMatchObject({ code: 'STALE_CONTROLS' });
    expect(f.state().room).toMatchObject({ ownerDiscordId: OWNER, controlVersion: 1 });
    expect(f.refreshes).toEqual([]);
  });

  it('serializes the same claimant across two rooms and leaves the losing room ownerless', async () => {
    const f = fixture(); f.ownElsewhere(OLDEST); const second = f.states.get(`other-${OLDEST}`)!; second.room.ownerDiscordId = null;
    f.gateway.snapshot.mockImplementation(async (channel) => ({ guildDiscordId: f.state().room.guildDiscordId, channelDiscordId: channel, name: 'Room', userLimit: 0, members: [human(OLDEST)] }));
    const attempts = await Promise.allSettled([
      f.service.claim(f.actor(OLDEST), f.gateway),
      f.service.claim({ ...f.actor(OLDEST), roomId: second.room.id }, f.gateway),
    ]);
    expect(attempts.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(attempts.filter((r) => r.status === 'rejected')).toEqual([expect.objectContaining({ reason: expect.objectContaining({ code: 'ALREADY_OWNS_ROOM' }) })]);
    expect([...f.states.values()].filter((s) => s.room.ownerDiscordId === OLDEST)).toHaveLength(1);
    expect(f.refreshes).toHaveLength(1);
  });

  it('ignores a queued deadline replaced without a version change', async () => {
    const f = fixture(); await f.observe(); const gate = deferred(); const started = deferred();
    const held = f.coordinator.room(f.state().room.guildDiscordId, f.state().room.channelDiscordId, async () => { started.resolve(); await gate.promise; });
    await started.promise; await vi.advanceTimersByTimeAsync(300_000);
    f.state().room.priorityMemberDiscordId = OTHER; f.state().room.priorityExpiresAt = new Date(600_000);
    gate.resolve(); await held; await f.timers.stop();
    expect(f.state().room.priorityExpiresAt).toEqual(new Date(600_000)); expect(f.refreshes).toEqual([]);
  });

  it('clears an unexpired priority when no human remains and grants a fresh window on rejoin', async () => {
    const f = fixture(); await f.observe(); await vi.advanceTimersByTimeAsync(100_000);
    f.live.snapshot!.members = []; await f.observe();
    expect(f.state().room).toMatchObject({ priorityMemberDiscordId: null, priorityExpiresAt: null }); expect(vi.getTimerCount()).toBe(0);
    f.live.snapshot!.members = [human(OTHER)]; await f.observe();
    expect(f.state().room).toMatchObject({ priorityMemberDiscordId: OTHER, priorityExpiresAt: new Date(400_000) });
  });

  it('reselects an exclusive candidate who becomes a second-room owner', async () => {
    const f = fixture(); await f.observe(); await vi.advanceTimersByTimeAsync(100_000);
    f.ownElsewhere(OLDEST); await f.observe();
    expect(f.state().room).toMatchObject({ priorityMemberDiscordId: OTHER, priorityExpiresAt: new Date(400_000) });
  });

  it('rejects an obsolete actor version without granting ownership', async () => {
    const f = fixture(); const actor = f.actor(OLDEST); f.state().room.controlVersion = 1;
    await expect(f.service.claim(actor, f.gateway)).rejects.toMatchObject({ code: 'STALE_CONTROLS' });
    expect(f.state().room.ownerDiscordId).toBeNull();
  });

  it('keeps interactive acquisition guarded if controls turn off at the ownership CAS', async () => {
    const f = fixture(); await f.observe(); f.hooks.beforeOwnerChange = async () => { f.state().controlsEnabled = false; };
    await expect(f.service.claim(f.actor(OLDEST), f.gateway)).rejects.toMatchObject({ code: 'STALE_CONTROLS' });
    expect(f.state().room.ownerDiscordId).toBeNull(); expect(f.refreshes).toEqual([]);
  });
});
