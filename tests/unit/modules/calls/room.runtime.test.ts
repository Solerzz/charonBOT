import { type Guild } from 'discord.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPrismaClient } from '../../../../src/core/database/prisma.js';
import { createLogger } from '../../../../src/core/logger/logger.js';
import { createRoomRuntime } from '../../../../src/modules/calls/room.runtime.js';
import { CallService } from '../../../../src/modules/calls/call.service.js';
import type { CallDiscordGateway } from '../../../../src/modules/calls/call.discord.js';
import type { TemporaryRoomRepository } from '../../../../src/modules/calls/call.repository.js';
import { CallInteractions, type CallInteraction } from '../../../../src/modules/calls/call.interactions.js';
import { PrismaVoiceCreatorRepository } from '../../../../src/modules/setup/setup.repository.js';
import { OTHER, OLDEST, OWNER } from '../ownership/ownership.fixtures.js';
import { creator, deferred, entry } from './call.fixtures.js';
import { roomSettingsFixture } from './room-settings.fixtures.js';

function runtimeFixture() {
  const f = roomSettingsFixture();
  const database = createPrismaClient({ url: 'postgresql://test:test@127.0.0.1:1/test', directUrl: 'postgresql://test:test@127.0.0.1:1/test' });
  const logger = createLogger({ level: 'silent' }); const timerFailures = vi.spyOn(logger, 'error');
  const runtime = createRoomRuntime(database, logger);
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
  const handler = new CallInteractions(runtime, () => f.gateway);
  const interaction = (action: string, kind = 'button') => ({
    customId: `call:v2:${action}:${f.state().room.id}:${['confirm', 'undo'].includes(action) ? f.state().transfer!.id : f.state().room.controlVersion}`,
    guild, guildId: guild.id, channelId: f.channel.id, user: { id: OWNER }, values: [OTHER],
    inGuild: () => true, isButton: () => kind === 'button', isStringSelectMenu: () => false,
    isUserSelectMenu: () => kind === 'user', isModalSubmit: () => false,
    deferReply: vi.fn(async () => {}), reply: vi.fn(async (_payload: unknown) => {}),
    editReply: vi.fn(async (_payload: unknown) => ({ id: '82345678901234567' })),
  });
  const execute = (input: ReturnType<typeof interaction>) => handler.execute(input as unknown as CallInteraction);
  const voiceService = new CallService({ findByChannel: async () => null } as never,
    { findActiveByChannel: async () => structuredClone(f.state().room) } as unknown as TemporaryRoomRepository,
    runtime, createLogger({ level: 'silent' }));
  const voice = (member: string, leaving: boolean) => {
    const gateway = Object.assign(Object.create(f.gateway) as object, {
      getChannelMemberCount: () => f.states.size,
      getMemberChannelDiscordId: () => f.states.get(member)?.channelId ?? null,
    }) as unknown as CallDiscordGateway;
    return voiceService.handleVoiceTransition({ ...entry, memberDiscordId: member,
      oldChannelDiscordId: leaving ? f.channel.id : null, newChannelDiscordId: leaving ? null : f.channel.id }, gateway);
  };
  return { ...f, database, runtime, observe, toggle, resolveGuild: async () => guild, interaction, execute, voice, timerFailures };
}

afterEach(() => { vi.useRealTimers(); });

