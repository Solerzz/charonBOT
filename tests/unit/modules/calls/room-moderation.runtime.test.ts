import { Client, DefaultRestOptions, PermissionFlagsBits as P, PermissionsBitField, RESTEvents, type Guild } from 'discord.js';
import type { Logger } from 'pino';
import { Response } from 'undici';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PrismaClient } from '../../../../src/generated/prisma/client.js';
import { createRoomRuntime } from '../../../../src/modules/calls/room.runtime.js';
import { TransferService } from '../../../../src/modules/ownership/transfer.service.js';
import { OwnershipService } from '../../../../src/modules/ownership/ownership.service.js';
import { deferred } from './call.fixtures.js';
import { roomModerationFixture, OWNER, OTHER } from './room-moderation.fixtures.js';
import { OLDEST } from '../ownership/ownership.fixtures.js';

const runtimes: ReturnType<typeof createRoomRuntime>[] = [];
afterEach(async () => {
  await Promise.all(runtimes.splice(0).map(runtime => runtime.stop()));
  vi.restoreAllMocks(); vi.useRealTimers();
});

function fixture() {
  const f = roomModerationFixture();
  const client = new Client({ intents: [] }); client.token = 'test-only';
  Object.assign(f.guild, { client });
  const logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn() } as unknown as Logger;
  const runtime = createRoomRuntime({} as PrismaClient, logger); runtimes.push(runtime);
  for (const method of ['read', 'readTransfer', 'findOwnedRoom', 'syncPresence', 'savePriority', 'changeOwner',
    'createTransfer', 'armTransfer', 'cancelTransfer', 'discardTransfer', 'invalidateTransfers', 'finishTransfer',
    'settleAccess', 'updateSettings', 'setAllowed', 'stageRoomBlock', 'stageRoomUnblock', 'completeRoomUnblock'] as const) {
    vi.spyOn(runtime.store, method).mockImplementation(f.store[method] as never);
  }
  vi.spyOn(runtime.store, 'setPanelId').mockImplementation(async (id, version, previous, next) => {
    const state = f.roomStates.get(id);
    if (!state || state.room.controlVersion !== version || state.room.controlMessageDiscordId !== previous) return false;
    state.room.controlMessageDiscordId = next; return true;
  });
  vi.spyOn(runtime.store, 'listTracked').mockImplementation(async () => [...f.roomStates.values()].filter(s => s.room.status !== 'CLOSED').map(s => structuredClone(s.room)));
  vi.spyOn(runtime.store, 'listForCreator').mockImplementation(async () => [structuredClone(f.state().room)]);
  vi.spyOn(runtime.store, 'cancelPreviousRunTransfers').mockImplementation(async () => { f.state().transfer = null; });
  vi.spyOn(runtime.store, 'invalidateControls').mockImplementation(async (id, version) => {
    const state = f.roomStates.get(id); if (!state || state.room.controlVersion !== version) return false;
    state.room.controlVersion++; state.transfer = null; return true;
  });
  vi.spyOn(runtime.store, 'purgeClosedRoomBlocks').mockImplementation(async () => {
    let count = 0;
    for (const state of f.roomStates.values()) if (state.room.status === 'CLOSED') { count += state.memberBlocks.length; state.memberBlocks = []; }
    return count;
  });
  const http = vi.spyOn(DefaultRestOptions, 'makeRequest').mockImplementation(async url => {
    f.leave(String(url).split('/').at(-1)!);
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  });
  const guild = f.guild as unknown as Guild;
  const gateway = () => runtime.gatewayFor(guild);
  const locked = (work: () => Promise<void>) => runtime.coordinator.room(guild.id, f.channel.id, work);
  const observe = () => locked(() => runtime.observeLocked(f.state().room.id, gateway()));
  return { ...f, runtime, client, http, nativeGuild: guild, gateway, locked, observe, logger };
}

