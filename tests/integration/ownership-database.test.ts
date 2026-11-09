import { randomUUID } from 'node:crypto';

import { Client } from 'pg';
import { describe, expect, it } from 'vitest';

import { createPrismaClient, disconnectDatabase } from '../../src/core/database/prisma.js';
import { assertDisposableDatabaseEnvironment } from './database-test-utils.js';

const integrationTest = process.env.RUN_DATABASE_TESTS === 'true' ? it : it.skip;
const OWNER = 'owner';

describe('room ownership database', () => {
  integrationTest('metadata protects the three new tables with RLS and no policies', async () => {
    assertDisposableDatabaseEnvironment();
    const client = new Client({ connectionString: process.env.DIRECT_URL });
    try {
      await client.connect();
      const result = await client.query<{ name: string }>(`
        SELECT relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relrowsecurity
          AND c.relname = ANY($1::text[]) ORDER BY relname
      `, [['RoomPresence', 'RoomAllowedMember', 'PendingOwnershipTransfer']]);
      const protectedTables = result.rows.map(({ name }) => name);
      expect(protectedTables).toEqual(['PendingOwnershipTransfer', 'RoomAllowedMember', 'RoomPresence']);
      const policies = await client.query(`SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename = ANY($1::text[])`, [['RoomPresence', 'RoomAllowedMember', 'PendingOwnershipTransfer']]);
      expect(policies.rows).toEqual([]);
    } finally { await client.end(); }
  });

  integrationTest('active-owner constraint blocks duplicate tracked owners but permits other guilds and closed history', async () => {
    assertDisposableDatabaseEnvironment();
    const client = new Client({ connectionString: process.env.DIRECT_URL });
    const guild = randomUUID();
    const creatorId = randomUUID();
    try {
      await client.connect();
      await client.query('BEGIN');
      await client.query(`INSERT INTO "VoiceCreator" (id, "guildDiscordId", "creatorChannelDiscordId", "categoryDiscordId", "updatedAt") VALUES ($1,$2,$3,$4,now())`, [creatorId, guild, randomUUID(), randomUUID()]);
      const insert = (status: string, guildId = guild) => client.query(`INSERT INTO "TemporaryRoom" (id,"guildDiscordId","voiceCreatorId","channelDiscordId","ownerDiscordId",name,status,"updatedAt") VALUES ($1,$2,$3,$4,$5,'Room',$6::"TemporaryRoomStatus",now())`, [randomUUID(), guildId, creatorId, randomUUID(), OWNER, status]);
      await insert('CLOSED');
      await insert('ACTIVE', randomUUID());
      await insert('CREATING');
      for (const status of ['CREATING', 'ACTIVE', 'CLOSING']) {
        await client.query('SAVEPOINT duplicate_owner');
        await expect(insert(status)).rejects.toMatchObject({ code: '23505', constraint: 'TemporaryRoom_active_owner_key' });
        await client.query('ROLLBACK TO SAVEPOINT duplicate_owner');
      }
    } finally {
      try { await client.query('ROLLBACK'); } finally { await client.end(); }
    }
  });

  async function fixture() {
    assertDisposableDatabaseEnvironment();
    const client = createPrismaClient({ url: process.env.DATABASE_URL!, directUrl: process.env.DIRECT_URL! });
    const { PrismaRoomStateRepository } = await import('../../src/modules/calls/room-state.repository.js');
    const store = new PrismaRoomStateRepository(client);
    const guild = randomUUID();
    const creatorId = randomUUID();
    const roomIds = [randomUUID(), randomUUID(), randomUUID()];
    try {
      await client.voiceCreator.create({ data: { id: creatorId, guildDiscordId: guild, creatorChannelDiscordId: randomUUID(), categoryDiscordId: randomUUID() } });
      for (const [i, id] of roomIds.entries()) {
        await client.temporaryRoom.create({ data: { id, guildDiscordId: i === 2 ? randomUUID() : guild, voiceCreatorId: creatorId, channelDiscordId: randomUUID(), name: 'Room', status: 'ACTIVE', ownerDiscordId: i === 0 ? OWNER : null } });
      }
    } catch (error) {
      await cleanup();
      throw error;
    }
    async function cleanup() {
      try {
        await client.temporaryRoom.deleteMany({ where: { id: { in: roomIds } } });
        await client.voiceCreator.deleteMany({ where: { id: creatorId } });
      } finally { await disconnectDatabase(client); }
    }
    return { client, store, guild, creatorId, first: roomIds[0]!, second: roomIds[1]!, otherGuild: roomIds[2]!, cleanup };
  }

  integrationTest('owner CAS has one winner, translates conflicts, and releases closed history', async () => {
    const f = await fixture();
    try {
      await expect(f.store.changeOwner(f.second, 0, null, OWNER)).rejects.toMatchObject({ code: 'ALREADY_OWNS_ROOM' });
      expect(await f.store.changeOwner(f.otherGuild, 0, null, OWNER)).toBe(true);
      const winners = await Promise.all([f.store.changeOwner(f.first, 0, OWNER, 'next-a'), f.store.changeOwner(f.first, 0, OWNER, 'next-b')]);
      expect(winners.sort()).toEqual([false, true]);
      expect(await f.store.read(f.first)).toMatchObject({ room: { controlVersion: 1 } });
      await f.client.temporaryRoom.update({ where: { id: f.first }, data: { status: 'CLOSED', ownerDiscordId: OWNER } });
      expect(await f.store.changeOwner(f.second, 0, null, OWNER)).toBe(true);
    } finally { await f.cleanup(); }
  });

  integrationTest('priority persists with controls disabled while stale, owned and inactive writes remain blocked', async () => {
    const f = await fixture();
    try {
      await f.client.voiceCreator.update({ where: { id: f.creatorId }, data: { roomCommandsEnabled: false } });
      expect(await f.store.savePriority(f.second, 0, 'candidate', new Date(300000))).toBe(true);
      expect((await f.store.read(f.second))?.room).toMatchObject({ priorityMemberDiscordId: 'candidate', priorityExpiresAt: new Date(300000) });
      expect(await f.store.changeOwner(f.second, 0, null, 'candidate')).toBe(false);
      expect(await f.store.savePriority(f.second, 1, 'stale', new Date(600000))).toBe(false);
      expect(await f.store.savePriority(f.first, 0, 'owned', new Date(600000))).toBe(false);
      for (const status of ['CREATING', 'CLOSING', 'CLOSED'] as const) {
        await f.client.temporaryRoom.update({ where: { id: f.second }, data: { status } });
        expect(await f.store.savePriority(f.second, 0, 'inactive', new Date(600000))).toBe(false);
      }
    } finally { await f.cleanup(); }
  });

  integrationTest('owner acquisition races across same-guild rooms have one winner and clearing releases the old slot', async () => {
    const f = await fixture();
    try {
      expect(await f.store.changeOwner(f.first, 0, OWNER, null)).toBe(true);
      const results = await Promise.allSettled([f.store.changeOwner(f.first, 1, null, OWNER), f.store.changeOwner(f.second, 0, null, OWNER)]);
      expect(results.filter((r) => r.status === 'fulfilled' && r.value)).toHaveLength(1);
      expect(results.filter((r) => r.status === 'rejected')).toEqual([expect.objectContaining({ reason: expect.objectContaining({ code: 'ALREADY_OWNS_ROOM' }) })]);
      const winner = (await f.store.findOwnedRoom(f.guild, OWNER))!;
      expect(await f.store.changeOwner(winner.id, winner.controlVersion, OWNER, 'replacement')).toBe(true);
      const loserId = winner.id === f.first ? f.second : f.first;
      expect(await f.store.changeOwner(loserId, loserId === f.first ? 1 : 0, null, OWNER)).toBe(true);
    } finally { await f.cleanup(); }
  });

  integrationTest('presence continuity, restart reset, room uniqueness and hard-delete cascades', async () => {
    const f = await fixture();
    try {
      await f.store.syncPresence(f.first, [{ memberDiscordId: OWNER, isBot: false }, { memberDiscordId: 'bot', isBot: true }], new Date(1000), false);
      await f.store.syncPresence(f.first, [{ memberDiscordId: OWNER, isBot: false }], new Date(2000), false);
      expect((await f.store.read(f.first))?.presences).toEqual([expect.objectContaining({ memberDiscordId: OWNER, joinedAt: new Date(1000) })]);
      await f.store.syncPresence(f.first, [{ memberDiscordId: OWNER, isBot: false }], new Date(3000), true);
      expect((await f.store.read(f.first))?.presences[0]?.joinedAt).toEqual(new Date(3000));
      await expect(f.client.roomPresence.create({ data: { roomId: f.first, memberDiscordId: OWNER, isBot: false, joinedAt: new Date() } })).rejects.toMatchObject({ code: 'P2002' });
      expect(await f.store.setAllowed(f.first, 0, 'guest', true)).toBe(true);
      expect(await f.store.setAllowed(f.first, 0, 'guest', true)).toBe(true);
      await expect(f.client.roomAllowedMember.create({ data: { roomId: f.first, memberDiscordId: 'guest' } })).rejects.toMatchObject({ code: 'P2002' });
      await f.store.createTransfer({ roomId: f.first, ownerDiscordId: OWNER, targetDiscordId: 'target', controlVersion: 0 });
      await f.client.temporaryRoom.delete({ where: { id: f.first } });
      expect(await f.client.roomPresence.count({ where: { roomId: f.first } })).toBe(0);
      expect(await f.client.roomAllowedMember.count({ where: { roomId: f.first } })).toBe(0);
      expect(await f.client.pendingOwnershipTransfer.count({ where: { roomId: f.first } })).toBe(0);
    } finally { await f.cleanup(); }
  });

  integrationTest('one pending transfer, one-shot arming, timeout boundary and atomic ownership completion', async () => {
    const f = await fixture();
    try {
      const transfer = await f.store.createTransfer({ roomId: f.first, ownerDiscordId: OWNER, targetDiscordId: 'target', controlVersion: 0 });
      expect(transfer.expiresAt).toBeNull();
      await expect(f.store.createTransfer({ roomId: f.first, ownerDiscordId: OWNER, targetDiscordId: 'other', controlVersion: 0 })).rejects.toMatchObject({ code: 'TRANSFER_PENDING' });
      expect(await f.store.finishTransfer(transfer.id, 0, new Date(5000), 'timeout')).toBe(false);
      expect(await f.store.armTransfer(transfer.id, 0, new Date(5000))).toBe(true);
      expect(await f.store.armTransfer(transfer.id, 0, new Date(10000))).toBe(false);
      expect(await f.store.finishTransfer(transfer.id, 0, new Date(4999), 'timeout')).toBe(false);
      expect(await f.store.finishTransfer(transfer.id, 0, new Date(5000), 'timeout')).toBe(true);
      expect(await f.store.read(f.first)).toMatchObject({ room: { ownerDiscordId: 'target', controlVersion: 1, priorityMemberDiscordId: null, priorityExpiresAt: null }, transfer: null });
      expect(await f.store.finishTransfer(transfer.id, 0, new Date(5000), 'timeout')).toBe(false);
    } finally { await f.cleanup(); }
  });

  integrationTest('failed transfer completion rolls back ownership, version, priority and pending row', async () => {
    const f = await fixture();
    try {
      await f.store.changeOwner(f.second, 0, null, 'target');
      await f.client.temporaryRoom.update({ where: { id: f.first }, data: { priorityMemberDiscordId: 'priority', priorityExpiresAt: new Date(300000) } });
      const transfer = await f.store.createTransfer({ roomId: f.first, ownerDiscordId: OWNER, targetDiscordId: 'target', controlVersion: 0 });
      await expect(f.store.finishTransfer(transfer.id, 0, new Date(0), 'confirm')).rejects.toMatchObject({ code: 'ALREADY_OWNS_ROOM' });
      expect(await f.store.read(f.first)).toMatchObject({ room: { ownerDiscordId: OWNER, controlVersion: 0, priorityMemberDiscordId: 'priority' }, transfer: { id: transfer.id } });
    } finally { await f.cleanup(); }
  });

  integrationTest('restart invalidation CAS preserves possession/priority and cannot remove a newer transfer', async () => {
    const f = await fixture();
    try {
      await f.client.temporaryRoom.update({ where: { id: f.first }, data: { priorityMemberDiscordId: 'priority', priorityExpiresAt: new Date(300000) } });
      await f.store.createTransfer({ roomId: f.first, ownerDiscordId: OWNER, targetDiscordId: 'target', controlVersion: 0 });
      expect(await f.store.invalidateControls(f.first, 0)).toBe(true);
      expect(await f.store.read(f.first)).toMatchObject({ room: { ownerDiscordId: OWNER, controlVersion: 1, priorityMemberDiscordId: 'priority', priorityExpiresAt: new Date(300000) }, transfer: null });
      const next = await f.store.createTransfer({ roomId: f.first, ownerDiscordId: OWNER, targetDiscordId: 'target', controlVersion: 1 });
      expect(await f.store.invalidateControls(f.first, 0)).toBe(false);
      await f.store.discardTransfer('00000000-0000-0000-0000-000000000000');
      expect((await f.store.read(f.first))?.transfer?.id).toBe(next.id);
    } finally { await f.cleanup(); }
  });

  integrationTest('prepared confirmation, undo and racing completion have exactly one result', async () => {
    const f = await fixture();
    try {
      const prepared = await f.store.createTransfer({ roomId: f.first, ownerDiscordId: OWNER, targetDiscordId: 'target', controlVersion: 0 });
      expect(await f.store.cancelTransfer(prepared.id, 'not-owner', new Date(0))).toBe(false);
      expect(await f.store.cancelTransfer(prepared.id, OWNER, new Date(0))).toBe(true);
      expect(await f.store.finishTransfer(prepared.id, 0, new Date(0), 'confirm')).toBe(false);
      const next = await f.store.createTransfer({ roomId: f.first, ownerDiscordId: OWNER, targetDiscordId: 'target', controlVersion: 0 });
      const results = await Promise.all([
        f.store.finishTransfer(next.id, 0, new Date(0), 'confirm'),
        f.store.cancelTransfer(next.id, OWNER, new Date(0)),
      ]);
      expect(results.filter(Boolean)).toHaveLength(1);
      const state = await f.store.read(f.first);
      expect(state?.transfer).toBeNull();
      expect(state?.room).toMatchObject(results[0]
        ? { ownerDiscordId: 'target', controlVersion: 1 }
        : { ownerDiscordId: OWNER, controlVersion: 0 });
      if (!results[0]) {
        const confirm = await f.store.createTransfer({ roomId: f.first, ownerDiscordId: OWNER, targetDiscordId: 'target', controlVersion: 0 });
        expect(await f.store.finishTransfer(confirm.id, 0, new Date(0), 'confirm')).toBe(true);
      }
      expect((await f.store.read(f.first))?.room).toMatchObject({ ownerDiscordId: 'target', controlVersion: 1 });
    } finally { await f.cleanup(); }
  });

  integrationTest('lifecycle owner clearing and closure invalidate controls and pending transfers once', async () => {
    const f = await fixture();
    const { PrismaTemporaryRoomRepository } = await import('../../src/modules/calls/call.repository.js');
    const lifecycle = new PrismaTemporaryRoomRepository(f.client);
    try {
      await f.store.createTransfer({ roomId: f.first, ownerDiscordId: OWNER, targetDiscordId: 'target', controlVersion: 0 });
      await f.client.temporaryRoom.update({ where: { id: f.first }, data: { priorityMemberDiscordId: 'priority', priorityExpiresAt: new Date(300000) } });
      await lifecycle.clearOwner(f.first, 'stale-owner');
      expect((await f.store.read(f.first))?.transfer).not.toBeNull();
      expect(await lifecycle.clearOwner(f.first, OWNER)).toMatchObject({ ownerDiscordId: null, controlVersion: 1, priorityMemberDiscordId: null, priorityExpiresAt: null });
      expect((await f.store.read(f.first))?.transfer).toBeNull();
      expect(await f.store.changeOwner(f.first, 1, null, OWNER)).toBe(true);
      await f.store.createTransfer({ roomId: f.first, ownerDiscordId: OWNER, targetDiscordId: 'target', controlVersion: 2 });
      expect(await lifecycle.beginClosing(f.first)).toMatchObject({ status: 'CLOSING', controlVersion: 3 });
      expect((await f.store.read(f.first))?.transfer).toBeNull();
      expect(await lifecycle.beginClosing(f.first)).toMatchObject({ controlVersion: 3 });
      expect(await lifecycle.markClosed(f.first)).toMatchObject({ status: 'CLOSED', controlVersion: 4 });
      expect(await lifecycle.markClosed(f.first)).toMatchObject({ controlVersion: 4 });
      expect(await f.store.invalidateControls(f.first, 4)).toBe(false);
      expect(await f.store.changeOwner(f.first, 4, OWNER, null)).toBe(false);
    } finally { await f.cleanup(); }
  });

  integrationTest('disabled configuration blocks controls but permits clearing owner and panel', async () => {
    const f = await fixture();
    try {
      await f.client.voiceCreator.update({ where: { id: f.creatorId }, data: { roomCommandsEnabled: false, deletedAt: new Date() } });
      expect((await f.store.read(f.first))?.controlsEnabled).toBe(false);
      expect(await f.store.updateSettings(f.first, 0, { name: 'No' })).toBe(false);
      expect(await f.store.setAllowed(f.first, 0, 'guest', true)).toBe(false);
      expect(await f.store.changeOwner(f.second, 0, null, 'next')).toBe(false);
      expect(await f.store.setPanelId(f.first, 0, null, 'new-panel')).toBe(false);
      expect(await f.store.setPanelId(f.first, 0, null, null)).toBe(true);
      expect(await f.store.changeOwner(f.first, 0, OWNER, null)).toBe(true);
      expect((await f.store.read(f.first))?.room.ownerDiscordId).toBeNull();
    } finally { await f.cleanup(); }
  });
});
