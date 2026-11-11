import { Events, type Guild, type Interaction, type VoiceState } from 'discord.js';
import type { Logger } from 'pino';

import type { AppConfig } from './core/config/env.js';
import {
  checkDatabase,
  createPrismaClient,
  disconnectDatabase,
  type DatabaseClient,
} from './core/database/prisma.js';
import { createDiscordClient } from './core/discord/client.js';
import { InteractionRegistry } from './core/discord/interactions/interaction-registry.js';
import { createLogger } from './core/logger/logger.js';
import type { PrismaClient } from './generated/prisma/client.js';
import { PrismaTemporaryRoomRepository } from './modules/calls/call.repository.js';
import { CallService } from './modules/calls/call.service.js';
import { CallInteractions } from './modules/calls/call.interactions.js';
import { createRoomRuntime, type RoomRuntime } from './modules/calls/room.runtime.js';
import {
  VoiceStateHandler,
  type VoiceStateDispatcher,
} from './modules/calls/voice-state.handler.js';
import { SetupCommand } from './modules/setup/setup.command.js';
import { DiscordSetupGateway } from './modules/setup/setup.discord.js';
import { SetupInteractions } from './modules/setup/setup.interactions.js';
import { PrismaVoiceCreatorRepository } from './modules/setup/setup.repository.js';
import { SetupService } from './modules/setup/setup.service.js';
import { SetupCreationInteractions } from './modules/setup/setup-creation.interactions.js';
import { SetupCreationService } from './modules/setup/setup-creation.service.js';
import { SetupDraftStore } from './modules/setup/setup-drafts.js';
import { StatusCommand } from './modules/status/status.command.js';

export interface DiscordClientPort {
  on(event: typeof Events.ClientReady, listener: () => void): unknown;
  off(event: typeof Events.ClientReady, listener: () => void): unknown;
  isReady(): boolean;
  guilds: { fetch(guildId: string): Promise<Guild> };
  on(
    event: typeof Events.InteractionCreate,
    listener: (interaction: Interaction) => void,
  ): unknown;
  on(
    event: typeof Events.VoiceStateUpdate,
    listener: (oldState: VoiceState, newState: VoiceState) => void,
  ): unknown;
  login(token: string): Promise<unknown>;
  destroy(): void;
}

export interface InteractionDispatcher {
  dispatch(interaction: Interaction): Promise<boolean>;
}

export interface Application {
  start(): Promise<void>;
  stop(signal: string): Promise<void>;
}

export interface SignalSource {
  once(event: 'SIGINT' | 'SIGTERM', listener: () => void): unknown;
}

interface ApplicationOverrides {
  readonly logger?: Logger;
  readonly database?: DatabaseClient;
  readonly discord?: DiscordClientPort;
  readonly dispatcher?: InteractionDispatcher;
  readonly voiceDispatcher?: VoiceStateDispatcher;
}

