import { Client, DefaultRestOptions, PermissionFlagsBits as P, REST, RESTEvents, Routes, type Guild, type RESTOptions } from 'discord.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getGlobalDispatcher, MockAgent, Response, setGlobalDispatcher } from 'undici';

import { createRoomModerationTransport } from '../../../../src/modules/calls/room-moderation.transport.js';
import { deferred } from './call.fixtures.js';
import { discordFixture } from './call.discord.fixtures.js';
import { room } from './call.fixtures.js';
import { DiscordRoomGateway } from '../../../../src/modules/calls/room.discord.js';

const guildId = '12345678901234567'; const memberId = '52345678901234567';
const transports: { stop(): Promise<void> }[] = [];
afterEach(async () => { await Promise.all(transports.splice(0).map(t => t.stop())); vi.restoreAllMocks(); vi.useRealTimers(); });
function fixture(send: RESTOptions['makeRequest']) {
  const http = vi.spyOn(DefaultRestOptions, 'makeRequest').mockImplementation(send);
  const client = new Client({ intents: [] }); client.token = 'test-only-not-a-credential';
  const transport = createRoomModerationTransport(client); transports.push(transport);
  return { http, client, transport, guild: { id: guildId, client } as unknown as Guild };
}
const response = (status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(status === 200 ? {} : { message: 'test failure', retry_after: 1 }), { status, headers: { 'content-type': 'application/json', ...headers } });

