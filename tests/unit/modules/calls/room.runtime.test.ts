import { type Guild } from 'discord.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPrismaClient } from '../../../../src/core/database/prisma.js';
import { createLogger } from '../../../../src/core/logger/logger.js';
import { createRoomRuntime } from '../../../../src/modules/calls/room.runtime.js';
import { PrismaVoiceCreatorRepository } from '../../../../src/modules/setup/setup.repository.js';
import { OTHER, OLDEST, OWNER } from '../ownership/ownership.fixtures.js';
import { creator, deferred } from './call.fixtures.js';
import { roomSettingsFixture } from './room-settings.fixtures.js';

function runtimeFixture() {
  const f = roomSettingsFixture();
  const database = createPrismaClient({ url: 'postgresql://test:test@127.0.0.1:1/test', directUrl: 'postgresql://test:test@127.0.0.1:1/test' });
  const runtime = createRoomRuntime(database, createLogger({ level: 'silent' }));
  vi.spyOn(database, '$transaction').mockImplementation((async (work: (tx: typeof database) => Promise<unknown>) => work(database)) as never);
  for (const name of ['read', 'readTransfer', 'findOwnedRoom', 'syncPresence', 'savePriority', 'changeOwner', 'createTransfer', 'armTransfer', 'cancelTransfer', 'discardTransfer', 'invalidateTransfers', 'finishTransfer', 'setAllowed', 'updateSettings'] as const) {
    vi.spyOn(runtime.store, name).mockImplementation(f.store[name] as never);
  }
  vi.spyOn(runtime.store, 'listTracked').mockImplementation(async () => [...f.roomStates.values()].map((s) => structuredClone(s.room)));
  vi.spyOn(runtime.store, 'listForCreator').mockImplementation(async () => [structuredClone(f.state().room)]);
  vi.spyOn(runtime.store, 'cancelPreviousRunTransfers').mockImplementation(async () => { for (const s of f.roomStates.values()) s.transfer = null; });
  vi.spyOn(runtime.store, 'invalidateControls').mockImplementation(async (id, version) => {
    const state = f.roomStates.get(id); if (!state || state.room.controlVersion !== version) return false;
    state.room.controlVersion++; state.transfer = null; return true;
  });
  vi.spyOn(runtime.store, 'setPanelId').mockImplementation(async (id, version, previous, next) => {
    const s = f.roomStates.get(id); if (!s || s.room.controlVersion !== version || s.room.controlMessageDiscordId !== previous) return false;
    s.room.controlMessageDiscordId = next; return true;
  });
  vi.spyOn(database.temporaryRoom, 'updateMany').mockImplementation(({ data }) => {
    Object.assign(f.state().room, data, { controlVersion: f.state().room.controlVersion + 1 });
    return Promise.resolve({ count: 1 }) as ReturnType<typeof database.temporaryRoom.updateMany>;
  });
  vi.spyOn(database.temporaryRoom, 'findUniqueOrThrow').mockImplementation(() => Promise.resolve(structuredClone(f.state().room)) as ReturnType<typeof database.temporaryRoom.findUniqueOrThrow>);
  vi.spyOn(database.pendingOwnershipTransfer, 'deleteMany').mockImplementation(() => {
    f.state().transfer = null;
    return Promise.resolve({ count: 1 }) as ReturnType<typeof database.pendingOwnershipTransfer.deleteMany>;
  });
  vi.spyOn(database.voiceCreator, 'update').mockImplementation(({ data }) => {
    f.state().controlsEnabled = data.roomCommandsEnabled as boolean;
    return Promise.resolve({ ...creator, roomCommandsEnabled: f.state().controlsEnabled }) as ReturnType<typeof database.voiceCreator.update>;
  });
  const creators = new PrismaVoiceCreatorRepository(database);
  const guild = f.guild as unknown as Guild;
  const observe = () => runtime.coordinator.room(guild.id, f.state().room.channelDiscordId, () => runtime.observeLocked(f.state().room.id, f.gateway));
  const toggle = async (enabled: boolean) => {
    await creators.setRoomCommandsEnabled(creator.id, enabled);
    return runtime.synchronizeCreator(creator.id);
  };
  return { ...f, database, runtime, observe, toggle, resolveGuild: async () => guild };
}

