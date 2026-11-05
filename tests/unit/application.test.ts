import type { Interaction } from 'discord.js';
import { describe, expect, it } from 'vitest';

import {
  createApplication,
  registerShutdownSignals,
  type DiscordClientPort,
  type InteractionDispatcher,
  type SignalSource,
} from '../../src/application.js';
import type { AppConfig } from '../../src/core/config/env.js';
import type { DatabaseClient } from '../../src/core/database/prisma.js';
import { createLogger } from '../../src/core/logger/logger.js';

const config: AppConfig = {
  nodeEnv: 'test',
  logLevel: 'silent',
  discord: { token: 'discord-token', clientId: '123456789012345678' },
  database: {
    url: 'postgresql://charon:secret@pool.example.com:6543/charon',
    directUrl: 'postgresql://charon:secret@db.example.com:5432/charon',
  },
};

function dependencies(events: string[]): {
  database: DatabaseClient;
  discord: DiscordClientPort;
  dispatcher: InteractionDispatcher;
} {
  return {
    database: {
      $connect: async () => {
        events.push('database:connect');
      },
      $queryRawUnsafe: async <T>() => {
        events.push('database:query');
        return [{ connected: 1 }] as T;
      },
      $disconnect: async () => {
        events.push('database:disconnect');
      },
    },
    discord: {
      on: () => {
        events.push('discord:listener');
      },
      login: async () => {
        events.push('discord:login');
      },
      destroy: () => {
        events.push('discord:destroy');
      },
    },
    dispatcher: {
      dispatch: async (_interaction: Interaction) => true,
    },
  };
}

describe('application lifecycle', () => {
  it('checks the database and attaches listeners before Discord login', async () => {
    const events: string[] = [];
    const ports = dependencies(events);
    const application = createApplication(config, {
      ...ports,
      logger: createLogger({ level: 'silent' }),
    });

    await application.start();

    expect(events).toEqual([
      'database:connect',
      'database:query',
      'discord:listener',
      'discord:login',
    ]);
  });

  it('does not log in to Discord when the database check fails', async () => {
    const events: string[] = [];
    const ports = dependencies(events);
    ports.database.$connect = async () => {
      events.push('database:connect');
      throw new Error('connection failed');
    };
    const application = createApplication(config, {
      ...ports,
      logger: createLogger({ level: 'silent' }),
    });

    await expect(application.start()).rejects.toThrow(
      'Database connection check failed',
    );
    expect(events).toEqual(['database:connect']);
  });

  it('destroys Discord and disconnects the database only once', async () => {
    const events: string[] = [];
    const ports = dependencies(events);
    const application = createApplication(config, {
      ...ports,
      logger: createLogger({ level: 'silent' }),
    });

    await application.stop('SIGINT');
    await application.stop('SIGTERM');

    expect(events).toEqual(['discord:destroy', 'database:disconnect']);
  });

  it.each(['SIGINT', 'SIGTERM'] as const)(
    'registers %s as a graceful shutdown signal',
    async (signal) => {
      const registered = new Map<string, () => Promise<void>>();
      const source: SignalSource = {
        once: (event, listener) => {
          registered.set(event, listener);
          return source;
        },
      };
      const received: string[] = [];

      registerShutdownSignals(
        {
          start: async () => undefined,
          stop: async (value) => {
            received.push(value);
          },
        },
        source,
      );
      await registered.get(signal)?.();

      expect(received).toEqual([signal]);
    },
  );
});