export function createApplication(
  config: AppConfig,
  overrides: ApplicationOverrides = {},
): Application {
  const logger = overrides.logger ?? createLogger({ level: config.logLevel });
  const database = overrides.database ?? createPrismaClient(config.database);
  const discord: DiscordClientPort = overrides.discord ?? createDiscordClient();
  const drafts = new SetupDraftStore();
  // Lifecycle doubles remain health-only when explicit dispatchers are supplied.
  const runtimeDatabase = (): PrismaClient => {
    if (!hasRuntimeRepositories(database)) {
      throw new Error(
        'Default dispatchers require a PrismaClient; supply both dispatchers for a health-only database',
      );
    }
    return database;
  };
  const runtime = !overrides.dispatcher || !overrides.voiceDispatcher
    ? createRoomRuntime(runtimeDatabase(), logger) : undefined;
  const dispatcher =
    overrides.dispatcher ?? createDefaultDispatcher(logger, runtimeDatabase(), runtime, drafts);
  const voiceDispatcher =
    overrides.voiceDispatcher ?? createDefaultVoiceDispatcher(logger, runtimeDatabase(), runtime);
  let state: 'idle' | 'starting' | 'running' | 'stopping' | 'stopped' | 'failed' =
    'idle';
  let startPromise: Promise<void> | undefined;
  let stopPromise: Promise<void> | undefined;
  let closePromise: Promise<void> | undefined;
  const inFlight = new Set<Promise<unknown>>();
  const abort = new AbortController();
  let settleReadiness!: (admitted: boolean) => void;
  const readiness = runtime ? new Promise<boolean>((resolve) => { settleReadiness = resolve; }) : Promise.resolve(true);
  const aborted = new Promise<false>((resolve) => abort.signal.addEventListener('abort', () => resolve(false), { once: true }));

  const acceptDispatch = (
    operation: () => Promise<unknown>,
    onFailure: (error: unknown) => void,
  ): void => {
    if (state !== 'starting' && state !== 'running') return;
    // Register synchronously, before the dispatcher gets its first microtask.
    const work = Promise.resolve()
      .then(async () => { if (await readiness) return operation(); })
      .catch(onFailure)
      .finally(() => { inFlight.delete(work); });
    inFlight.add(work);
  };

  const closeResources = (): Promise<void> => {
    closePromise ??= (async () => {
      // Callers have already closed admission by entering stopping/failed.
      const timersDrained = runtime?.stop(Promise.allSettled([...inFlight]));
      await Promise.allSettled([...inFlight, timersDrained]);
      await drafts.dispose();
      discord.destroy();
      await disconnectDatabase(database);
    })();
    return closePromise;
  };

  return {
    async start(): Promise<void> {
      if (state === 'running') {
        return;
      }

      if (startPromise) {
        return startPromise;
      }

      if (state === 'stopping' || state === 'stopped' || state === 'failed') {
        throw new Error('Application cannot start after shutdown or failure');
      }

      state = 'starting';
      startPromise = (async () => {
        try {
          await checkDatabase(database);
          if (state !== 'starting') {
            return;
          }

          discord.on(Events.InteractionCreate, (interaction) => {
            acceptDispatch(
              () => dispatcher.dispatch(interaction),
              (error: unknown) => {
                logger.error(
                  {
                    interactionId: interaction.id,
                    errorName: error instanceof Error ? error.name : 'UnknownError',
                  },
                  'Interaction dispatch failed',
                );
              },
            );
          });
          discord.on(Events.VoiceStateUpdate, (oldState, newState) => {
            acceptDispatch(
              () => voiceDispatcher.dispatch(oldState, newState),
              (error: unknown) => {
                logger.error(
                  {
                    guildDiscordId: newState.guild.id,
                    memberDiscordId: newState.id,
                    oldChannelDiscordId: oldState.channelId,
                    newChannelDiscordId: newState.channelId,
                    errorName: error instanceof Error ? error.name : 'UnknownError',
                  },
                  'Voice state dispatch failed',
                );
              },
            );
          });
          // Subscribe before login: a synchronous ClientReady must not be lost.
          const ready = runtime ? waitForDiscordReady(discord, abort.signal) : Promise.resolve(true);
          const login = discord.login(config.discord.token);
          if (runtime) {
            if (!await Promise.race([login.then(() => true), aborted]) || !await ready) return;
          } else await login;
          if (state !== 'starting') {
            return;
          }
          if (runtime) await runtime.start((id) => discord.guilds.fetch(id));
          if (state !== 'starting') return;
          settleReadiness?.(true);
          state = 'running';
          logger.info('Charon started');
        } catch (error) {
          state = 'failed';
          abort.abort();
          settleReadiness?.(false);
          try {
            await closeResources();
          } catch (cleanupError) {
            logger.error(
              {
                errorName:
                  cleanupError instanceof Error
                    ? cleanupError.name
                    : 'UnknownError',
              },
              'Startup rollback failed',
            );
          }
          throw error;
        } finally {
          if (state !== 'running') settleReadiness?.(false);
        }
      })();

      return startPromise;
    },

    async stop(signal: string): Promise<void> {
      if (stopPromise) {
        return stopPromise;
      }

      state = 'stopping';
      abort.abort();
      settleReadiness?.(false);
      // Close timer admission now, not after startup or dispatches release locks.
      const timersDrained = runtime?.stop(Promise.allSettled([...inFlight]));
      stopPromise = (async () => {
        logger.info({ signal }, 'Charon stopping');
        await startPromise?.catch(() => undefined);
        await timersDrained;
        await closeResources();
        state = 'stopped';
        logger.info('Charon stopped');
      })();

      return stopPromise;
    },
  };
}

function waitForDiscordReady(discord: DiscordClientPort, signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    const finish = (ready: boolean) => {
      discord.off(Events.ClientReady, onReady);
      signal.removeEventListener('abort', onAbort);
      resolve(ready);
    };
    const onReady = () => finish(true);
    const onAbort = () => finish(false);
    discord.on(Events.ClientReady, onReady);
    signal.addEventListener('abort', onAbort, { once: true });
    if (signal.aborted) finish(false);
    else if (discord.isReady()) finish(true);
  });
}

function hasRuntimeRepositories(database: DatabaseClient): database is PrismaClient {
  // Prisma's generated proxy does not preserve instanceof PrismaClient.
  return 'voiceCreator' in database && 'temporaryRoom' in database;
}

export function registerShutdownSignals(
  application: Application,
  source: SignalSource = process,
  onFailure: (signal: 'SIGINT' | 'SIGTERM') => void = () => {
    console.error('Charon failed to stop cleanly.');
    process.exitCode = 1;
  },
): void {
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    source.once(signal, () => {
      void application.stop(signal).catch(() => onFailure(signal));
    });
  }
}

export function createDefaultDispatcher(
  logger: Logger,
  database: PrismaClient,
  runtime: RoomRuntime = createRoomRuntime(database, logger),
  drafts: SetupDraftStore = new SetupDraftStore(),
): InteractionRegistry {
  const setupRepository = new PrismaVoiceCreatorRepository(database);
  const setupService = new SetupService(setupRepository, (id) => runtime.synchronizeCreator(id), logger);
  const registry = new InteractionRegistry(logger);
  registry.register(new StatusCommand());
  registry.register(new SetupCommand(setupService));
  registry.register(
    new SetupInteractions(
      setupService,
      (interaction) => new DiscordSetupGateway(interaction.guild),
    ),
  );
  registry.register(new SetupCreationInteractions(drafts, new SetupCreationService(setupRepository, logger),
    (interaction) => new DiscordSetupGateway(interaction.guild)));
  registry.register(new CallInteractions({ ...runtime, logger }, runtime.gatewayFor));
  return registry;
}

export function createDefaultVoiceDispatcher(
  logger: Logger,
  database: PrismaClient,
  runtime: RoomRuntime = createRoomRuntime(database, logger),
): VoiceStateHandler {
  // The application supplies the same runtime to both dispatchers.
  const service = new CallService(
    new PrismaVoiceCreatorRepository(database),
    new PrismaTemporaryRoomRepository(database),
    runtime,
    logger,
  );
  return new VoiceStateHandler(service, logger, runtime.gatewayFor);
}
