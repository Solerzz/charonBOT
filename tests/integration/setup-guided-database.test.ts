import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { Client } from 'pg';
import type { Guild } from 'discord.js';
import { describe, expect, it } from 'vitest';

import { createPrismaClient, disconnectDatabase } from '../../src/core/database/prisma.js';
import { PrismaVoiceCreatorRepository, VoiceCreatorNotFoundError } from '../../src/modules/setup/setup.repository.js';
import { SetupCreationService } from '../../src/modules/setup/setup-creation.service.js';
import { DiscordSetupGateway } from '../../src/modules/setup/setup.discord.js';
import { createLogger } from '../../src/core/logger/logger.js';
import { discordFixture } from '../unit/modules/calls/call.discord.fixtures.js';
import { assertDisposableDatabaseEnvironment } from './database-test-utils.js';

const integrationTest = process.env.RUN_DATABASE_TESTS === 'true' ? it : it.skip;

describe('guided setup persistence', () => {
  integrationTest.each([0, 1, 4, 99])('creates an unlimited entry through the real gateway while SQL stores default %i', async (defaultUserLimit) => {
    assertDisposableDatabaseEnvironment();
    const client = createPrismaClient({ url: process.env.DATABASE_URL!, directUrl: process.env.DIRECT_URL! });
    const repository = new PrismaVoiceCreatorRepository(client);
    const d = discordFixture();
    d.entryChannel.id = String(70000000000000000n + BigInt(`0x${randomUUID().replaceAll('-', '').slice(0, 12)}`));
    d.entryChannel.userLimit = 77;
    d.guild.channels.create.mockImplementationOnce(async (input) => {
      d.entryChannel.name = input.name; d.entryChannel.userLimit = input.userLimit!;
      d.entryChannel.parentId = typeof input.parent === 'string' ? input.parent : input.parent!.id;
      return d.entryChannel;
    });
    try {
      const result = await new SetupCreationService(repository, createLogger({ level: 'silent' })).create({
        id: randomUUID(), revision: 2, status: 'creating', expiresAt: Date.now() + 60_000,
        context: { guildDiscordId: d.guild.id, administratorDiscordId: d.member.id, messageDiscordId: d.message.id },
        input: { categoryDiscordId: d.category.id, name: 'Entry only', defaultUserLimit },
      }, new DiscordSetupGateway(d.guild as unknown as Guild));
      expect(result.status).toBe('created');
      expect(d.guild.channels.create).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ name: 'Entry only', userLimit: 0, parent: d.category.id }));
      expect(d.entryChannel.userLimit).toBe(0);
      const stored = await repository.findByChannel(d.entryChannel.id);
      expect(stored).toMatchObject({ defaultUserLimit, categoryDiscordId: d.category.id, roomCommandsEnabled: true });
      await repository.setDefaultUserLimit(stored!.id, 8);
      expect(d.entryChannel.userLimit).toBe(0);
      expect(d.guild.channels.create).toHaveBeenCalledOnce();
      expect(d.entryChannel.setUserLimit).not.toHaveBeenCalled();
    } finally {
      try { await client.voiceCreator.deleteMany({ where: { guildDiscordId: d.guild.id, creatorChannelDiscordId: d.entryChannel.id } }); }
      finally { await disconnectDatabase(client); }
    }
  }, 30_000);

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