describe('moderation composed with the application room runtime', () => {
  it.each([200, 403])('quarantines a stalled %s disconnect body at the deadline and drains accepted shutdown', async status => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const f = fixture(); const reading = deferred(); let body: ReadableStreamDefaultController<Uint8Array>; let settled = false;
    f.http.mockImplementationOnce(async (_url, init) => {
      const stream = new ReadableStream<Uint8Array>({ start(controller) { body = controller; } });
      init.signal!.addEventListener('abort', () => body.error(Object.assign(new Error('timeout'), { name: 'AbortError' })), { once: true });
      const result = new Response(stream, { status, headers: { 'content-type': 'application/json' } });
      for (const method of ['json', 'arrayBuffer'] as const) {
        const consume = result[method].bind(result);
        vi.spyOn(result, method).mockImplementation((async () => { reading.resolve(); try { return await consume(); } finally { settled = true; } }) as never);
      }
      return result;
    });
    const operation = f.runtime.moderation.block(f.actor(), OTHER, f.gateway()).catch((error: unknown) => error);
    await reading.promise; let stopped = false;
    const stopping = f.runtime.stop(operation).then(() => { stopped = true; });
    try {
      await vi.advanceTimersByTimeAsync(15_000);
      expect(settled).toBe(true);
      expect(await operation).toMatchObject({ code: 'MODERATION_INCOMPLETE' }); await stopping;
      expect(stopped).toBe(true); expect(f.runtime.access.isUncertain(f.state().room.id)).toBe(true);
      expect(f.state().memberBlocks).toHaveLength(1); expect(f.http).toHaveBeenCalledOnce();
      expect(f.states.has(OTHER)).toBe(true);
    } finally { if (!settled) body!.error(new Error('test cleanup')); await operation; await stopping; }
  });

  it('does not stage a new block through an impossible existing moderation quarantine', async () => {
    const f = fixture(); const block = f.seedBlock(); const fetch = f.guild.members.fetch.getMockImplementation()!;
    f.guild.members.fetch.mockImplementation(async options => {
      const member = await fetch(options);
      if (member.id === OTHER) return { ...member, permissions: new PermissionsBitField(P.Administrator) };
      return member;
    });
    f.runtime.access.markUncertain(f.state().room.id);
    await expect(f.runtime.moderation.block(f.actor(), OLDEST, f.gateway())).rejects.toMatchObject({ code: 'MODERATION_INCOMPLETE' });
    expect(f.store.stageRoomBlock).not.toHaveBeenCalled(); expect(f.state().memberBlocks).toEqual([block]);
    expect(f.state().room.controlVersion).toBe(0); expect(f.http).not.toHaveBeenCalled();
    expect(f.runtime.access.isUncertain(f.state().room.id)).toBe(true);
  });

  it('does not clear quarantine for an absent BLOCKED administrator during runtime recovery', async () => {
    const f = fixture(); f.seedBlock(); f.leave(OTHER); f.member.permissions.add(P.Administrator);
    f.runtime.access.markUncertain(f.state().room.id);
    await expect(f.observe()).rejects.toMatchObject({ code: 'MODERATION_INCOMPLETE' });
    expect(f.runtime.access.isUncertain(f.state().room.id)).toBe(true); expect(f.http).not.toHaveBeenCalled();
    await expect(f.runtime.moderation.unblock(f.actor(), f.state().memberBlocks[0]!.id, f.gateway())).resolves.toMatchObject({ kind: 'unblocked' });
    expect(f.state().memberBlocks).toEqual([]);
  });

  it('removes a blocked occupant through the real shared transport before publishing, without reentering room locks', async () => {
    const f = fixture();
    const roomLock = vi.spyOn(f.runtime.coordinator, 'room');
    const result = await f.runtime.moderation.block(f.actor(), OTHER, f.gateway());
    expect(result).toMatchObject({ kind: 'blocked', removedFromRoom: true, actor: { controlVersion: 1 } });
    expect(f.states.has(OTHER)).toBe(false); expect(f.state().presences.map(p => p.memberDiscordId)).toEqual([OWNER]);
    expect(f.http).toHaveBeenCalledOnce(); expect(roomLock).toHaveBeenCalledOnce();
    expect(f.channel.messages.edit).toHaveBeenCalledOnce();
    await f.locked(() => f.runtime.publishLocked(f.state().room.id, f.gateway()));
    expect(f.http).toHaveBeenCalledOnce();
  });

  it('never retries an uncertain disconnect through publication or catch; a later observation can recover durable intent', async () => {
    const f = fixture();
    f.http.mockRejectedValueOnce(new Error('uncertain HTTP response'));
    await expect(f.runtime.moderation.block(f.actor(), OTHER, f.gateway())).rejects.toMatchObject({ code: 'MODERATION_INCOMPLETE' });
    expect(f.http).toHaveBeenCalledOnce(); expect(f.state().memberBlocks).toHaveLength(1);
    expect(f.runtime.access.isUncertain(f.state().room.id)).toBe(true);
    await f.observe(); expect(f.http).toHaveBeenCalledTimes(2);
    expect(f.runtime.access.isUncertain(f.state().room.id)).toBe(false);
  });

  it('recovers a block revealed only by the SQL fence before revalidating an old actor', async () => {
    const f = fixture(); const actor = f.actor();
    f.runtime.access.markUnsettled(actor.roomId, actor.controlVersion);
    const settle = f.store.settleAccess.getMockImplementation()!;
    f.store.settleAccess.mockImplementationOnce(async (...args) => { f.seedBlock(); return settle(...args); });
    await expect(f.runtime.controls.rename(actor, 'Forbidden', f.gateway())).rejects.toMatchObject({ code: 'STALE_CONTROLS' });
    expect(f.states.has(OTHER)).toBe(false); expect(f.http).toHaveBeenCalledOnce();
    expect(f.channel.setName).not.toHaveBeenCalled();
    expect(JSON.stringify(f.channel.messages.edit.mock.calls)).toContain(':1');
  });

  it('acknowledges an expected blocked disconnect receipt without quarantining grants that excluded that occupant', async () => {
    const f = fixture();
    const http = f.http.getMockImplementation()!;
    f.http.mockImplementationOnce(async (...args) => {
      const result = await http(...args);
      f.runtime.coordinator.recordDeparture(f.guild.id, f.channel.id, OTHER, false);
      return result;
    });
    await expect(f.runtime.moderation.block(f.actor(), OTHER, f.gateway())).resolves.toMatchObject({ kind: 'blocked' });
    expect(f.runtime.coordinator.pendingDepartures(f.guild.id, f.channel.id)).toEqual([]);
    expect(f.runtime.access.isUncertain(f.state().room.id)).toBe(false);
    expect(f.http).toHaveBeenCalledOnce();
  });

  it('retains a new nonblocked departure through the real removal callback and rejects success after that member returns', async () => {
    const f = fixture(); f.join(OLDEST);
    const http = f.http.getMockImplementation()!;
    f.http.mockImplementationOnce(async (...args) => {
      const result = await http(...args);
      f.runtime.coordinator.recordDeparture(f.guild.id, f.channel.id, OLDEST, false);
      f.runtime.coordinator.recordArrival(f.guild.id, f.channel.id, OLDEST);
      return result;
    });
    await expect(f.runtime.moderation.block(f.actor(), OTHER, f.gateway())).rejects.toMatchObject({ code: 'MODERATION_INCOMPLETE' });
    expect(f.runtime.access.isUncertain(f.state().room.id)).toBe(true);
    expect(f.runtime.coordinator.pendingDepartures(f.guild.id, f.channel.id).map(receipt => receipt.memberId)).toEqual([OLDEST]);
    expect(f.http).toHaveBeenCalledOnce();
    await f.observe();
    expect(f.runtime.coordinator.pendingDepartures(f.guild.id, f.channel.id)).toEqual([]);
    expect(f.runtime.access.isUncertain(f.state().room.id)).toBe(false); expect(f.http).toHaveBeenCalledOnce();
  });

  it('retains owner departure evidence when setup off wins the removal callback CAS, without replaying disconnect', async () => {
    const f = fixture(); const http = f.http.getMockImplementation()!;
    f.http.mockImplementationOnce(async (...args) => {
      const result = await http(...args);
      f.runtime.coordinator.recordDeparture(f.guild.id, f.channel.id, OWNER, false);
      f.runtime.coordinator.recordArrival(f.guild.id, f.channel.id, OWNER);
      return result;
    });
    let setupCommitted = false;
    f.hooks.beforeOwnerChange = async () => {
      if (!setupCommitted) { setupCommitted = true; f.state().controlsEnabled = false; f.state().room.controlVersion++; }
    };
    await expect(f.runtime.moderation.block(f.actor(), OTHER, f.gateway())).rejects.toMatchObject({ code: 'MODERATION_INCOMPLETE' });
    expect(f.state().room).toMatchObject({ ownerDiscordId: null, controlVersion: 3, controlMessageDiscordId: null });
    expect(f.state().controlsEnabled).toBe(false);
    expect(f.runtime.coordinator.pendingDepartures(f.guild.id, f.channel.id).map(receipt => receipt.memberId)).toEqual([OWNER]);
    expect(f.http).toHaveBeenCalledOnce();
    await f.observe();
    expect(f.runtime.coordinator.pendingDepartures(f.guild.id, f.channel.id)).toEqual([]);
    expect(f.state().room.ownerDiscordId).toBeNull(); expect(f.http).toHaveBeenCalledOnce();
  });

  it.each(['administrator', 'bot', 'guild-owner', 'room-owner'] as const)('permits corrective unblock of a protected %s while other mutations remain quarantined', async protection => {
    const f = fixture(); const block = f.seedBlock(protection === 'room-owner' ? OWNER : OTHER);
    if (protection === 'administrator') f.member.permissions.add(P.Administrator);
    if (protection === 'bot') {
      f.member.user.bot = true;
      const fetch = f.guild.members.fetch.getMockImplementation()!;
      // Keep the owner human while the target remains a protected bot.
      f.guild.members.fetch.mockImplementation(async options => (options as { user: string }).user === OWNER ? { ...f.member, id: OWNER, user: { bot: false } } : fetch(options));
    }
    if (protection === 'guild-owner') f.guild.ownerId = OTHER;
    f.runtime.access.markUncertain(f.state().room.id);
    await expect(f.runtime.controls.rename(f.actor(), 'Forbidden', f.gateway())).rejects.toThrow();
    expect(f.channel.setName).not.toHaveBeenCalled(); expect(f.http).not.toHaveBeenCalled();
    await expect(f.runtime.moderation.unblock(f.actor(), block.id, f.gateway())).resolves.toMatchObject({ kind: 'unblocked' });
    expect(f.state().memberBlocks).toEqual([]); expect(f.http).not.toHaveBeenCalled();
  });

  it('does not bypass an unavailable SQL fence even for corrective unblock', async () => {
    const f = fixture(); const block = f.seedBlock();
    f.runtime.access.markUnsettled(f.state().room.id, 0);
    f.store.settleAccess.mockRejectedValue(new Error('fence unavailable'));
    await expect(f.runtime.moderation.unblock(f.actor(), block.id, f.gateway())).rejects.toMatchObject({ code: 'PERSISTENCE_FAILURE' });
    expect(f.store.stageRoomUnblock).not.toHaveBeenCalled(); expect(f.http).not.toHaveBeenCalled();
    expect(f.state().memberBlocks[0]!.state).toBe('BLOCKED');
  });

  it.each(['BLOCKED', 'UNBLOCK_PENDING'] as const)('excludes a present %s member from priority, claim and transfer even before recovery succeeds', async intent => {
    const f = fixture(); f.seedBlock(OTHER, intent); f.join(OLDEST);
    f.leave(OWNER); f.state().room.ownerDiscordId = null;
    await f.locked(async () => f.runtime.ownership.observeLocked(f.state().room.id, (await f.gateway().snapshot(f.channel.id))!, f.gateway()));
    expect(f.state().room.priorityMemberDiscordId).toBe(OLDEST);
    // Exercise the real ownership boundary independently of recovery, including
    // an elapsed priority marker which otherwise permits any present human.
    const ownership = new OwnershipService({ store: f.runtime.store, coordinator: f.runtime.coordinator,
      timers: f.runtime.timers, onChangedLocked: f.runtime.publishLocked });
    f.state().room.priorityExpiresAt = new Date(0);
    await expect(ownership.claim(f.actorFor(OTHER), f.gateway())).rejects.toMatchObject({ code: 'MEMBER_BLOCKED' });
    expect(f.state().room.ownerDiscordId).toBeNull();
    f.join(OWNER); f.state().room.ownerDiscordId = OWNER;
    const transfers = new TransferService({ store: f.runtime.store, coordinator: f.runtime.coordinator,
      timers: f.runtime.timers, onChangedLocked: f.runtime.publishLocked });
    await expect(transfers.begin(f.actor(), OTHER, f.gateway())).rejects.toMatchObject({ code: 'MEMBER_BLOCKED' });
    expect(f.state().transfer).toBeNull();
  });

  it('startup recovers both intents and purges only CLOSED records even with setup off', async () => {
    const f = fixture(); f.seedBlock(); const pending = f.seedBlock(OLDEST, 'UNBLOCK_PENDING');
    f.state().controlsEnabled = false;
    const closed = structuredClone(f.state()); closed.room.id = 'closed-room'; closed.room.status = 'CLOSED';
    f.roomStates.set(closed.room.id, closed);
    await f.runtime.start(async () => f.nativeGuild);
    expect(f.http).toHaveBeenCalledOnce(); expect(f.states.has(OTHER)).toBe(false);
    expect(f.state().memberBlocks.map(b => b.id)).not.toContain(pending.id);
    expect(f.state().memberBlocks).toHaveLength(1); expect(closed.memberBlocks).toEqual([]);
    expect(f.state().room.controlMessageDiscordId).toBeNull();
    expect(f.channel.send).not.toHaveBeenCalled();
  });

  it('setup off enforces a newly observed occupant without requiring or recreating a panel', async () => {
    const f = fixture(); await f.runtime.start(async () => f.nativeGuild); f.seedBlock();
    f.state().controlsEnabled = false; f.state().room.controlVersion++;
    await f.runtime.synchronizeCreator(f.state().room.voiceCreatorId);
    expect(f.states.has(OTHER)).toBe(false); expect(f.http).toHaveBeenCalledOnce();
    expect(f.state().memberBlocks).toHaveLength(1); expect(f.state().room.controlMessageDiscordId).toBeNull();
  });

  it('retains blocks across A → B → A without granting prior allowlist access', async () => {
    const f = fixture(); f.leave(OLDEST); f.seedBlock(OLDEST); f.state().room.visibility = 'PRIVATE';
    await f.observe();
    let pending = await f.runtime.transfers.begin(f.actor(), OTHER, f.gateway());
    await f.runtime.transfers.confirm(f.actor(), pending.id, f.gateway());
    expect(f.state().room.ownerDiscordId).toBe(OTHER);
    pending = await f.runtime.transfers.begin(f.actorFor(OTHER), OWNER, f.gateway());
    await f.runtime.transfers.confirm(f.actorFor(OTHER), pending.id, f.gateway());
    expect(f.state().room.ownerDiscordId).toBe(OWNER); expect(f.state().memberBlocks).toHaveLength(1);
    expect(f.overwrite(OLDEST)?.deny.has(P.Connect | P.SendMessages)).toBe(true);
    expect(f.state().allowedMemberIds).toEqual([]); expect(f.http).not.toHaveBeenCalled();
  });

  it('shares transport cooldown across gateway instances, rejects another Client and never destroys the shared Client', async () => {
    const f = fixture(); const first = f.gateway(); const second = f.gateway();
    const destroy = vi.spyOn(f.client, 'destroy');
    f.http.mockResolvedValueOnce(new Response('{"retry_after":60}', { status: 429, headers: { 'content-type': 'application/json' } }));
    await expect(first.disconnectFromRoom(f.channel.id, OTHER)).rejects.toThrow();
    await expect(second.disconnectFromRoom(f.channel.id, OTHER)).rejects.toThrow();
    expect(f.http).toHaveBeenCalledOnce();
    expect(() => f.runtime.gatewayFor({ ...f.guild, client: new Client({ intents: [] }) } as unknown as Guild)).toThrow();
    await f.runtime.stop(); expect(destroy).not.toHaveBeenCalled();
    expect(f.client.rest.listenerCount(RESTEvents.RateLimited)).toBe(0);
  });

  it('drains an admitted HTTP operation before detaching the one owned transport', async () => {
    const f = fixture(); const entered = deferred(); const release = deferred();
    f.http.mockImplementationOnce(async () => { entered.resolve(); await release.promise; return new Response('{}', { headers: { 'content-type': 'application/json' } }); });
    const operation = f.gateway().disconnectFromRoom(f.channel.id, OTHER); await entered.promise;
    let stopped = false; const stopping = f.runtime.stop().then(() => { stopped = true; });
    await Promise.resolve(); expect(stopped).toBe(false);
    release.resolve(); await operation; await stopping;
    expect(f.http).toHaveBeenCalledOnce(); expect(f.client.rest.listenerCount(RESTEvents.RateLimited)).toBe(0);
    await expect(f.gateway().disconnectFromRoom(f.channel.id, OTHER)).rejects.toThrow();
  });
});
