import { MessageFlags, MessageFlagsBitField, PermissionFlagsBits, PermissionsBitField, type Interaction } from 'discord.js';
import { describe, expect, it, vi } from 'vitest';

import { SetupInteractions, type SetupInteraction, type SetupDiscordGatewayFactory } from '../../../../src/modules/setup/setup.interactions.js';
import { SetupDiscordError, type SetupDiscordGateway } from '../../../../src/modules/setup/setup.discord.js';
import { VoiceCreatorAlreadyConfiguredError, VoiceCreatorNotFoundError, type CreateVoiceCreatorInput, type VoiceCreatorConfiguration, type VoiceCreatorRepository } from '../../../../src/modules/setup/setup.repository.js';
import { SetupService } from '../../../../src/modules/setup/setup.service.js';

const guildId = '12345678901234567';
const first: VoiceCreatorConfiguration = {
  id: '123e4567-e89b-42d3-a456-426614174000', guildDiscordId: guildId,
  creatorChannelDiscordId: '22345678901234567', categoryDiscordId: '32345678901234567',
  roomCommandsEnabled: true, defaultUserLimit: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date(),
};
const second = { ...first, id: '123e4567-e89b-42d3-a456-426614174001', creatorChannelDiscordId: '52345678901234567' };
type Kind = 'button' | 'channel' | 'string' | 'modal' | 'role';

function fixture(action = 'toggle-commands', kind: Kind = 'button', values: string[] = [], identifier = first.id, onControlsChanged?: (id: string) => Promise<{ synced: number; failed: number }>) {
  let configurations = [{ ...first }, { ...second }];
  const listByGuild = vi.fn(async () => configurations.map((item) => ({ ...item })));
  const findById = vi.fn(async (id: string) => configurations.find((item) => item.id === id) ?? null);
  const create = vi.fn(async (input: CreateVoiceCreatorInput) => {
    const created = { ...first, ...input, id: '123e4567-e89b-42d3-a456-426614174002' };
    configurations.push(created);
    return created;
  });
  const updateCategory = vi.fn(async (id: string, categoryDiscordId: string) => {
    const item = configurations.find((entry) => entry.id === id)!;
    item.categoryDiscordId = categoryDiscordId;
    return { ...item };
  });
  const setRoomCommandsEnabled = vi.fn(async (id: string, enabled: boolean) => {
    const item = configurations.find((entry) => entry.id === id)!;
    item.roomCommandsEnabled = enabled;
    return { ...item };
  });
  const remove = vi.fn(async (id: string) => { configurations = configurations.filter((item) => item.id !== id); });
  const setDefaultUserLimit = vi.fn(async (id: string, limit: number) => {
    const item = configurations.find((entry) => entry.id === id)!;
    item.defaultUserLimit = limit;
    return { ...item };
  });
  const repository: VoiceCreatorRepository = { listByGuild, findById, create, updateCategory, setRoomCommandsEnabled, delete: remove, findByChannel: vi.fn(), findStoredByChannel: vi.fn(), setDefaultUserLimit };
  const assertCanConfigure = vi.fn().mockResolvedValue(undefined);
  const getVoiceChannel = vi.fn(async (id: string) => ({ id, name: id === second.creatorChannelDiscordId ? 'Segundo' : 'Criar sala', categoryDiscordId: first.categoryDiscordId }));
  const getCategory = vi.fn(async (id: string) => ({ id, name: 'Salas' }));
  const renameVoiceChannel = vi.fn().mockResolvedValue(undefined);
  const gateway: SetupDiscordGateway = { assertCanConfigure, getVoiceChannel, getCategory, renameVoiceChannel, createVoiceCreator: vi.fn(), deleteCreatedVoiceCreatorIfEmpty: vi.fn() };
  const factory = vi.fn<SetupDiscordGatewayFactory>().mockReturnValue(gateway);
  const reply = vi.fn().mockResolvedValue(undefined);
  const deferUpdate = vi.fn().mockResolvedValue(undefined);
  const editReply = vi.fn().mockResolvedValue(undefined);
  const showModal = vi.fn().mockResolvedValue(undefined);
  const send = vi.fn();
  const interaction = {
    customId: action === 'add' ? 'setup:v1:add' : `setup:v1:${action}:${identifier}`,
    values, isButton: () => kind === 'button', isAnySelectMenu: () => ['channel', 'string', 'role'].includes(kind),
    isChannelSelectMenu: () => kind === 'channel', isStringSelectMenu: () => kind === 'string',
    isModalSubmit: () => kind === 'modal', isFromMessage: () => true,
    inGuild: () => true, guildId, guild: { id: guildId }, channelId: '42345678901234567',
    memberPermissions: new PermissionsBitField(PermissionFlagsBits.Administrator),
    message: { flags: new MessageFlagsBitField(MessageFlags.Ephemeral) },
    fields: { getTextInputValue: vi.fn().mockReturnValue('Novo nome') },
    channel: { send }, reply, deferUpdate, editReply, showModal,
  } as unknown as SetupInteraction;
  return { handler: new SetupInteractions(new SetupService(repository, onControlsChanged), factory), interaction, factory, reply, deferUpdate, editReply, showModal, send, listByGuild, findById, create, updateCategory, setRoomCommandsEnabled, setDefaultUserLimit, remove, assertCanConfigure, getVoiceChannel, getCategory, renameVoiceChannel, configurations };
}

