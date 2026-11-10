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
  defaultUserLimit: 0,
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
    findStoredByChannel: vi.fn().mockResolvedValue(configuration),
    create: vi.fn().mockResolvedValue(configuration),
    updateCategory: vi.fn().mockResolvedValue(configuration),
    setDefaultUserLimit: vi.fn().mockResolvedValue({ ...configuration, defaultUserLimit: 4 }),
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

  it.each([undefined, 0, 4, 99])('passes creation default %s without normalizing an omitted restore default', async (limit) => {
    const repository = createRepositoryDouble();
    const service = new SetupService(repository);
    const input = {
      guildDiscordId: configuration.guildDiscordId,
      creatorChannelDiscordId: configuration.creatorChannelDiscordId,
      categoryDiscordId: configuration.categoryDiscordId,
      ...(limit === undefined ? {} : { defaultUserLimit: limit }),
    };
    await service.add(input);
    expect(repository.create).toHaveBeenCalledExactlyOnceWith(input);
  });

  it.each([-1, 100, 1.5])('rejects invalid creation default %s before persistence', async (limit) => {
    const repository = createRepositoryDouble();
    const service = new SetupService(repository);
    await expect(service.add({
      guildDiscordId: configuration.guildDiscordId,
      creatorChannelDiscordId: configuration.creatorChannelDiscordId,
      categoryDiscordId: configuration.categoryDiscordId,
      defaultUserLimit: limit,
    })).rejects.toThrow();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it.each([0, 4, 99])('validates and saves default limit %s without synchronizing rooms', async (limit) => {
    const saved = { ...configuration, defaultUserLimit: limit };
    const repository = createRepositoryDouble({ setDefaultUserLimit: vi.fn().mockResolvedValue(saved) });
    const synchronize = vi.fn();
    const service = new SetupService(repository, synchronize);

    await expect(service.setDefaultUserLimit(configuration.id, limit)).resolves.toEqual(saved);
    expect(repository.setDefaultUserLimit).toHaveBeenCalledExactlyOnceWith(configuration.id, limit);
    expect(synchronize).not.toHaveBeenCalled();
  });

  it.each([-1, 100, 1.5])('rejects invalid default update %s before persistence', async (limit) => {
    const repository = createRepositoryDouble();
    const service = new SetupService(repository);
    await expect(service.setDefaultUserLimit(configuration.id, limit)).rejects.toThrow();
    expect(repository.setDefaultUserLimit).not.toHaveBeenCalled();
  });

  it('rejects an invalid creator ID before updating the default', async () => {
    const repository = createRepositoryDouble();
    const service = new SetupService(repository);
    await expect(service.setDefaultUserLimit('invalid', 4)).rejects.toThrow('Invalid Voice Creator ID');
    expect(repository.setDefaultUserLimit).not.toHaveBeenCalled();
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
      configuration: { roomCommandsEnabled: false }, synchronization: null,
    });
    expect(repository.setRoomCommandsEnabled).toHaveBeenCalledWith(
      configuration.id,
      false,
    );
  });

  it.each([{ synced: 2, failed: 0 }, { synced: 1, failed: 1 }])('returns known synchronization counts after saving: %j', async (counts) => {
    const saved = { ...configuration };
    const repository = createRepositoryDouble({
      findById: async () => ({ ...saved }),
      setRoomCommandsEnabled: async (_id, enabled) => { saved.roomCommandsEnabled = enabled; return { ...saved }; },
    });
    const service = new SetupService(repository, async (id) => {
      expect(id).toBe(configuration.id);
      expect(saved.roomCommandsEnabled).toBe(false);
      return counts;
    });
    expect(await service.toggleRoomCommands(configuration.id)).toMatchObject({ configuration: { roomCommandsEnabled: false }, synchronization: counts });
  });

  it('reports unconfirmed synchronization without undoing the saved flag and logs no raw error', async () => {
    const lines: string[] = [];
    const { createLogger } = await import('../../../../src/core/logger/logger.js');
    const logger = createLogger({ level: 'warn', destination: { write: (line: string) => { lines.push(line); } } });
    const saved = { ...configuration };
    const service = new SetupService(createRepositoryDouble({
      findById: async () => ({ ...saved }),
      setRoomCommandsEnabled: async (_id, enabled) => { saved.roomCommandsEnabled = enabled; return { ...saved }; },
    }), async () => { throw new Error('private-response-secret'); }, logger);
    expect(await service.toggleRoomCommands(configuration.id)).toMatchObject({ configuration: { roomCommandsEnabled: false }, synchronization: null });
    expect(saved.roomCommandsEnabled).toBe(false);
    expect(lines.join('')).toContain(configuration.id);
    expect(lines.join('')).not.toContain('private-response-secret');
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
