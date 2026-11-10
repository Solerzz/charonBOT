import { describe, expect, it, vi } from 'vitest';

import { createDiscordClient } from '../../../../src/core/discord/client.js';

describe('Discord client transport', () => {
  it.each(['500', 'timeout'] as const)('does not replay a channel POST after %s on the shared REST client', async (failure) => {
    const client = createDiscordClient();
    const makeRequest = vi.fn(async () => {
      if (failure === 'timeout') throw Object.assign(new Error('stub timeout'), { name: 'AbortError' });
      return {
        status: 500, statusText: 'Internal Server Error', ok: false,
        headers: new Headers(), body: null, bodyUsed: false,
        text: async () => 'server error', json: async () => ({ message: 'server error' }),
        arrayBuffer: async () => new ArrayBuffer(0),
      };
    });
    client.rest.options.makeRequest = makeRequest;
    client.rest.setToken('stub-only-not-a-credential');
    try {
      await expect(client.rest.post('/guilds/12345678901234567/channels', {
        body: { name: 'Entrada', type: 2, user_limit: 0 },
      })).rejects.toThrow();
      expect(makeRequest).toHaveBeenCalledOnce();
      expect(client.rest.options.retries).toBe(0);
      expect(client.rest.options.rejectOnRateLimit).toBeNull();
    } finally {
      await client.destroy();
    }
  });
});
