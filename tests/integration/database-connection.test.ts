import { describe, expect, it } from 'vitest';

import {
  checkDatabase,
  createPrismaClient,
  disconnectDatabase,
} from '../../src/core/database/prisma.js';

const integrationTest = process.env.RUN_DATABASE_TESTS === 'true' ? it : it.skip;

describe('database connection', () => {
  integrationTest('connects to the configured PostgreSQL database', async () => {
    const url = process.env.DATABASE_URL;
    const directUrl = process.env.DIRECT_URL;

    expect(url).toBeTruthy();
    expect(directUrl).toBeTruthy();

    const client = createPrismaClient({ url: url!, directUrl: directUrl! });

    try {
      await expect(checkDatabase(client)).resolves.toBeUndefined();
    } finally {
      await disconnectDatabase(client);
    }
  });
});
