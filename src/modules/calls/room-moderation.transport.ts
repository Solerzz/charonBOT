import { AsyncLocalStorage } from 'node:async_hooks';
import { DefaultRestOptions, REST, RESTEvents, Routes, type Client, type Guild, type RateLimitData } from 'discord.js';

import { discordIdSchema } from '../setup/setup.schemas.js';
import { RoomActionError } from './room.types.js';

export interface RoomModerationTransport {
  disconnectOnce(guild: Guild, memberId: string, beforeSend: () => Promise<boolean>): Promise<'disconnected' | 'not-in-room'>;
  stop(): Promise<void>;
}

class NotInRoom extends Error {}

export function createRoomModerationTransport(client: Client): RoomModerationTransport {
  const invocation = new AsyncLocalStorage<{ beforeSend: () => Promise<boolean>; sent: boolean }>();
  const pending = new Set<Promise<'disconnected' | 'not-in-room'>>();
  let closed = false; let cooldownUntil = 0;
  const limited = (data: RateLimitData) => {
    const durations = [data.retryAfter, data.timeToReset, data.sublimitTimeout];
    const duration = durations.every(Number.isFinite) ? Math.max(...durations, 15_000) : Infinity;
    cooldownUntil = Math.max(cooldownUntil, Date.now() + duration);
  };
  const assertAvailable = () => {
    if (Date.now() < cooldownUntil || client.rest.globalDelay !== null
      || (client.rest.globalRemaining <= 0 && client.rest.globalReset > Date.now())) throw new RoomActionError('MODERATION_INCOMPLETE');
  };
  const rest = new REST({ retries: 0, rejectOnRateLimit: () => true, timeout: 15_000,
    makeRequest: async (url, init) => {
      const context = invocation.getStore();
      if (!context || context.sent) throw new RoomActionError('MODERATION_INCOMPLETE');
      assertAvailable();
      // REST invokes this only AFTER its route/global queue. Do not move the
      // guard to patch(): that would authorize a stale queued invocation.
      if (!await context.beforeSend()) throw new NotInRoom();
      assertAvailable();
      if (init.signal?.aborted) throw new RoomActionError('MODERATION_INCOMPLETE');
      context.sent = true;
      const response = await DefaultRestOptions.makeRequest(url, { ...init, redirect: 'error' });
      if (response.status < 200 || (response.status >= 300 && response.status < 400)) {
        await response.arrayBuffer();
        throw new RoomActionError('DISCORD_FAILURE');
      }
      if (response.status === 429) {
        // Discord can put retry_after in the JSON body without Retry-After.
        // Consume the rejected response; the SDK will reject this 429, not
        // parse it or replay it. Unknown cooldowns fail closed until shutdown.
        let bodySeconds = 0;
        try { bodySeconds = Number(((await response.json()) as { retry_after?: unknown }).retry_after); } catch { /* Unknown duration below. */ }
        const headerSeconds = Number(response.headers.get('retry-after'));
        const seconds = Math.max(Number.isFinite(headerSeconds) && headerSeconds > 0 ? headerSeconds : 0,
          Number.isFinite(bodySeconds) && bodySeconds > 0 ? bodySeconds : 0);
        cooldownUntil = Math.max(cooldownUntil, seconds > 0 ? Date.now() + seconds * 1_000 + 50 : Infinity);
      } else if (response.status >= 500) await response.arrayBuffer();
      return response;
    },
  });
  client.rest.on(RESTEvents.RateLimited, limited);
  rest.on(RESTEvents.RateLimited, limited);
  return {
    disconnectOnce(guild, memberId, beforeSend) {
      const token = client.token;
      if (closed || guild.client !== client || !token) return Promise.reject(new RoomActionError('MODERATION_INCOMPLETE'));
      const work = invocation.run({ beforeSend, sent: false }, async (): Promise<'disconnected' | 'not-in-room'> => {
        discordIdSchema.parse(guild.id); discordIdSchema.parse(memberId); assertAvailable();
        rest.setToken(token);
        try {
          await rest.patch(Routes.guildMember(guild.id, memberId), { body: { channel_id: null } });
          return 'disconnected';
        } catch (error) {
          if (error instanceof NotInRoom) return 'not-in-room';
          throw error instanceof RoomActionError ? error : new RoomActionError('DISCORD_FAILURE');
        }
      });
      pending.add(work);
      void work.finally(() => pending.delete(work)).catch(() => {});
      return work;
    },
    async stop() {
      closed = true;
      await Promise.allSettled([...pending]);
      client.rest.off(RESTEvents.RateLimited, limited);
      rest.clearHashSweeper(); rest.clearHandlerSweeper(); rest.removeAllListeners();
      rest.handlers.clear(); rest.hashes.clear(); invocation.disable();
      rest.setToken('');
    },
  };
}
