import pino, { type DestinationStream, type Logger } from 'pino';

import type { AppConfig } from '../config/env.js';

export interface LoggerOptions {
  readonly level: AppConfig['logLevel'];
  readonly destination?: DestinationStream;
}

const redactedPaths = [
  'token',
  'password',
  'databaseUrl',
  'discord.token',
  'database.url',
  'database.directUrl',
];

export function createLogger(options: LoggerOptions): Logger {
  const configuration = {
    level: options.level,
    redact: {
      paths: redactedPaths,
      censor: '[Redacted]',
    },
  };

  return options.destination
    ? pino(configuration, options.destination)
    : pino(configuration);
}
