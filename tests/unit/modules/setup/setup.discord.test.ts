import { ChannelType, PermissionFlagsBits, PermissionsBitField, type Guild } from 'discord.js';
import { describe, expect, it, vi } from 'vitest';

import { DiscordSetupGateway, SetupDiscordError } from '../../../../src/modules/setup/setup.discord.js';

const guildId = '12345678901234567';
const channelId = '22345678901234567';
const allPermissions = new PermissionsBitField([
  PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.MoveMembers, PermissionFlagsBits.Connect,
  PermissionFlagsBits.SendMessages,
]);

function fixture(type: ChannelType = ChannelType.GuildVoice) {
  const channel = {
    id: channelId, guildId, type, name: 'Criar sala', parentId: '32345678901234567',
    permissionsFor: vi.fn().mockReturnValue(allPermissions),
    setName: vi.fn().mockResolvedValue(undefined),
    isThread: () => false,
  };
  const member = { permissions: allPermissions };
  const fetch = vi.fn().mockResolvedValue(channel);
  const fetchMe = vi.fn().mockResolvedValue(member);
  const guild = { id: guildId, channels: { fetch }, members: { fetchMe } } as unknown as Guild;
  return { channel, member, fetch, fetchMe, gateway: new DiscordSetupGateway(guild) };
}

describe('DiscordSetupGateway', () => {
  it('resolves a fresh guild voice channel and its category', async () => {
    const { gateway, channel, fetch } = fixture();
    await expect(gateway.getVoiceChannel(channelId)).resolves.toEqual({
      id: channelId, name: 'Criar sala', categoryDiscordId: '32345678901234567',
    });
    expect(fetch).toHaveBeenCalledWith(channelId, { force: true });
    channel.type = ChannelType.GuildCategory;
    await expect(gateway.getCategory(channelId)).resolves.toEqual({ id: channelId, name: 'Criar sala' });
  });

  it.each([ChannelType.GuildText, ChannelType.GuildStageVoice, ChannelType.GuildCategory])(
    'does not accept channel type %s as a voice creator', async (type) => {
      const { gateway, channel } = fixture(type);
      await expect(gateway.getVoiceChannel(channelId)).resolves.toBeNull();
      await expect(gateway.renameVoiceChannel(channelId, 'Sala')).rejects.toBeInstanceOf(SetupDiscordError);
      expect(channel.setName).not.toHaveBeenCalled();
    },
  );

  it('rejects a voice channel as a destination category', async () => {
    await expect(fixture().gateway.getCategory(channelId)).resolves.toBeNull();
  });

  it.each([ChannelType.GuildVoice, ChannelType.GuildCategory])('does not resolve or rename channels outside the gateway guild: %s', async (type) => {
    const { gateway, channel } = fixture(type);
    channel.guildId = '42345678901234567';
    await expect(gateway.getVoiceChannel(channelId)).resolves.toBeNull();
    await expect(gateway.getCategory(channelId)).resolves.toBeNull();
    await expect(gateway.renameVoiceChannel(channelId, 'Sala')).rejects.toBeInstanceOf(SetupDiscordError);
    expect(channel.setName).not.toHaveBeenCalled();
  });

  it('maps missing/deleted channels to safe results but preserves unexpected API failures', async () => {
    const { gateway, fetch } = fixture();
    fetch.mockResolvedValueOnce(null).mockRejectedValueOnce({ code: 10003 });
    await expect(gateway.getVoiceChannel(channelId)).resolves.toBeNull();
    await expect(gateway.getCategory(channelId)).resolves.toBeNull();
    fetch.mockRejectedValueOnce(new Error('network unavailable'));
    await expect(gateway.getVoiceChannel(channelId)).rejects.toThrow('network unavailable');
  });

  it.each(['invalid', '123'])('validates channel IDs before fetching: %s', async (id) => {
    const { gateway, fetch } = fixture();
    await expect(gateway.getVoiceChannel(id)).rejects.toBeInstanceOf(SetupDiscordError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(['', '   ', 'x'.repeat(101)])('rejects invalid rename input before any API work', async (name) => {
    const { gateway, fetch, channel } = fixture();
    await expect(gateway.renameVoiceChannel(channelId, name)).rejects.toBeInstanceOf(SetupDiscordError);
    expect(fetch).not.toHaveBeenCalled();
    expect(channel.setName).not.toHaveBeenCalled();
  });

  it('renames the existing voice channel with a trimmed name', async () => {
    const { gateway, channel } = fixture();
    await gateway.renameVoiceChannel(channelId, '  Nova sala  ');
    expect(channel.setName).toHaveBeenCalledExactlyOnceWith('Nova sala');
  });

  it.each([10003, 50001, 50013])('converts expected Discord race failures into safe domain errors: %s', async (code) => {
    const { gateway, channel } = fixture();
    channel.setName.mockRejectedValue({ code });
    await expect(gateway.renameVoiceChannel(channelId, 'Sala')).rejects.toBeInstanceOf(SetupDiscordError);
  });

  it.each([50001, 50013])('converts denied channel access into a safe permission error: %s', async (code) => {
    const { gateway, fetch } = fixture();
    fetch.mockRejectedValue({ code });
    await expect(gateway.getVoiceChannel(channelId)).rejects.toBeInstanceOf(SetupDiscordError);
  });

  it.each([
    PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers,
    PermissionFlagsBits.Connect, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel,
  ])('checks effective channel permissions before rename: %s', async (permission) => {
    const { gateway, channel } = fixture();
    channel.permissionsFor.mockReturnValue(new PermissionsBitField(allPermissions.bitfield & ~permission));
    await expect(gateway.renameVoiceChannel(channelId, 'Sala')).rejects.toBeInstanceOf(SetupDiscordError);
    expect(channel.setName).not.toHaveBeenCalled();
  });

  it('checks destination category overwrites at runtime', async () => {
    const { gateway, channel } = fixture(ChannelType.GuildCategory);
    channel.permissionsFor.mockReturnValue(new PermissionsBitField(PermissionFlagsBits.ManageChannels));
    await expect(gateway.getCategory(channelId)).rejects.toBeInstanceOf(SetupDiscordError);
  });

  it('checks bot guild permissions and send permissions in the invocation context', async () => {
    const { gateway, channel, member, fetchMe } = fixture(ChannelType.GuildText);
    await expect(gateway.assertCanConfigure(channelId)).resolves.toBeUndefined();
    expect(fetchMe).toHaveBeenCalledWith({ force: true });
    member.permissions = new PermissionsBitField(PermissionFlagsBits.ManageChannels);
    await expect(gateway.assertCanConfigure(channelId)).rejects.toBeInstanceOf(SetupDiscordError);
    member.permissions = allPermissions;
    channel.permissionsFor.mockReturnValue(new PermissionsBitField(PermissionFlagsBits.ViewChannel));
    await expect(gateway.assertCanConfigure(channelId)).rejects.toBeInstanceOf(SetupDiscordError);
  });

  it('requires the bot to be able to connect before opening an empty setup', async () => {
    const { gateway, member } = fixture(ChannelType.GuildText);
    member.permissions = new PermissionsBitField(allPermissions.bitfield & ~PermissionFlagsBits.Connect);
    await expect(gateway.assertCanConfigure(channelId)).rejects.toBeInstanceOf(SetupDiscordError);
  });
});
