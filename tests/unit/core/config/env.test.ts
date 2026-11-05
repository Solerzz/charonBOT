import { describe, expect, it } from 'vitest';

import { loadConfig } from '../../../../src/core/config/env.js';

const validEnvironment = {
  NODE_ENV: 'test',
  LOG_LEVEL: 'debug',
  DISCORD_TOKEN: 'discord-secret-token',
  DISCORD_CLIENT_ID: '123456789012345678',
  DATABASE_URL: 'postgresql://charon:pool-secret@pool.example.com:6543/charon',
  DIRECT_URL: 'postgresql://charon:direct-secret@db.example.com:5432/charon',
} satisfies NodeJS.ProcessEnv;

describe('loadConfig', () => {
  it('maps valid environment values into application config', () => {
    expect(loadConfig(validEnvironment)).toEqual({
      nodeEnv: 'test',
      logLevel: 'debug',
      discord: {
        token: 'discord-secret-token',
        clientId: '123456789012345678',
      },
      database: {
        url: 'postgresql://charon:pool-secret@pool.example.com:6543/charon',
        directUrl: 'postgresql://charon:direct-secret@db.example.com:5432/charon',
      },
    });
  });

  it('rejects a missing Discord token without exposing other secrets', () => {
    const environment = { ...validEnvironment, DISCORD_TOKEN: undefined };

    expect(() => loadConfig(environment)).toThrowError(/DISCORD_TOKEN/);
    expect(() => loadConfig(environment)).not.toThrowError(/pool-secret|direct-secret/);
  });

  it.each([
    ['DATABASE_URL', 'https://pool.example.com/charon'],
    ['DIRECT_URL', 'mysql://db.example.com/charon'],
  ])('rejects a non-PostgreSQL %s', (field, value) => {
    expect(() => loadConfig({ ...validEnvironment, [field]: value })).toThrowError(
      new RegExp(field),
    );
  });

  it.each([
    ['NODE_ENV', 'staging'],
    ['LOG_LEVEL', 'verbose'],
  ])('rejects an unsupported %s value', (field, value) => {
    expect(() => loadConfig({ ...validEnvironment, [field]: value })).toThrowError(
      new RegExp(field),
    );
  });
});
