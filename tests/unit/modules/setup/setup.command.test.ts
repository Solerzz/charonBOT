import { InteractionContextType, MessageFlags, PermissionFlagsBits, PermissionsBitField, ChannelType, type ChatInputCommandInteraction, type Interaction, type Guild } from 'discord.js';
import { describe, expect, it, vi } from 'vitest';

import { SetupCommand, setupCommandData } from '../../../../src/modules/setup/setup.command.js';
import type { VoiceCreatorConfiguration, VoiceCreatorRepository } from '../../../../src/modules/setup/setup.repository.js';
import { SetupService } from '../../../../src/modules/setup/setup.service.js';

const guildId = '12345678901234567';
const configuration: VoiceCreatorConfiguration = {
  id: '123e4567-e89b-42d3-a456-426614174000', guildDiscordId: guildId,
  creatorChannelDiscordId: '22345678901234567', categoryDiscordId: '32345678901234567',
  roomCommandsEnabled: true, deletedAt: null, createdAt: new Date(), updatedAt: new Date(),
};
const botPermissions = new PermissionsBitField([
  PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers,
  PermissionFlagsBits.Connect, PermissionFlagsBits.SendMessages,
]);

function fixture(configurations: VoiceCreatorConfiguration[] = []) {
  const listByGuild = vi.fn().mockResolvedValue(configurations);
  const repository = { listByGuild } as unknown as VoiceCreatorRepository;
  const service = new SetupService(repository);
  const send = vi.fn();
  const permissionsFor = vi.fn().mockReturnValue(botPermissions);
  const fetch = vi.fn(async (id: string) => ({
    id, guildId, name: 'Criar sala', parentId: configuration.categoryDiscordId,
    type: id === configuration.categoryDiscordId ? ChannelType.GuildCategory : id === configuration.creatorChannelDiscordId ? ChannelType.GuildVoice : ChannelType.GuildText,
    permissionsFor, isThread: () => false,
  }));
  const guild = { id: guildId, channels: { fetch }, members: { fetchMe: vi.fn().mockResolvedValue({ permissions: botPermissions }) } } as unknown as Guild;
  const reply = vi.fn().mockResolvedValue(undefined);
  const deferReply = vi.fn().mockResolvedValue(undefined);
  const editReply = vi.fn().mockResolvedValue(undefined);
  const interaction = {
    commandName: 'setup', isChatInputCommand: () => true,
    options: { getSubcommand: () => 'init' },
    inGuild: () => true, guildId, guild, channelId: '42345678901234567',
    memberPermissions: new PermissionsBitField(PermissionFlagsBits.Administrator),
    channel: { send }, reply, deferReply, editReply,
  } as unknown as ChatInputCommandInteraction;
  return { command: new SetupCommand(service), interaction, listByGuild, reply, deferReply, editReply, send, permissionsFor, fetch, guild };
}

