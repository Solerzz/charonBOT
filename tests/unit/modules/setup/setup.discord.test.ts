import { ChannelType, Collection, PermissionFlagsBits, PermissionsBitField, type Guild } from 'discord.js';
import { describe, expect, it, vi } from 'vitest';

import { DiscordSetupGateway, SetupChannelCreationError, SetupDiscordError } from '../../../../src/modules/setup/setup.discord.js';

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

function creationFixture() {
  const categoryId = '32345678901234567';
  const overwrites = [
    { id: guildId, type: 0, allow: new PermissionsBitField(), deny: new PermissionsBitField([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]) },
    { id: '42345678901234567', type: 0, allow: new PermissionsBitField(PermissionFlagsBits.Connect), deny: new PermissionsBitField(PermissionFlagsBits.SendMessages) },
    { id: '52345678901234567', type: 1, allow: new PermissionsBitField(PermissionFlagsBits.ViewChannel), deny: new PermissionsBitField(PermissionFlagsBits.Connect) },
  ];
  const category = {
    id: categoryId, guildId, type: ChannelType.GuildCategory,
    permissionOverwrites: { cache: new Collection(overwrites.map((o) => [o.id, o])) },
    permissionsFor: vi.fn().mockReturnValue(allPermissions),
  };
  const channel = {
    id: channelId, guildId, type: ChannelType.GuildVoice, name: 'Entrada', parentId: categoryId, userLimit: 0,
    permissionsFor: vi.fn().mockReturnValue(allPermissions), delete: vi.fn().mockResolvedValue(undefined),
  };
  const states = new Collection<string, { channelId: string }>();
  const fetch = vi.fn(async (id: string) => id === categoryId ? category : channel);
  const create = vi.fn().mockResolvedValue(channel);
  const fetchMe = vi.fn().mockResolvedValue({ permissions: allPermissions });
  const guild = { id: guildId, channels: { fetch, create }, members: { fetchMe }, voiceStates: { cache: states } } as unknown as Guild;
  return { gateway: new DiscordSetupGateway(guild), categoryId, category, channel, fetch, create, fetchMe, states };
}

