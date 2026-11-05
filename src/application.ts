import { Events, type Interaction } from 'discord.js';
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
import { StatusCommand } from './modules/status/status.command.js';

export interface DiscordClientPort {
  on(
    event: typeof Events.InteractionCreate,
    listener: (interaction: Interaction) => void,
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
}

export function createApplication(
  config: AppConfig,
  overrides: ApplicationOverrides = {},
): Application {
  const logger = overrides.logger ?? createLogger({ level: config.logLevel });
  const database = overrides.database ?? createPrismaClient(config.database);
  const discord = overrides.discord ?? createDiscordClient();
  const dispatcher = overrides.dispatcher ?? createDefaultDispatcher(logger);
  let state: 'idle' | 'starting' | 'running' | 'stopping' | 'stopped' | 'failed' =
    'idle';
  let startPromise: Promise<void> | undefined;
  let stopPromise: Promise<void> | undefined;
  let closePromise: Promise<void> | undefined;

  const closeResources = (): Promise<void> => {
    closePromise ??= (async () => {
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
            void dispatcher.dispatch(interaction).catch((error: unknown) => {
              logger.error(
                {
                  interactionId: interaction.id,
                  errorName: error instanceof Error ? error.name : 'UnknownError',
                },
                'Interaction dispatch failed',
              );
            });
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

function createDefaultDispatcher(logger: Logger): InteractionRegistry {
  const registry = new InteractionRegistry(logger);
  registry.register(new StatusCommand());
  return registry;
}
