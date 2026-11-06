import { describe, expect, it, vi } from 'vitest';

import type {
  CreateVoiceCreatorInput,
  VoiceCreatorConfiguration,
  VoiceCreatorRepository,
} from '../../../../src/modules/setup/setup.repository.js';
import {
  SetupService,
  type SetupChannelGateway,
} from '../../../../src/modules/setup/setup.service.js';

const configuration: VoiceCreatorConfiguration = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  guildDiscordId: '12345678901234567',
  creatorChannelDiscordId: '22345678901234567',
  categoryDiscordId: '32345678901234567',
  roomCommandsEnabled: true,
  deletedAt: null,
  createdAt: new Date('2026-11-05T10:00:00.000Z'),
  updatedAt: new Date('2026-11-05T10:00:00.000Z'),
};

function createRepositoryDouble(
  overrides: Partial<VoiceCreatorRepository> = {},
): VoiceCreatorRepository {
  return {
    listByGuild: vi.fn().mockResolvedValue([configuration]),
    findById: vi.fn().mockResolvedValue(configuration),
    findByChannel: vi.fn().mockResolvedValue(configuration),
    create: vi.fn().mockResolvedValue(configuration),
    updateCategory: vi.fn().mockResolvedValue(configuration),
    setRoomCommandsEnabled: vi
      .fn()
      .mockResolvedValue({ ...configuration, roomCommandsEnabled: false }),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('SetupService', () => {
  it('validates and lists configurations for a guild', async () => {
    const repository = createRepositoryDouble();
    const service = new SetupService(repository);

    await expect(service.list(configuration.guildDiscordId)).resolves.toEqual([
      configuration,
    ]);
    await expect(service.list('not-a-discord-id')).rejects.toThrow(
      'Invalid Discord ID',
    );
    expect(repository.listByGuild).toHaveBeenCalledOnce();
  });

  it('validates every ID before adding a configuration', async () => {
    const repository = createRepositoryDouble();
    const service = new SetupService(repository);
    const input: CreateVoiceCreatorInput = {
      guildDiscordId: configuration.guildDiscordId,
      creatorChannelDiscordId: configuration.creatorChannelDiscordId,
      categoryDiscordId: configuration.categoryDiscordId,
    };

    await expect(service.add(input)).resolves.toEqual(configuration);
    await expect(
      service.add({ ...input, categoryDiscordId: 'invalid' }),
    ).rejects.toThrow('Invalid Discord ID');
    expect(repository.create).toHaveBeenCalledOnce();
  });

  it('changes a category after validating configuration and category IDs', async () => {
    const updated = {
      ...configuration,
      categoryDiscordId: '42345678901234567',
    };
    const repository = createRepositoryDouble({
      updateCategory: vi.fn().mockResolvedValue(updated),
    });
    const service = new SetupService(repository);

    await expect(
      service.changeCategory(configuration.id, updated.categoryDiscordId),
    ).resolves.toEqual(updated);
    expect(repository.updateCategory).toHaveBeenCalledWith(
      configuration.id,
      updated.categoryDiscordId,
    );
  });

  it('renames the persisted creator channel rather than the configuration ID', async () => {
    const repository = createRepositoryDouble();
    const gateway: SetupChannelGateway = {
      renameVoiceChannel: vi.fn().mockResolvedValue(undefined),
    };
    const service = new SetupService(repository);

    await expect(
      service.rename(configuration.id, 'Create your room', gateway),
    ).resolves.toBeUndefined();
    expect(gateway.renameVoiceChannel).toHaveBeenCalledWith(
      configuration.creatorChannelDiscordId,
      'Create your room',
    );
  });

  it.each([
    ['an empty name', '   '],
    ['an oversized name', 'x'.repeat(101)],
  ])('rejects %s before calling rename dependencies', async (_case, name) => {
    const repository = createRepositoryDouble();
    const gateway: SetupChannelGateway = {
      renameVoiceChannel: vi.fn().mockResolvedValue(undefined),
    };
    const service = new SetupService(repository);

    await expect(
      service.rename(configuration.id, name, gateway),
    ).rejects.toThrow();
    expect(repository.findById).not.toHaveBeenCalled();
    expect(gateway.renameVoiceChannel).not.toHaveBeenCalled();
  });

  it('does not call the rename gateway when the configuration is missing', async () => {
    const repository = createRepositoryDouble({
      findById: vi.fn().mockResolvedValue(null),
    });
    const gateway: SetupChannelGateway = {
      renameVoiceChannel: vi.fn().mockResolvedValue(undefined),
    };
    const service = new SetupService(repository);

    await expect(
      service.rename(configuration.id, 'Create your room', gateway),
    ).rejects.toThrow('Voice creator configuration not found');
    expect(gateway.renameVoiceChannel).not.toHaveBeenCalled();
  });

  it('toggles room commands from the persisted setting', async () => {
    const repository = createRepositoryDouble();
    const service = new SetupService(repository);

    await expect(service.toggleRoomCommands(configuration.id)).resolves.toMatchObject({
      roomCommandsEnabled: false,
    });
    expect(repository.setRoomCommandsEnabled).toHaveBeenCalledWith(
      configuration.id,
      false,
    );
  });

  it('validates the configuration ID before removal', async () => {
    const repository = createRepositoryDouble();
    const service = new SetupService(repository);

    await expect(service.remove(configuration.id)).resolves.toBeUndefined();
    await expect(service.remove('not-a-uuid')).rejects.toThrow(
      'Invalid Voice Creator ID',
    );
    expect(repository.delete).toHaveBeenCalledOnce();
  });
});