afterEach(() => { vi.useRealTimers(); });

describe('application-owned room runtime', () => {
  it('cancels prior-run transfers and invalidates old menus without transferring; resets uncertain chronology', async () => {
    vi.useFakeTimers(); vi.setSystemTime(10_000);
    const f = runtimeFixture(); f.join(OTHER);
    await f.runtime.transfers.begin(f.actor(), OTHER, f.gateway);
    f.state().presences = [{ id: 'old', roomId: f.state().room.id, memberDiscordId: OTHER, isBot: false, joinedAt: new Date(0) }];
    await f.runtime.start(f.resolveGuild);
    expect(f.state().transfer).toBeNull();
    expect(f.state().room).toMatchObject({ ownerDiscordId: OWNER, controlVersion: 1 });
    expect(f.state().presences.map((p) => p.joinedAt.getTime())).toEqual([10_000, 10_000]);
    await f.runtime.stop(); await f.database.$disconnect();
  });

  it.each(['expired', 'future', 'ineligible'] as const)('reconciles %s priority without inventing offline chronology', async (kind) => {
    vi.useFakeTimers(); vi.setSystemTime(10_000);
    const f = runtimeFixture(); f.leave(OWNER); f.join(OTHER); f.join(OLDEST);
    Object.assign(f.state().room, { ownerDiscordId: null, priorityMemberDiscordId: OTHER, priorityExpiresAt: new Date(kind === 'expired' ? 9_000 : 20_000) });
    if (kind === 'ineligible') f.ownElsewhere(OTHER);
    await f.runtime.start(f.resolveGuild);
    expect(f.state().room.priorityMemberDiscordId).toBe(kind === 'ineligible' ? OLDEST : OTHER);
    expect(f.state().room.priorityExpiresAt?.getTime()).toBe(kind === 'expired' ? 9_000 : kind === 'future' ? 20_000 : 310_000);
    await f.observe();
    expect(f.state().room.priorityMemberDiscordId).toBe(kind === 'ineligible' ? OLDEST : OTHER);
    expect(f.state().room.priorityExpiresAt?.getTime()).toBe(kind === 'expired' ? 9_000 : kind === 'future' ? 20_000 : 310_000);
    await f.runtime.stop(); await f.database.$disconnect();
  });

  it('continues private projection on a priority timer with controls disabled', async () => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = runtimeFixture(); f.leave(OWNER); f.join(OTHER);
    f.state().controlsEnabled = false; f.state().room.visibility = 'PRIVATE'; await f.observe();
    f.join(OLDEST);
    await vi.advanceTimersByTimeAsync(300_000);
    expect(f.state().presences.map((p) => p.memberDiscordId).sort()).toEqual([OLDEST, OTHER]);
    expect(f.projected().some((o) => o.id === OLDEST)).toBe(true);
    await f.runtime.stop(); await f.database.$disconnect();
  });

  it.each([true, false])('rebinds priority after actual setup %s -> opposite without restarting its deadline', async (enabled) => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = runtimeFixture(); f.leave(OWNER); f.join(OTHER);
    f.state().controlsEnabled = enabled; f.state().room.visibility = 'PRIVATE';
    await f.runtime.start(f.resolveGuild);
    const version = f.state().room.controlVersion;
    await vi.advanceTimersByTimeAsync(1_234);
    await expect(f.toggle(!enabled)).resolves.toEqual({ synced: 1, failed: 0 });
    expect(f.state().room).toMatchObject({ controlVersion: version + 1, priorityMemberDiscordId: OTHER, priorityExpiresAt: new Date(300_000) });
    f.join(OLDEST); // No voice event: expiry itself must reconcile and project.
    await vi.advanceTimersByTimeAsync(298_765);
    expect(f.state().presences.map((p) => p.memberDiscordId)).toEqual([OTHER]);
    await vi.advanceTimersByTimeAsync(1);
    expect(f.state().presences.map((p) => p.memberDiscordId).sort()).toEqual([OLDEST, OTHER]);
    expect(f.projected().some((o) => o.id === OLDEST)).toBe(true);
    expect(f.state().room.priorityExpiresAt).toEqual(new Date(300_000));
    await f.runtime.stop(); await f.database.$disconnect();
  });

  it.each([true, false])('observes expiry once when setup %s -> opposite resolves its guild after the deadline', async (enabled) => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = runtimeFixture(); f.leave(OWNER); f.join(OTHER);
    f.state().controlsEnabled = enabled; f.state().room.visibility = 'PRIVATE';
    const resolveGuild = vi.fn(f.resolveGuild);
    await f.runtime.start(resolveGuild);
    const version = f.state().room.controlVersion;
    await vi.advanceTimersByTimeAsync(299_999);
    const entered = deferred(); const release = deferred();
    resolveGuild.mockImplementationOnce(async () => { entered.resolve(); await release.promise; return f.resolveGuild(); });
    const toggling = f.toggle(!enabled);
    await entered.promise;
    const observations = vi.mocked(f.runtime.store.syncPresence).mock.calls.length;
    const projections = f.channel.permissionOverwrites.set.mock.calls.length;
    f.join(OLDEST);
    await vi.advanceTimersByTimeAsync(2); // Old expiry is now queued behind setup's room lock.
    expect(f.state().presences.map((p) => p.memberDiscordId)).toEqual([OTHER]);
    release.resolve();
    await expect(toggling).resolves.toEqual({ synced: 1, failed: 0 });
    await vi.advanceTimersByTimeAsync(1);
    expect(f.state().presences.map((p) => p.memberDiscordId).sort()).toEqual([OLDEST, OTHER]);
    expect(f.projected().some((o) => o.id === OLDEST)).toBe(true);
    expect(f.state().room).toMatchObject({ controlVersion: version + 1, priorityMemberDiscordId: OTHER, priorityExpiresAt: new Date(300_000) });
    expect(vi.mocked(f.runtime.store.syncPresence).mock.calls.length - observations).toBe(1);
    expect(f.channel.permissionOverwrites.set.mock.calls.length - projections).toBe(1);
    await vi.advanceTimersByTimeAsync(600_000);
    expect(vi.mocked(f.runtime.store.syncPresence).mock.calls.length - observations).toBe(1);
    expect(f.channel.permissionOverwrites.set.mock.calls.length - projections).toBe(1);
    await f.runtime.stop(); await f.database.$disconnect();
  });

  it('disable at 4999ms defeats timeout even after reenable and invalidates the old operation', async () => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = runtimeFixture(); f.join(OTHER); await f.runtime.start(f.resolveGuild);
    const actor = f.actor();
    const pending = await f.runtime.transfers.begin(actor, OTHER, f.gateway);
    await f.runtime.transfers.activate(actor, pending.id, f.gateway);
    await vi.advanceTimersByTimeAsync(4_999);
    await f.toggle(false); await f.toggle(true);
    await vi.advanceTimersByTimeAsync(1);
    expect(f.state().transfer).toBeNull();
    expect(f.state().room.ownerDiscordId).toBe(OWNER);
    await f.runtime.transfers.confirm(actor, pending.id, f.gateway);
    expect(f.state().room.ownerDiscordId).toBe(OWNER);
    await f.runtime.stop(); await f.database.$disconnect();
  });

  it('keeps the expired open marker through candidate departure and setup off/on, allowing another human to claim', async () => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = runtimeFixture(); f.leave(OWNER); f.join(OTHER); await f.runtime.start(f.resolveGuild);
    await vi.advanceTimersByTimeAsync(300_000);
    f.leave(OTHER); f.join(OLDEST); await f.observe();
    await f.toggle(false); await f.toggle(true);
    expect(f.state().room).toMatchObject({ priorityMemberDiscordId: OTHER, priorityExpiresAt: new Date(300_000) });
    await f.runtime.ownership.claim(f.actorFor(OLDEST), f.gateway);
    expect(f.state().room.ownerDiscordId).toBe(OLDEST);
    await f.runtime.stop(); await f.database.$disconnect();
  });

  it('keeps privacy/presence/priority alive with controls off and cancels target-departure transfers', async () => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = runtimeFixture(); f.join(OTHER);
    const pending = await f.runtime.transfers.begin(f.actor(), OTHER, f.gateway);
    await f.runtime.transfers.activate(f.actor(), pending.id, f.gateway);
    f.leave(OTHER); await f.observe();
    expect(f.state().transfer).toBeNull();
    await vi.advanceTimersByTimeAsync(5_000); expect(f.state().room.ownerDiscordId).toBe(OWNER);
    f.state().controlsEnabled = false; f.state().room.visibility = 'PRIVATE';
    f.leave(OWNER); f.join(OTHER); await f.observe();
    expect(f.state().room.ownerDiscordId).toBeNull();
    expect(f.state().room.priorityMemberDiscordId).toBe(OTHER);
    expect(f.state().presences.map((p) => p.memberDiscordId)).toEqual([OTHER]);
    expect(f.state().room.controlMessageDiscordId).toBeNull();
    expect(f.projected().some((o) => o.id === OTHER)).toBe(true);
    await f.runtime.stop(); await f.database.$disconnect();
  });

  it('does not mark an uncertain fetch closed, but closes a confirmed missing tracked channel', async () => {
    const f = runtimeFixture(); f.guild.channels.fetch.mockRejectedValueOnce(new Error('uncertain REST'));
    await f.runtime.start(f.resolveGuild);
    expect(f.state().room.status).toBe('ACTIVE');
    await f.runtime.stop(); await f.database.$disconnect();
    const missing = runtimeFixture(); missing.guild.channels.fetch.mockResolvedValueOnce(null!);
    await missing.runtime.start(missing.resolveGuild);
    expect(missing.state().room.status).toBe('CLOSED');
    await missing.runtime.stop(); await missing.database.$disconnect();
  });

  it('never carries prior-run join chronology into the first observation after an uncertain startup fetch', async () => {
    vi.useFakeTimers(); vi.setSystemTime(10_000);
    const f = runtimeFixture(); f.leave(OWNER); f.join(OLDEST); f.join(OTHER);
    f.state().room.ownerDiscordId = null;
    f.state().presences = [{ id: 'old', roomId: f.state().room.id, memberDiscordId: OTHER, isBot: false, joinedAt: new Date(0) }];
    f.guild.channels.fetch.mockRejectedValueOnce(new Error('uncertain fetch'));
    await f.runtime.start(f.resolveGuild);
    vi.setSystemTime(20_000); await f.observe();
    expect(f.state().presences.map((p) => p.joinedAt.getTime())).toEqual([20_000, 20_000]);
    expect(f.state().room.priorityMemberDiscordId).toBe(OLDEST);
    await f.runtime.stop(); await f.database.$disconnect();
  });

  it('closes timer admission synchronously and drains a callback queued on the same room lock', async () => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = runtimeFixture(); f.leave(OWNER); f.join(OTHER); await f.observe();
    const entered = deferred(); const release = deferred();
    const held = f.runtime.coordinator.room(f.guild.id, f.state().room.channelDiscordId, async () => { entered.resolve(); await release.promise; });
    await entered.promise;
    await vi.advanceTimersByTimeAsync(300_000);
    let done = false; const stopping = f.runtime.stop().then(() => { done = true; });
    await Promise.resolve(); expect(done).toBe(false);
    release.resolve(); await held; await stopping;
    const reads = vi.mocked(f.runtime.store.read).mock.calls.length;
    await vi.advanceTimersByTimeAsync(600_000);
    expect(vi.mocked(f.runtime.store.read).mock.calls.length).toBe(reads);
    await f.database.$disconnect();
  });
});
