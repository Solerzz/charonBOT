import { afterEach, describe, expect, it, vi } from 'vitest';

import { assertDisposableDatabaseEnvironment } from '../integration/database-test-utils.js';

const local = 'postgresql://test:secret@localhost:5432/charon_v030_test_unit';

afterEach(() => vi.unstubAllEnvs());

describe('disposable database guard', () => {
  it.each(['localhost', '127.0.0.1', '[::1]'])('accepts credentialed disposable %s targets', (host) => {
    vi.stubEnv('DATABASE_URL', `postgresql://test:secret@${host}:5432/charon_v030_test_unit`);
    vi.stubEnv('DIRECT_URL', `postgresql://test:secret@${host}:5432/charon_v030_test_unit`);
    expect(() => assertDisposableDatabaseEnvironment()).not.toThrow();
  });

  it('accepts the local loader public-schema parameter without allowing connection overrides', () => {
    vi.stubEnv('DATABASE_URL', `${local}?schema=public`);
    vi.stubEnv('DIRECT_URL', `${local}?schema=public`);
    expect(() => assertDisposableDatabaseEnvironment()).not.toThrow();
  });

  it.each([
    [undefined, local], [local, undefined], ['', local], ['not a URL', local],
    ['postgresql://test:secret@db.example.supabase.co/charon_v030_test_unit', local],
    ['postgresql://test:secret@localhost/charon', local],
    ['postgresql://test@localhost/charon_v030_test_unit', local],
    ['postgresql://:secret@localhost/charon_v030_test_unit', local],
    ['postgresql://localhost/charon_v030_test_unit', local],
    [local, local.replace('5432', '5433')],
    [local, local.replace('_unit', '_other')],
    [local, local.replace('localhost', 'remote.example')],
    [local, local.replace('secret', 'different')],
    [local.replace('postgresql:', 'https:'), local],
    [local, `${local}?host=remote.example`],
  ])('rejects unsafe or mismatched targets without leaking input (%#)', (url, direct) => {
    vi.stubEnv('DATABASE_URL', url);
    vi.stubEnv('DIRECT_URL', direct);
    expect(() => assertDisposableDatabaseEnvironment()).toThrow('Disposable local test database required');
    try {
      assertDisposableDatabaseEnvironment();
    } catch (error) {
      expect((error as Error).message).toBe('Disposable local test database required');
    }
  });
});
