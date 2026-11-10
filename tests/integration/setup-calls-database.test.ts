import { randomUUID } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import {
  createPrismaClient,
  disconnectDatabase,
} from '../../src/core/database/prisma.js';
import { PrismaTemporaryRoomRepository } from '../../src/modules/calls/call.repository.js';
import { PrismaVoiceCreatorRepository } from '../../src/modules/setup/setup.repository.js';
import { CallService } from '../../src/modules/calls/call.service.js';
import { createRoomRuntime } from '../../src/modules/calls/room.runtime.js';
import { createLogger } from '../../src/core/logger/logger.js';
import { discordFixture } from '../unit/modules/calls/call.discord.fixtures.js';
import { entry, deferred } from '../unit/modules/calls/call.fixtures.js';
import { assertDisposableDatabaseEnvironment } from './database-test-utils.js';

const integrationTest = process.env.RUN_DATABASE_TESTS === 'true' ? it : it.skip;

async function callsFixture(defaultUserLimit: number) {
  assertDisposableDatabaseEnvironment();
  const client = createPrismaClient({ url: process.env.DATABASE_URL!, directUrl: process.env.DIRECT_URL! });
  const creatorId = randomUUID();
  const d = discordFixture();
  const snowflake = () => String(70000000000000000n + BigInt(`0x${randomUUID().replaceAll('-', '').slice(0, 12)}`));
  d.entryChannel.id = snowflake(); d.channel.id = snowflake();
  d.states.clear(); d.states.set(d.member.id, { channelId: d.entryChannel.id });
  const logger = createLogger({ level: 'silent' });
  const runtime = createRoomRuntime(client, logger);
  const creators = new PrismaVoiceCreatorRepository(client);
  const rooms = new PrismaTemporaryRoomRepository(client);
  const calls = new CallService(creators, rooms, runtime, logger);
  const transition = { ...entry, guildDiscordId: d.guild.id, newChannelDiscordId: d.entryChannel.id };
  const cleanup = async () => {
    await runtime.stop();
    try {
      await client.$transaction([
        client.temporaryRoom.deleteMany({ where: { voiceCreatorId: creatorId } }),
        client.voiceCreator.deleteMany({ where: { id: creatorId } }),
      ]);
      expect(await client.temporaryRoom.count({ where: { voiceCreatorId: creatorId } })).toBe(0);
      expect(await client.voiceCreator.count({ where: { id: creatorId } })).toBe(0);
    } finally { await disconnectDatabase(client); }
  };
  try {
    await client.voiceCreator.create({ data: { id: creatorId, guildDiscordId: d.guild.id,
      creatorChannelDiscordId: d.entryChannel.id, categoryDiscordId: d.category.id, defaultUserLimit } });
  } catch (error) { await cleanup(); throw error; }
  const create = () => calls.handleVoiceTransition(transition, d.gateway);
  const close = async () => {
    d.states.clear();
    await calls.handleVoiceTransition({ ...transition, oldChannelDiscordId: d.channel.id, newChannelDiscordId: null }, d.gateway);
  };
  const reenter = () => { d.states.set(d.member.id, { channelId: d.entryChannel.id }); };
  const next = () => { d.channel.id = snowflake(); reenter(); };
  return { client, creatorId, d, runtime, creators, rooms, create, close, reenter, next, cleanup };
}