describe('room moderation HTTP transport', () => {
  it('fails closed on an unknown 429 cooldown when its body aborts at the deadline', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }); const entered = deferred();
    let first = true;
    const f = fixture(async (_url, init) => {
      if (!first) return response(); first = false;
      const stream = new ReadableStream<Uint8Array>({ start(controller) {
        init.signal!.addEventListener('abort', () => controller.error(Object.assign(new Error('timeout'), { name: 'AbortError' })), { once: true });
      } });
      entered.resolve(); return new Response(stream, { status: 429, headers: { 'content-type': 'application/json' } });
    });
    const result = f.transport.disconnectOnce(f.guild, memberId, async () => true).catch((error: unknown) => error);
    await entered.promise; await vi.advanceTimersByTimeAsync(15_000);
    expect(await result).toMatchObject({ code: 'DISCORD_FAILURE' });
    await expect(f.transport.disconnectOnce(f.guild, memberId, async () => true)).rejects.toMatchObject({ code: 'MODERATION_INCOMPLETE' });
    expect(f.http).toHaveBeenCalledOnce();
  });

  it.each([200, 403, 500])('keeps the abortable deadline through a pending %s response body and drains stop', async status => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const reading = deferred(); let body: ReadableStreamDefaultController<Uint8Array>;
    let aborted = false; let readSettled = false;
    const f = fixture(async (_url, init) => {
      const stream = new ReadableStream<Uint8Array>({ start(controller) { body = controller; } });
      init.signal!.addEventListener('abort', () => { aborted = true; body.error(Object.assign(new Error('body timeout'), { name: 'AbortError' })); }, { once: true });
      const result = new Response(stream, { status, headers: { 'content-type': 'application/json' } });
      for (const method of ['json', 'arrayBuffer'] as const) {
        const consume = result[method].bind(result);
        vi.spyOn(result, method).mockImplementation((async () => {
          reading.resolve(); try { return await consume(); } finally { readSettled = true; }
        }) as never);
      }
      return result;
    });
    let finished = false;
    const operation = f.transport.disconnectOnce(f.guild, memberId, async () => true).then(value => { finished = true; return value; }, (error: unknown) => { finished = true; return error; });
    await reading.promise;
    let stopped = false; const stopping = f.transport.stop().then(() => { stopped = true; });
    try {
      await vi.advanceTimersByTimeAsync(14_999); expect(finished).toBe(false); expect(stopped).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(aborted).toBe(true); expect(readSettled).toBe(true); expect(finished).toBe(true);
      expect(await operation).toMatchObject({ code: 'DISCORD_FAILURE' }); await stopping;
      expect(stopped).toBe(true); expect(f.http).toHaveBeenCalledOnce();
    } finally {
      if (!readSettled) body!.error(new Error('test cleanup'));
      await operation; await stopping;
    }
  });

  it.each([500, 429])('sends exactly one real undici HTTP dispatch for %s, with network access disabled', async statusCode => {
    const original = getGlobalDispatcher(); const agent = new MockAgent(); agent.disableNetConnect();
    let requests = 0;
    agent.get('https://discord.com').intercept({ method: 'PATCH', path: `/api/v10/guilds/${guildId}/members/${memberId}`, body: '{"channel_id":null}' }).reply(() => {
      requests++;
      return { statusCode, data: '{"retry_after":1}', responseOptions: { headers: { 'content-type': 'application/json', 'retry-after': '1' } } };
    }).persist();
    setGlobalDispatcher(agent);
    const client = new Client({ intents: [] }); client.token = 'test-only';
    const transport = createRoomModerationTransport(client);
    try {
      await expect(transport.disconnectOnce({ id: guildId, client } as Guild, memberId, async () => true)).rejects.toThrow();
      expect(requests).toBe(1);
    } finally { await transport.stop(); setGlobalDispatcher(original); await agent.close(); }
  });
  it.each(['other-call', 'protected'] as const)('gateway revalidates a queued target at the HTTP boundary: %s', async change => {
    const entered = deferred(); const release = deferred();
    const f = fixture(async () => { entered.resolve(); await release.promise; return response(); });
    const discord = discordFixture(); Object.assign(discord.guild, { client: f.client });
    discord.states.set(discord.member.id, { channelId: room.channelDiscordId });
    const gateway = new DiscordRoomGateway(discord.guild as unknown as Guild, f.transport);
    const first = f.transport.disconnectOnce(f.guild, '62345678901234567', async () => true); await entered.promise;
    const queued = gateway.disconnectFromRoom(room.channelDiscordId, discord.member.id);
    const outcome = queued.catch((error: unknown) => error);
    if (change === 'other-call') discord.states.set(discord.member.id, { channelId: '72345678901234567' });
    else discord.member.permissions.add(P.Administrator);
    release.resolve(); await first;
    if (change === 'other-call') expect(await outcome).toBe('not-in-room');
    else expect(await outcome).toMatchObject({ code: 'PROTECTED_MEMBER' });
    expect(f.http).toHaveBeenCalledOnce(); expect(discord.member.voice.setChannel).not.toHaveBeenCalled();
  });
  it('the HTTP counter detects SDK-level replay (not merely calls to disconnect)', async () => {
    const http = vi.spyOn(DefaultRestOptions, 'makeRequest').mockImplementation(async () => response(500));
    const rest = new REST({ retries: 1 }).setToken('test-only');
    try {
      await expect(rest.patch(Routes.guildMember(guildId, memberId), { body: { channel_id: null } })).rejects.toThrow();
      expect(http).toHaveBeenCalledTimes(2);
    } finally { rest.clearHashSweeper(); rest.clearHandlerSweeper(); }
  });
  it.each(['500', 'timeout', '429'] as const)('never replays an uncertain %s HTTP send', async failure => {
    const f = fixture(async () => {
      if (failure === 'timeout') throw Object.assign(new Error('request aborted'), { name: 'AbortError' });
      return response(Number(failure), failure === '429' ? { 'retry-after': '1' } : {});
    });
    await expect(f.transport.disconnectOnce(f.guild, memberId, async () => true)).rejects.toThrow();
    expect(f.http).toHaveBeenCalledTimes(1);
    expect(f.http.mock.calls[0]![0]).toBe(`https://discord.com/api/v10/guilds/${guildId}/members/${memberId}`);
    expect(f.http.mock.calls[0]![1]).toMatchObject({ method: 'PATCH', body: JSON.stringify({ channel_id: null }) });
    if (failure === '429') {
      await expect(f.transport.disconnectOnce(f.guild, memberId, async () => true)).rejects.toThrow();
      expect(f.http).toHaveBeenCalledTimes(1);
    }
  });
  it('false guard returns not-in-room without an HTTP request', async () => {
    const f = fixture(async () => response());
    await expect(f.transport.disconnectOnce(f.guild, memberId, async () => false)).resolves.toBe('not-in-room');
    expect(f.http).not.toHaveBeenCalled();
  });
  it('rejects redirects instead of acknowledging an uncertain result or forwarding the token', async () => {
    const f = fixture(async () => response(302, { location: 'https://example.invalid/not-discord' }));
    await expect(f.transport.disconnectOnce(f.guild, memberId, async () => true)).rejects.toMatchObject({ code: 'DISCORD_FAILURE' });
    expect(f.http).toHaveBeenCalledOnce();
  });
  it('aborts at 15000ms and does not let the SDK replay the timed-out HTTP attempt', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }); const entered = deferred();
    const f = fixture(async (_url, init) => new Promise((_resolve, reject) => {
      init.signal!.addEventListener('abort', () => reject(Object.assign(new Error('timeout'), { name: 'AbortError' })), { once: true });
      entered.resolve();
    }));
    const call = f.transport.disconnectOnce(f.guild, memberId, async () => true);
    const rejected = expect(call).rejects.toMatchObject({ code: 'DISCORD_FAILURE' });
    await entered.promise; await vi.advanceTimersByTimeAsync(14_999); expect(f.http).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1); await rejected; expect(f.http).toHaveBeenCalledOnce();
  });
  it('rejects a protected guard without HTTP even when the error looks retriable', async () => {
    const f = fixture(async () => response());
    await expect(f.transport.disconnectOnce(f.guild, memberId, async () => { throw Object.assign(new Error('protected'), { name: 'AbortError' }); })).rejects.toThrow();
    expect(f.http).not.toHaveBeenCalled();
  });
  it('runs each invocation guard after the SDK queue, without swapping concurrent contexts', async () => {
    const entered = deferred(); const release = deferred(); const f = fixture(async () => { entered.resolve(); await release.promise; return response(); });
    const first = vi.fn(async () => true); let present = true; const second = vi.fn(async () => present);
    const a = f.transport.disconnectOnce(f.guild, memberId, first); await entered.promise;
    const b = f.transport.disconnectOnce(f.guild, '62345678901234567', second);
    await Promise.resolve(); expect(second).not.toHaveBeenCalled();
    present = false; release.resolve();
    await expect(a).resolves.toBe('disconnected'); await expect(b).resolves.toBe('not-in-room');
    expect(first).toHaveBeenCalledOnce(); expect(second).toHaveBeenCalledOnce(); expect(f.http).toHaveBeenCalledOnce();
  });
  it('fails conservatively for the Client global limit without mutating shared REST options', async () => {
    const f = fixture(async () => response()); const options = f.client.rest.options;
    f.client.rest.globalRemaining = 0; f.client.rest.globalReset = Date.now() + 10_000;
    await expect(f.transport.disconnectOnce(f.guild, memberId, async () => true)).rejects.toThrow();
    expect(f.http).not.toHaveBeenCalled(); expect(f.client.rest.options).toBe(options); expect(options.retries).toBe(3);
  });
  it.each([30_000, Number.NaN])('honors shared rate-limit notifications without bypassing an uncertain cooldown: %s', async timeToReset => {
    const f = fixture(async () => response());
    f.client.rest.emit(RESTEvents.RateLimited, { global: true, hash: 'test', limit: 50, majorParameter: guildId,
      method: 'PATCH', route: '/guilds/:id/members/:id', scope: 'global', sublimitTimeout: 0, timeToReset, retryAfter: 0, url: 'https://discord.com' });
    await expect(f.transport.disconnectOnce(f.guild, memberId, async () => true)).rejects.toThrow();
    expect(f.http).not.toHaveBeenCalled();
  });
  it('does not bypass an observed body-only 429 cooldown longer than the fallback', async () => {
    let now = Date.now(); vi.spyOn(Date, 'now').mockImplementation(() => now);
    const f = fixture(async () => new Response(JSON.stringify({ retry_after: 60, global: true }), { status: 429, headers: { 'content-type': 'application/json' } }));
    await expect(f.transport.disconnectOnce(f.guild, memberId, async () => true)).rejects.toThrow();
    now += 20_000;
    await expect(f.transport.disconnectOnce(f.guild, memberId, async () => true)).rejects.toThrow();
    expect(f.http).toHaveBeenCalledOnce();
  });
  it('stop closes admission, drains admitted HTTP, and leaves Client resources untouched', async () => {
    const entered = deferred(); const release = deferred(); const f = fixture(async () => { entered.resolve(); await release.promise; return response(); });
    const sharedHash = vi.spyOn(f.client.rest, 'clearHashSweeper'); const sharedHandler = vi.spyOn(f.client.rest, 'clearHandlerSweeper');
    const active = f.transport.disconnectOnce(f.guild, memberId, async () => true); await entered.promise;
    let drained = false; const stopped = f.transport.stop().then(() => { drained = true; });
    await Promise.resolve(); expect(drained).toBe(false);
    await expect(f.transport.disconnectOnce(f.guild, memberId, async () => true)).rejects.toThrow();
    release.resolve(); await active; await stopped; expect(f.http).toHaveBeenCalledOnce();
    expect(sharedHash).not.toHaveBeenCalled(); expect(sharedHandler).not.toHaveBeenCalled();
  });
  it('drains a failed HTTP response body before stop finishes, without replay', async () => {
    const entered = deferred(); const release = deferred();
    const f = fixture(async () => {
      const failed = response(500);
      vi.spyOn(failed, 'arrayBuffer').mockImplementation(async () => { entered.resolve(); await release.promise; return new ArrayBuffer(0); });
      return failed;
    });
    const result = f.transport.disconnectOnce(f.guild, memberId, async () => true).catch((error: unknown) => error);
    expect(await Promise.race([entered.promise.then(() => 'draining'), result.then(() => 'finished')])).toBe('draining');
    let stopped = false; const stopping = f.transport.stop().then(() => { stopped = true; });
    await Promise.resolve(); expect(stopped).toBe(false); release.resolve(); await stopping;
    expect(await result).toMatchObject({ code: 'DISCORD_FAILURE' }); expect(f.http).toHaveBeenCalledOnce();
  });
});
