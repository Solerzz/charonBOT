import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  createPrismaClient,
  disconnectDatabase,
} from '../../src/core/database/prisma.js';
import { PrismaTemporaryRoomRepository } from '../../src/modules/calls/call.repository.js';
import { PrismaVoiceCreatorRepository } from '../../src/modules/setup/setup.repository.js';

const integrationTest = process.env.RUN_DATABASE_TESTS === 'true' ? it : it.skip;

describe('setup and calls database round trips', () => {
  integrationTest('isolates creator settings and preserves closed room history through restoration', async () => {
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
      });
      expect(room).toMatchObject({
        status: 'CREATING', visibility: 'PUBLIC', userLimit: 0,
        controlMessageDiscordId: null, closedAt: null,
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
