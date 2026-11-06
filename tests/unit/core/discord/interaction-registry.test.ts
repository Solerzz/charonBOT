import { Writable } from 'node:stream';

import {
  GatewayIntentBits,
  MessageFlags,
  type Interaction,
} from 'discord.js';
import { describe, expect, it } from 'vitest';

import { createDiscordClient } from '../../../../src/core/discord/client.js';
import type { InteractionHandler } from '../../../../src/core/discord/interactions/interaction-handler.js';
import { InteractionRegistry } from '../../../../src/core/discord/interactions/interaction-registry.js';
import { createLogger } from '../../../../src/core/logger/logger.js';

function interactionFrom(value: Record<string, unknown>): Interaction {
  return value as unknown as Interaction;
}

function createSilentLogger(): ReturnType<typeof createLogger> {
  const destination = new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });

  return createLogger({ level: 'silent', destination });
}

describe('createDiscordClient', () => {
  it('subscribes only to guild and voice-state gateway events', () => {
    const client = createDiscordClient();

    expect(client.options.intents.has(GatewayIntentBits.Guilds)).toBe(true);
    expect(client.options.intents.has(GatewayIntentBits.GuildVoiceStates)).toBe(
      true,
    );
    expect(client.options.intents.toArray()).toHaveLength(2);
  });
});

describe('InteractionRegistry', () => {
  it('dispatches to the first matching handler', async () => {
    const interaction = interactionFrom({ id: 'interaction-1' });
    let executions = 0;
    const handler: InteractionHandler<Interaction> = {
      canHandle: (candidate): candidate is Interaction =>
        candidate.id === interaction.id,
      execute: async () => {
        executions += 1;
      },
    };
    const registry = new InteractionRegistry(createSilentLogger());
    registry.register(handler);

    await expect(registry.dispatch(interaction)).resolves.toBe(true);
    expect(executions).toBe(1);
  });

  it('returns false when no handler matches', async () => {
    const registry = new InteractionRegistry(createSilentLogger());

    await expect(
      registry.dispatch(interactionFrom({ id: 'unmatched' })),
    ).resolves.toBe(false);
  });

  it('contains handler errors and sends a safe ephemeral response', async () => {
    const logLines: string[] = [];
    const destination = new Writable({
      write(chunk, _encoding, callback) {
        logLines.push(chunk.toString());
        callback();
      },
    });
    const logger = createLogger({ level: 'error', destination });
    let reply: unknown;
    const interaction = interactionFrom({
      id: 'interaction-2',
      replied: false,
      deferred: false,
      isRepliable: () => true,
      reply: async (payload: unknown) => {
        reply = payload;
      },
    });
    const handler: InteractionHandler<Interaction> = {
      canHandle: (candidate): candidate is Interaction =>
        candidate.id === interaction.id,
      execute: async () => {
        throw new Error('discord-secret-token');
      },
    };
    const registry = new InteractionRegistry(logger);
    registry.register(handler);

    await expect(registry.dispatch(interaction)).resolves.toBe(true);
    expect(reply).toEqual({
      content: 'Não foi possível concluir esta ação.',
      flags: MessageFlags.Ephemeral,
    });
    expect(logLines.join('')).not.toContain('discord-secret-token');
  });

  it('contains matcher errors and sends a safe ephemeral response', async () => {
    let reply: unknown;
    const interaction = interactionFrom({
      id: 'interaction-3',
      replied: false,
      deferred: false,
      isRepliable: () => true,
      reply: async (payload: unknown) => {
        reply = payload;
      },
    });
    const handler: InteractionHandler<Interaction> = {
      canHandle: (_candidate): _candidate is Interaction => {
        throw new Error('matcher-secret-token');
      },
      execute: async () => undefined,
    };
    const registry = new InteractionRegistry(createSilentLogger());
    registry.register(handler);

    await expect(registry.dispatch(interaction)).resolves.toBe(true);
    expect(reply).toEqual({
      content: 'Não foi possível concluir esta ação.',
      flags: MessageFlags.Ephemeral,
    });
  });
});
