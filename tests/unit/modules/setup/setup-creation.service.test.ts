import { describe, expect, it, vi } from 'vitest';

import { createLogger } from '../../../../src/core/logger/logger.js';
import { SetupCreationService } from '../../../../src/modules/setup/setup-creation.service.js';
import type { ReadySetupDraft } from '../../../../src/modules/setup/setup-creation.types.js';
import { SetupChannelCreationError, type SetupDiscordGateway } from '../../../../src/modules/setup/setup.discord.js';
import type { VoiceCreatorConfiguration, VoiceCreatorRepository } from '../../../../src/modules/setup/setup.repository.js';

const guildId = '12345678901234567';
const channelId = '22345678901234567';
const categoryId = '32345678901234567';
const configuration: VoiceCreatorConfiguration = {
  id: '123e4567-e89b-42d3-a456-426614174000', guildDiscordId: guildId,
  creatorChannelDiscordId: channelId, categoryDiscordId: categoryId,
  defaultUserLimit: 4, roomCommandsEnabled: true, deletedAt: null,
  createdAt: new Date('2026-11-10'), updatedAt: new Date('2026-11-10'),
};

function fixture() {
  const draft: ReadySetupDraft = {
    id: 'opaque-draft', revision: 2, expiresAt: Date.now() + 600_000, status: 'creating',
    context: { guildDiscordId: guildId, administratorDiscordId: '42345678901234567', messageDiscordId: '52345678901234567' },
    input: { categoryDiscordId: categoryId, name: '  Entrada privada  ', defaultUserLimit: 4 },
  };
  const create = vi.fn().mockResolvedValue(configuration);
  const findStoredByChannel = vi.fn().mockResolvedValue(null);
  const repository: VoiceCreatorRepository = {
    create, findStoredByChannel, listByGuild: vi.fn(), findById: vi.fn(), findByChannel: vi.fn(),
    updateCategory: vi.fn(), setRoomCommandsEnabled: vi.fn(), setDefaultUserLimit: vi.fn(), delete: vi.fn(),
  };
  const getCategory = vi.fn().mockResolvedValue({ id: categoryId, name: 'Privado' });
  const createVoiceCreator = vi.fn().mockResolvedValue({ id: channelId, name: 'Entrada privada', categoryDiscordId: categoryId });
  const deleteCreatedVoiceCreatorIfEmpty = vi.fn().mockResolvedValue(true);
  const gateway: SetupDiscordGateway = {
    getCategory, createVoiceCreator, deleteCreatedVoiceCreatorIfEmpty,
    assertCanConfigure: vi.fn(), getVoiceChannel: vi.fn(), renameVoiceChannel: vi.fn(),
  };
  const logs: string[] = [];
  const logger = createLogger({ level: 'info', destination: { write: (line) => { logs.push(line); } } });
  return { draft, gateway, create, findStoredByChannel, getCategory, createVoiceCreator, deleteCreatedVoiceCreatorIfEmpty, logs, service: new SetupCreationService(repository, logger) };
}

