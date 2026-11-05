import pino, {
  type DestinationStream,
  type Logger,
  type LogFn,
} from 'pino';

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

const sensitiveKeys = new Set([
  'apikey',
  'authorization',
  'databaseurl',
  'directurl',
  'password',
  'secret',
  'token',
]);

const postgresUrlPattern = /postgres(?:ql)?:\/\/[^\s"'`]+/giu;

export function createLogger(options: LoggerOptions): Logger {
  const configuration = {
    level: options.level,
    redact: {
      paths: redactedPaths,
      censor: '[Redacted]',
    },
    hooks: {
      logMethod(
        this: Logger,
        args: Parameters<LogFn>,
        method: LogFn,
      ): void {
        const sanitized = args.map((value) => sanitizeLogValue(value)) as Parameters<LogFn>;
        method.apply(this, sanitized);
      },
    },
  };

  return options.destination
    ? pino(configuration, options.destination)
    : pino(configuration);
}

function sanitizeLogValue(
  value: unknown,
  seen: WeakMap<object, unknown> = new WeakMap(),
): unknown {
  if (typeof value === 'string') {
    return value.replace(postgresUrlPattern, '[Redacted]');
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeLogValue(value.message),
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogValue(item, seen));
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return value;
  }

  const existing = seen.get(value);
  if (existing !== undefined) {
    return existing;
  }

  const sanitized: Record<string, unknown> = {};
  seen.set(value, sanitized);

  for (const [key, nestedValue] of Object.entries(value)) {
    const normalizedKey = key.replace(/[^a-z0-9]/giu, '').toLowerCase();
    sanitized[key] = sensitiveKeys.has(normalizedKey)
      ? '[Redacted]'
      : sanitizeLogValue(nestedValue, seen);
  }

  return sanitized;
}