describe('DiscordSetupGateway creation', () => {
  it('creates an unlimited voice entry with the exact restricted category overwrites', async () => {
    const f = creationFixture();
    await expect(f.gateway.createVoiceCreator({ categoryDiscordId: f.categoryId, name: '  Entrada  ' })).resolves.toEqual({ id: channelId, name: 'Entrada', categoryDiscordId: f.categoryId });
    expect(f.create).toHaveBeenCalledExactlyOnceWith({
      name: 'Entrada', type: ChannelType.GuildVoice, parent: f.categoryId, userLimit: 0,
      permissionOverwrites: [
        { id: guildId, type: 0, allow: 0n, deny: PermissionFlagsBits.ViewChannel | PermissionFlagsBits.Connect },
        { id: '42345678901234567', type: 0, allow: PermissionFlagsBits.Connect, deny: PermissionFlagsBits.SendMessages },
        { id: '52345678901234567', type: 1, allow: PermissionFlagsBits.ViewChannel, deny: PermissionFlagsBits.Connect },
      ],
    });
    expect(f.fetch).toHaveBeenCalledWith(f.categoryId, { force: true });
    expect(f.fetch).toHaveBeenCalledWith(channelId, { force: true });
  });

  it.each(['missing', 'wrong-type', 'foreign', 'denied'] as const)('rejects %s categories before POST', async (mode) => {
    const f = creationFixture();
    if (mode === 'missing') f.fetch.mockResolvedValueOnce(null as never);
    if (mode === 'wrong-type') f.category.type = ChannelType.GuildText;
    if (mode === 'foreign') f.category.guildId = '92345678901234567';
    if (mode === 'denied') f.category.permissionsFor.mockReturnValue(new PermissionsBitField(PermissionFlagsBits.ManageChannels));
    await expect(f.gateway.createVoiceCreator({ categoryDiscordId: f.categoryId, name: 'Entrada' })).rejects.toMatchObject({ certainty: 'rejected' });
    expect(f.create).not.toHaveBeenCalled();
  });

  it.each([
    [{ status: 403, code: 50013, message: 'secret response' }, 'rejected'],
    [{ status: 408, message: 'secret response' }, 'unknown'],
    [{ status: 500, message: 'secret response' }, 'unknown'],
    [Object.assign(new Error('secret timeout'), { name: 'AbortError' }), 'unknown'],
  ] as const)('classifies create failures without exposing the HTTP response: %j', async (error, certainty) => {
    const f = creationFixture();
    f.create.mockRejectedValue(error);
    const result = await f.gateway.createVoiceCreator({ categoryDiscordId: f.categoryId, name: 'Entrada' }).catch((caught: unknown) => caught);
    expect(result).toBeInstanceOf(SetupChannelCreationError);
    expect(result).toMatchObject({ certainty, channelDiscordId: undefined });
    expect(JSON.stringify(result)).not.toContain('secret');
    expect((result as Error).message).not.toContain('secret');
    expect(f.create).toHaveBeenCalledOnce();
  });

  it.each(['foreign', 'wrong-type', 'wrong-parent', 'limited', 'permissions', 'fetch-failed'] as const)('retains the known ID on %s postflight failure', async (mode) => {
    const f = creationFixture();
    if (mode === 'foreign') f.channel.guildId = '92345678901234567';
    if (mode === 'wrong-type') f.channel.type = ChannelType.GuildText;
    if (mode === 'wrong-parent') f.channel.parentId = '92345678901234567';
    if (mode === 'limited') f.channel.userLimit = 4;
    if (mode === 'permissions') f.channel.permissionsFor.mockReturnValue(new PermissionsBitField());
    if (mode === 'fetch-failed') f.fetch.mockResolvedValueOnce(f.category).mockRejectedValueOnce(new Error('secret response'));
    await expect(f.gateway.createVoiceCreator({ categoryDiscordId: f.categoryId, name: 'Entrada' })).rejects.toMatchObject({ certainty: 'created', channelDiscordId: channelId });
    expect(f.channel.delete).not.toHaveBeenCalled();
  });

  it('does not claim a create without a returned ID was rejected', async () => {
    const f = creationFixture();
    f.create.mockResolvedValue({});
    await expect(f.gateway.createVoiceCreator({ categoryDiscordId: f.categoryId, name: 'Entrada' })).rejects.toMatchObject({ certainty: 'unknown' });
  });

  it.each(['', '   ', 'x'.repeat(101)])('rejects invalid entry names before Discord reads: %s', async (name) => {
    const f = creationFixture();
    await expect(f.gateway.createVoiceCreator({ categoryDiscordId: f.categoryId, name })).rejects.toMatchObject({ certainty: 'rejected' });
    expect(f.fetch).not.toHaveBeenCalled();
    expect(f.create).not.toHaveBeenCalled();
  });

  it.each([
    PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.MoveMembers, PermissionFlagsBits.Connect, PermissionFlagsBits.SendMessages,
  ])('requires effective destination permission %s before create', async (permission) => {
    const f = creationFixture();
    f.category.permissionsFor.mockReturnValue(new PermissionsBitField(allPermissions.bitfield & ~permission));
    await expect(f.gateway.createVoiceCreator({ categoryDiscordId: f.categoryId, name: 'Entrada' })).rejects.toMatchObject({ certainty: 'rejected' });
    expect(f.create).not.toHaveBeenCalled();
  });

  it('never deletes a foreign ID returned by a malformed create response', async () => {
    const f = creationFixture();
    f.channel.guildId = '92345678901234567';
    await expect(f.gateway.createVoiceCreator({ categoryDiscordId: f.categoryId, name: 'Entrada' })).rejects.toMatchObject({ certainty: 'created', channelDiscordId: channelId });
    await expect(f.gateway.deleteCreatedVoiceCreatorIfEmpty(channelId)).resolves.toBe(false);
    expect(f.channel.delete).not.toHaveBeenCalled();
  });

  it('deletes only this operation\'s empty created channel after a fresh fetch', async () => {
    const f = creationFixture();
    await f.gateway.createVoiceCreator({ categoryDiscordId: f.categoryId, name: 'Entrada' });
    f.fetch.mockClear();
    await expect(f.gateway.deleteCreatedVoiceCreatorIfEmpty(channelId)).resolves.toBe(true);
    expect(f.fetch).toHaveBeenCalledExactlyOnceWith(channelId, { force: true });
    expect(f.channel.delete).toHaveBeenCalledOnce();
  });

  it('does not delete an arbitrary preexisting ID', async () => {
    const f = creationFixture();
    await expect(f.gateway.deleteCreatedVoiceCreatorIfEmpty(channelId)).resolves.toBe(false);
    expect(f.channel.delete).not.toHaveBeenCalled();
  });

  it.each(['null', '10003'] as const)('confirms absence of a known created channel: %s', async (mode) => {
    const f = creationFixture();
    await f.gateway.createVoiceCreator({ categoryDiscordId: f.categoryId, name: 'Entrada' });
    if (mode === 'null') f.fetch.mockResolvedValueOnce(null as never);
    else f.fetch.mockRejectedValueOnce({ code: 10003 });
    await expect(f.gateway.deleteCreatedVoiceCreatorIfEmpty(channelId)).resolves.toBe(true);
    expect(f.channel.delete).not.toHaveBeenCalled();
  });

  it('rechecks occupation after awaited I/O, not just before it', async () => {
    const f = creationFixture();
    await f.gateway.createVoiceCreator({ categoryDiscordId: f.categoryId, name: 'Entrada' });
    f.fetch.mockImplementationOnce(async () => {
      f.states.set('member', { channelId });
      return f.channel;
    });
    await expect(f.gateway.deleteCreatedVoiceCreatorIfEmpty(channelId)).resolves.toBe(false);
    expect(f.channel.delete).not.toHaveBeenCalled();
  });

  it.each(['foreign', 'wrong-type', 'wrong-id', 'delete-failed', 'read-failed'] as const)('does not claim removal when %s', async (mode) => {
    const f = creationFixture();
    await f.gateway.createVoiceCreator({ categoryDiscordId: f.categoryId, name: 'Entrada' });
    if (mode === 'foreign') f.channel.guildId = '92345678901234567';
    if (mode === 'wrong-type') f.channel.type = ChannelType.GuildText;
    if (mode === 'wrong-id') f.channel.id = '92345678901234567';
    if (mode === 'delete-failed') f.channel.delete.mockRejectedValue(new Error('timeout'));
    if (mode === 'read-failed') f.fetch.mockRejectedValue(new Error('timeout'));
    await expect(f.gateway.deleteCreatedVoiceCreatorIfEmpty(channelId)).resolves.toBe(false);
    if (mode !== 'delete-failed') expect(f.channel.delete).not.toHaveBeenCalled();
  });
});
