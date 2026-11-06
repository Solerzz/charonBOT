import { describe, expect, it, vi } from 'vitest';

import {
  checkDatabase,
  createPrismaClient,
  disconnectDatabase,
  type DatabaseClient,
} from '../../../../src/core/database/prisma.js';

function createDatabaseDouble(
  overrides: Partial<DatabaseClient> = {},
): DatabaseClient {
  return {
    $connect: vi.fn().mockResolvedValue(undefined),
    $queryRawUnsafe: vi.fn().mockResolvedValue([{ connected: 1 }]),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('Prisma database adapter', () => {
  it('creates a Prisma client backed by the runtime pooled URL', () => {
    const client = createPrismaClient({
      url: 'postgresql://charon:secret@pool.example.com:6543/charon?pgbouncer=true',
      directUrl: 'postgresql://charon:secret@db.example.com:5432/charon',
    });

    expect(client.$connect).toBeTypeOf('function');
    expect(client.$queryRawUnsafe).toBeTypeOf('function');
    expect(client.$disconnect).toBeTypeOf('function');
  });

  it('checks connectivity with a constant query', async () => {
    const client = createDatabaseDouble();

    await expect(checkDatabase(client)).resolves.toBeUndefined();

    expect(client.$connect).toHaveBeenCalledOnce();
    expect(client.$queryRawUnsafe).toHaveBeenCalledWith('SELECT 1');
  });

  it('replaces connection failures with a credential-safe error', async () => {
    const client = createDatabaseDouble({
      $connect: vi
        .fn()
        .mockRejectedValue(
          new Error('postgresql://charon:database-secret@db.example.com/charon'),
        ),
    });

    const error = await checkDatabase(client).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('Database connection check failed');
    expect((error as Error).message).not.toContain('database-secret');
  });

  it('disconnects the same client only once', async () => {
    const client = createDatabaseDouble();

    await disconnectDatabase(client);
    await disconnectDatabase(client);

    expect(client.$disconnect).toHaveBeenCalledOnce();
  });
});