describe('setup and calls database round trips', () => {
  integrationTest.each([[0, '1 / Ilimitado'], [1, '1 / 1'], [4, '1 / 4'], [99, '1 / 99']] as const)(
    'copies default %i into native creation, SQL and a retained owner panel', async (userLimit, capacity) => {
      const f = await callsFixture(userLimit);
      try {
        await f.create();
        expect(f.d.guild.channels.create).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ name: 'Game', userLimit }));
        const room = await f.rooms.findActiveByChannel(f.d.channel.id);
        expect(room).toMatchObject({ userLimit, status: 'ACTIVE', controlMessageDiscordId: f.d.message.id, name: 'Game' });
        expect(f.d.channel.userLimit).toBe(userLimit);
        expect(JSON.stringify(f.d.channel.send.mock.calls)).toContain(capacity);
        expect(f.d.entryChannel.userLimit).toBe(0);
        expect(f.d.channel.setUserLimit).not.toHaveBeenCalled();
      } finally { await f.cleanup(); }
    }, 30_000);

  integrationTest('owner edits, reentry and future default edits isolate rooms, history and the unlimited entry', async () => {
    const f = await callsFixture(4);
    try {
      await f.create();
      const first = (await f.rooms.findActiveByChannel(f.d.channel.id))!;
      const actor = { roomId: first.id, guildDiscordId: f.d.guild.id, memberDiscordId: f.d.member.id, controlVersion: 0 };
      await f.runtime.controls.setLimit(actor, 8, f.d.gateway);
      expect((await f.runtime.store.read(first.id))?.room.userLimit).toBe(8);
      expect(f.d.channel.userLimit).toBe(8);
      expect((await f.creators.findById(f.creatorId))?.defaultUserLimit).toBe(4);
      f.d.states.set('72345678901234567', { channelId: f.d.channel.id });
      f.d.states.set('82345678901234567', { channelId: f.d.channel.id });
      f.d.member.voice.setChannel.mockClear();
      await f.runtime.controls.setLimit(actor, 1, f.d.gateway);
      expect(f.d.gateway.getChannelMemberCount(f.d.channel.id)).toBe(3);
      expect(f.d.member.voice.setChannel).not.toHaveBeenCalled();
      expect(JSON.stringify(f.d.message.edit.mock.calls)).toContain('3 / 1');
      await f.close();
      f.next(); await f.create();
      const second = (await f.rooms.findActiveByChannel(f.d.channel.id))!;
      expect(second).toMatchObject({ userLimit: 4, name: 'Game' });
      expect(second.id).not.toBe(first.id);
      await f.runtime.controls.rename({ ...actor, roomId: second.id }, 'Owner name', f.d.gateway);
      await f.runtime.controls.setLimit({ ...actor, roomId: second.id }, 8, f.d.gateway);
      await f.creators.setDefaultUserLimit(f.creatorId, 99);
      f.reenter(); await f.create();
      expect((await f.runtime.store.read(second.id))?.room).toMatchObject({ userLimit: 8, name: 'Owner name', controlMessageDiscordId: f.d.message.id });
      expect(f.d.channel).toMatchObject({ userLimit: 8, name: 'Owner name' });
      expect(f.d.guild.channels.create).toHaveBeenCalledTimes(2);
      expect(f.d.channel.send).toHaveBeenCalledTimes(2);
      expect(JSON.stringify(f.d.message.edit.mock.calls)).toContain('1 / 8');
      await f.close(); f.next(); await f.create();
      expect(await f.rooms.findActiveByChannel(f.d.channel.id)).toMatchObject({ userLimit: 99, name: 'Game' });
      expect(f.d.channel.userLimit).toBe(99);
      expect(await f.client.temporaryRoom.findUniqueOrThrow({ where: { id: first.id } })).toMatchObject({ status: 'CLOSED', userLimit: 1 });
      expect(await f.client.temporaryRoom.findUniqueOrThrow({ where: { id: second.id } })).toMatchObject({ status: 'CLOSED', userLimit: 8, name: 'Owner name' });
      expect(f.d.entryChannel.userLimit).toBe(0);
      expect((await f.creators.findById(f.creatorId))?.defaultUserLimit).toBe(99);
    } finally { await f.cleanup(); }
  }, 30_000);

  integrationTest('an administrator update during native create cannot split the Discord and SQL snapshots', async () => {
    const f = await callsFixture(4);
    const started = deferred(); const release = deferred();
    const create = f.d.guild.channels.create.getMockImplementation()!;
    f.d.guild.channels.create.mockImplementationOnce(async (input) => {
      started.resolve(); await release.promise; return create(input);
    });
    const lookup = vi.spyOn(f.creators, 'findByChannel');
    let creating: Promise<void> | undefined;
    try {
      creating = f.create(); await started.promise;
      await f.creators.setDefaultUserLimit(f.creatorId, 8);
      release.resolve(); await creating;
      expect(f.d.channel.userLimit).toBe(4);
      expect(await f.rooms.findActiveByChannel(f.d.channel.id)).toMatchObject({ userLimit: 4 });
      expect((await f.creators.findById(f.creatorId))?.defaultUserLimit).toBe(8);
      expect(JSON.stringify(f.d.channel.send.mock.calls)).toContain('1 / 4');
      expect(lookup).toHaveBeenCalledOnce();
    } finally { release.resolve(); try { await creating; } finally { await f.cleanup(); } }
  }, 30_000);

  integrationTest('isolates creator settings and preserves closed room history through restoration', async () => {
    assertDisposableDatabaseEnvironment();
    const url = process.env.DATABASE_URL;
    const directUrl = process.env.DIRECT_URL;

    // Opt in only with an explicitly confirmed disposable local test database.
    // Like the existing connection test, this never loads .env automatically.
    expect(url).toBeTruthy();
    expect(directUrl).toBeTruthy();

    const client = createPrismaClient({ url: url!, directUrl: directUrl! });
    const creators = new PrismaVoiceCreatorRepository(client);
    const rooms = new PrismaTemporaryRoomRepository(client);
    // Repository-only fixtures: UUID strings cannot reference real Discord IDs.
    const guildDiscordId = randomUUID();
    const firstInput = {
      guildDiscordId,
      creatorChannelDiscordId: randomUUID(),
      categoryDiscordId: randomUUID(),
    };
    const secondInput = {
      guildDiscordId,
      creatorChannelDiscordId: randomUUID(),
      categoryDiscordId: randomUUID(),
    };
    const channelDiscordId = randomUUID();
    const ownerDiscordId = randomUUID();
    const controlMessageDiscordId = randomUUID();
    const updatedCategoryDiscordId = randomUUID();
    const restoredCategoryDiscordId = randomUUID();

    try {
      const first = await creators.create(firstInput);
      await creators.setDefaultUserLimit(first.id, 4);
      const second = await creators.create(secondInput);
      expect(first.id).not.toBe(second.id);
      expect(first.roomCommandsEnabled).toBe(true);
      expect(second.roomCommandsEnabled).toBe(true);
      expect((await creators.listByGuild(guildDiscordId)).map(({ id }) => id))
        .toEqual(expect.arrayContaining([first.id, second.id]));

      await expect(creators.updateCategory(first.id, updatedCategoryDiscordId))
        .resolves.toMatchObject({ id: first.id, categoryDiscordId: updatedCategoryDiscordId });
      await expect(creators.setRoomCommandsEnabled(first.id, false))
        .resolves.toMatchObject({ id: first.id, roomCommandsEnabled: false });
      await expect(creators.findByChannel(firstInput.creatorChannelDiscordId))
        .resolves.toMatchObject({
          id: first.id,
          categoryDiscordId: updatedCategoryDiscordId,
          roomCommandsEnabled: false,
        });
      await expect(creators.findById(second.id)).resolves.toEqual(second);

      const room = await rooms.createCreating({
        guildDiscordId,
        voiceCreatorId: first.id,
        channelDiscordId,
        ownerDiscordId,
        name: 'Round trip',
        userLimit: 0,
      });
      expect(room).toMatchObject({
        status: 'CREATING', visibility: 'PUBLIC', userLimit: 0,
        controlMessageDiscordId: null, closedAt: null,
        controlVersion: 0, priorityMemberDiscordId: null, priorityExpiresAt: null,
      });
      await expect(rooms.findActiveByChannel(channelDiscordId)).resolves.toEqual(room);
      await expect(rooms.findActiveByOwner(guildDiscordId, ownerDiscordId)).resolves.toEqual(room);

      await expect(rooms.markActive(room.id, controlMessageDiscordId))
        .resolves.toMatchObject({ status: 'ACTIVE', controlMessageDiscordId });
      await expect(rooms.clearOwner(room.id, ownerDiscordId))
        .resolves.toMatchObject({ status: 'ACTIVE', ownerDiscordId: null });
      await expect(rooms.findActiveByOwner(guildDiscordId, ownerDiscordId)).resolves.toBeNull();
      await expect(rooms.findActiveByChannel(channelDiscordId))
        .resolves.toMatchObject({ id: room.id, ownerDiscordId: null });
      await expect(rooms.beginClosing(room.id)).resolves.toMatchObject({ status: 'CLOSING' });
      await expect(rooms.markClosed(room.id)).resolves.toMatchObject({
        status: 'CLOSED', closedAt: expect.any(Date),
      });
      await expect(rooms.findActiveByChannel(channelDiscordId)).resolves.toBeNull();

      await creators.delete(first.id);
      await expect(creators.findById(first.id)).resolves.toBeNull();
      await expect(creators.findByChannel(firstInput.creatorChannelDiscordId)).resolves.toBeNull();
      await expect(creators.listByGuild(guildDiscordId)).resolves.toEqual([second]);
      await expect(client.voiceCreator.findUniqueOrThrow({ where: { id: first.id } }))
        .resolves.toMatchObject({ deletedAt: expect.any(Date) });

      const restored = await creators.create({
        ...firstInput, categoryDiscordId: restoredCategoryDiscordId,
      });
      expect(restored).toMatchObject({
        id: first.id,
        categoryDiscordId: restoredCategoryDiscordId,
        roomCommandsEnabled: false,
        deletedAt: null,
        createdAt: first.createdAt,
        defaultUserLimit: 4,
      });
      await expect(creators.setRoomCommandsEnabled(first.id, true))
        .resolves.toMatchObject({ roomCommandsEnabled: true });
      await expect(creators.findById(first.id)).resolves.toMatchObject({
        categoryDiscordId: restoredCategoryDiscordId,
        roomCommandsEnabled: true,
        deletedAt: null,
      });
      expect(await creators.listByGuild(guildDiscordId)).toHaveLength(2);
      await expect(creators.findById(second.id)).resolves.toEqual(second);
      await expect(client.temporaryRoom.findUniqueOrThrow({ where: { id: room.id } }))
        .resolves.toMatchObject({
          voiceCreatorId: first.id,
          status: 'CLOSED',
          ownerDiscordId: null,
          controlMessageDiscordId,
          closedAt: expect.any(Date),
        });
    } finally {
      try {
        // Exact, preallocated UUID fixture keys also cover failed create replies.
        // Never delete by guild alone, truncate tables, or touch unrelated rows.
        await client.$transaction([
          client.temporaryRoom.deleteMany({ where: { guildDiscordId, channelDiscordId } }),
          client.voiceCreator.deleteMany({
            where: {
              guildDiscordId,
              creatorChannelDiscordId: {
                in: [firstInput.creatorChannelDiscordId, secondInput.creatorChannelDiscordId],
              },
            },
          }),
        ]);
      } finally {
        await disconnectDatabase(client);
      }
    }
  }, 30_000);
});
