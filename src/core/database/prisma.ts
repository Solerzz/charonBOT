import { PrismaPg } from '@prisma/adapter-pg';

import type { AppConfig } from '../config/env.js';
import { PrismaClient } from '../../generated/prisma/client.js';

export interface DatabaseClient {
  $connect(): Promise<void>;
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
  $disconnect(): Promise<void>;
}

const disconnectedClients = new WeakSet<object>();

export function createPrismaClient(
  config: AppConfig['database'],
): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: config.url,
    connectionTimeoutMillis: 5_000,
  });

  return new PrismaClient({ adapter });
}

export async function checkDatabase(client: DatabaseClient): Promise<void> {
  try {
    await client.$connect();
    await client.$queryRawUnsafe('SELECT 1');
  } catch {
    throw new Error('Database connection check failed');
  }
}

export async function disconnectDatabase(
  client: DatabaseClient,
): Promise<void> {
  if (disconnectedClients.has(client)) {
    return;
  }

  disconnectedClients.add(client);
  await client.$disconnect();
}
