import { ChannelType, Events, MessageFlags, PermissionFlagsBits, PermissionsBitField, type Interaction, type VoiceState } from 'discord.js';
import { Writable } from 'node:stream';

import { describe, expect, it, vi } from 'vitest';

import {
  createApplication,
  createDefaultDispatcher,
  createDefaultVoiceDispatcher,
  registerShutdownSignals,
  type DiscordClientPort,
  type InteractionDispatcher,
  type SignalSource,
} from '../../src/application.js';
import type { AppConfig } from '../../src/core/config/env.js';
import type { DatabaseClient } from '../../src/core/database/prisma.js';
import { createLogger } from '../../src/core/logger/logger.js';
import { createPrismaClient } from '../../src/core/database/prisma.js';
import { InteractionRegistry } from '../../src/core/discord/interactions/interaction-registry.js';
import { VoiceStateHandler, type VoiceStateDispatcher } from '../../src/modules/calls/voice-state.handler.js';
import { CallInteractions } from '../../src/modules/calls/call.interactions.js';
import { SetupCommand } from '../../src/modules/setup/setup.command.js';
import { SetupInteractions } from '../../src/modules/setup/setup.interactions.js';
import { StatusCommand } from '../../src/modules/status/status.command.js';

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
  voiceDispatcher: VoiceStateDispatcher;
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
      off: () => undefined,
      isReady: () => true,
      guilds: { fetch: async () => { throw new Error('Unexpected guild fetch in health-only fixture'); } },
      on: (event) => {
        events.push(`discord:${event}`);
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
    voiceDispatcher: { dispatch: async () => undefined },
  };
}

function shutdownFixture() {
  const events: string[] = [];
  const ports = dependencies(events);
  let interactionListener!: (interaction: Interaction) => void;
  let voiceListener!: (oldState: VoiceState, newState: VoiceState) => void;
  ports.discord.on = (event, listener) => {
    if (event === Events.InteractionCreate) {
      interactionListener = listener as typeof interactionListener;
    } else {
      voiceListener = listener as typeof voiceListener;
    }
  };
  const oldState = {
    id: '52345678901234567', guild: { id: '12345678901234567' },
    channelId: '22345678901234567',
  } as VoiceState;
  const emit = (kind: 'interaction' | 'voice') => {
    if (kind === 'interaction') interactionListener({ id: '72345678901234567' } as Interaction);
    else voiceListener(oldState, { ...oldState, channelId: null } as VoiceState);
  };
  const app = createApplication(config, { ...ports, logger: createLogger({ level: 'silent' }) });
  return { events, ports, emit, app };
}

