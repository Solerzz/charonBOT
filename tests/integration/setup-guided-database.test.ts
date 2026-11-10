import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { Client } from 'pg';
import { describe, expect, it } from 'vitest';

import { createPrismaClient, disconnectDatabase } from '../../src/core/database/prisma.js';
import { PrismaVoiceCreatorRepository, VoiceCreatorNotFoundError } from '../../src/modules/setup/setup.repository.js';
import { assertDisposableDatabaseEnvironment } from './database-test-utils.js';

const integrationTest = process.env.RUN_DATABASE_TESTS === 'true' ? it : it.skip;

describe('guided setup persistence', () => {
  integrationTest('migrates an existing row atomically with default zero, range protection and unchanged RLS', async () => {
    assertDisposableDatabaseEnvironment();
    const migration = await readFile(new URL('../../prisma/migrations/20261110010000_voice_creator_default_limit/migration.sql', import.meta.url), 'utf8');
    const client = new Client({ connectionString: process.env.DIRECT_URL });
    const schema = `setup_guided_${randomUUID().replaceAll('-', '')}`;
    try {
      await client.connect();
      await client.query('BEGIN');
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET LOCAL search_path TO "${schema}"`);
      await client.query(`
        CREATE TABLE "VoiceCreator" (
          id TEXT PRIMARY KEY,
          "categoryDiscordId" TEXT NOT NULL,
          "roomCommandsEnabled" BOOLEAN NOT NULL DEFAULT true
        );
        ALTER TABLE "VoiceCreator" ENABLE ROW LEVEL SECURITY;
        INSERT INTO "VoiceCreator" (id, "categoryDiscordId", "roomCommandsEnabled")
          VALUES ('existing', 'previous-category', false);
      `);

      await client.query(migration);
      const existing = await client.query('SELECT * FROM "VoiceCreator"');
      expect(existing.rows).toEqual([{
        id: 'existing', categoryDiscordId: 'previous-category',
        roomCommandsEnabled: false, defaultUserLimit: 0,
      }]);
      await client.query(`INSERT INTO "VoiceCreator" (id, "categoryDiscordId") VALUES ('new', 'new-category')`);
      expect((await client.query(`SELECT "defaultUserLimit" FROM "VoiceCreator" WHERE id = 'new'`)).rows)
        .toEqual([{ defaultUserLimit: 0 }]);
      expect((await client.query(`SELECT relrowsecurity FROM pg_class WHERE oid = '"VoiceCreator"'::regclass`)).rows)
        .toEqual([{ relrowsecurity: true }]);
      expect((await client.query('SELECT * FROM pg_policies WHERE schemaname = $1', [schema])).rows).toEqual([]);

      for (const limit of [0, 4, 99]) {
        await client.query('UPDATE "VoiceCreator" SET "defaultUserLimit" = $1 WHERE id = $2', [limit, 'existing']);
        expect((await client.query(`SELECT "defaultUserLimit" FROM "VoiceCreator" WHERE id = 'existing'`)).rows)
          .toEqual([{ defaultUserLimit: limit }]);
      }
      for (const limit of [-1, 100]) {
        await client.query('SAVEPOINT invalid_limit');
        await expect(client.query('UPDATE "VoiceCreator" SET "defaultUserLimit" = $1 WHERE id = $2', [limit, 'existing']))
          .rejects.toMatchObject({ code: '23514', constraint: 'VoiceCreator_defaultUserLimit_check' });
        await client.query('ROLLBACK TO SAVEPOINT invalid_limit');
        await client.query('RELEASE SAVEPOINT invalid_limit');
      }
      await client.query('SAVEPOINT null_limit');
      await expect(client.query('UPDATE "VoiceCreator" SET "defaultUserLimit" = NULL'))
        .rejects.toMatchObject({ code: '23502', column: 'defaultUserLimit' });
      await client.query('ROLLBACK TO SAVEPOINT null_limit');
      await client.query('ROLLBACK');
      expect((await client.query('SELECT 1 FROM pg_namespace WHERE nspname = $1', [schema])).rows).toEqual([]);
    } finally {
      try { await client.query('ROLLBACK'); } finally { await client.end(); }
    }
  }, 30_000);

  integrationTest('round-trips defaults independently and preserves omitted restoration defaults and preferences', async () => {
    assertDisposableDatabaseEnvironment();
    const client = createPrismaClient({ url: process.env.DATABASE_URL!, directUrl: process.env.DIRECT_URL! });
    const repository = new PrismaVoiceCreatorRepository(client);
    const guildDiscordId = randomUUID();
    const firstInput = { guildDiscordId, creatorChannelDiscordId: randomUUID(), categoryDiscordId: randomUUID() };
    const secondInput = { guildDiscordId, creatorChannelDiscordId: randomUUID(), categoryDiscordId: randomUUID() };
    try {
      const first = await repository.create({ ...firstInput, defaultUserLimit: 4 });
      const second = await repository.create(secondInput);
      expect(first.defaultUserLimit).toBe(4);
      expect(second.defaultUserLimit).toBe(0);
      for (const limit of [0, 4, 99]) {
        await expect(repository.setDefaultUserLimit(first.id, limit)).resolves.toMatchObject({ id: first.id, defaultUserLimit: limit });
        await expect(repository.findById(first.id)).resolves.toMatchObject({ defaultUserLimit: limit });
        await expect(repository.findById(second.id)).resolves.toEqual(second);
      }
      await repository.setRoomCommandsEnabled(first.id, false);
      await repository.delete(first.id);
      await expect(repository.setDefaultUserLimit(first.id, 4)).rejects.toBeInstanceOf(VoiceCreatorNotFoundError);
      await expect(repository.findByChannel(firstInput.creatorChannelDiscordId)).resolves.toBeNull();
      await expect(repository.findStoredByChannel(firstInput.creatorChannelDiscordId)).resolves.toMatchObject({
        id: first.id, deletedAt: expect.any(Date), defaultUserLimit: 99,
      });
      await expect(repository.create(firstInput)).resolves.toMatchObject({
        id: first.id, createdAt: first.createdAt, roomCommandsEnabled: false, defaultUserLimit: 99, deletedAt: null,
      });
      await repository.delete(first.id);
      await expect(repository.create({ ...firstInput, defaultUserLimit: 0 })).resolves.toMatchObject({
        id: first.id, createdAt: first.createdAt, roomCommandsEnabled: false, defaultUserLimit: 0, deletedAt: null,
      });
      await expect(repository.findById(second.id)).resolves.toEqual(second);
    } finally {
      try {
        await client.voiceCreator.deleteMany({ where: {
          guildDiscordId,
          creatorChannelDiscordId: { in: [firstInput.creatorChannelDiscordId, secondInput.creatorChannelDiscordId] },
        } });
      } finally { await disconnectDatabase(client); }
    }
  }, 30_000);
});
