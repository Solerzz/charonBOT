import type { Interaction } from 'discord.js';
import { Writable } from 'node:stream';

import { describe, expect, it, vi } from 'vitest';

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
    expect(events).toEqual([
      'database:connect',
      'discord:destroy',
      'database:disconnect',
    ]);
  });

  it('releases resources when Discord login fails', async () => {
    const events: string[] = [];
    const ports = dependencies(events);
    ports.discord.login = async () => {
      events.push('discord:login');
      throw new Error('login failed');
    };
    const application = createApplication(config, {
      ...ports,
      logger: createLogger({ level: 'silent' }),
    });

    await expect(application.start()).rejects.toThrow('login failed');
    expect(events).toEqual([
      'database:connect',
      'database:query',
      'discord:listener',
      'discord:login',
      'discord:destroy',
      'database:disconnect',
    ]);
  });

  it('shares one startup across concurrent start calls', async () => {
    const events: string[] = [];
    const ports = dependencies(events);
    const application = createApplication(config, {
      ...ports,
      logger: createLogger({ level: 'silent' }),
    });

    await Promise.all([application.start(), application.start()]);

    expect(events).toEqual([
      'database:connect',
      'database:query',
      'discord:listener',
      'discord:login',
    ]);
  });

  it('does not continue to Discord login when stop begins during startup', async () => {
    const events: string[] = [];
    let releaseConnection: (() => void) | undefined;
    const connectionGate = new Promise<void>((resolve) => {
      releaseConnection = resolve;
    });
    const ports = dependencies(events);
    ports.database.$connect = async () => {
      events.push('database:connect');
      await connectionGate;
    };
    const application = createApplication(config, {
      ...ports,
      logger: createLogger({ level: 'silent' }),
    });

    const starting = application.start();
    const stopping = application.stop('SIGTERM');
    releaseConnection?.();
    await Promise.all([starting, stopping]);

    expect(events).toEqual([
      'database:connect',
      'database:query',
      'discord:destroy',
      'database:disconnect',
    ]);
  });

  it('contains a rejected dispatch at the Discord event boundary', async () => {
    const logLines: string[] = [];
    const destination = new Writable({
      write(chunk, _encoding, callback) {
        logLines.push(chunk.toString());
        callback();
      },
    });
    let interactionListener: ((interaction: Interaction) => void) | undefined;
    const events: string[] = [];
    const ports = dependencies(events);
    ports.discord.on = (_event, listener) => {
      interactionListener = listener;
    };
    ports.dispatcher.dispatch = async () => {
      throw new Error('dispatch-secret-token');
    };
    const application = createApplication(config, {
      ...ports,
      logger: createLogger({ level: 'error', destination }),
    });
    await application.start();

    interactionListener?.({ id: 'interaction-4' } as Interaction);
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(logLines.join('')).toContain('Interaction dispatch failed');
    expect(logLines.join('')).not.toContain('dispatch-secret-token');
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
      const registered = new Map<string, () => void>();
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
      registered.get(signal)?.();

      await vi.waitFor(() => expect(received).toEqual([signal]));
    },
  );

  it('reports an asynchronous shutdown failure without exposing the error', async () => {
    const registered = new Map<string, () => void>();
    const source: SignalSource = {
      once: (event, listener) => {
        registered.set(event, listener);
        return source;
      },
    };
    const failures: string[] = [];

    registerShutdownSignals(
      {
        start: async () => undefined,
        stop: async () => {
          throw new Error('shutdown-secret-token');
        },
      },
      source,
      (signal) => failures.push(signal),
    );
    registered.get('SIGINT')?.();

    await vi.waitFor(() => expect(failures).toEqual(['SIGINT']));
  });
});