function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => { release = resolve; });
  return { promise, release };
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
      'discord:interactionCreate',
      'discord:voiceStateUpdate',
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
      'discord:interactionCreate',
      'discord:voiceStateUpdate',
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
      'discord:interactionCreate',
      'discord:voiceStateUpdate',
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

  it.each([false, true])('contains interaction dispatch failure (synchronous: %s)', async (synchronous) => {
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
    ports.discord.on = (event, listener) => {
      if (event === Events.InteractionCreate) {
        interactionListener = listener as (interaction: Interaction) => void;
      }
    };
    const failure = new Error('dispatch-secret-token');
    ports.dispatcher.dispatch = synchronous
      ? () => { throw failure; }
      : async () => { throw failure; };
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

  it.each(['interaction', 'voice'] as const)(
    'drains accepted %s work, including work queued before stop, and ignores later events',
    async (kind) => {
      const f = shutdownFixture();
      const held = gate();
      const operation = vi.fn(async () => {
        f.events.push(`${kind}:started`);
        await held.promise;
        f.events.push(`${kind}:completed`);
        return true;
      });
      f.ports.dispatcher.dispatch = operation;
      f.ports.voiceDispatcher.dispatch = async () => { await operation(); };
      await f.app.start();
      f.events.length = 0;

      // Acceptance happens synchronously even though dispatch starts in a microtask.
      f.emit(kind);
      let stopped = false;
      const stopping = f.app.stop('SIGTERM').then(() => { stopped = true; });
      const stoppingAgain = f.app.stop('SIGINT');
      f.emit('interaction');
      f.emit('voice');
      try {
        await new Promise<void>((resolve) => setImmediate(resolve));
        expect(f.events).toEqual([`${kind}:started`]);
        expect(stopped).toBe(false);
        expect(operation).toHaveBeenCalledOnce();
      } finally {
        held.release();
        await Promise.all([stopping, stoppingAgain]);
      }
      expect(f.events).toEqual([`${kind}:started`, `${kind}:completed`, 'discord:destroy', 'database:disconnect']);
      f.emit('interaction');
      f.emit('voice');
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(operation).toHaveBeenCalledOnce();
    },
  );

  it('waits for both dispatch types and contains rejection without blocking the drain', async () => {
    const f = shutdownFixture();
    const interactionGate = gate();
    const voiceGate = gate();
    f.ports.dispatcher.dispatch = async () => {
      f.events.push('interaction:started');
      await interactionGate.promise;
      f.events.push('interaction:rejected');
      throw new Error('private-dispatch-error');
    };
    f.ports.voiceDispatcher.dispatch = async () => {
      f.events.push('voice:started');
      await voiceGate.promise;
      f.events.push('voice:completed');
    };
    await f.app.start();
    f.events.length = 0;
    f.emit('interaction');
    f.emit('voice');
    await new Promise<void>((resolve) => setImmediate(resolve));
    const stopping = f.app.stop('SIGTERM');
    interactionGate.release();
    try {
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(f.events).toEqual(['interaction:started', 'voice:started', 'interaction:rejected']);
    } finally {
      voiceGate.release();
      await stopping;
    }
    expect(f.events).toEqual(['interaction:started', 'voice:started', 'interaction:rejected', 'voice:completed', 'discord:destroy', 'database:disconnect']);
  });

  it.each([
    ['interaction', false], ['voice', false],
    ['interaction', true], ['voice', true],
  ] as const)(
    'drains rejected %s work before startup rollback (concurrent stop: %s)',
    async (kind, concurrentStop) => {
      const f = shutdownFixture();
      const loginGate = gate();
      const workGate = gate();
      f.ports.discord.login = async () => {
        f.emit(kind);
        await loginGate.promise;
        throw new Error('login failed');
      };
      const operation = async () => {
        f.events.push(`${kind}:started`);
        await workGate.promise;
        f.events.push(`${kind}:rejected`);
        throw new TypeError('private-dispatch-error');
      };
      f.ports.dispatcher.dispatch = operation;
      f.ports.voiceDispatcher.dispatch = operation;
      const starting = f.app.start();
      const startupFailure = expect(starting).rejects.toThrow('login failed');
      await new Promise<void>((resolve) => setImmediate(resolve));
      f.events.length = 0;
      const stopping = concurrentStop ? f.app.stop('SIGTERM') : Promise.resolve();
      loginGate.release();
      try {
        await new Promise<void>((resolve) => setImmediate(resolve));
        // Rollback itself closes admission, even without an explicit stop.
        f.emit('interaction');
        f.emit('voice');
        await new Promise<void>((resolve) => setImmediate(resolve));
        expect(f.events).toEqual([]);
      } finally {
        workGate.release();
        await Promise.all([startupFailure, stopping]);
      }
      expect(f.events).toEqual([`${kind}:rejected`, 'discord:destroy', 'database:disconnect']);
      await f.app.stop('SIGINT');
      expect(f.events).toHaveLength(3);
    },
  );

  it.each([false, true])('contains voice dispatch failure (synchronous: %s) with ID-only logs', async (synchronous) => {
    const lines: string[] = [];
    const destination = new Writable({ write(chunk, _encoding, done) { lines.push(chunk.toString()); done(); } });
    const ports = dependencies([]);
    let voiceListener: ((oldState: VoiceState, newState: VoiceState) => void) | undefined;
    ports.discord.on = (event, listener) => {
      if (event === Events.VoiceStateUpdate) voiceListener = listener as typeof voiceListener;
    };
    const failure = new TypeError('private-member-room-content');
    ports.voiceDispatcher.dispatch = synchronous
      ? () => { throw failure; }
      : async () => { throw failure; };
    const app = createApplication(config, { ...ports, logger: createLogger({ level: 'error', destination }) });
    await app.start();
    const oldState = { id: '52345678901234567', guild: { id: '12345678901234567' }, channelId: '22345678901234567' } as VoiceState;
    const newState = { ...oldState, channelId: null } as VoiceState;
    expect(voiceListener).toBeTypeOf('function');
    voiceListener!(oldState, newState);
    await new Promise<void>((resolve) => setImmediate(resolve));
    const log = JSON.parse(lines.join('')) as Record<string, unknown>;
    expect(log).toMatchObject({ guildDiscordId: '12345678901234567', memberDiscordId: '52345678901234567', oldChannelDiscordId: '22345678901234567', newChannelDiscordId: null, errorName: 'TypeError' });
    expect(Object.keys(log).sort()).toEqual(['errorName', 'guildDiscordId', 'hostname', 'level', 'memberDiscordId', 'msg', 'newChannelDiscordId', 'oldChannelDiscordId', 'pid', 'time'].sort());
    expect(lines.join('')).not.toContain('private-member-room-content');
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

describe('default module composition', () => {
  it('registers status, setup command and setup actions without connecting', async () => {
    const database = createPrismaClient(config.database);
    const connect = vi.spyOn(database, '$connect');
    const register = vi.spyOn(InteractionRegistry.prototype, 'register');
    try {
      const registry = createDefaultDispatcher(createLogger({ level: 'silent' }), database);
      expect(registry).toBeInstanceOf(InteractionRegistry);
      expect(register.mock.calls.map(([handler]) => handler.constructor)).toEqual([StatusCommand, SetupCommand, SetupInteractions, CallInteractions]);
      expect(connect).not.toHaveBeenCalled();
    } finally {
      register.mockRestore();
      await database.$disconnect();
    }
  });

  it('composes both default dispatchers using the existing runtime Prisma client', async () => {
    const database = createPrismaClient(config.database);
    vi.spyOn(database, '$connect').mockResolvedValue(undefined);
    vi.spyOn(database, '$queryRawUnsafe').mockResolvedValue([]);
    vi.spyOn(database.pendingOwnershipTransfer, 'deleteMany').mockResolvedValue({ count: 0 });
    vi.spyOn(database.temporaryRoom, 'findMany').mockResolvedValue([]);
    const lookup = vi.spyOn(database.temporaryRoom, 'findFirst').mockResolvedValue(null);
    const discord = dependencies([]).discord;
    let interactionListener: ((interaction: Interaction) => void) | undefined;
    let voiceListener: ((oldState: VoiceState, newState: VoiceState) => void) | undefined;
    discord.on = (event, listener) => {
      if (event === Events.InteractionCreate) interactionListener = listener as typeof interactionListener;
      if (event === Events.VoiceStateUpdate) voiceListener = listener as typeof voiceListener;
    };
    const app = createApplication(config, { database, discord, logger: createLogger({ level: 'silent' }) });
    try {
      await app.start();
      const reply = vi.fn().mockResolvedValue(undefined);
      interactionListener!({ commandName: 'status', isChatInputCommand: () => true, reply } as unknown as Interaction);
      const guild = { id: '12345678901234567' };
      const member = { id: '52345678901234567', guild, user: { bot: false }, displayName: 'Member', presence: null };
      const oldState = { guild, member, id: member.id, channelId: '22345678901234567', channel: null } as unknown as VoiceState;
      voiceListener!(oldState, { ...oldState, channelId: null } as VoiceState);
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(reply).toHaveBeenCalledExactlyOnceWith({ content: 'Charon está online.', flags: MessageFlags.Ephemeral });
      expect(lookup).toHaveBeenCalledOnce();
    } finally {
      await app.stop('SIGTERM');
    }
  });

  it('routes setup command and actions through the real Prisma repository and Discord gateway', async () => {
    const database = createPrismaClient(config.database);
    const list = vi.spyOn(database.voiceCreator, 'findMany').mockResolvedValue([]);
    const registry = createDefaultDispatcher(createLogger({ level: 'silent' }), database);
    const permissions = new PermissionsBitField(PermissionFlagsBits.Administrator);
    const guildId = '12345678901234567';
    const channelId = '42345678901234567';
    const fetch = vi.fn(async (id: string) => ({ id, guildId, type: ChannelType.GuildText, isThread: () => false, permissionsFor: () => permissions }));
    const guild = { id: guildId, channels: { fetch }, members: { fetchMe: vi.fn(async () => ({ permissions })) } };
    const editReply = vi.fn().mockResolvedValue(undefined);
    const deferReply = vi.fn().mockResolvedValue(undefined);
    const deferUpdate = vi.fn().mockResolvedValue(undefined);
    const reply = vi.fn().mockResolvedValue(undefined);
    const common = { id: '72345678901234567', guildId, guild, channelId, memberPermissions: permissions, inGuild: () => true, editReply, reply, isRepliable: () => true };
    try {
      expect(await registry.dispatch({ ...common, commandName: 'setup', options: { getSubcommand: () => 'init' }, isChatInputCommand: () => true, deferReply } as unknown as Interaction)).toBe(true);
      expect(deferReply).toHaveBeenCalledExactlyOnceWith({ flags: MessageFlags.Ephemeral });
      expect(list).toHaveBeenCalledExactlyOnceWith({ where: { guildDiscordId: guildId, deletedAt: null }, orderBy: { createdAt: 'asc' } });
      expect(editReply).toHaveBeenCalledOnce();

      expect(await registry.dispatch({ ...common, customId: 'setup:v1:cancel:123e4567-e89b-42d3-a456-426614174000', isChatInputCommand: () => false, isButton: () => true, isAnySelectMenu: () => false, isModalSubmit: () => false, message: { flags: { has: (flag: number) => flag === MessageFlags.Ephemeral } }, deferUpdate } as unknown as Interaction)).toBe(true);
      expect(deferUpdate).toHaveBeenCalledOnce();
      expect(list).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenCalledWith(channelId, { force: true });
      expect(editReply).toHaveBeenCalledTimes(2);
      expect(reply).not.toHaveBeenCalled();
    } finally {
      list.mockRestore();
      await database.$disconnect();
    }
  });

  it('uses the supplied Prisma client and shares member serialization across voice events', async () => {
    const database = createPrismaClient(config.database);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const lookup = vi.spyOn(database.temporaryRoom, 'findFirst').mockImplementationOnce(
      () => gate.then(() => null) as ReturnType<typeof database.temporaryRoom.findFirst>,
    ).mockResolvedValue(null);
    const creatorLookup = vi.spyOn(database.voiceCreator, 'findFirst').mockResolvedValue(null);
    const handler = createDefaultVoiceDispatcher(createLogger({ level: 'silent' }), database);
    expect(handler).toBeInstanceOf(VoiceStateHandler);
    const guild = { id: '12345678901234567' };
    const member = { id: '52345678901234567', guild, user: { bot: false }, displayName: 'Private name', presence: null };
    const oldState = { id: member.id, guild, member, channelId: null, channel: null } as unknown as VoiceState;
    const newState = { ...oldState, channelId: '22345678901234567' } as VoiceState;
    try {
      const first = handler.dispatch(oldState, newState);
      const second = handler.dispatch(oldState, newState);
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(lookup).toHaveBeenCalledTimes(1);
      release();
      await Promise.all([first, second]);
      expect(lookup).toHaveBeenCalledTimes(2);
      expect(lookup).toHaveBeenCalledWith({ where: { channelDiscordId: '22345678901234567', status: { in: ['CREATING', 'ACTIVE', 'CLOSING'] } } });
      expect(creatorLookup).toHaveBeenCalledTimes(2);
    } finally {
      release();
      lookup.mockRestore();
      creatorLookup.mockRestore();
      await database.$disconnect();
    }
  });
});
