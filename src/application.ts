import { Events, type Interaction, type VoiceState } from 'discord.js';
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
import {
  VoiceStateHandler,
  type VoiceStateDispatcher,
} from './modules/calls/voice-state.handler.js';
import { SetupCommand } from './modules/setup/setup.command.js';
import { DiscordSetupGateway } from './modules/setup/setup.discord.js';
import { SetupInteractions } from './modules/setup/setup.interactions.js';
import { PrismaVoiceCreatorRepository } from './modules/setup/setup.repository.js';
import { SetupService } from './modules/setup/setup.service.js';
import { StatusCommand } from './modules/status/status.command.js';
import { KeyedMutex } from './shared/keyed-mutex.js';

export interface DiscordClientPort {
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
  // Lifecycle doubles remain health-only when explicit dispatchers are supplied.
  const runtimeDatabase = (): PrismaClient => {
    if (!hasRuntimeRepositories(database)) {
      throw new Error(
        'Default dispatchers require a PrismaClient; supply both dispatchers for a health-only database',
      );
    }
    return database;
  };
  const dispatcher =
    overrides.dispatcher ?? createDefaultDispatcher(logger, runtimeDatabase());
  const voiceDispatcher =
    overrides.voiceDispatcher ?? createDefaultVoiceDispatcher(logger, runtimeDatabase());
  let state: 'idle' | 'starting' | 'running' | 'stopping' | 'stopped' | 'failed' =
    'idle';
  let startPromise: Promise<void> | undefined;
  let stopPromise: Promise<void> | undefined;
  let closePromise: Promise<void> | undefined;
  const inFlight = new Set<Promise<unknown>>();

  const acceptDispatch = (
    operation: () => Promise<unknown>,
    onFailure: (error: unknown) => void,
  ): void => {
    if (state !== 'starting' && state !== 'running') return;
    // Register synchronously, before the dispatcher gets its first microtask.
    const work = Promise.resolve()
      .then(operation)
      .catch(onFailure)
      .finally(() => { inFlight.delete(work); });
    inFlight.add(work);
  };

  const closeResources = (): Promise<void> => {
    closePromise ??= (async () => {
      // Callers have already closed admission by entering stopping/failed.
      await Promise.allSettled(inFlight);
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
          await discord.login(config.discord.token);
          if (state !== 'starting') {
            return;
          }

          state = 'running';
          logger.info('Charon started');
        } catch (error) {
          state = 'failed';
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
        }
      })();

      return startPromise;
    },

    async stop(signal: string): Promise<void> {
      if (stopPromise) {
        return stopPromise;
      }

      state = 'stopping';
      stopPromise = (async () => {
        logger.info({ signal }, 'Charon stopping');
        await startPromise?.catch(() => undefined);
        await closeResources();
        state = 'stopped';
        logger.info('Charon stopped');
      })();

      return stopPromise;
    },
  };
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
): InteractionRegistry {
  const setupService = new SetupService(new PrismaVoiceCreatorRepository(database));
  const registry = new InteractionRegistry(logger);
  registry.register(new StatusCommand());
  registry.register(new SetupCommand(setupService));
  registry.register(
    new SetupInteractions(
      setupService,
      (interaction) => new DiscordSetupGateway(interaction.guild),
    ),
  );
  return registry;
}

export function createDefaultVoiceDispatcher(
  logger: Logger,
  database: PrismaClient,
): VoiceStateHandler {
  // One service/mutex per application dispatcher, never per event or member.
  const service = new CallService(
    new PrismaVoiceCreatorRepository(database),
    new PrismaTemporaryRoomRepository(database),
    new KeyedMutex(),
    logger,
  );
  return new VoiceStateHandler(service, logger);
}
