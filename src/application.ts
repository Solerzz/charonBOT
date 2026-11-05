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
  once(event: 'SIGINT' | 'SIGTERM', listener: () => Promise<void>): unknown;
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
  let stopPromise: Promise<void> | undefined;

  return {
    async start(): Promise<void> {
      await checkDatabase(database);
      discord.on(Events.InteractionCreate, (interaction) => {
        void dispatcher.dispatch(interaction);
      });
      await discord.login(config.discord.token);
      logger.info('Charon started');
    },

    async stop(signal: string): Promise<void> {
      stopPromise ??= (async () => {
        logger.info({ signal }, 'Charon stopping');
        discord.destroy();
        await disconnectDatabase(database);
        logger.info('Charon stopped');
      })();

      await stopPromise;
    },
  };
}

export function registerShutdownSignals(
  application: Application,
  source: SignalSource = process,
): void {
  source.once('SIGINT', async () => application.stop('SIGINT'));
  source.once('SIGTERM', async () => application.stop('SIGTERM'));
}

function createDefaultDispatcher(logger: Logger): InteractionRegistry {
  const registry = new InteractionRegistry(logger);
  registry.register(new StatusCommand());
  return registry;
}