describe('SetupCreationService', () => {
  it('revalidates the category, creates once, and saves the new channel with the calls default', async () => {
    const f = fixture();
    await expect(f.service.create(f.draft, f.gateway)).resolves.toEqual({ status: 'created', configuration });
    expect(f.getCategory).toHaveBeenCalledExactlyOnceWith(categoryId);
    expect(f.createVoiceCreator).toHaveBeenCalledExactlyOnceWith({ categoryDiscordId: categoryId, name: 'Entrada privada' });
    expect(f.getCategory.mock.invocationCallOrder[0]).toBeLessThan(f.createVoiceCreator.mock.invocationCallOrder[0]!);
    expect(f.create).toHaveBeenCalledExactlyOnceWith({ guildDiscordId: guildId, creatorChannelDiscordId: channelId, categoryDiscordId: categoryId, defaultUserLimit: 4 });
    expect(f.findStoredByChannel).not.toHaveBeenCalled();
    expect(f.deleteCreatedVoiceCreatorIfEmpty).not.toHaveBeenCalled();
  });

  it.each(['missing', 'denied', 'foreign'] as const)('fails before creating when category is %s', async (mode) => {
    const f = fixture();
    if (mode === 'missing') f.getCategory.mockResolvedValue(null);
    if (mode === 'denied') f.getCategory.mockRejectedValue(new Error('permission revoked'));
    if (mode === 'foreign') f.getCategory.mockResolvedValue({ id: '92345678901234567', name: 'Foreign' });
    await expect(f.service.create(f.draft, f.gateway)).resolves.toEqual({ status: 'failed' });
    expect(f.createVoiceCreator).not.toHaveBeenCalled();
    expect(f.create).not.toHaveBeenCalled();
  });

  it.each([
    { name: '', defaultUserLimit: 4 }, { name: 'x'.repeat(101), defaultUserLimit: 4 },
    { name: 'Entrada', defaultUserLimit: -1 }, { name: 'Entrada', defaultUserLimit: 1.5 },
  ])('does not create with invalid input %j', async (input) => {
    const f = fixture();
    Object.assign(f.draft.input, input);
    await expect(f.service.create(f.draft, f.gateway)).resolves.toEqual({ status: 'failed' });
    expect(f.createVoiceCreator).not.toHaveBeenCalled();
  });

  it.each(['rejected', 'unknown', 'untyped'] as const)('classifies %s create failures without blind retries or compensation', async (certainty) => {
    const f = fixture();
    f.createVoiceCreator.mockRejectedValue(certainty === 'untyped' ? new Error('timeout') : new SetupChannelCreationError(certainty));
    await expect(f.service.create(f.draft, f.gateway)).resolves.toEqual({ status: certainty === 'rejected' ? 'failed' : 'uncertain' });
    expect(f.createVoiceCreator).toHaveBeenCalledOnce();
    expect(f.create).not.toHaveBeenCalled();
    expect(f.findStoredByChannel).not.toHaveBeenCalled();
    expect(f.deleteCreatedVoiceCreatorIfEmpty).not.toHaveBeenCalled();
  });

  it('recognizes a committed configuration after persistence loses its response', async () => {
    const f = fixture();
    f.create.mockRejectedValue(new Error('response lost'));
    f.findStoredByChannel.mockResolvedValue(configuration);
    await expect(f.service.create(f.draft, f.gateway)).resolves.toEqual({ status: 'created', configuration });
    expect(f.create).toHaveBeenCalledOnce();
    expect(f.findStoredByChannel).toHaveBeenCalledExactlyOnceWith(channelId);
    expect(f.deleteCreatedVoiceCreatorIfEmpty).not.toHaveBeenCalled();
  });

  it.each([
    { deletedAt: new Date('2026-11-10') }, { guildDiscordId: '92345678901234567' },
    { creatorChannelDiscordId: '92345678901234567' }, { categoryDiscordId: '92345678901234567' },
    { defaultUserLimit: 9 },
  ])('preserves the channel if recovery finds an incompatible or deleted row %j', async (change) => {
    const f = fixture();
    f.create.mockRejectedValue(new Error('write failed'));
    f.findStoredByChannel.mockResolvedValue({ ...configuration, ...change });
    await expect(f.service.create(f.draft, f.gateway)).resolves.toEqual({ status: 'uncertain', channelDiscordId: channelId });
    expect(f.deleteCreatedVoiceCreatorIfEmpty).not.toHaveBeenCalled();
  });

  it('preserves the channel if the recovery read is uncertain', async () => {
    const f = fixture();
    f.create.mockRejectedValue(new Error('write failed'));
    f.findStoredByChannel.mockRejectedValue(new Error('read failed'));
    await expect(f.service.create(f.draft, f.gateway)).resolves.toEqual({ status: 'uncertain', channelDiscordId: channelId });
    expect(f.deleteCreatedVoiceCreatorIfEmpty).not.toHaveBeenCalled();
  });

  it.each(['removed', 'occupied', 'delete-failed'] as const)('compensates only after confirmed absent persistence: %s', async (outcome) => {
    const f = fixture();
    f.create.mockRejectedValue(new Error('write failed'));
    if (outcome === 'occupied') f.deleteCreatedVoiceCreatorIfEmpty.mockResolvedValue(false);
    if (outcome === 'delete-failed') f.deleteCreatedVoiceCreatorIfEmpty.mockRejectedValue(new Error('delete failed'));
    await expect(f.service.create(f.draft, f.gateway)).resolves.toEqual({ status: outcome === 'removed' ? 'failed' : 'partial', channelDiscordId: channelId });
    expect(f.findStoredByChannel).toHaveBeenCalledExactlyOnceWith(channelId);
    expect(f.deleteCreatedVoiceCreatorIfEmpty).toHaveBeenCalledExactlyOnceWith(channelId);
    expect(f.findStoredByChannel.mock.invocationCallOrder[0]).toBeLessThan(f.deleteCreatedVoiceCreatorIfEmpty.mock.invocationCallOrder[0]!);
    expect(f.createVoiceCreator).toHaveBeenCalledOnce();
    expect(f.create).toHaveBeenCalledOnce();
  });

  it('uses the same safe compensation for a postflight failure carrying a created ID', async () => {
    const f = fixture();
    f.createVoiceCreator.mockRejectedValue(new SetupChannelCreationError('created', channelId));
    await expect(f.service.create(f.draft, f.gateway)).resolves.toEqual({ status: 'failed', channelDiscordId: channelId });
    expect(f.create).not.toHaveBeenCalled();
    expect(f.findStoredByChannel).toHaveBeenCalledExactlyOnceWith(channelId);
    expect(f.deleteCreatedVoiceCreatorIfEmpty).toHaveBeenCalledExactlyOnceWith(channelId);
  });

  it.each(['saved', 'deleted', 'occupied', 'read-failed'] as const)('preserves known postflight resources safely when %s', async (outcome) => {
    const f = fixture();
    f.createVoiceCreator.mockRejectedValue(new SetupChannelCreationError('created', channelId));
    if (outcome === 'saved') f.findStoredByChannel.mockResolvedValue(configuration);
    if (outcome === 'deleted') f.findStoredByChannel.mockResolvedValue({ ...configuration, deletedAt: new Date() });
    if (outcome === 'read-failed') f.findStoredByChannel.mockRejectedValue(new Error('read failed'));
    if (outcome === 'occupied') f.deleteCreatedVoiceCreatorIfEmpty.mockResolvedValue(false);
    await expect(f.service.create(f.draft, f.gateway)).resolves.toEqual(outcome === 'saved'
      ? { status: 'created', configuration }
      : { status: outcome === 'occupied' ? 'partial' : 'uncertain', channelDiscordId: channelId });
    expect(f.create).not.toHaveBeenCalled();
    if (outcome !== 'occupied') expect(f.deleteCreatedVoiceCreatorIfEmpty).not.toHaveBeenCalled();
  });

  it('does not accept a mismatched persistence response as confirmed creation', async () => {
    const f = fixture();
    const foreign = { ...configuration, guildDiscordId: '92345678901234567' };
    f.create.mockResolvedValue(foreign);
    f.findStoredByChannel.mockResolvedValue(foreign);
    await expect(f.service.create(f.draft, f.gateway)).resolves.toEqual({ status: 'uncertain', channelDiscordId: channelId });
    expect(f.deleteCreatedVoiceCreatorIfEmpty).not.toHaveBeenCalled();
  });

  it('cannot persist or compensate a gateway response without an ID', async () => {
    const f = fixture();
    f.createVoiceCreator.mockResolvedValue({ name: 'Entrada' });
    await expect(f.service.create(f.draft, f.gateway)).resolves.toEqual({ status: 'uncertain' });
    expect(f.create).not.toHaveBeenCalled();
    expect(f.deleteCreatedVoiceCreatorIfEmpty).not.toHaveBeenCalled();
  });

  it.each([undefined, 'invalid'])('cannot compensate a postflight error without a usable ID: %s', async (id) => {
    const f = fixture();
    f.createVoiceCreator.mockRejectedValue(new SetupChannelCreationError('created', id));
    await expect(f.service.create(f.draft, f.gateway)).resolves.toEqual({ status: 'uncertain' });
    expect(f.deleteCreatedVoiceCreatorIfEmpty).not.toHaveBeenCalled();
  });

  it('never logs raw errors or form values during recovery', async () => {
    const f = fixture();
    f.create.mockRejectedValue(new Error('token=do-not-log postgres://secret example Entrada privada'));
    f.findStoredByChannel.mockRejectedValue(new Error('read secret'));
    await f.service.create(f.draft, f.gateway);
    expect(f.logs.length).toBeGreaterThan(0);
    expect(f.logs.join('')).not.toMatch(/do-not-log|postgres:|Entrada privada|read secret|defaultUserLimit/);
    expect(f.logs.join('')).toContain(channelId);
    expect(f.logs.map((line) => JSON.parse(line))).toContainEqual(expect.objectContaining({ operation: 'persist', errorType: 'Error', channelDiscordId: channelId }));
  });
});
