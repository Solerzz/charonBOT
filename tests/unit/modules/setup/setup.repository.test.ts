import { describe, expect, it, vi } from 'vitest';

import {
  Prisma,
  type PrismaClient,
  type VoiceCreator,
} from '../../../../src/generated/prisma/client.js';
import {
  PrismaVoiceCreatorRepository,
  VoiceCreatorAlreadyConfiguredError,
  VoiceCreatorNotFoundError,
} from '../../../../src/modules/setup/setup.repository.js';

const firstCreator: VoiceCreator = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  guildDiscordId: '12345678901234567',
  creatorChannelDiscordId: '22345678901234567',
  categoryDiscordId: '32345678901234567',
  roomCommandsEnabled: true,
  deletedAt: null,
  createdAt: new Date('2026-11-05T10:00:00.000Z'),
  updatedAt: new Date('2026-11-05T10:00:00.000Z'),
};

const secondCreator: VoiceCreator = {
  ...firstCreator,
  id: '223e4567-e89b-42d3-a456-426614174000',
  creatorChannelDiscordId: '42345678901234567',
  categoryDiscordId: '52345678901234567',
  createdAt: new Date('2026-11-05T11:00:00.000Z'),
  updatedAt: new Date('2026-11-05T11:00:00.000Z'),
};

function createPrismaDouble() {
  return {
    voiceCreator: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
}

describe('PrismaVoiceCreatorRepository', () => {
  it('lists active guild configurations in creation order', async () => {
    const prisma = createPrismaDouble();
    prisma.voiceCreator.findMany.mockResolvedValue([firstCreator, secondCreator]);
    const repository = new PrismaVoiceCreatorRepository(
      prisma as unknown as PrismaClient,
    );

    await expect(repository.listByGuild(firstCreator.guildDiscordId)).resolves.toEqual([
      firstCreator,
      secondCreator,
    ]);
    expect(prisma.voiceCreator.findMany).toHaveBeenCalledWith({
      where: { guildDiscordId: firstCreator.guildDiscordId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('keeps multiple channel configurations independent within one guild', async () => {
    const prisma = createPrismaDouble();
    prisma.voiceCreator.create
      .mockResolvedValueOnce(firstCreator)
      .mockResolvedValueOnce(secondCreator);
    const repository = new PrismaVoiceCreatorRepository(
      prisma as unknown as PrismaClient,
    );

    const first = await repository.create({
      guildDiscordId: firstCreator.guildDiscordId,
      creatorChannelDiscordId: firstCreator.creatorChannelDiscordId,
      categoryDiscordId: firstCreator.categoryDiscordId,
    });
    const second = await repository.create({
      guildDiscordId: secondCreator.guildDiscordId,
      creatorChannelDiscordId: secondCreator.creatorChannelDiscordId,
      categoryDiscordId: secondCreator.categoryDiscordId,
    });

    expect(first.id).toBe(firstCreator.id);
    expect(second.id).toBe(secondCreator.id);
    expect(prisma.voiceCreator.create).toHaveBeenNthCalledWith(1, {
      data: {
        guildDiscordId: firstCreator.guildDiscordId,
        creatorChannelDiscordId: firstCreator.creatorChannelDiscordId,
        categoryDiscordId: firstCreator.categoryDiscordId,
      },
    });
    expect(prisma.voiceCreator.create).toHaveBeenNthCalledWith(2, {
      data: {
        guildDiscordId: secondCreator.guildDiscordId,
        creatorChannelDiscordId: secondCreator.creatorChannelDiscordId,
        categoryDiscordId: secondCreator.categoryDiscordId,
      },
    });
  });

  it('translates duplicate channel failures without exposing Prisma details', async () => {
    const prisma = createPrismaDouble();
    prisma.voiceCreator.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError(
        'postgresql://charon:database-secret@db.example.com/charon',
        { code: 'P2002', clientVersion: '7.10.1' },
      ),
    );
    const repository = new PrismaVoiceCreatorRepository(
      prisma as unknown as PrismaClient,
    );

    const error = await repository
      .create({
        guildDiscordId: firstCreator.guildDiscordId,
        creatorChannelDiscordId: firstCreator.creatorChannelDiscordId,
        categoryDiscordId: firstCreator.categoryDiscordId,
      })
      .catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(VoiceCreatorAlreadyConfiguredError);
    expect((error as Error).message).not.toContain('database-secret');
  });

  it('excludes deleted configurations from ID and channel lookups', async () => {
    const prisma = createPrismaDouble();
    prisma.voiceCreator.findFirst.mockResolvedValue(null);
    const repository = new PrismaVoiceCreatorRepository(
      prisma as unknown as PrismaClient,
    );

    await expect(repository.findById(firstCreator.id)).resolves.toBeNull();
    await expect(
      repository.findByChannel(firstCreator.creatorChannelDiscordId),
    ).resolves.toBeNull();
    expect(prisma.voiceCreator.findFirst).toHaveBeenNthCalledWith(1, {
      where: { id: firstCreator.id, deletedAt: null },
    });
    expect(prisma.voiceCreator.findFirst).toHaveBeenNthCalledWith(2, {
      where: {
        creatorChannelDiscordId: firstCreator.creatorChannelDiscordId,
        deletedAt: null,
      },
    });
  });

  it('logically deletes a configuration without deleting historical rooms', async () => {
    const prisma = createPrismaDouble();
    prisma.voiceCreator.update.mockResolvedValue({
      ...firstCreator,
      deletedAt: new Date('2026-11-05T12:00:00.000Z'),
    });
    const repository = new PrismaVoiceCreatorRepository(
      prisma as unknown as PrismaClient,
    );

    await expect(repository.delete(firstCreator.id)).resolves.toBeUndefined();
    expect(prisma.voiceCreator.update).toHaveBeenCalledWith({
      where: { id: firstCreator.id, deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it.each([
    ['category update', (repository: PrismaVoiceCreatorRepository) =>
      repository.updateCategory(firstCreator.id, '62345678901234567')],
    ['commands update', (repository: PrismaVoiceCreatorRepository) =>
      repository.setRoomCommandsEnabled(firstCreator.id, false)],
    ['logical delete', (repository: PrismaVoiceCreatorRepository) =>
      repository.delete(firstCreator.id)],
  ])('translates not-found Prisma failures for %s', async (_name, operation) => {
    const prisma = createPrismaDouble();
    prisma.voiceCreator.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '7.10.1',
      }),
    );
    const repository = new PrismaVoiceCreatorRepository(
      prisma as unknown as PrismaClient,
    );

    await expect(operation(repository)).rejects.toBeInstanceOf(
      VoiceCreatorNotFoundError,
    );
  });
});