describe('application-owned room runtime', () => {
  it('propagates a direct manual refresh discovery error without scheduling recovery', async () => {
    const f = runtimeFixture(); const failure = new Error('private-manual-query');
    vi.mocked(f.runtime.store.read).mockRejectedValueOnce(failure);
    await expect(f.runtime.ownership.refreshPriority(f.state().room.id, f.gateway)).rejects.toBe(failure);
    expect(f.runtime.timers.scheduledDeadlines().size).toBe(0);
    expect(f.timerFailures).not.toHaveBeenCalled();
    await f.runtime.stop(); await f.database.$disconnect();
  });

  it.each(['final-read-unavailable', 'unrelated-reservation'] as const)('does not retain unproven due work after initial read failure with %s', async (reason) => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = runtimeFixture(); f.leave(OWNER); f.join(OTHER); f.state().room.ownerDiscordId = null;
    await f.runtime.start(f.resolveGuild);
    const entered = deferred(); const release = deferred(); const committed = deferred(); const acknowledge = deferred();
    vi.mocked(f.runtime.store.read).mockImplementationOnce(async () => { entered.resolve(); await release.promise; throw new Error('private-first-read'); });
    if (reason === 'final-read-unavailable') vi.mocked(f.runtime.store.read).mockRejectedValueOnce(new Error('private-final-read'));
    await vi.advanceTimersByTimeAsync(300_000); await entered.promise;
    vi.mocked(f.database.$transaction).mockImplementationOnce((async (work: (tx: typeof f.database) => Promise<unknown>) => {
      const saved = await work(f.database); committed.resolve(); await acknowledge.promise; return saved;
    }) as never);
    const toggling = f.toggle(false); await committed.promise;
    if (reason === 'unrelated-reservation') await f.runtime.store.savePriority(f.state().room.id, 2, OLDEST, new Date(300_000));
    release.resolve(); await vi.advanceTimersByTimeAsync(0);
    expect(f.runtime.timers.scheduledDeadlines().has(`priority:${f.state().room.id}`)).toBe(false);
    expect(f.timerFailures).toHaveBeenCalledOnce();
    expect(JSON.stringify(f.timerFailures.mock.calls)).not.toContain('private-');
    const observations = vi.mocked(f.runtime.store.syncPresence).mock.calls.length;
    acknowledge.resolve(); await toggling; await vi.advanceTimersByTimeAsync(600_000);
    expect(vi.mocked(f.runtime.store.syncPresence).mock.calls.length).toBe(observations);
    await f.runtime.stop(); await f.database.$disconnect();
  });

  it('retains due evidence after setup wins the panel installation CAS inside the observation callback', async () => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = runtimeFixture(); f.leave(OWNER); f.join(OTHER);
    Object.assign(f.state().room, { ownerDiscordId: null, visibility: 'PRIVATE' }); await f.runtime.start(f.resolveGuild);
    f.state().room.controlMessageDiscordId = null;
    const entered = deferred(); const release = deferred(); const committed = deferred(); const acknowledge = deferred();
    const send = f.channel.send.getMockImplementation()!;
    f.channel.send.mockImplementationOnce(async (...args) => { const result = await send(...args); entered.resolve(); await release.promise; return result; });
    f.join(OLDEST); await vi.advanceTimersByTimeAsync(300_000); await entered.promise;
    vi.mocked(f.database.$transaction).mockImplementationOnce((async (work: (tx: typeof f.database) => Promise<unknown>) => {
      const saved = await work(f.database); committed.resolve(); await acknowledge.promise; return saved;
    }) as never);
    const toggling = f.toggle(false); await committed.promise;
    release.resolve(); await vi.advanceTimersByTimeAsync(0);
    expect(f.state().room.controlMessageDiscordId).toBeNull();
    expect(f.message.delete).toHaveBeenCalledOnce(); // Failed old-version CAS compensates its untracked native message.
    expect(f.runtime.timers.scheduledDeadlines().get(`priority:${f.state().room.id}`)).toEqual(new Date(300_000));
    const observations = vi.mocked(f.runtime.store.syncPresence).mock.calls.length;
    const projections = f.channel.permissionOverwrites.set.mock.calls.length;
    acknowledge.resolve(); await toggling; await vi.advanceTimersByTimeAsync(1);
    expect(vi.mocked(f.runtime.store.syncPresence).mock.calls.length - observations).toBe(1);
    expect(f.channel.permissionOverwrites.set.mock.calls.length - projections).toBe(1);
    expect(f.state().room).toMatchObject({ priorityMemberDiscordId: OTHER, priorityExpiresAt: new Date(300_000) });
    await vi.advanceTimersByTimeAsync(600_000);
    expect(vi.mocked(f.runtime.store.syncPresence).mock.calls.length - observations).toBe(1);
    expect(f.channel.permissionOverwrites.set.mock.calls.length - projections).toBe(1);
    await f.runtime.stop(); await f.database.$disconnect();
  });

  it.each(['cancel', 'replace', 'stop'] as const)('does not resurrect or remove due metadata after %s during a superseded snapshot', async (action) => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = runtimeFixture(); f.leave(OWNER); f.join(OTHER);
    Object.assign(f.state().room, { ownerDiscordId: null, visibility: 'PRIVATE' }); await f.runtime.start(f.resolveGuild);
    const entered = deferred(); const release = deferred(); const committed = deferred(); const acknowledge = deferred();
    const fetch = f.guild.channels.fetch.getMockImplementation()!;
    f.guild.channels.fetch.mockImplementationOnce(async (...args) => { const result = await fetch(...args); entered.resolve(); await release.promise; return result; });
    await vi.advanceTimersByTimeAsync(300_000); await entered.promise;
    vi.mocked(f.database.$transaction).mockImplementationOnce((async (work: (tx: typeof f.database) => Promise<unknown>) => {
      const saved = await work(f.database); committed.resolve(); await acknowledge.promise; return saved;
    }) as never);
    const toggling = f.toggle(false); await committed.promise;
    const key = `priority:${f.state().room.id}`; const effects: string[] = [];
    let stopping: Promise<void> | undefined;
    if (action === 'cancel') f.runtime.timers.cancel(key);
    if (action === 'replace') f.runtime.timers.schedule(key, new Date(400_000), async () => { effects.push('replacement'); });
    if (action === 'stop') stopping = f.runtime.stop();
    release.resolve(); await vi.advanceTimersByTimeAsync(0); await stopping;
    expect(f.runtime.timers.scheduledDeadlines().get(key)).toEqual(action === 'replace' ? new Date(400_000) : undefined);
    if (action === 'replace') { await vi.advanceTimersByTimeAsync(100_000); expect(effects).toEqual(['replacement']); }
    else { await vi.advanceTimersByTimeAsync(600_000); expect(effects).toEqual([]); }
    acknowledge.resolve(); await toggling;
    await f.runtime.stop(); await f.database.$disconnect();
  });

  it.each(['candidate', 'deadline', 'owner', 'closed'] as const)('does not retain an unrelated %s state after setup invalidates an awaited due snapshot', async (changed) => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = runtimeFixture(); f.leave(OWNER); f.join(OTHER);
    f.state().room.ownerDiscordId = null; await f.runtime.start(f.resolveGuild);
    const entered = deferred(); const release = deferred(); const committed = deferred(); const acknowledge = deferred();
    const fetch = f.guild.channels.fetch.getMockImplementation()!;
    f.guild.channels.fetch.mockImplementationOnce(async (...args) => { const result = await fetch(...args); entered.resolve(); await release.promise; return result; });
    await vi.advanceTimersByTimeAsync(300_000); await entered.promise;
    vi.mocked(f.database.$transaction).mockImplementationOnce((async (work: (tx: typeof f.database) => Promise<unknown>) => {
      const saved = await work(f.database); committed.resolve(); await acknowledge.promise; return saved;
    }) as never);
    const toggling = f.toggle(false); await committed.promise;
    if (changed === 'candidate') await f.runtime.store.savePriority(f.state().room.id, 2, OLDEST, new Date(300_000));
    if (changed === 'deadline') await f.runtime.store.savePriority(f.state().room.id, 2, OTHER, new Date(299_999));
    if (changed === 'owner') Object.assign(f.state().room, { ownerDiscordId: OTHER, controlVersion: 3, priorityMemberDiscordId: null, priorityExpiresAt: null });
    if (changed === 'closed') f.state().room.status = 'CLOSED';
    release.resolve(); await vi.advanceTimersByTimeAsync(0);
    expect(f.runtime.timers.scheduledDeadlines().has(`priority:${f.state().room.id}`)).toBe(false);
    acknowledge.resolve(); await toggling; await vi.advanceTimersByTimeAsync(600_000);
    await f.runtime.stop(); await f.database.$disconnect();
  });

  it.each([true, false].flatMap((enabled) => ['snapshot', 'presence-read', 'projection', 'snapshot-failure', 'initial-read-failure'].map((boundary) => ({ enabled, boundary }))))('preserves due evidence when setup $enabled -> opposite commits during $boundary', async ({ enabled, boundary }) => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = runtimeFixture(); f.leave(OWNER); f.join(OTHER);
    Object.assign(f.state().room, { ownerDiscordId: null, visibility: 'PRIVATE' });
    f.state().controlsEnabled = enabled; await f.runtime.start(f.resolveGuild);
    const entered = deferred(); const release = deferred(); const committed = deferred(); const acknowledge = deferred();
    if (boundary === 'initial-read-failure') {
      vi.mocked(f.runtime.store.read).mockImplementationOnce(async () => { entered.resolve(); await release.promise; throw new Error('private-initial-query-sentinel'); });
    } else if (boundary === 'snapshot' || boundary === 'snapshot-failure') {
      const fetch = f.guild.channels.fetch.getMockImplementation()!;
      f.guild.channels.fetch.mockImplementationOnce(async (...args) => {
        const result = await fetch(...args); entered.resolve(); await release.promise;
        if (boundary === 'snapshot-failure') throw new Error('private-snapshot-sentinel');
        return result;
      });
    } else if (boundary === 'presence-read') {
      const sync = vi.mocked(f.runtime.store.syncPresence).getMockImplementation()!;
      vi.mocked(f.runtime.store.syncPresence).mockImplementationOnce(async (...args) => { await sync(...args); entered.resolve(); await release.promise; });
    } else {
      const project = f.channel.permissionOverwrites.set.getMockImplementation()!;
      f.channel.permissionOverwrites.set.mockImplementationOnce(async (...args) => { await project(...args); entered.resolve(); await release.promise; });
    }
    f.join(OLDEST); await vi.advanceTimersByTimeAsync(300_000); await entered.promise;
    vi.mocked(f.database.$transaction).mockImplementationOnce((async (work: (tx: typeof f.database) => Promise<unknown>) => {
      const saved = await work(f.database); committed.resolve(); await acknowledge.promise; return saved;
    }) as never);
    const toggling = f.toggle(!enabled); await committed.promise;
    release.resolve(); await vi.advanceTimersByTimeAsync(0);
    expect(f.runtime.timers.scheduledDeadlines().get(`priority:${f.state().room.id}`)).toEqual(new Date(300_000));
    const observations = vi.mocked(f.runtime.store.syncPresence).mock.calls.length;
    const projections = f.channel.permissionOverwrites.set.mock.calls.length;
    acknowledge.resolve(); await toggling; await vi.advanceTimersByTimeAsync(1);
    expect(f.state().presences.map((p) => p.memberDiscordId).sort()).toEqual([OLDEST, OTHER]);
    expect(f.projected().some((o) => o.id === OLDEST)).toBe(true);
    expect(f.state().room).toMatchObject({ controlVersion: 2, priorityMemberDiscordId: OTHER, priorityExpiresAt: new Date(300_000) });
    expect(vi.mocked(f.runtime.store.syncPresence).mock.calls.length - observations).toBe(1);
    expect(f.channel.permissionOverwrites.set.mock.calls.length - projections).toBe(1);
    await vi.advanceTimersByTimeAsync(600_000);
    expect(vi.mocked(f.runtime.store.syncPresence).mock.calls.length - observations).toBe(1);
    expect(f.channel.permissionOverwrites.set.mock.calls.length - projections).toBe(1);
    await f.toggle(enabled); await vi.advanceTimersByTimeAsync(600_000);
    expect(vi.mocked(f.runtime.store.syncPresence).mock.calls.length - observations).toBe(1);
    expect(f.channel.permissionOverwrites.set.mock.calls.length - projections).toBe(1);
    expect(f.state().room.priorityExpiresAt).toEqual(new Date(300_000));
    await f.runtime.stop(); await f.database.$disconnect();
  });

  it('retires coordinator metadata when startup confirms a missing tracked channel permanently closed', async () => {
    const f = runtimeFixture();
    await f.runtime.coordinator.room(f.guild.id, f.channel.id, () => f.runtime.coordinator.changeOwnership(f.guild.id, f.channel.id, 0, null,
      () => f.runtime.store.changeOwner(f.state().room.id, 0, OWNER, null)));
    f.guild.channels.fetch.mockResolvedValueOnce(null!);
    await f.runtime.start(f.resolveGuild);
    expect(f.state().room.status).toBe('CLOSED');
    const metadata = f.runtime.coordinator as unknown as { generations: Map<string, number>; departures: Map<string, unknown>; ownershipAttempts: Map<string, unknown>; accepted: Map<string, unknown> };
    expect(metadata.generations.size).toBe(0); expect(metadata.departures.size).toBe(0); expect(metadata.ownershipAttempts.size).toBe(0);
    expect(metadata.accepted.size).toBe(0);
    await f.runtime.stop(); await f.database.$disconnect();
  });

  it.each([true, false])('retains due work while actual setup %s -> opposite waits for its committed storage acknowledgement', async (enabled) => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = runtimeFixture(); f.leave(OWNER); f.join(OTHER);
    f.state().controlsEnabled = enabled; f.state().room.visibility = 'PRIVATE'; f.state().room.ownerDiscordId = null; await f.runtime.start(f.resolveGuild);
    await vi.advanceTimersByTimeAsync(299_999);
    const committed = deferred(); const acknowledge = deferred();
    vi.mocked(f.database.$transaction).mockImplementationOnce((async (work: (tx: typeof f.database) => Promise<unknown>) => {
      const saved = await work(f.database); committed.resolve(); await acknowledge.promise; return saved;
    }) as never);
    const toggling = f.toggle(!enabled); await committed.promise;
    expect(f.state().room.controlVersion).toBe(2);
    const observations = vi.mocked(f.runtime.store.syncPresence).mock.calls.length;
    const projections = f.channel.permissionOverwrites.set.mock.calls.length;
    f.join(OLDEST); await vi.advanceTimersByTimeAsync(2);
    expect(f.state().presences.map((p) => p.memberDiscordId)).toEqual([OTHER]);
    acknowledge.resolve(); await toggling; await vi.advanceTimersByTimeAsync(1);
    expect(f.state().presences.map((p) => p.memberDiscordId).sort()).toEqual([OLDEST, OTHER]);
    expect(f.projected().some((o) => o.id === OLDEST)).toBe(true);
    expect(f.state().room).toMatchObject({ controlVersion: 2, priorityMemberDiscordId: OTHER, priorityExpiresAt: new Date(300_000) });
    expect(vi.mocked(f.runtime.store.syncPresence).mock.calls.length - observations).toBe(1);
    expect(f.channel.permissionOverwrites.set.mock.calls.length - projections).toBe(1);
    await vi.advanceTimersByTimeAsync(600_000);
    expect(vi.mocked(f.runtime.store.syncPresence).mock.calls.length - observations).toBe(1);
    expect(f.channel.permissionOverwrites.set.mock.calls.length - projections).toBe(1);
    await f.runtime.stop(); await f.database.$disconnect();
  });

  it.each([true, false].flatMap((enabled) => ['owner', 'priority'].map((kind) => ({ enabled, kind }))))('reconciles a $kind departure after actual setup $enabled -> opposite wins its CAS', async ({ enabled, kind }) => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = runtimeFixture(); f.join(OTHER); f.state().controlsEnabled = enabled;
    if (kind === 'priority') { f.leave(OWNER); f.state().room.ownerDiscordId = null; }
    await f.runtime.start(f.resolveGuild);
    const member = kind === 'owner' ? OWNER : OTHER;
    const entered = deferred(); const release = deferred(); const committed = deferred();
    const beforeCAS = async () => { entered.resolve(); await release.promise; };
    if (kind === 'owner') f.hooks.beforeOwnerChange = beforeCAS; else f.hooks.beforePrioritySave = beforeCAS;
    const update = vi.mocked(f.database.temporaryRoom.updateMany).getMockImplementation()!;
    vi.mocked(f.database.temporaryRoom.updateMany).mockImplementationOnce((...args) => { const saved = update(...args); committed.resolve(); return saved; });
    vi.setSystemTime(1_000); f.leave(member); const leaving = f.voice(member, true);
    f.join(member); const returning = f.voice(member, false);
    await entered.promise;
    const toggling = f.toggle(!enabled); await committed.promise;
    release.resolve(); await Promise.all([leaving, returning, toggling]);
    expect(f.state().controlsEnabled).toBe(!enabled);
    if (kind === 'owner') expect(f.state().room).toMatchObject({ ownerDiscordId: null, controlVersion: 3 });
    else expect(f.state().room).toMatchObject({ ownerDiscordId: null, controlVersion: 2, priorityMemberDiscordId: OTHER, priorityExpiresAt: new Date(301_000) });
    expect(f.runtime.coordinator.pendingDepartures(f.guild.id, f.channel.id)).toHaveLength(0);
    await f.runtime.stop(); await f.database.$disconnect();
  });

  it.each(['owner', 'priority'] as const)('retains a %s departure after bounded definitive CAS losses and reconciles on the next observation', async (kind) => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = runtimeFixture(); f.join(OTHER);
    if (kind === 'priority') { f.leave(OWNER); f.state().room.ownerDiscordId = null; }
    await f.observe(); vi.setSystemTime(1_000);
    const member = kind === 'owner' ? OWNER : OTHER;
    f.runtime.coordinator.recordDeparture(f.guild.id, f.channel.id, member, false);
    f.runtime.coordinator.recordArrival(f.guild.id, f.channel.id, member);
    const cas = vi.mocked(kind === 'owner' ? f.runtime.store.changeOwner : f.runtime.store.savePriority);
    cas.mockClear(); cas.mockResolvedValue(false);
    await expect(f.observe()).rejects.toMatchObject({ code: 'STALE_CONTROLS' });
    expect(f.runtime.coordinator.pendingDepartures(f.guild.id, f.channel.id)).toHaveLength(1);
    expect(cas).toHaveBeenCalledTimes(3);
    cas.mockImplementation((kind === 'owner' ? f.store.changeOwner : f.store.savePriority) as never);
    await f.observe();
    expect(f.state().room.ownerDiscordId).toBeNull();
    if (kind === 'priority') expect(f.state().room.priorityExpiresAt).toEqual(new Date(301_000));
    expect(f.runtime.coordinator.pendingDepartures(f.guild.id, f.channel.id)).toHaveLength(0);
    await f.runtime.stop(); await f.database.$disconnect();
  });

  it.each(['name', 'visibility', 'allowed'] as const)('does not commit %s when the owner leaves/returns during its native write', async (setting) => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = runtimeFixture(); f.join(OTHER); await f.observe();
    const entered = deferred(); const release = deferred();
    if (setting === 'name') f.channel.setName.mockImplementationOnce(async (name) => { f.channel.name = name; entered.resolve(); await release.promise; });
    else {
      if (setting === 'allowed') { f.state().room.visibility = 'PRIVATE'; await f.observe(); }
      f.channel.permissionOverwrites.set.mockImplementationOnce(async () => { entered.resolve(); await release.promise; });
    }
    const changing = setting === 'name' ? f.runtime.controls.rename(f.actor(), 'New', f.gateway)
      : setting === 'visibility' ? f.runtime.controls.setVisibility(f.actor(), 'PRIVATE', f.gateway)
      : f.runtime.controls.setAllowed(f.actor(), OTHER, true, f.gateway);
    const rejected = expect(changing).rejects.toMatchObject({ code: 'STALE_CONTROLS' });
    await entered.promise;
    f.leave(OWNER); const leaving = f.voice(OWNER, true);
    f.join(OWNER); const returning = f.voice(OWNER, false);
    release.resolve(); await rejected; await Promise.all([leaving, returning]);
    expect(f.state().room).toMatchObject({ ownerDiscordId: null, controlVersion: 1, name: 'Game', visibility: setting === 'allowed' ? 'PRIVATE' : 'PUBLIC' });
    expect(f.state().allowedMemberIds).toEqual([]); expect(f.channel.name).toBe('Game');
    await f.runtime.stop(); await f.database.$disconnect();
  });

  it('uses the online departure instant when priority expiry passes while its room lock is held', async () => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = runtimeFixture(); f.leave(OWNER); f.join(OTHER); f.join(OLDEST); f.state().room.ownerDiscordId = null; await f.observe();
    const entered = deferred(); const release = deferred();
    const held = f.runtime.coordinator.room(f.guild.id, f.channel.id, async () => { entered.resolve(); await release.promise; });
    await entered.promise;
    vi.setSystemTime(299_999); f.leave(OLDEST); const leaving = f.voice(OLDEST, true);
    vi.setSystemTime(300_001); f.join(OLDEST); const returning = f.voice(OLDEST, false);
    release.resolve(); await Promise.all([held, leaving, returning]);
    expect(f.state().room).toMatchObject({ priorityMemberDiscordId: OTHER, priorityExpiresAt: new Date(600_001) });
    expect(f.state().presences.find((p) => p.memberDiscordId === OLDEST)?.joinedAt).toEqual(new Date(300_001));
    await f.runtime.stop(); await f.database.$disconnect();
  });

  it('keeps exact old/new prompt renderers separate while a terminal edit fails', async () => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = runtimeFixture(); f.join(OTHER); await f.runtime.start(f.resolveGuild);
    const original = f.interaction('transfer-target', 'user'); await f.execute(original);
    const oldId = f.state().transfer!.id;
    const entered = deferred(); const release = deferred();
    original.editReply.mockImplementationOnce(async () => { entered.resolve(); await release.promise; return { id: '82345678901234567' }; });
    await vi.advanceTimersByTimeAsync(1_000); await entered.promise;
    await f.execute(f.interaction('undo'));
    const next = f.interaction('transfer-target', 'user'); await f.execute(next);
    expect(f.state().transfer?.id).not.toBe(oldId);
    expect(f.state().transfer?.expiresAt).toEqual(new Date(6_000));
    original.editReply.mockRejectedValueOnce(new Error('private-terminal-sentinel'));
    release.resolve(); await vi.advanceTimersByTimeAsync(1_000);
    expect(original.editReply.mock.calls.at(-1)?.[0]).toMatchObject({ content: expect.stringContaining('encerrada'), components: [] });
    expect(next.editReply).toHaveBeenCalledTimes(2);
    await f.runtime.transfers.expire(oldId, f.gateway);
    expect(f.state().transfer?.expiresAt).toEqual(new Date(6_000));
    expect(f.state().room.ownerDiscordId).toBe(OWNER);
    await vi.advanceTimersByTimeAsync(4_001);
    expect(f.state().room).toMatchObject({ ownerDiscordId: OTHER, controlVersion: 2 });
    expect(next.editReply.mock.calls.at(-1)?.[0]).toMatchObject({ content: expect.stringContaining('encerrada'), components: [] });
    const edits = original.editReply.mock.calls.length + next.editReply.mock.calls.length;
    await f.runtime.stop(); await vi.advanceTimersByTimeAsync(600_000);
    expect(original.editReply.mock.calls.length + next.editReply.mock.calls.length).toBe(edits);
    await f.database.$disconnect();
  });

  it('does not let an exclusive candidate claim after leaving and returning during final REST', async () => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = runtimeFixture(); f.leave(OWNER); f.join(OTHER); f.state().room.ownerDiscordId = null; await f.observe();
    const entered = deferred(); const release = deferred();
    const snapshot = f.gateway.snapshot.bind(f.gateway);
    let reads = 0;
    vi.spyOn(f.gateway, 'snapshot').mockImplementation(async (id) => {
      const live = await snapshot(id);
      if (++reads === 2) { entered.resolve(); await release.promise; }
      return live;
    });
    const claiming = f.runtime.ownership.claim(f.actorFor(OTHER), f.gateway);
    const rejected = expect(claiming).rejects.toMatchObject({ code: 'STALE_CONTROLS' });
    await entered.promise;
    f.leave(OTHER); const leaving = f.voice(OTHER, true);
    vi.setSystemTime(1_000); f.join(OTHER); const returning = f.voice(OTHER, false);
    release.resolve(); await rejected; await Promise.all([leaving, returning]);
    expect(f.state().room).toMatchObject({ ownerDiscordId: null, controlVersion: 0, priorityMemberDiscordId: OTHER, priorityExpiresAt: new Date(301_000) });
    await Promise.allSettled([f.runtime.ownership.claim(f.actorFor(OTHER), f.gateway), f.runtime.ownership.claim(f.actorFor(OTHER), f.gateway)]);
    expect(f.state().room).toMatchObject({ ownerDiscordId: OTHER, controlVersion: 1 });
    await f.runtime.stop(); await f.database.$disconnect();
  });

  it.each(['confirm', 'undo', 'setup', 'departure', 'timeout'] as const)('terminally edits the original prompt on %s with the real runtime/handler', async (cause) => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = runtimeFixture(); f.join(OTHER); await f.runtime.start(f.resolveGuild);
    const original = f.interaction('transfer-target', 'user'); await f.execute(original);
    if (cause === 'confirm' || cause === 'undo') await f.execute(f.interaction(cause));
    if (cause === 'setup') await f.toggle(false);
    if (cause === 'departure') { f.leave(OTHER); await f.observe(); }
    await vi.advanceTimersByTimeAsync(cause === 'timeout' ? 5_001 : 1);
    expect(original.editReply.mock.calls.at(-1)?.[0]).toMatchObject({ content: expect.stringContaining('encerrada'), components: [] });
    expect(f.state().room.ownerDiscordId).toBe(cause === 'confirm' || cause === 'timeout' ? OTHER : OWNER);
    const edits = original.editReply.mock.calls.length;
    await f.runtime.stop(); await vi.advanceTimersByTimeAsync(600_000);
    expect(original.editReply).toHaveBeenCalledTimes(edits);
    await f.database.$disconnect();
  });

  it.each([true, false].flatMap((enabled) => ['enumeration', 'read', 'lock'].map((stage) => ({ enabled, stage }))))('preserves a due setup observation across delayed $stage with initial controls $enabled', async ({ enabled, stage }) => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = runtimeFixture(); f.leave(OWNER); f.join(OTHER);
    f.state().controlsEnabled = enabled; f.state().room.visibility = 'PRIVATE'; await f.runtime.start(f.resolveGuild);
    await vi.advanceTimersByTimeAsync(299_999);
    const entered = deferred(); const release = deferred();
    let held: Promise<void> | undefined;
    if (stage === 'enumeration') vi.mocked(f.runtime.store.listForCreator).mockImplementationOnce(async () => { entered.resolve(); await release.promise; return [structuredClone(f.state().room)]; });
    if (stage === 'read') {
      const read = f.runtime.store.read.bind(f.runtime.store);
      vi.mocked(f.runtime.store.read).mockImplementationOnce(async (id) => { entered.resolve(); await release.promise; return read(id); });
    }
    if (stage === 'lock') {
      held = f.runtime.coordinator.room(f.guild.id, f.channel.id, async () => { entered.resolve(); await release.promise; });
      await entered.promise;
    }
    const toggling = f.toggle(!enabled); await entered.promise;
    const observations = vi.mocked(f.runtime.store.syncPresence).mock.calls.length;
    const projections = f.channel.permissionOverwrites.set.mock.calls.length;
    f.join(OLDEST); await vi.advanceTimersByTimeAsync(2); release.resolve(); await toggling;
    await held;
    await vi.advanceTimersByTimeAsync(1);
    expect(f.state().presences.map((p) => p.memberDiscordId).sort()).toEqual([OLDEST, OTHER]);
    expect(f.projected().some((o) => o.id === OLDEST)).toBe(true);
    expect(f.state().room).toMatchObject({ priorityMemberDiscordId: OTHER, priorityExpiresAt: new Date(300_000) });
    expect(vi.mocked(f.runtime.store.syncPresence).mock.calls.length - observations).toBe(1);
    expect(f.channel.permissionOverwrites.set.mock.calls.length - projections).toBe(1);
    await vi.advanceTimersByTimeAsync(600_000);
    expect(vi.mocked(f.runtime.store.syncPresence).mock.calls.length - observations).toBe(1);
    expect(f.channel.permissionOverwrites.set.mock.calls.length - projections).toBe(1);
    await f.runtime.stop(); await f.database.$disconnect();
  });

  it.each((['owner', 'target', 'priority'] as const).flatMap((kind) => ['member', 'room', 'REST'].map((stage) => ({ kind, stage }))))('preserves queued online $kind leave/rejoin boundaries behind $stage', async ({ kind, stage }) => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = runtimeFixture(); f.join(OTHER); f.join(OLDEST);
    if (kind === 'priority') { f.leave(OWNER); f.state().room.ownerDiscordId = null; }
    await f.observe();
    if (kind === 'target') {
      const pending = await f.runtime.transfers.begin(f.actor(), OTHER, f.gateway);
      await f.runtime.transfers.activate(f.actor(), pending.id, f.gateway);
    }
    const member = kind === 'owner' ? OWNER : kind === 'priority' ? OLDEST : OTHER;
    const entered = deferred(); const release = deferred();
    let held: Promise<void>;
    if (stage === 'REST') {
      f.state().room.visibility = 'PRIVATE';
      f.channel.permissionOverwrites.set.mockImplementationOnce(async () => { entered.resolve(); await release.promise; });
      held = f.observe();
    } else held = stage === 'member'
      ? f.runtime.coordinator.member(f.guild.id, member, async () => { entered.resolve(); await release.promise; })
      : f.runtime.coordinator.room(f.guild.id, f.channel.id, async () => { entered.resolve(); await release.promise; });
    await entered.promise;
    vi.setSystemTime(1_000); f.leave(member);
    const leaving = f.voice(member, true);
    vi.setSystemTime(2_000); f.join(member);
    const returning = f.voice(member, false);
    release.resolve(); await Promise.all([held, leaving, returning]);
    if (kind === 'owner') expect(f.state().room).toMatchObject({ ownerDiscordId: null, controlVersion: 1 });
    if (kind === 'target') {
      expect(f.state().transfer).toBeNull();
      await vi.advanceTimersByTimeAsync(5_000);
      expect(f.state().room.ownerDiscordId).toBe(OWNER);
    }
    if (kind === 'priority') expect(f.state().room).toMatchObject({ priorityMemberDiscordId: OTHER, priorityExpiresAt: new Date(302_000) });
    expect(f.state().presences.find((p) => p.memberDiscordId === member)?.joinedAt).toEqual(new Date(2_000));
    await f.runtime.stop(); await f.database.$disconnect();
  });

  it.each([OWNER, OTHER].flatMap((member) => ['confirmed', 'lost-reply'].map((reply) => ({ member, reply }))))('does not let an old departure of $member undo an in-flight CAS with $reply', async ({ member, reply }) => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = runtimeFixture(); f.join(OTHER); await f.observe();
    const first = await f.runtime.transfers.begin(f.actor(), OTHER, f.gateway);
    await f.runtime.transfers.activate(f.actor(), first.id, f.gateway);
    const entered = deferred(); const release = deferred();
    f.hooks.beforeOwnerChange = async () => { entered.resolve(); await release.promise; };
    if (reply === 'lost-reply') {
      const finish = f.store.finishTransfer.getMockImplementation()!;
      vi.mocked(f.runtime.store.finishTransfer).mockImplementationOnce(async (...args) => { await finish(...args); throw new Error('private-lost-reply'); });
    }
    const confirming = f.runtime.transfers.confirm(f.actor(), first.id, f.gateway);
    const result = reply === 'lost-reply' ? expect(confirming).rejects.toMatchObject({ code: 'PERSISTENCE_FAILURE' }) : confirming;
    await entered.promise;
    f.leave(member); const leaving = f.voice(member, true);
    f.join(member); const returning = f.voice(member, false);
    release.resolve(); await Promise.all([result, leaving, returning]);
    expect(f.state().room).toMatchObject({ ownerDiscordId: OTHER, controlVersion: 1 });
    await f.runtime.transfers.confirm(f.actor(), first.id, f.gateway);
    await vi.advanceTimersByTimeAsync(6_000);
    expect(f.state().room).toMatchObject({ ownerDiscordId: OTHER, controlVersion: 1 });
    if (reply === 'lost-reply') {
      f.leave(OTHER); const newDeparture = f.voice(OTHER, true);
      f.join(OTHER); const newReturn = f.voice(OTHER, false);
      await Promise.all([newDeparture, newReturn]);
      expect(f.state().room).toMatchObject({ ownerDiscordId: null, controlVersion: 2 });
      await f.runtime.stop(); await f.database.$disconnect();
      return;
    }
    const second = await f.runtime.transfers.begin(f.actorFor(OTHER), OWNER, f.gateway);
    await f.runtime.transfers.confirm(f.actorFor(OTHER), second.id, f.gateway);
    expect(f.state().room).toMatchObject({ ownerDiscordId: OWNER, controlVersion: 2 });
    await f.runtime.stop(); await f.database.$disconnect();
  });

  it.each([OWNER, OTHER])('rejects confirmation if %s leaves and returns during the final live REST read', async (member) => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = runtimeFixture(); f.join(OTHER); await f.observe();
    const pending = await f.runtime.transfers.begin(f.actor(), OTHER, f.gateway);
    const entered = deferred(); const release = deferred();
    const snapshot = f.gateway.snapshot.bind(f.gateway);
    vi.spyOn(f.gateway, 'snapshot').mockImplementationOnce(async (id) => { const live = await snapshot(id); entered.resolve(); await release.promise; return live; });
    const confirming = f.runtime.transfers.confirm(f.actor(), pending.id, f.gateway);
    const rejected = expect(confirming).rejects.toMatchObject({ code: 'STALE_CONTROLS' });
    await entered.promise;
    f.leave(member); const leaving = f.voice(member, true);
    f.join(member); const returning = f.voice(member, false);
    release.resolve(); await rejected; await Promise.all([leaving, returning]);
    expect(f.state().room.ownerDiscordId).toBe(member === OWNER ? null : OWNER);
    expect(f.state().transfer).toBeNull();
    expect(f.store.finishTransfer).not.toHaveBeenCalled();
    await f.runtime.stop(); await f.database.$disconnect();
  });

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
