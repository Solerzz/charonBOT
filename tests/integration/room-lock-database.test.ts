import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { PermissionFlagsBits as P } from 'discord.js';
import { Client } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import { createPrismaClient, disconnectDatabase } from '../../src/core/database/prisma.js';
import { PrismaRoomStateRepository } from '../../src/modules/calls/room-state.repository.js';
import { RoomAccessService } from '../../src/modules/calls/room-access.service.js';
import { RoomControlsService } from '../../src/modules/calls/room-controls.service.js';
import { roomSettingsFixture } from '../unit/modules/calls/room-settings.fixtures.js';
import { assertDisposableDatabaseEnvironment } from './database-test-utils.js';
import { deferred } from '../unit/modules/calls/call.fixtures.js';
import { OTHER } from '../unit/modules/ownership/ownership.fixtures.js';
import { moderationDeniedBefore, moderationDenyBits } from '../../src/modules/calls/room-moderation.permissions.js';

const integrationTest = process.env.RUN_DATABASE_TESTS === 'true' ? it : it.skip;

describe('independent room lock persistence', () => {
  integrationTest('projects persisted blocks through compensation and same-version SQL drift without restoring authorization', async () => {
    assertDisposableDatabaseEnvironment();
    const client = createPrismaClient({ url: process.env.DATABASE_URL!, directUrl: process.env.DIRECT_URL! });
    const store = new PrismaRoomStateRepository(client); const f = roomSettingsFixture();
    const creatorId = randomUUID(); const roomId = randomUUID();
    const access = new RoomAccessService(store, f.coordinator);
    const controls = new RoomControlsService({ store, coordinator: f.coordinator, access, onChangedLocked: async () => {} });
    const actor = { ...f.actor(), roomId };
    try {
      await client.voiceCreator.create({ data: { id: creatorId, guildDiscordId: f.guild.id, creatorChannelDiscordId: randomUUID(), categoryDiscordId: randomUUID() } });
      await client.temporaryRoom.create({ data: { id: roomId, voiceCreatorId: creatorId, guildDiscordId: f.guild.id,
        channelDiscordId: f.channel.id, ownerDiscordId: actor.memberDiscordId, name: 'Game', status: 'ACTIVE', visibility: 'PRIVATE', isLocked: true } });
      f.join(OTHER); expect(await store.setAllowed(roomId, 0, OTHER, true)).toBe(true);
      const stale = (await store.read(roomId))!; const snapshot = (await f.gateway.snapshot(f.channel.id))!;
      await access.synchronizeLocked(stale, snapshot, f.gateway);
      f.channel.permissionOverwrites.cache.get(OTHER)!.allow.add(P.Speak);
      f.channel.permissionOverwrites.cache.get(OTHER)!.deny.add(P.SendPolls | P.Stream);
      const deniedBefore = moderationDeniedBefore(await f.gateway.readAccess(f.channel.id), OTHER);
      expect(deniedBefore).toBe(P.SendPolls);
      const staged = (await store.stageRoomBlock(actor, OTHER, deniedBefore))!;
      await access.synchronizeLocked(stale, snapshot, f.gateway);
      expect(f.projected().find(p => p.id === OTHER)!.deny.bitfield & moderationDenyBits).toBe(moderationDenyBits);
      vi.spyOn(store, 'updateSettings').mockResolvedValueOnce(false);
      await expect(controls.toggleLock({ ...actor, controlVersion: staged.controlVersion }, f.gateway)).rejects.toMatchObject({ code: 'STALE_CONTROLS' });
      expect(f.projected().find(p => p.id === OTHER)!.allow.has(P.Connect, false)).toBe(false);
      expect(f.projected().find(p => p.id === OTHER)!.deny.has(P.ViewChannel, false)).toBe(true);
      f.leave(OTHER);
      const write = f.channel.permissionOverwrites.set.getMockImplementation()!;
      f.channel.permissionOverwrites.set.mockImplementationOnce(async input => {
        await write(input);
        // Independent writer at the REST boundary: no SQL transaction from
        // settlement/projection may retain the room row lock across this I/O.
        await client.$transaction(async tx => {
          await tx.$executeRaw`SET LOCAL lock_timeout = '500ms'`;
          await tx.temporaryRoom.update({ where: { id: roomId }, data: { userLimit: 1 } });
          await tx.roomMemberBlock.update({ where: { id: staged.block.id }, data: { state: 'UNBLOCK_PENDING' } });
        });
      });
      await access.synchronizeLocked((await store.read(roomId))!, snapshot, f.gateway);
      const target = f.projected().find(p => p.id === OTHER)!;
      expect(target.allow.bitfield).toBe(P.Speak); expect(target.deny.bitfield).toBe(P.SendPolls | P.Stream);
      expect(await store.read(roomId)).toMatchObject({ allowedMemberIds: [], memberBlocks: [{ state: 'UNBLOCK_PENDING', deniedBefore: P.SendPolls }] });
      expect(access.isUncertain(roomId)).toBe(false);
    } finally {
      try { await client.temporaryRoom.deleteMany({ where: { id: roomId } }); await client.voiceCreator.deleteMany({ where: { id: creatorId } }); }
      finally { await disconnectDatabase(client); }
    }
  }, 30_000);
  integrationTest('settlement waits for a row-locked writer and fences writers not yet admitted without retaining a SQL lock across REST', async () => {
    assertDisposableDatabaseEnvironment();
    const client = createPrismaClient({ url: process.env.DATABASE_URL!, directUrl: process.env.DIRECT_URL! });
    const store = new PrismaRoomStateRepository(client);
    const creatorId = randomUUID(); const roomId = randomUUID();
    const locked = deferred(); const release = deferred(); const fenceLocked = deferred(); const releaseFence = deferred();
    let writer: Promise<boolean> | undefined; let settlement: Promise<unknown> | undefined;
    let queuedSettings: Promise<boolean> | undefined; let queuedAllowlist: Promise<boolean> | undefined;
    try {
      await client.voiceCreator.create({ data: { id: creatorId, guildDiscordId: randomUUID(), creatorChannelDiscordId: randomUUID(), categoryDiscordId: randomUUID() } });
      await client.temporaryRoom.create({ data: { id: roomId, voiceCreatorId: creatorId, guildDiscordId: randomUUID(), channelDiscordId: randomUUID(), ownerDiscordId: 'owner', name: 'Game', status: 'ACTIVE' } });
      // Hold the same row lock used by setAllowed; a response may fail while
      // the transaction still owns the row and can commit later.
      writer = client.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "TemporaryRoom" WHERE id = ${roomId}::uuid FOR UPDATE`;
        locked.resolve(); await release.promise;
        return new PrismaRoomStateRepository(tx as unknown as typeof client).updateSettings(roomId, 0, { isLocked: true });
      });
      await locked.promise;
      expect(await store.read(roomId)).toMatchObject({ room: { isLocked: false, controlVersion: 0 } });
      // An observer connection proves the barrier is actually waiting on a
      // PostgreSQL lock, rather than relying on elapsed time to infer ordering.
      const observer = new Client({ connectionString: process.env.DIRECT_URL });
      await observer.connect();
      try {
        settlement = store.settleAccess(roomId, 0);
        let waiting = false;
        for (let attempt = 0; attempt < 100 && !waiting; attempt++) {
          const result = await observer.query<{ waiting: boolean }>(`SELECT EXISTS (
            SELECT 1 FROM pg_stat_activity WHERE datname = current_database()
              AND pid <> pg_backend_pid() AND wait_event_type = 'Lock'
              AND query LIKE '%TemporaryRoom%'
          ) AS waiting`);
          waiting = result.rows[0]!.waiting;
        }
        expect(waiting).toBe(true);
        let finished = false; void settlement.then(() => { finished = true; });
        await Promise.resolve(); expect(finished).toBe(false);
        release.resolve(); expect(await writer).toBe(true);
        expect(await settlement).toMatchObject({ room: { isLocked: true, controlVersion: 1 } });
        // Reverse the order: hold the real barrier's transaction just before
        // commit and submit both old-generation writers while it owns the row.
        const transaction = client.$transaction.bind(client);
        vi.spyOn(client, '$transaction').mockImplementationOnce((async (work: (tx: typeof client) => Promise<unknown>) =>
          transaction(async (tx) => { const result = await work(tx as unknown as typeof client); fenceLocked.resolve(); await releaseFence.promise; return result; })) as never);
        settlement = store.settleAccess(roomId, 1); await fenceLocked.promise;
        queuedSettings = store.updateSettings(roomId, 1, { isLocked: false });
        queuedAllowlist = store.setAllowed(roomId, 1, 'guest', true);
        let blocked = 0;
        for (let attempt = 0; attempt < 100 && blocked < 2; attempt++) {
          const result = await observer.query<{ blocked: number }>(`SELECT count(*)::int AS blocked FROM pg_stat_activity
            WHERE datname = current_database() AND pid <> pg_backend_pid()
              AND wait_event_type = 'Lock' AND query LIKE '%TemporaryRoom%'`);
          blocked = result.rows[0]!.blocked;
        }
        expect(blocked).toBeGreaterThanOrEqual(2);
        releaseFence.resolve(); expect(await settlement).toMatchObject({ room: { isLocked: true, controlVersion: 2 } });
        expect(await queuedSettings).toBe(false); expect(await queuedAllowlist).toBe(false);
      } finally { await observer.end(); }
      // Even a request which was queued before settlement but starts later
      // cannot mutate with the old generation, for settings OR allowlist.
      expect(await store.updateSettings(roomId, 0, { isLocked: false })).toBe(false);
      expect(await store.setAllowed(roomId, 0, 'guest', true)).toBe(false);
      expect(await store.read(roomId)).toMatchObject({ room: { isLocked: true, controlVersion: 2 }, allowedMemberIds: [] });
      await client.$transaction(async (tx) => {
        await tx.$executeRaw`SET LOCAL lock_timeout = '500ms'`;
        // This independent writer is the REST boundary probe: settlement has
        // returned and must have released its SQL row lock before any REST.
        expect(await tx.temporaryRoom.updateMany({ where: { id: roomId, controlVersion: 2 }, data: { userLimit: 7 } })).toMatchObject({ count: 1 });
      });
    } finally {
      release.resolve(); releaseFence.resolve(); await writer?.catch(() => {}); await settlement?.catch(() => {});
      await queuedSettings?.catch(() => {}); await queuedAllowlist?.catch(() => {});
      try { await client.temporaryRoom.deleteMany({ where: { id: roomId } }); await client.voiceCreator.deleteMany({ where: { id: creatorId } }); }
      finally { await disconnectDatabase(client); }
    }
  }, 30_000);

  integrationTest('serializes independent toggles and confirms lost SQL replies with the real CAS and native projection', async () => {
    assertDisposableDatabaseEnvironment();
    const client = createPrismaClient({ url: process.env.DATABASE_URL!, directUrl: process.env.DIRECT_URL! });
    const store = new PrismaRoomStateRepository(client); const f = roomSettingsFixture();
    const creatorId = randomUUID(); const roomId = randomUUID();
    const access = new RoomAccessService(store, f.coordinator);
    const controls = new RoomControlsService({ store, coordinator: f.coordinator, access, onChangedLocked: async () => {} });
    const actor = { ...f.actor(), roomId };
    try {
      await client.voiceCreator.create({ data: { id: creatorId, guildDiscordId: f.guild.id, creatorChannelDiscordId: randomUUID(), categoryDiscordId: randomUUID() } });
      await client.temporaryRoom.create({ data: { id: roomId, voiceCreatorId: creatorId, guildDiscordId: f.guild.id,
        channelDiscordId: f.channel.id, ownerDiscordId: actor.memberDiscordId, name: 'Game', status: 'ACTIVE' } });
      await Promise.all([controls.toggleLock(actor, f.gateway), controls.toggleVisibility(actor, f.gateway)]);
      expect(await store.read(roomId)).toMatchObject({ room: { isLocked: true, visibility: 'PRIVATE' } });
      await Promise.all([controls.toggleLock(actor, f.gateway), controls.toggleLock(actor, f.gateway)]);
      expect(await store.read(roomId)).toMatchObject({ room: { isLocked: true, visibility: 'PRIVATE' } });
      const commit = store.updateSettings.bind(store); const restore = vi.spyOn(f.gateway, 'restoreAccess');
      vi.spyOn(store, 'updateSettings').mockImplementationOnce(async (...args) => { await commit(...args); throw new Error('lost SQL acknowledgement'); });
      await expect(controls.toggleVisibility(actor, f.gateway)).rejects.toMatchObject({ code: 'PERSISTENCE_FAILURE' });
      expect(await store.read(roomId)).toMatchObject({ room: { isLocked: true, visibility: 'PUBLIC', controlVersion: 1 } });
      const everyone = f.projected().find((p) => p.id === f.guild.id)!;
      expect(everyone.allow.has([P.ViewChannel, P.SendMessages], false)).toBe(true);
      expect(everyone.deny.has(P.Connect, false)).toBe(true); expect(restore).not.toHaveBeenCalled();
      expect(access.isUncertain(roomId)).toBe(false);
    } finally {
      try {
        await client.temporaryRoom.deleteMany({ where: { id: roomId } });
        await client.voiceCreator.deleteMany({ where: { id: creatorId } });
      } finally { await disconnectDatabase(client); }
    }
  }, 30_000);

  integrationTest('backfills only private rooms without changing existing values, RLS or public policies', async () => {
    assertDisposableDatabaseEnvironment();
    const migration = await readFile(new URL('../../prisma/migrations/20261110020000_room_lock_state/migration.sql', import.meta.url), 'utf8');
    const client = new Client({ connectionString: process.env.DIRECT_URL });
    const schema = `room_lock_${randomUUID().replaceAll('-', '')}`;
    try {
      await client.connect();
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET search_path TO "${schema}"`);
      await client.query(`
        CREATE TYPE "RoomVisibility" AS ENUM ('PUBLIC', 'PRIVATE');
        CREATE TYPE "TemporaryRoomStatus" AS ENUM ('CREATING', 'ACTIVE', 'CLOSING', 'CLOSED');
        CREATE TABLE "TemporaryRoom" (
          id TEXT PRIMARY KEY, "guildDiscordId" TEXT NOT NULL, "voiceCreatorId" UUID NOT NULL,
          "channelDiscordId" TEXT NOT NULL UNIQUE, "ownerDiscordId" TEXT, "controlMessageDiscordId" TEXT,
          name TEXT NOT NULL, "userLimit" INTEGER NOT NULL DEFAULT 0,
          visibility "RoomVisibility" NOT NULL DEFAULT 'PUBLIC',
          status "TemporaryRoomStatus" NOT NULL DEFAULT 'CREATING',
          "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ(3) NOT NULL,
          "closedAt" TIMESTAMPTZ(3), "controlVersion" INTEGER NOT NULL DEFAULT 0,
          "priorityMemberDiscordId" TEXT, "priorityExpiresAt" TIMESTAMPTZ(3)
        );
        ALTER TABLE "TemporaryRoom" ENABLE ROW LEVEL SECURITY;
        INSERT INTO "TemporaryRoom" (
          id, "guildDiscordId", "voiceCreatorId", "channelDiscordId", "ownerDiscordId", "controlMessageDiscordId",
          name, "userLimit", visibility, status, "createdAt", "updatedAt", "closedAt", "controlVersion",
          "priorityMemberDiscordId", "priorityExpiresAt"
        ) VALUES
          ('visible', 'guild-a', '123e4567-e89b-42d3-a456-426614174000', 'channel-a', 'owner-a', 'panel-a',
           'Visible', 11, 'PUBLIC', 'ACTIVE', '2026-01-01', '2026-01-02', NULL, 3, 'priority', '2026-01-03'),
          ('hidden', 'guild-b', '123e4567-e89b-42d3-a456-426614174000', 'channel-b', NULL, NULL,
           'Hidden', 99, 'PRIVATE', 'CLOSED', '2026-02-01', '2026-02-02', '2026-02-03', 7, NULL, NULL);
      `);
      const before = (await client.query('SELECT * FROM "TemporaryRoom" ORDER BY id DESC')).rows;

      await client.query(migration);
      const rows = (await client.query('SELECT * FROM "TemporaryRoom" ORDER BY id DESC')).rows;
      expect(rows).toEqual([
        expect.objectContaining({ id: 'visible', visibility: 'PUBLIC', isLocked: false }),
        expect.objectContaining({ id: 'hidden', visibility: 'PRIVATE', isLocked: true }),
      ]);
      expect(rows.map(({ isLocked: _isLocked, ...previous }) => previous)).toEqual(before);
      for (const visibility of ['PUBLIC', 'PRIVATE']) {
        const insertedWithoutLock = (await client.query(`
          INSERT INTO "TemporaryRoom" (id, "guildDiscordId", "voiceCreatorId", "channelDiscordId", name, visibility, "updatedAt")
          VALUES ($1, 'new-guild', $2, $1, 'New', $3, now()) RETURNING *
        `, [`new-${visibility}`, randomUUID(), visibility])).rows[0];
        expect(insertedWithoutLock.isLocked).toBe(false);
        expect(insertedWithoutLock.visibility).toBe(visibility);
      }
      const rlsEnabled = (await client.query(`SELECT relrowsecurity FROM pg_class WHERE oid = '"TemporaryRoom"'::regclass`)).rows[0].relrowsecurity;
      expect(rlsEnabled).toBe(true);
      const publicPolicies = (await client.query('SELECT * FROM pg_policies WHERE schemaname = $1', [schema])).rows;
      expect(publicPolicies).toEqual([]);
      const writeNullLock = () => client.query('UPDATE "TemporaryRoom" SET "isLocked" = NULL WHERE id = $1', ['visible']);
      await expect(writeNullLock()).rejects.toMatchObject({ code: '23502', column: 'isLocked' });
    } finally {
      try {
        await client.query('ROLLBACK');
        await client.query('RESET search_path');
        await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      } finally { await client.end(); }
    }
  }, 30_000);

  integrationTest('round-trips lock-only patches independently of visibility through the real repository CAS', async () => {
    assertDisposableDatabaseEnvironment();
    const client = createPrismaClient({ url: process.env.DATABASE_URL!, directUrl: process.env.DIRECT_URL! });
    const store = new PrismaRoomStateRepository(client);
    const creatorId = randomUUID(); const roomId = randomUUID(); const guildDiscordId = randomUUID();
    try {
      await client.voiceCreator.create({ data: { id: creatorId, guildDiscordId, creatorChannelDiscordId: randomUUID(), categoryDiscordId: randomUUID() } });
      await client.temporaryRoom.create({ data: {
        id: roomId, guildDiscordId, voiceCreatorId: creatorId, channelDiscordId: randomUUID(),
        name: 'Kept', userLimit: 11, status: 'ACTIVE', ownerDiscordId: 'owner',
      } });
      expect(await store.read(roomId)).toMatchObject({ room: { isLocked: false, visibility: 'PUBLIC' } });
      expect(await store.updateSettings(roomId, 0, { isLocked: true })).toBe(true);
      expect(await store.read(roomId)).toMatchObject({ room: { isLocked: true, visibility: 'PUBLIC' } });
      expect(await store.updateSettings(roomId, 0, { visibility: 'PRIVATE' })).toBe(true);
      for (const isLocked of [false, true]) {
        const before = (await store.read(roomId))!.room;
        expect(await store.updateSettings(roomId, 0, { isLocked })).toBe(true);
        expect((await store.read(roomId))!.room).toEqual({ ...before, isLocked, updatedAt: expect.any(Date) });
      }
      expect(await store.updateSettings(roomId, 0, { visibility: 'PUBLIC' })).toBe(true);
      expect(await store.read(roomId)).toMatchObject({ room: { isLocked: true, visibility: 'PUBLIC' } });
      expect(await store.updateSettings(roomId, 1, { isLocked: false })).toBe(false);
      expect(await store.read(roomId)).toMatchObject({ room: { isLocked: true, visibility: 'PUBLIC', controlVersion: 0 } });
    } finally {
      try {
        await client.temporaryRoom.deleteMany({ where: { id: roomId } });
        await client.voiceCreator.deleteMany({ where: { id: creatorId } });
      } finally { await disconnectDatabase(client); }
    }
  }, 30_000);
});
