import { Writable } from 'node:stream';

import { describe, expect, it } from 'vitest';

import { createLogger } from '../../../../src/core/logger/logger.js';

function captureLogger(): {
  readonly lines: string[];
  readonly logger: ReturnType<typeof createLogger>;
} {
  const lines: string[] = [];
  const destination = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(chunk.toString());
      callback();
    },
  });

  return {
    lines,
    logger: createLogger({ level: 'info', destination }),
  };
}

describe('createLogger', () => {
  it('writes structured JSON with message, level, timestamp, and context', () => {
    const { lines, logger } = captureLogger();

    logger.info({ context: 'bootstrap' }, 'application started');

    const entry = JSON.parse(lines[0] ?? '{}') as Record<string, unknown>;
    expect(entry).toMatchObject({
      level: 30,
      context: 'bootstrap',
      msg: 'application started',
    });
    expect(entry.time).toEqual(expect.any(Number));
  });

  it('redacts root and configured nested credentials', () => {
    const { lines, logger } = captureLogger();

    logger.info(
      {
        token: 'root-token',
        password: 'root-password',
        databaseUrl: 'postgresql://root-secret@example.com/database',
        discord: { token: 'discord-token' },
        database: {
          url: 'postgresql://pool-secret@example.com/database',
          directUrl: 'postgresql://direct-secret@example.com/database',
        },
      },
      'configuration loaded',
    );

    const output = lines.join('');
    expect(output).not.toMatch(
      /root-token|root-password|root-secret|discord-token|pool-secret|direct-secret/,
    );

    const entry = JSON.parse(lines[0] ?? '{}') as Record<string, unknown>;
    expect(entry).toMatchObject({
      token: '[Redacted]',
      password: '[Redacted]',
      databaseUrl: '[Redacted]',
      discord: { token: '[Redacted]' },
      database: { url: '[Redacted]', directUrl: '[Redacted]' },
    });
  });

  it('redacts credential keys at arbitrary depth and regardless of casing', () => {
    const { lines, logger } = captureLogger();

    logger.info({
      request: {
        credentials: { Password: 'deep-password' },
        headers: { Authorization: 'Bearer authorization-secret' },
      },
      config: {
        DATABASE_URL: 'postgresql://charon:nested-secret@example.com/charon',
      },
    });

    const output = lines.join('');
    expect(output).not.toMatch(
      /deep-password|authorization-secret|nested-secret/,
    );
    expect(JSON.parse(lines[0] ?? '{}')).toMatchObject({
      request: {
        credentials: { Password: '[Redacted]' },
        headers: { Authorization: '[Redacted]' },
      },
      config: { DATABASE_URL: '[Redacted]' },
    });
  });

  it('redacts a PostgreSQL connection string passed as a log message', () => {
    const { lines, logger } = captureLogger();

    logger.error(
      'Connection failed: postgresql://charon:message-secret@example.com/charon',
    );

    expect(lines.join('')).not.toContain('message-secret');
    expect(JSON.parse(lines[0] ?? '{}')).toMatchObject({
      msg: 'Connection failed: [Redacted]',
    });
  });
});