function payload(f: ReturnType<typeof fixture>) {
  return JSON.parse(JSON.stringify(f.editReply.mock.calls.at(-1)![0]));
}

function expectNoMutation(f: ReturnType<typeof fixture>) {
  for (const mutation of [f.create, f.updateCategory, f.setRoomCommandsEnabled, f.setDefaultUserLimit, f.remove, f.renameVoiceChannel]) {
    expect(mutation).not.toHaveBeenCalled();
  }
  expect(f.send).not.toHaveBeenCalled();
}

describe('SetupInteractions', () => {
  it.each([['button', true], ['channel', true], ['string', true], ['modal', true], ['role', true]] as const)('routes only the setup v1 namespace for %s', (kind, expected) => {
    const f = fixture('delete', kind);
    expect(f.handler.canHandle(f.interaction)).toBe(expected);
    for (const customId of ['calls:v1:delete:x', 'setup:v2:add', 'setup:v1evil:add']) {
      expect(f.handler.canHandle({ ...f.interaction, customId } as unknown as Interaction)).toBe(false);
    }
    expect(f.handler.canHandle({ ...f.interaction, isButton: () => false, isAnySelectMenu: () => false, isModalSubmit: () => false } as unknown as Interaction)).toBe(false);
  });

  it('acknowledges the private source before requests, toggles only the selected creator, and refreshes persisted data', async () => {
    const f = fixture('toggle-commands', 'button', [], second.id);
    await f.handler.execute(f.interaction);
    expect(f.deferUpdate).toHaveBeenCalledExactlyOnceWith();
    expect(f.deferUpdate.mock.invocationCallOrder[0]).toBeLessThan(f.assertCanConfigure.mock.invocationCallOrder[0]!);
    expect(f.assertCanConfigure).toHaveBeenCalledWith('42345678901234567');
    expect(f.setRoomCommandsEnabled).toHaveBeenCalledExactlyOnceWith(second.id, false);
    expect(f.configurations[0]!.roomCommandsEnabled).toBe(true);
    expect(f.listByGuild).toHaveBeenCalledTimes(2);
    expect(payload(f).embeds[0].fields).toContainEqual({ name: 'Comandos da sala', value: expect.stringContaining('Desabilitados') });
    expect(f.reply).not.toHaveBeenCalled();
    expect(f.send).not.toHaveBeenCalled();
    expect(payload(f).flags).toBeUndefined();
    expect(payload(f).content).toContain('salva');
    expect(payload(f).content).toContain('não confirmada');
    expect(payload(f).allowedMentions).toEqual({ parse: [] });
  });

  it.each([
    [{ synced: 2, failed: 0 }, 'concluída'],
    [{ synced: 1, failed: 2 }, '2 sala(s) com falha'],
  ] as const)('refreshes the saved flag and reports private synchronization status: %j', async (counts, status) => {
    const callback = vi.fn(async () => {
      expect(f.deferUpdate).toHaveBeenCalledOnce();
      expect(f.configurations[0]!.roomCommandsEnabled).toBe(false);
      return counts;
    });
    const f = fixture('toggle-commands', 'button', [], first.id, callback);
    await f.handler.execute(f.interaction);
    expect(payload(f).content).toContain('salva');
    expect(payload(f).content).toContain(status);
    expect(payload(f).embeds[0].fields).toContainEqual({ name: 'Comandos da sala', value: expect.stringContaining('Desabilitados') });
    expect(f.setRoomCommandsEnabled).toHaveBeenCalledOnce();
    expect(f.send).not.toHaveBeenCalled();
  });

  it('keeps the saved outcome explicit and removes stale toggle controls if dashboard refresh fails', async () => {
    const f = fixture('toggle-commands', 'button', [], first.id, async () => {
      f.getVoiceChannel.mockRejectedValueOnce(new SetupDiscordError('Permissões insuficientes.'));
      return { synced: 1, failed: 1 };
    });
    await f.handler.execute(f.interaction);
    expect(f.configurations[0]!.roomCommandsEnabled).toBe(false);
    expect(f.setRoomCommandsEnabled).toHaveBeenCalledOnce();
    expect(payload(f).content).toContain('salva');
    expect(payload(f).content).toContain('1 sala(s) com falha');
    expect(payload(f).components).toEqual([]);
  });

  it('selects another persisted creator using UUID values, including pagination values', async () => {
    const f = fixture('select', 'string', [second.id]);
    await f.handler.execute(f.interaction);
    expect(payload(f).components[0].components[0].options).toContainEqual(expect.objectContaining({ value: second.id, default: true, label: 'Segundo' }));
    expectNoMutation(f);
  });

  it.each(['add', 'add-category'])('expires old %s without any external work', async (action) => {
    const f = fixture(action, 'channel', ['72345678901234567'], '62345678901234567');
    await f.handler.execute(f.interaction);
    expect(f.reply).toHaveBeenCalledWith(expect.objectContaining({ content: 'Abra /setup init novamente', flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } }));
    expect(f.factory).not.toHaveBeenCalled();
    expect(f.listByGuild).not.toHaveBeenCalled();
    expectNoMutation(f);
  });

  it('opens the generic default modal before all gateway/repository work', async () => {
    const f = fixture('default-limit');
    f.assertCanConfigure.mockReturnValue(new Promise(() => {}));
    f.listByGuild.mockReturnValue(new Promise(() => {}));
    const pending = f.handler.execute(f.interaction);
    expect(f.showModal).toHaveBeenCalledOnce();
    await pending;
    const modal = JSON.parse(JSON.stringify(f.showModal.mock.calls[0]![0]));
    expect(modal).toMatchObject({ custom_id: `setup:v1:default-limit:${first.id}` });
    expect(modal.components[0].components[0]).toMatchObject({ custom_id: 'default-limit', value: '0' });
    expect(f.factory).not.toHaveBeenCalled();
    expect(f.listByGuild).not.toHaveBeenCalled();
    expectNoMutation(f);
  });

  it.each(['0', '1', '99'])('saves only the default %s after ack and preserves missing-category recovery', async (value) => {
    const f = fixture('default-limit', 'modal');
    const before = structuredClone(f.configurations);
    if (f.interaction.isModalSubmit()) vi.mocked(f.interaction.fields.getTextInputValue).mockReturnValue(value);
    f.getCategory.mockResolvedValue(null as never);
    await f.handler.execute(f.interaction);
    expect(f.deferUpdate.mock.invocationCallOrder[0]).toBeLessThan(f.assertCanConfigure.mock.invocationCallOrder[0]!);
    expect(f.deferUpdate.mock.invocationCallOrder[0]).toBeLessThan(f.listByGuild.mock.invocationCallOrder[0]!);
    expect(f.setDefaultUserLimit).toHaveBeenCalledExactlyOnceWith(first.id, Number(value));
    expect(f.configurations).toEqual([{ ...before[0], defaultUserLimit: Number(value) }, before[1]]);
    expect(f.renameVoiceChannel).not.toHaveBeenCalled();
    expect(f.updateCategory).not.toHaveBeenCalled();
    expect(f.setRoomCommandsEnabled).not.toHaveBeenCalled();
    expect(payload(f).embeds[0].fields).toContainEqual({ name: 'Limite padrão das novas calls', value: value === '0' ? '0 · sem limite' : value });
    expect(JSON.stringify(payload(f))).toContain('Categoria indisponível');
  });

  it.each(['', '-1', '100', '1.5', '01'])('rejects invalid default form %j before I/O', async (value) => {
    const f = fixture('default-limit', 'modal');
    if (f.interaction.isModalSubmit()) vi.mocked(f.interaction.fields.getTextInputValue).mockReturnValue(value);
    await f.handler.execute(f.interaction);
    expect(f.reply).toHaveBeenCalledWith(expect.objectContaining({ flags: MessageFlags.Ephemeral }));
    expect(f.factory).not.toHaveBeenCalled();
    expectNoMutation(f);
  });

  it('changes destination even when the old category no longer exists', async () => {
    const f = fixture('change-category', 'channel', ['72345678901234567']);
    f.getCategory.mockImplementation(async (id) => id === first.categoryDiscordId ? null as never : { id, name: 'Nova' });
    await f.handler.execute(f.interaction);
    expect(f.updateCategory).toHaveBeenCalledExactlyOnceWith(first.id, '72345678901234567');
    expect(payload(f).embeds[0].fields).toContainEqual({ name: 'Categoria das salas', value: '<#72345678901234567>' });
  });

  it('opens an empty generic rename modal synchronously without private data access', async () => {
    const f = fixture('rename');
    const execution = f.handler.execute(f.interaction);
    expect(f.showModal).toHaveBeenCalledOnce();
    await execution;
    const modal = JSON.parse(JSON.stringify(f.showModal.mock.calls[0]![0]));
    expect(modal).toMatchObject({ custom_id: `setup:v1:rename:${first.id}`, title: 'Renomear Voice Creator' });
    expect(modal.components[0].components[0]).toMatchObject({ custom_id: 'name', min_length: 1, max_length: 100 });
    expect(modal.components[0].components[0].value).toBeUndefined();
    expect(f.factory).not.toHaveBeenCalled();
    expect(f.listByGuild).not.toHaveBeenCalled();
    expect(f.findById).not.toHaveBeenCalled();
    expect(f.deferUpdate).not.toHaveBeenCalled();
    expect(f.editReply).not.toHaveBeenCalled();
    expectNoMutation(f);
  });

  it.each(['gateway', 'repository'] as const)('opens the modal before awaiting a never-settling %s', async (dependency) => {
    const f = fixture('rename');
    const pending = new Promise<never>(() => {});
    if (dependency === 'gateway') f.assertCanConfigure.mockReturnValue(pending);
    else f.listByGuild.mockReturnValue(pending);
    f.showModal.mockImplementation(async () => {
      expect(f.factory).not.toHaveBeenCalled();
      expect(f.listByGuild).not.toHaveBeenCalled();
    });

    const execution = f.handler.execute(f.interaction);
    expect(f.showModal).toHaveBeenCalledOnce();
    await execution;
    expect(f.assertCanConfigure).not.toHaveBeenCalled();
    expect(f.getVoiceChannel).not.toHaveBeenCalled();
    expect(f.getCategory).not.toHaveBeenCalled();
    expect(f.listByGuild).not.toHaveBeenCalled();
    expectNoMutation(f);
  });

  it.each(['missing', 'foreign', 'deleted'] as const)('does not look up %s configuration state to open the generic form', async (state) => {
    const f = fixture('rename');
    if (state === 'missing') f.configurations.splice(0, 1);
    else if (state === 'foreign') f.configurations[0]!.guildDiscordId = '92345678901234567';
    else f.configurations[0]!.deletedAt = new Date();
    await f.handler.execute(f.interaction);
    expect(f.showModal).toHaveBeenCalledOnce();
    expect(f.factory).not.toHaveBeenCalled();
    expect(f.listByGuild).not.toHaveBeenCalled();
    const modal = JSON.parse(JSON.stringify(f.showModal.mock.calls[0]![0]));
    expect(modal.components[0].components[0].value).toBeUndefined();
    expectNoMutation(f);
  });

  it.each([
    { customId: 'setup:v1:rename:invalid' },
    { inGuild: () => false, guild: null, guildId: null },
    { guild: { id: '92345678901234567' } },
    { memberPermissions: new PermissionsBitField(PermissionFlagsBits.ManageChannels) },
    { message: { flags: new MessageFlagsBitField() } },
  ])('checks synchronous safety gates before opening any rename form: %j', async (overrides) => {
    const f = fixture('rename');
    Object.assign(f.interaction, overrides);
    await f.handler.execute(f.interaction);
    expect(f.showModal).not.toHaveBeenCalled();
    expect(f.reply).toHaveBeenCalledWith(expect.objectContaining({ flags: MessageFlags.Ephemeral }));
    expect(f.factory).not.toHaveBeenCalled();
    expect(f.listByGuild).not.toHaveBeenCalled();
    expectNoMutation(f);
  });

  it('revalidates modal submission and renames the same persisted channel with trimmed input', async () => {
    const f = fixture('rename', 'modal');
    if (f.interaction.isModalSubmit()) vi.mocked(f.interaction.fields.getTextInputValue).mockReturnValue('  Novo nome  ');
    await f.handler.execute(f.interaction);
    expect(f.renameVoiceChannel).toHaveBeenCalledExactlyOnceWith(first.creatorChannelDiscordId, 'Novo nome');
    expect(f.deferUpdate).toHaveBeenCalledOnce();
    expect(payload(f).embeds[0].title).toBe('Configuração do Charon');
  });

  it('requires explicit delete confirmation and explains that channels/rooms are preserved', async () => {
    const f = fixture('delete');
    await f.handler.execute(f.interaction);
    const result = payload(f);
    expect(JSON.stringify(result)).toContain('preservados');
    expect(result.components[0].components).toEqual(expect.arrayContaining([
      expect.objectContaining({ custom_id: `setup:v1:confirm-delete:${first.id}`, style: 4 }),
      expect.objectContaining({ custom_id: `setup:v1:cancel:${first.id}` }),
    ]));
    expectNoMutation(f);
  });

  it('confirms logical removal even when both Discord targets were externally deleted', async () => {
    const f = fixture('confirm-delete');
    f.getVoiceChannel.mockResolvedValue(null as never);
    f.getCategory.mockResolvedValue(null as never);
    await f.handler.execute(f.interaction);
    expect(f.remove).toHaveBeenCalledExactlyOnceWith(first.id);
    expect(payload(f).components[0].components[0].options).not.toContainEqual(expect.objectContaining({ value: first.id }));
    expect(f.send).not.toHaveBeenCalled();
  });

  it('cancels delete and restores the same selected dashboard without mutations', async () => {
    const f = fixture('cancel', 'button', [], second.id);
    await f.handler.execute(f.interaction);
    expect(payload(f).components[0].components[0].options).toContainEqual(expect.objectContaining({ value: second.id, default: true }));
    expectNoMutation(f);
  });

  it.each(['select', 'cancel'])('warns for missing persisted targets while keeping recovery controls: %s', async (action) => {
    const f = fixture(action, action === 'select' ? 'string' : 'button', [first.id]);
    f.getVoiceChannel.mockResolvedValue(null as never);
    f.getCategory.mockResolvedValue(null as never);
    await f.handler.execute(f.interaction);
    expect(payload(f).embeds[0].fields).toContainEqual(expect.objectContaining({ name: 'Atenção' }));
    expect(JSON.stringify(payload(f))).toContain(`setup:v1:delete:${first.id}`);
    expectNoMutation(f);
  });

  it.each(['delete', 'confirm-delete', 'cancel', 'toggle-commands', 'rename', 'default-limit', 'change-category', 'select'])('rejects a forged foreign-guild configuration on every action: %s', async (action) => {
    const f = fixture(action, action === 'select' ? 'string' : action === 'change-category' ? 'channel' : action === 'rename' || action === 'default-limit' ? 'modal' : 'button', [action === 'change-category' ? '72345678901234567' : first.id]);
    if (action === 'default-limit' && f.interaction.isModalSubmit()) vi.mocked(f.interaction.fields.getTextInputValue).mockReturnValue('4');
    f.configurations[0]!.guildDiscordId = '92345678901234567';
    await f.handler.execute(f.interaction);
    expectNoMutation(f);
    expect(f.showModal).not.toHaveBeenCalled();
    expect(f.getVoiceChannel).not.toHaveBeenCalled();
    expect(f.listByGuild).toHaveBeenCalledWith(guildId);
    expect(JSON.stringify(f.editReply.mock.calls.concat(f.reply.mock.calls))).toContain('configuração');
  });

  it('rejects a forged select value even if the custom ID belongs to this guild', async () => {
    const f = fixture('select', 'string', ['123e4567-e89b-42d3-a456-426614174099']);
    await f.handler.execute(f.interaction);
    expectNoMutation(f);
    expect(f.getVoiceChannel).not.toHaveBeenCalled();
  });

  it('rejects a foreign-guild select value even when the source creator is owned', async () => {
    const f = fixture('select', 'string', [second.id]);
    f.configurations[1]!.guildDiscordId = '92345678901234567';
    await f.handler.execute(f.interaction);
    expectNoMutation(f);
    expect(f.getVoiceChannel).not.toHaveBeenCalled();
    expect(payload(f).content).toContain('configuração');
  });

  it.each(['delete', 'confirm-delete', 'cancel', 'toggle-commands', 'rename', 'change-category', 'select'])('rejects an expired or logically deleted configuration: %s', async (action) => {
    const f = fixture(action, action === 'select' ? 'string' : action === 'change-category' ? 'channel' : action === 'rename' ? 'modal' : 'button', [action === 'change-category' ? '72345678901234567' : first.id]);
    f.configurations[0]!.deletedAt = new Date();
    await f.handler.execute(f.interaction);
    expectNoMutation(f);
    expect(f.showModal).not.toHaveBeenCalled();
    expect(f.listByGuild).toHaveBeenCalledWith(guildId);
  });

  it.each(['missing', 'foreign', 'deleted'] as const)('rechecks persisted ownership on modal submit: %s', async (state) => {
    const f = fixture('rename', 'modal');
    if (state === 'missing') f.configurations.splice(0, 1);
    else if (state === 'foreign') f.configurations[0]!.guildDiscordId = '92345678901234567';
    else f.configurations[0]!.deletedAt = new Date();
    await f.handler.execute(f.interaction);
    expectNoMutation(f);
    expect(f.assertCanConfigure).toHaveBeenCalledWith('42345678901234567');
    expect(f.listByGuild).toHaveBeenCalledWith(guildId);
    expect(f.getVoiceChannel).not.toHaveBeenCalled();
    expect(payload(f).content).toContain('configuração');
  });

  it('rejects malformed rename submit IDs before data access or mutation', async () => {
    const f = fixture('rename', 'modal');
    Object.assign(f.interaction, { customId: 'setup:v1:rename:invalid' });
    await f.handler.execute(f.interaction);
    expect(f.reply).toHaveBeenCalledWith(expect.objectContaining({ flags: MessageFlags.Ephemeral }));
    expect(f.factory).not.toHaveBeenCalled();
    expect(f.listByGuild).not.toHaveBeenCalled();
    expectNoMutation(f);
  });

  it('refreshes another page from the existing real-UUID navigation contract', async () => {
    const f = fixture('select', 'string', ['123e4567-e89b-42d3-a456-426614174024']);
    for (let index = 2; index < 30; index++) {
      f.configurations.push({ ...first, id: `123e4567-e89b-42d3-a456-${String(426614174000 + index)}`, creatorChannelDiscordId: String(62345678901234567n + BigInt(index)) });
    }
    await f.handler.execute(f.interaction);
    expect(payload(f).embeds[0].footer.text).toContain('Página 2 de 2');
    expect(payload(f).components[0].components[0].options).toContainEqual(expect.objectContaining({ value: '123e4567-e89b-42d3-a456-426614174024', default: true }));
    expectNoMutation(f);
  });

  it('rechecks permissions on modal submission after a valid rename button was opened', async () => {
    const f = fixture('rename');
    await f.handler.execute(f.interaction);
    expect(f.showModal).toHaveBeenCalledOnce();
    Object.assign(f.interaction, { isButton: () => false, isModalSubmit: () => true });
    f.getVoiceChannel.mockRejectedValue(new SetupDiscordError('Permissões insuficientes.'));
    await f.handler.execute(f.interaction);
    expectNoMutation(f);
    expect(payload(f).content).toContain('Permissões');
  });

  it('rejects modal submissions with no name field safely', async () => {
    const f = fixture('rename', 'modal');
    if (f.interaction.isModalSubmit()) vi.mocked(f.interaction.fields.getTextInputValue).mockImplementation(() => { throw new Error('field missing'); });
    await f.handler.execute(f.interaction);
    expectNoMutation(f);
    expect(f.reply).toHaveBeenCalledWith(expect.objectContaining({ flags: MessageFlags.Ephemeral }));
  });

  it.each(['setup:v1:delete:not-a-uuid', `setup:v1:delete:${first.id}:extra`, 'setup:v2:add', 'setup:v1:unknown'])('rejects malformed IDs privately: %s', async (customId) => {
    const f = fixture();
    Object.assign(f.interaction, { customId });
    await f.handler.execute(f.interaction);
    expect(f.reply).toHaveBeenCalledWith(expect.objectContaining({ flags: MessageFlags.Ephemeral }));
    expect(f.listByGuild).not.toHaveBeenCalled();
    expectNoMutation(f);
  });

  it.each([
    ['add', 'button', []], ['add', 'role', ['62345678901234567']], ['add', 'channel', []],
    ['add', 'channel', ['1']], ['add', 'channel', ['62345678901234567', '72345678901234567']],
    ['select', 'channel', [second.id]], ['select', 'string', ['invalid']],
    ['change-category', 'channel', [second.id]], ['toggle-commands', 'modal', []],
    ['confirm-delete', 'channel', []], ['add-category', 'string', ['72345678901234567']],
  ] as [string, Kind, string[]][])('rejects invalid action/component/value combinations: %s %s %j', async (action, kind, values) => {
    const f = fixture(action, kind, values, action === 'add-category' ? '62345678901234567' : first.id);
    await f.handler.execute(f.interaction);
    expectNoMutation(f);
    expect(f.listByGuild).not.toHaveBeenCalled();
    expect(f.reply).toHaveBeenCalledWith(expect.objectContaining({ flags: MessageFlags.Ephemeral }));
  });

  it.each(['', '  ', 'x'.repeat(101)])('rejects invalid modal names without any mutation: %j', async (name) => {
    const f = fixture('rename', 'modal');
    if (f.interaction.isModalSubmit()) vi.mocked(f.interaction.fields.getTextInputValue).mockReturnValue(name);
    await f.handler.execute(f.interaction);
    expectNoMutation(f);
    expect(f.factory).not.toHaveBeenCalled();
    expect(f.listByGuild).not.toHaveBeenCalled();
  });

  it.each([null, 0n, PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ManageChannels])('rechecks user permissions after opening: %s', async (bits) => {
    const f = fixture();
    Object.assign(f.interaction, { memberPermissions: bits === null ? null : new PermissionsBitField(bits) });
    await f.handler.execute(f.interaction);
    expect(f.reply).toHaveBeenCalledWith(expect.objectContaining({ flags: MessageFlags.Ephemeral }));
    expect(f.factory).not.toHaveBeenCalled();
    expectNoMutation(f);
  });

  it('accepts the ManageGuild AND ManageChannels alternative', async () => {
    const f = fixture();
    Object.assign(f.interaction, { memberPermissions: new PermissionsBitField([PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ManageChannels]) });
    await f.handler.execute(f.interaction);
    expect(f.setRoomCommandsEnabled).toHaveBeenCalledExactlyOnceWith(first.id, false);
  });

  it.each([{ inGuild: () => false, guild: null, guildId: null }, { guild: null }, { guild: { id: '92345678901234567' } }])('rejects missing or mismatched guild context privately', async (overrides) => {
    const f = fixture();
    Object.assign(f.interaction, overrides);
    await f.handler.execute(f.interaction);
    expect(f.reply).toHaveBeenCalledWith(expect.objectContaining({ flags: MessageFlags.Ephemeral }));
    expect(f.factory).not.toHaveBeenCalled();
    expectNoMutation(f);
  });

  it.each(['button', 'modal'] as const)('never updates a public or absent source message: %s', async (kind) => {
    const f = fixture('rename', kind);
    Object.assign(f.interaction, { message: { flags: new MessageFlagsBitField() } });
    await f.handler.execute(f.interaction);
    expect(f.reply).toHaveBeenCalledWith(expect.objectContaining({ flags: MessageFlags.Ephemeral }));
    expect(f.deferUpdate).not.toHaveBeenCalled();
    expect(f.editReply).not.toHaveBeenCalled();
    expect(f.factory).not.toHaveBeenCalled();
    expectNoMutation(f);
  });

  it('rejects modal submits not attached to a message', async () => {
    const f = fixture('rename', 'modal');
    Object.assign(f.interaction, { message: null, isFromMessage: () => false });
    await f.handler.execute(f.interaction);
    expectNoMutation(f);
    expect(f.deferUpdate).not.toHaveBeenCalled();
    expect(f.reply).toHaveBeenCalledWith(expect.objectContaining({ flags: MessageFlags.Ephemeral }));
  });

  it.each(['preflight', 'voice', 'category'])('denies lost effective bot permissions before mutation: %s', async (target) => {
    const f = fixture();
    const request = target === 'preflight' ? f.assertCanConfigure : target === 'voice' ? f.getVoiceChannel : f.getCategory;
    request.mockRejectedValue(new SetupDiscordError('Permissões insuficientes.'));
    await f.handler.execute(f.interaction);
    expect(payload(f).content).toContain('Permissões');
    expectNoMutation(f);
  });

  it.each(['rename', 'toggle-commands', 'change-category'])('denies a missing live voice target for actual changes: %s', async (action) => {
    const f = fixture(action, action === 'add' || action === 'add-category' || action === 'change-category' ? 'channel' : action === 'rename' ? 'modal' : 'button', ['72345678901234567'], action === 'add-category' ? '62345678901234567' : first.id);
    f.getVoiceChannel.mockResolvedValue(null as never);
    await f.handler.execute(f.interaction);
    expectNoMutation(f);
    expect(payload(f).content).toContain('indisponível');
  });

  it.each(['change-category', 'toggle-commands', 'rename'])('denies missing required destination categories: %s', async (action) => {
    const f = fixture(action, action === 'add-category' || action === 'change-category' ? 'channel' : action === 'rename' ? 'modal' : 'button', ['72345678901234567'], action === 'add-category' ? '62345678901234567' : first.id);
    f.getCategory.mockResolvedValue(null as never);
    await f.handler.execute(f.interaction);
    expectNoMutation(f);
    expect(f.showModal).not.toHaveBeenCalled();
  });

  it.each([new VoiceCreatorAlreadyConfiguredError(), new VoiceCreatorNotFoundError()])('renders safe domain failures rather than raw storage details', async (error) => {
    const f = fixture('confirm-delete');
    f.remove.mockRejectedValue(error);
    await f.handler.execute(f.interaction);
    expect(payload(f).content).toEqual(expect.any(String));
    expect(payload(f).content).not.toContain(error.message);
    expect(f.reply).not.toHaveBeenCalled();
  });

  it('propagates unexpected errors to the existing central registry', async () => {
    const f = fixture();
    f.listByGuild.mockRejectedValue(new Error('database offline'));
    await expect(f.handler.execute(f.interaction)).rejects.toThrow('database offline');
    expectNoMutation(f);
  });
});