describe('SetupCommand', () => {
  it('exports deploy-time command data without requiring a runtime service', () => {
    expect(setupCommandData.toJSON()).toMatchObject({ name: 'setup', contexts: [InteractionContextType.Guild], options: [{ name: 'init', type: 1 }] });
    expect(fixture().command.data).toBe(setupCommandData);
  });

  it('acknowledges privately before slow Discord requests and edits that same response', async () => {
    const { command, interaction, deferReply, editReply, reply, fetch } = fixture();
    await command.execute(interaction);
    expect(deferReply).toHaveBeenCalledExactlyOnceWith({ flags: MessageFlags.Ephemeral });
    expect(deferReply.mock.invocationCallOrder[0]).toBeLessThan(fetch.mock.invocationCallOrder[0]!);
    expect(editReply).toHaveBeenCalledOnce();
    expect(reply).not.toHaveBeenCalled();
  });

  it.each([
    ['setup', 'init', true, true], ['setup', 'other', true, false],
    ['status', 'init', true, false], ['setup', 'init', false, false],
  ])('routes only setup init: %s %s %s', (commandName, subcommand, chat, expected) => {
    const { command } = fixture();
    expect(command.canHandle({ commandName, isChatInputCommand: () => chat, options: { getSubcommand: () => subcommand } } as unknown as Interaction)).toBe(expected);
  });

  it('rejects DMs privately before service or guild access', async () => {
    const { command, interaction, reply, listByGuild } = fixture();
    Object.assign(interaction, { inGuild: () => false, guild: null, guildId: null });
    await command.execute(interaction);
    expect(reply).toHaveBeenCalledExactlyOnceWith({ content: 'Use este comando em um servidor.', flags: MessageFlags.Ephemeral });
    expect(listByGuild).not.toHaveBeenCalled();
  });

  it.each([null, 0n, PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ManageChannels])('rejects insufficient user permissions at runtime: %s', async (bits) => {
    const { command, interaction, reply, listByGuild } = fixture();
    Object.assign(interaction, { memberPermissions: bits === null ? null : new PermissionsBitField(bits) });
    await command.execute(interaction);
    expect(reply).toHaveBeenCalledExactlyOnceWith({ content: 'Você precisa de Administrador ou Gerenciar Servidor e Gerenciar Canais.', flags: MessageFlags.Ephemeral });
    expect(listByGuild).not.toHaveBeenCalled();
  });

  it.each([PermissionFlagsBits.Administrator, PermissionFlagsBits.ManageGuild | PermissionFlagsBits.ManageChannels])('opens the dashboard only ephemerally for authorized members: %s', async (bits) => {
    const { command, interaction, reply, deferReply, editReply, send, listByGuild } = fixture();
    Object.assign(interaction, { memberPermissions: new PermissionsBitField(bits) });
    await command.execute(interaction);
    expect(listByGuild).toHaveBeenCalledExactlyOnceWith(guildId);
    expect(deferReply).toHaveBeenCalledExactlyOnceWith({ flags: MessageFlags.Ephemeral });
    expect(editReply).toHaveBeenCalledOnce();
    expect(editReply.mock.calls[0]![0]).toMatchObject({ embeds: [expect.anything()] });
    expect(reply).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('loads creator details and selects the first persisted configuration', async () => {
    const { command, interaction, deferReply, editReply, fetch, send } = fixture([configuration]);
    await command.execute(interaction);
    const payload = JSON.parse(JSON.stringify(editReply.mock.calls[0]![0]));
    expect(deferReply).toHaveBeenCalledExactlyOnceWith({ flags: MessageFlags.Ephemeral });
    expect(payload.flags).toBeUndefined();
    expect(payload.embeds[0].fields[2].value).toBe('Criar sala');
    expect(payload.components[0].components[0].options[0]).toMatchObject({ value: configuration.id, default: true });
    expect(fetch).toHaveBeenCalledWith(configuration.categoryDiscordId, { force: true });
    expect(send).not.toHaveBeenCalled();
  });

  it('refuses to open when the bot cannot manage channels or move members', async () => {
    const { command, interaction, editReply, listByGuild, guild } = fixture();
    vi.mocked(guild.members.fetchMe).mockResolvedValue({ permissions: new PermissionsBitField(PermissionFlagsBits.ManageChannels) } as never);
    await command.execute(interaction);
    expect(editReply.mock.calls[0]![0]).toEqual({ content: 'O Charon precisa de Gerenciar Canais, Mover Membros, Conectar e Enviar Mensagens no contexto da configuração.' });
    expect(listByGuild).not.toHaveBeenCalled();
  });

  it('honors invocation-channel permission overwrites even if guild permissions allow setup', async () => {
    const { command, interaction, editReply, permissionsFor } = fixture();
    permissionsFor.mockReturnValue(new PermissionsBitField(PermissionFlagsBits.ViewChannel));
    await command.execute(interaction);
    expect(editReply.mock.calls[0]![0]).toMatchObject({ content: expect.stringContaining('O Charon precisa') });
  });

  it.each([
    [configuration.creatorChannelDiscordId],
    [configuration.categoryDiscordId],
    [configuration.creatorChannelDiscordId, configuration.categoryDiscordId],
  ])('opens a recoverable private dashboard when persisted targets are unavailable: %j', async (...missing) => {
    const other = { ...configuration, id: '123e4567-e89b-42d3-a456-426614174001', creatorChannelDiscordId: '52345678901234567' };
    const { command, interaction, deferReply, editReply, fetch, send } = fixture([configuration, other]);
    const resolve = fetch.getMockImplementation()!;
    fetch.mockImplementation(async (id: string) => missing.includes(id) ? null as never : resolve(id));
    await command.execute(interaction);
    expect(deferReply).toHaveBeenCalledExactlyOnceWith({ flags: MessageFlags.Ephemeral });
    const payload = JSON.parse(JSON.stringify(editReply.mock.calls[0]![0]));
    expect(payload).toHaveProperty('embeds');
    expect(payload.embeds[0].title).toBe('Configuração do Charon');
    expect(payload.embeds[0].fields).toContainEqual(expect.objectContaining({ name: 'Atenção', value: expect.stringContaining('indisponível') }));
    const controls = payload.components.flatMap((row: { components: unknown[] }) => row.components);
    expect(controls[0].options).toEqual(expect.arrayContaining([
      expect.objectContaining({ value: configuration.id, default: true }),
      expect.objectContaining({ value: other.id, default: false }),
    ]));
    expect(controls).toContainEqual(expect.objectContaining({ custom_id: `setup:v1:delete:${configuration.id}` }));
    expect(controls).toContainEqual(expect.objectContaining({ custom_id: `setup:v1:change-category:${configuration.id}` }));
    expect(controls).toContainEqual(expect.objectContaining({ custom_id: 'setup:v1:add' }));
    expect(send).not.toHaveBeenCalled();
  });

  it('still denies setup for actual target permission failures rather than treating them as stale state', async () => {
    const { command, interaction, editReply, fetch } = fixture([configuration]);
    const resolve = fetch.getMockImplementation()!;
    fetch.mockImplementation(async (id: string) => {
      if (id === configuration.creatorChannelDiscordId) {
        throw { code: 50013 };
      }
      return resolve(id);
    });
    await command.execute(interaction);
    expect(editReply.mock.calls[0]![0]).toEqual({ content: 'O Charon precisa de Gerenciar Canais, Mover Membros, Conectar e Enviar Mensagens no contexto da configuração.' });
  });

  it('leaves unexpected failures to the central interaction registry', async () => {
    const { command, interaction, reply, listByGuild } = fixture();
    listByGuild.mockRejectedValue(new Error('database offline'));
    await expect(command.execute(interaction)).rejects.toThrow('database offline');
    expect(reply).not.toHaveBeenCalled();
  });
});
