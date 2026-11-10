import { randomUUID } from 'node:crypto';

import { Client } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import { createPrismaClient, disconnectDatabase } from '../../src/core/database/prisma.js';
import type { RoomStateRepository } from '../../src/modules/calls/room-state.repository.js';
import { RoomAccessService } from '../../src/modules/calls/room-access.service.js';
import { RoomControlsService } from '../../src/modules/calls/room-controls.service.js';
import { RoomCoordinator } from '../../src/modules/calls/room.coordinator.js';
import type { RoomActor, RoomDiscordGateway, RoomState } from '../../src/modules/calls/room.types.js';
import { OwnershipTimers } from '../../src/modules/ownership/ownership.timers.js';
import { TransferService } from '../../src/modules/ownership/transfer.service.js';
import { KeyedMutex } from '../../src/shared/keyed-mutex.js';
import { PrismaVoiceCreatorRepository } from '../../src/modules/setup/setup.repository.js';
import { createLogger } from '../../src/core/logger/logger.js';
import { RoomPanelService } from '../../src/modules/calls/room-panel.service.js';
import { DiscordRoomGateway } from '../../src/modules/calls/room.discord.js';
import { createRoomRuntime } from '../../src/modules/calls/room.runtime.js';
import { CallInteractions, type CallInteraction } from '../../src/modules/calls/call.interactions.js';
import { SetupService } from '../../src/modules/setup/setup.service.js';
import { MessageFlags, type Guild } from 'discord.js';
import { discordFixture } from '../unit/modules/calls/call.discord.fixtures.js';
import { deferred } from '../unit/modules/calls/call.fixtures.js';
import { assertDisposableDatabaseEnvironment } from './database-test-utils.js';
import { roomSettingsFixture } from '../unit/modules/calls/room-settings.fixtures.js';

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

  integrationTest('creator off/on atomically invalidates tracked versions and transfers without changing room settings', async () => {
    const f = await fixture();
    try {
      const creators = new PrismaVoiceCreatorRepository(f.client);
      await f.client.temporaryRoom.update({ where: { id: f.second }, data: { status: 'CREATING', visibility: 'PRIVATE', userLimit: 3, priorityMemberDiscordId: 'candidate', priorityExpiresAt: new Date(300000) } });
      await f.client.temporaryRoom.update({ where: { id: f.otherGuild }, data: { status: 'CLOSING' } });
      const transfer = await f.store.createTransfer({ roomId: f.first, ownerDiscordId: OWNER, targetDiscordId: 'target', controlVersion: 0 });
      await f.store.armTransfer(transfer.id, 0, new Date(5000));
      expect(await creators.setRoomCommandsEnabled(f.creatorId, false)).toMatchObject({ roomCommandsEnabled: false });
      for (const id of [f.first, f.second, f.otherGuild]) {
        expect(await f.store.read(id)).toMatchObject({ controlsEnabled: false, room: { controlVersion: 1 }, transfer: null });
      }
      expect(await f.store.finishTransfer(transfer.id, 0, new Date(1000), 'confirm')).toBe(false);
      expect(await f.store.finishTransfer(transfer.id, 0, new Date(6000), 'timeout')).toBe(false);
      expect(await f.store.setPanelId(f.first, 0, null, 'stale')).toBe(false);
      await creators.setRoomCommandsEnabled(f.creatorId, true);
      expect(await f.store.setPanelId(f.first, 0, null, 'stale')).toBe(false);
      expect(await f.store.read(f.first)).toMatchObject({ controlsEnabled: true, room: { controlVersion: 2, ownerDiscordId: OWNER }, transfer: null });
      expect(await f.store.read(f.second)).toMatchObject({ room: { controlVersion: 2, visibility: 'PRIVATE', userLimit: 3, priorityMemberDiscordId: 'candidate', priorityExpiresAt: new Date(300000) } });
      await f.client.temporaryRoom.update({ where: { id: f.otherGuild }, data: { status: 'CLOSED' } });
      await creators.setRoomCommandsEnabled(f.creatorId, false);
      expect((await f.store.read(f.otherGuild))?.room.controlVersion).toBe(2);
      await creators.delete(f.creatorId);
      expect(await creators.findById(f.creatorId)).toBeNull();
      expect(await creators.listByGuild(f.guild)).toEqual([]);
      expect(await f.store.read(f.first)).toMatchObject({ controlsEnabled: false, room: { status: 'ACTIVE' } });
    } finally { await f.cleanup(); }
  });

  integrationTest('a failed version increment rolls back the saved creator flag and pending-transfer cancellation', async () => {
    const f = await fixture();
    try {
      const creators = new PrismaVoiceCreatorRepository(f.client);
      const transfer = await f.store.createTransfer({ roomId: f.first, ownerDiscordId: OWNER, targetDiscordId: 'target', controlVersion: 0 });
      await f.client.temporaryRoom.update({ where: { id: f.second }, data: { controlVersion: 2147483647 } });
      await expect(creators.setRoomCommandsEnabled(f.creatorId, false)).rejects.toThrow();
      expect(await creators.findById(f.creatorId)).toMatchObject({ roomCommandsEnabled: true });
      expect(await f.store.read(f.first)).toMatchObject({ room: { controlVersion: 0 }, transfer: { id: transfer.id } });
      expect((await f.store.read(f.second))?.room.controlVersion).toBe(2147483647);
    } finally { await f.cleanup(); }
  });

  integrationTest('a concurrent pending-transfer creation cannot survive a committed controls toggle', async () => {
    const f = await fixture();
    try {
      const creators = new PrismaVoiceCreatorRepository(f.client);
      const [toggle, transfer] = await Promise.allSettled([
        creators.setRoomCommandsEnabled(f.creatorId, false),
        f.store.createTransfer({ roomId: f.first, ownerDiscordId: OWNER, targetDiscordId: 'target', controlVersion: 0 }),
      ]);
      expect(toggle.status).toBe('fulfilled');
      if (transfer.status === 'rejected') expect(transfer.reason).toMatchObject({ code: expect.stringMatching(/^(CONTROLS_DISABLED|STALE_CONTROLS)$/) });
      expect(await f.store.read(f.first)).toMatchObject({ controlsEnabled: false, room: { controlVersion: 1, ownerDiscordId: OWNER }, transfer: null });
    } finally { await f.cleanup(); }
  });

  integrationTest('SQL panel installation CAS loses after off/on and compensation deletes only the REST-created duplicate', async () => {
    const f = await fixture();
    try {
      const d = discordFixture();
      const creators = new PrismaVoiceCreatorRepository(f.client);
      await f.client.temporaryRoom.update({ where: { id: f.first }, data: { guildDiscordId: d.guild.id, channelDiscordId: d.channel.id } });
      d.states.clear(); d.states.set(d.member.id, { channelId: d.channel.id });
      const createdId = '70000000000000000'; const winnerId = '80000000000000000';
      const messages = new Set<string>();
      d.channel.send.mockImplementation(async () => {
        messages.add(createdId);
        await creators.setRoomCommandsEnabled(f.creatorId, false);
        await creators.setRoomCommandsEnabled(f.creatorId, true);
        messages.add(winnerId);
        expect(await f.store.setPanelId(f.first, 2, null, winnerId)).toBe(true);
        return { ...d.message, id: createdId };
      });
      d.channel.messages.fetch.mockImplementation(async (...args: unknown[]) => {
        const id = args[0] as string;
        if (!messages.has(id)) throw { code: 10008 };
        d.message.delete.mockImplementation(async () => { messages.delete(id); });
        return { ...d.message, id };
      });
      const coordinator = new RoomCoordinator(new KeyedMutex());
      const service = new RoomPanelService({ store: f.store, coordinator, logger: createLogger({ level: 'silent' }) });
      await expect(coordinator.room(d.guild.id, d.channel.id, () => service.synchronizeLocked(f.first, new DiscordRoomGateway(d.guild as unknown as Guild))))
        .rejects.toMatchObject({ code: 'STALE_CONTROLS' });
      expect([...messages]).toEqual([winnerId]);
      expect(await f.store.read(f.first)).toMatchObject({ controlsEnabled: true, room: { controlVersion: 2, controlMessageDiscordId: winnerId } });
    } finally { await f.cleanup(); }
  });

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

  async function transferRuntime(f: Awaited<ReturnType<typeof fixture>>, store: RoomStateRepository = f.store) {
    const rooms = (await Promise.all([f.store.read(f.first), f.store.read(f.second)])).map((state) => state!.room);
    const unused = async (): Promise<never> => { throw new Error('Unused Discord boundary'); };
    const gateway: RoomDiscordGateway = {
      snapshot: async (id) => {
        const room = rooms.find((r) => r.channelDiscordId === id);
        return room ? { guildDiscordId: f.guild, channelDiscordId: id, name: room.name, userLimit: 0,
          members: [OWNER, 'second-owner', 'target'].map((memberDiscordId) => ({ memberDiscordId, isBot: false })) } : null;
      },
      resolveMember: async (memberDiscordId) => ({ memberDiscordId, isBot: false }),
      rename: unused, restoreName: unused, setLimit: unused, readAccess: unused, setRoomAccess: unused,
      restoreAccess: unused, sendControlPanel: unused, updateControlPanel: unused, deleteControlPanel: unused,
    };
    const timers = new OwnershipTimers({ error: () => { throw new Error('Unexpected timer error'); } });
    const changed: RoomState[] = [];
    const service = new TransferService({ store, coordinator: new RoomCoordinator(new KeyedMutex()), timers,
      onChangedLocked: async (id) => { changed.push((await f.store.read(id))!); } });
    const actor = (id = f.first, owner = OWNER): RoomActor => ({ roomId: id, guildDiscordId: f.guild, memberDiscordId: owner, controlVersion: 0 });
    return { service, gateway, timers, changed, actor };
  }

  integrationTest('transfer service confirms a prepared operation once and synchronizes only committed state', async () => {
    const f = await fixture();
    const runtime = await transferRuntime(f);
    try {
      await f.store.setAllowed(f.first, 0, 'allowed', true);
      const pending = await runtime.service.begin(runtime.actor(), 'target', runtime.gateway);
      expect(pending.expiresAt).toBeNull();
      await Promise.all([
        runtime.service.confirm(runtime.actor(), pending.id, runtime.gateway),
        runtime.service.confirm(runtime.actor(), pending.id, runtime.gateway),
      ]);
      expect(await runtime.service.activate(runtime.actor(), pending.id, runtime.gateway)).toBeNull();
      expect(runtime.changed).toHaveLength(1);
      expect(runtime.changed[0]).toMatchObject({ room: { ownerDiscordId: 'target', controlVersion: 1 }, transfer: null, allowedMemberIds: ['allowed'] });
    } finally { await runtime.timers.stop(); await f.cleanup(); }
  });

  integrationTest('service undo preserves an elapsed operation; exact failed-publication cleanup preserves its replacement', async () => {
    const f = await fixture();
    const runtime = await transferRuntime(f);
    try {
      const first = await runtime.service.begin(runtime.actor(), 'target', runtime.gateway);
      await runtime.service.undo(runtime.actor(), first.id, runtime.gateway);
      const second = await runtime.service.begin(runtime.actor(), 'target', runtime.gateway);
      await runtime.service.activate(runtime.actor(), second.id, runtime.gateway);
      await runtime.service.abortUnpublished(first.id, runtime.gateway);
      expect((await f.store.read(f.first))?.transfer?.id).toBe(second.id);
      await runtime.service.abortUnpublished(second.id, runtime.gateway);
      const elapsed = await runtime.service.begin(runtime.actor(), 'target', runtime.gateway);
      expect(await f.store.armTransfer(elapsed.id, 0, new Date(0))).toBe(true);
      await expect(runtime.service.undo(runtime.actor(), elapsed.id, runtime.gateway)).rejects.toMatchObject({ code: 'TRANSFER_EXPIRED' });
      expect((await f.store.read(f.first))?.transfer?.id).toBe(elapsed.id);
      await Promise.all([runtime.service.expire(elapsed.id, runtime.gateway), runtime.service.expire(elapsed.id, runtime.gateway)]);
      expect((await f.store.read(f.first))?.room).toMatchObject({ ownerDiscordId: 'target', controlVersion: 1 });
      expect(runtime.changed).toHaveLength(1);
    } finally { await runtime.timers.stop(); await f.cleanup(); }
  });

  integrationTest('independent transfer services racing for the same target have one transactional owner-slot winner', async () => {
    const f = await fixture();
    await f.store.changeOwner(f.second, 0, null, 'second-owner');
    let arrived = 0;
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => { release = resolve; });
    let racing = false;
    const racingStore: RoomStateRepository = Object.create(f.store);
    racingStore.findOwnedRoom = async (guild, member) => {
      const owned = await f.store.findOwnedRoom(guild, member);
      if (racing && member === 'target') { if (++arrived === 2) release(); await barrier; }
      return owned;
    };
    const a = await transferRuntime(f, racingStore);
    const b = await transferRuntime(f, racingStore);
    try {
      const first = await a.service.begin(a.actor(), 'target', a.gateway);
      const secondActor = { ...b.actor(f.second, 'second-owner'), controlVersion: 1 };
      const second = await b.service.begin(secondActor, 'target', b.gateway);
      racing = true;
      const results = await Promise.allSettled([
        a.service.confirm(a.actor(), first.id, a.gateway), b.service.confirm(secondActor, second.id, b.gateway),
      ]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(results.filter((r) => r.status === 'rejected')).toEqual([expect.objectContaining({ reason: expect.objectContaining({ code: 'ALREADY_OWNS_ROOM' }) })]);
      const states = await Promise.all([f.store.read(f.first), f.store.read(f.second)]);
      expect(states.filter((s) => s!.room.ownerDiscordId === 'target')).toHaveLength(1);
      expect(states.every((s) => s!.transfer === null)).toBe(true);
      expect(a.changed.length + b.changed.length).toBe(1);
    } finally { await a.timers.stop(); await b.timers.stop(); await f.cleanup(); }
  });

  async function settingsRuntime(f: Awaited<ReturnType<typeof fixture>>, store: RoomStateRepository = f.store) {
    const boundaries = roomSettingsFixture();
    const owner = boundaries.actor().memberDiscordId;
    await f.client.temporaryRoom.update({ where: { id: f.first }, data: {
      guildDiscordId: boundaries.guild.id, channelDiscordId: boundaries.channel.id, ownerDiscordId: owner,
    } });
    const access = new RoomAccessService(store, boundaries.coordinator);
    const changed: RoomState[] = [];
    const controls = new RoomControlsService({ store, coordinator: boundaries.coordinator, access,
      onChangedLocked: async (id) => { changed.push((await f.store.read(id))!); } });
    return { ...boundaries, access, controls, changed,
      actor: (): RoomActor => ({ ...boundaries.actor(), roomId: f.first }) };
  }

  integrationTest('settings service round trips names, limits, room-specific access and privacy across ownership', async () => {
    const f = await fixture(); const r = await settingsRuntime(f); const guest = '72345678901234567';
    try {
      await r.controls.rename(r.actor(), `  ${'👨‍👩‍👧‍👦'.repeat(11)}  `, r.gateway);
      await r.controls.setLimit(r.actor(), 1, r.gateway);
      await r.controls.setAllowed(r.actor(), guest, true, r.gateway);
      await r.controls.setVisibility(r.actor(), 'PRIVATE', r.gateway);
      expect(await f.store.read(f.first)).toMatchObject({ room: { name: '👨‍👩‍👧‍👦'.repeat(11), userLimit: 1, visibility: 'PRIVATE' }, allowedMemberIds: [guest] });
      expect(r.changed).toHaveLength(4); expect(r.changed[3]?.room.visibility).toBe('PRIVATE');
      expect((await f.store.read(f.second))?.allowedMemberIds).toEqual([]);
      const next = '82345678901234567';
      expect(await f.store.changeOwner(f.first, 0, r.actor().memberDiscordId, next)).toBe(true);
      r.join(next); r.leave(r.actor().memberDiscordId);
      const actor = { ...r.actor(), memberDiscordId: next, controlVersion: 1 };
      await r.controls.setVisibility(actor, 'PUBLIC', r.gateway);
      await r.controls.setVisibility(actor, 'PRIVATE', r.gateway);
      expect((await f.store.read(f.first))?.allowedMemberIds).toEqual([guest]);
      await r.controls.setAllowed(actor, guest, false, r.gateway);
      expect((await f.store.read(f.first))?.allowedMemberIds).toEqual([]);
      expect(r.member.voice.setChannel).not.toHaveBeenCalled();
    } finally { await f.cleanup(); }
  });

  integrationTest('settings/list CAS rejects stale, disabled and inactive writes without changing stored values', async () => {
    const f = await fixture();
    try {
      expect(await f.store.updateSettings(f.first, 0, { name: 'Kept', userLimit: 9, visibility: 'PRIVATE' })).toBe(true);
      expect(await f.store.setAllowed(f.first, 0, 'kept', true)).toBe(true);
      expect(await f.store.updateSettings(f.first, 1, { name: 'Lost' })).toBe(false);
      expect(await f.store.setAllowed(f.first, 1, 'kept', false)).toBe(false);
      await f.client.voiceCreator.update({ where: { id: f.creatorId }, data: { roomCommandsEnabled: false } });
      expect(await f.store.updateSettings(f.first, 0, { name: 'Lost' })).toBe(false);
      expect(await f.store.setAllowed(f.first, 0, 'kept', false)).toBe(false);
      await f.client.voiceCreator.update({ where: { id: f.creatorId }, data: { roomCommandsEnabled: true } });
      for (const status of ['CREATING', 'CLOSING', 'CLOSED'] as const) {
        await f.client.temporaryRoom.update({ where: { id: f.first }, data: { status } });
        expect(await f.store.updateSettings(f.first, 0, { name: 'Lost' })).toBe(false);
        expect(await f.store.setAllowed(f.first, 0, 'kept', false)).toBe(false);
      }
      expect(await f.store.read(f.first)).toMatchObject({ room: { name: 'Kept', userLimit: 9, visibility: 'PRIVATE' }, allowedMemberIds: ['kept'] });
    } finally { await f.cleanup(); }
  });

  integrationTest('no SQL transaction spans Discord I/O; config changes there compensate actual prior settings', async () => {
    const f = await fixture(); const r = await settingsRuntime(f);
    try {
      r.channel.name = 'External';
      r.channel.setName.mockImplementationOnce(async (name) => {
        r.channel.name = name;
        await f.client.voiceCreator.update({ where: { id: f.creatorId }, data: { roomCommandsEnabled: false } });
      });
      await expect(r.controls.rename(r.actor(), 'Rejected', r.gateway)).rejects.toMatchObject({ code: 'CONTROLS_DISABLED' });
      expect(r.channel.name).toBe('External'); expect((await f.store.read(f.first))?.room.name).toBe('Room'); expect(r.changed).toEqual([]);
    } finally { await f.cleanup(); }
  });

  integrationTest('a changed SQL authority after permission writes requires reconciliation rather than restoring obsolete grants', async () => {
    const f = await fixture();
    const racingStore: RoomStateRepository = Object.create(f.store);
    racingStore.setAllowed = async (id, version, member, allowed) => {
      await f.client.temporaryRoom.update({ where: { id }, data: { controlVersion: { increment: 1 } } });
      return f.store.setAllowed(id, version, member, allowed);
    };
    const r = await settingsRuntime(f, racingStore);
    try {
      await r.controls.setVisibility(r.actor(), 'PRIVATE', r.gateway);
      const previous = await r.gateway.readAccess(r.channel.id);
      const restore = vi.spyOn(r.gateway, 'restoreAccess');
      await expect(r.controls.setAllowed(r.actor(), '72345678901234567', true, r.gateway)).rejects.toMatchObject({ code: 'STALE_CONTROLS' });
      expect(restore).not.toHaveBeenCalled(); expect(r.access.isUncertain(f.first)).toBe(true);
      expect(await f.store.read(f.first)).toMatchObject({ room: { visibility: 'PRIVATE', controlVersion: 1 }, allowedMemberIds: [] });
      expect(r.changed).toHaveLength(1);
      await f.client.voiceCreator.update({ where: { id: f.creatorId }, data: { roomCommandsEnabled: false } });
      const state = (await f.store.read(f.first))!;
      await r.access.synchronizeLocked(state, (await r.gateway.snapshot(r.channel.id))!, r.gateway);
      expect(await r.gateway.readAccess(r.channel.id)).toEqual(previous);
      expect(r.access.isUncertain(f.first)).toBe(false);
      expect((await f.store.read(f.first))?.room.visibility).toBe('PRIVATE');
    } finally { await f.cleanup(); }
  });

  integrationTest('composed startup cancels prior transfers, invalidates old menus and reobserves SQL presence without changing a present owner', async () => {
    const f = await fixture(); const d = discordFixture();
    const runtime = createRoomRuntime(f.client, createLogger({ level: 'silent' }));
    try {
      await f.client.temporaryRoom.updateMany({ where: { id: { in: [f.second, f.otherGuild] } }, data: { status: 'CLOSED' } });
      await f.client.temporaryRoom.update({ where: { id: f.first }, data: {
        guildDiscordId: d.guild.id, channelDiscordId: d.channel.id, ownerDiscordId: d.member.id,
      } });
      d.states.set(d.member.id, { channelId: d.channel.id });
      await f.store.syncPresence(f.first, [{ memberDiscordId: d.member.id, isBot: false }], new Date(0), false);
      const old = await f.store.createTransfer({ roomId: f.first, ownerDiscordId: d.member.id, targetDiscordId: '72345678901234567', controlVersion: 0 });
      await f.store.armTransfer(old.id, 0, new Date(0));
      const before = Date.now();
      await runtime.start(async () => d.guild as unknown as Guild);
      const state = (await runtime.store.read(f.first))!;
      expect(state).toMatchObject({ transfer: null, room: { ownerDiscordId: d.member.id, controlVersion: 1, status: 'ACTIVE', controlMessageDiscordId: d.message.id } });
      expect(state.presences).toHaveLength(1);
      expect(state.presences[0]!.joinedAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(await f.store.finishTransfer(old.id, 0, new Date(), 'timeout')).toBe(false);
      const gateway = new DiscordRoomGateway(d.guild as unknown as Guild);
      await expect(runtime.controls.rename({ roomId: f.first, guildDiscordId: d.guild.id, memberDiscordId: d.member.id, controlVersion: 0 }, 'Stale', gateway)).rejects.toMatchObject({ code: 'STALE_CONTROLS' });
      expect((await f.store.read(f.first))?.room.name).toBe('Room');
    } finally { await runtime.stop(); await f.cleanup(); }
  });

  integrationTest('SQL off/on cancels a published-late exact operation; the real handler never arms an invisible timeout', async () => {
    const f = await fixture(); const d = discordFixture(); const target = '72345678901234567';
    const runtime = createRoomRuntime(f.client, createLogger({ level: 'silent' }));
    try {
      await f.client.temporaryRoom.updateMany({ where: { id: { in: [f.second, f.otherGuild] } }, data: { status: 'CLOSED' } });
      await f.client.temporaryRoom.update({ where: { id: f.first }, data: { guildDiscordId: d.guild.id, channelDiscordId: d.channel.id, ownerDiscordId: d.member.id } });
      d.states.set(d.member.id, { channelId: d.channel.id }); d.states.set(target, { channelId: d.channel.id });
      await runtime.start(async () => d.guild as unknown as Guild);
      const creators = new PrismaVoiceCreatorRepository(f.client);
      const setup = new SetupService(creators, (id) => runtime.synchronizeCreator(id), createLogger({ level: 'silent' }));
      const handler = new CallInteractions(runtime, (guild) => new DiscordRoomGateway(guild));
      const responses: unknown[] = [];
      const entered = deferred(); const release = deferred(); const disabled = deferred();
      const save = creators.setRoomCommandsEnabled.bind(creators);
      vi.spyOn(creators, 'setRoomCommandsEnabled').mockImplementationOnce(async (...args) => {
        const result = await save(...args); disabled.resolve(); return result;
      });
      let publication = true;
      const customId = `call:v3:transfer-target:${f.first}:1`;
      const interaction = {
        customId, guild: d.guild, guildId: d.guild.id, channelId: d.channel.id, createdTimestamp: Date.now(), applicationId: '92345678901234567',
        message: { id: '82345678901234567', flags: { has: (flag: number) => flag === MessageFlags.Ephemeral },
          author: { id: '92345678901234567' }, interactionMetadata: { user: { id: d.member.id } }, components: [{ components: [{ customId }] }] },
        user: { id: d.member.id }, values: [target], inGuild: () => true,
        isButton: () => false, isUserSelectMenu: () => true, isStringSelectMenu: () => false, isModalSubmit: () => false,
        deferUpdate: async () => {}, reply: async (payload: unknown) => { responses.push(payload); },
        editReply: async (payload: unknown) => { responses.push(payload); },
        webhook: { editMessage: async (_id: string, payload: unknown) => {
          responses.push(payload);
          if (publication) {
            publication = false;
            expect((await runtime.store.read(f.first))?.transfer?.expiresAt).toBeNull();
            entered.resolve(); await release.promise;
          }
          return { id: '82345678901234567' };
        } },
      } as unknown as CallInteraction;
      const handling = handler.execute(interaction); await entered.promise;
      const disabling = setup.toggleRoomCommands(f.creatorId); await disabled.promise;
      release.resolve();
      expect((await disabling).synchronization).toEqual({ synced: 1, failed: 0 });
      expect((await setup.toggleRoomCommands(f.creatorId)).synchronization).toEqual({ synced: 1, failed: 0 });
      await handling;
      expect(await runtime.store.read(f.first)).toMatchObject({ controlsEnabled: true, transfer: null, room: { ownerDiscordId: d.member.id, controlVersion: 3 } });
      expect(JSON.stringify(responses.at(-1))).toContain('expirou');
      expect(d.message.delete).toHaveBeenCalledOnce();
    } finally { await runtime.stop(); await f.cleanup(); }
  });

  integrationTest('logical creator deletion hides setup but preserves existing-room preference and live owner controls', async () => {
    const f = await fixture(); const d = discordFixture();
    d.channel.setName.mockImplementation(async (name) => { d.channel.name = name; });
    const runtime = createRoomRuntime(f.client, createLogger({ level: 'silent' }));
    try {
      await f.client.temporaryRoom.updateMany({ where: { id: { in: [f.second, f.otherGuild] } }, data: { status: 'CLOSED' } });
      await f.client.temporaryRoom.update({ where: { id: f.first }, data: { guildDiscordId: d.guild.id, channelDiscordId: d.channel.id, ownerDiscordId: d.member.id } });
      d.states.clear(); d.states.set(d.member.id, { channelId: d.channel.id });
      await runtime.start(async () => d.guild as unknown as Guild);
      const creators = new PrismaVoiceCreatorRepository(f.client);
      await creators.delete(f.creatorId);
      expect(await creators.findById(f.creatorId)).toBeNull();
      expect(await runtime.store.read(f.first)).toMatchObject({ controlsEnabled: true, room: { status: 'ACTIVE', controlVersion: 1 } });
      const gateway = new DiscordRoomGateway(d.guild as unknown as Guild);
      await runtime.controls.rename({ roomId: f.first, guildDiscordId: d.guild.id, memberDiscordId: d.member.id, controlVersion: 1 }, 'Retained', gateway);
      expect(d.channel.name).toBe('Retained');
      expect((await runtime.store.read(f.first))?.room.name).toBe('Retained');
    } finally { await runtime.stop(); await f.cleanup(); }
  });
});
