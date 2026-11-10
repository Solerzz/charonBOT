import { ChannelType, PermissionFlagsBits, PermissionsBitField } from 'discord.js';
import { describe, expect, it } from 'vitest';

import { CallMoveUnconfirmedError } from '../../../../src/modules/calls/call.discord.js';
import { creator, deferred, entry, room } from './call.fixtures.js';
import { discordFixture as fixture } from './call.discord.fixtures.js';

const createInput = { categoryDiscordId: creator.categoryDiscordId, name: 'Game', userLimit: 0 };
const panel = { embeds: [], components: [], allowedMentions: { parse: [] as never[] } };

describe('DiscordCallGateway', () => {
  it.each([0, 1, 4, 99])('includes limit %i in the single create request, without a later limit edit', async (userLimit) => {
    const f = fixture();
    await f.gateway.createTemporaryChannel({ ...createInput, userLimit });
    expect(f.guild.channels.create).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ userLimit }));
    expect((await f.gateway.snapshot(room.channelDiscordId))?.userLimit).toBe(userLimit);
    expect(f.channel.setUserLimit).not.toHaveBeenCalled();
  });

  it.each([-1, 100, 1.5, undefined])('rejects invalid or missing limit %s before any HTTP', async (userLimit) => {
    const f = fixture();
    await expect(f.gateway.createTemporaryChannel({ ...createInput, userLimit: userLimit as number })).rejects.toThrow();
    expect(f.guild.channels.fetch).not.toHaveBeenCalled();
    expect(f.guild.members.fetchMe).not.toHaveBeenCalled();
    expect(f.guild.channels.create).not.toHaveBeenCalled();
  });
  it('delegates exact native name restoration while keeping owner rename strict', async () => {
    const f = fixture(); const previous = `  ${'x'.repeat(96)}  `;
    f.channel.setName.mockImplementation(async (name) => { f.channel.name = name; });
    await f.gateway.restoreName(room.channelDiscordId, previous);
    expect((await f.gateway.snapshot(room.channelDiscordId))?.name).toBe(previous);
    await expect(f.gateway.rename(room.channelDiscordId, previous)).rejects.toMatchObject({ code: 'DISCORD_FAILURE' });
    expect(f.channel.name).toBe(previous);
    await f.gateway.rename(room.channelDiscordId, '  Trimmed  ');
    expect(f.channel.name).toBe('Trimmed');
  });
  it('creates native public unlimited voice channels without inheriting hidden category overwrites', async () => {
    const f = fixture();
    await expect(f.gateway.createTemporaryChannel(createInput)).resolves.toEqual({ channelDiscordId: room.channelDiscordId });
    expect(f.guild.channels.create).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      name: 'Game', type: ChannelType.GuildVoice, parent: creator.categoryDiscordId, userLimit: 0,
      permissionOverwrites: [
        { id: creator.guildDiscordId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.SendMessages] },
        { id: '92345678901234567', allow: expect.arrayContaining([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks]) },
      ],
    }));
  });

  it('rejects missing/wrong/foreign categories and invalid names before creation', async () => {
    for (const category of [null, { ...fixture().category, type: ChannelType.GuildVoice }, { ...fixture().category, guildId: '82345678901234567' }]) {
      const f = fixture();
      f.guild.channels.fetch.mockResolvedValueOnce(category as never);
      await expect(f.gateway.createTemporaryChannel(createInput)).rejects.toThrow();
      expect(f.guild.channels.create).not.toHaveBeenCalled();
    }
    const f = fixture();
    await expect(f.gateway.createTemporaryChannel({ ...createInput, name: 'longer than eleven characters' })).rejects.toThrow();
    expect(f.guild.channels.create).not.toHaveBeenCalled();
  });

  it('requires bot management permissions before creating and compensates unusable created channels', async () => {
    const f = fixture();
    f.category.permissionsFor.mockReturnValueOnce(new PermissionsBitField());
    await expect(f.gateway.createTemporaryChannel(createInput)).rejects.toThrow();
    expect(f.guild.channels.create).not.toHaveBeenCalled();
    const g = fixture();
    g.channel.permissionsFor.mockReturnValueOnce(new PermissionsBitField([PermissionFlagsBits.ViewChannel]));
    await expect(g.gateway.createTemporaryChannel(createInput)).rejects.toThrow();
    expect(g.channel.delete).toHaveBeenCalledTimes(1);
  });

  it('retains the created channel ID in a safe error if postflight compensation also fails', async () => {
    const f = fixture();
    f.channel.permissionsFor.mockReturnValueOnce(new PermissionsBitField());
    f.channel.delete.mockRejectedValueOnce(new Error('sensitive Discord response'));
    const error: unknown = await f.gateway.createTemporaryChannel(createInput).catch((reason: unknown) => reason);
    expect(error).toMatchObject({ name: 'CallDiscordError', channelDiscordId: room.channelDiscordId });
    expect((error as Error).message).not.toContain('sensitive Discord response');
  });

  it('reads current member channel and live guild voice states, not a captured count', () => {
    const f = fixture();
    expect(f.gateway.getMemberChannelDiscordId()).toBe(creator.creatorChannelDiscordId);
    expect(f.gateway.getChannelMemberCount(room.channelDiscordId)).toBe(0);
    f.states.set(entry.memberDiscordId, { channelId: room.channelDiscordId });
    f.states.set('72345678901234567', { channelId: room.channelDiscordId });
    expect(f.gateway.getMemberChannelDiscordId()).toBe(room.channelDiscordId);
    expect(f.gateway.getChannelMemberCount(room.channelDiscordId)).toBe(2);
    f.states.delete(entry.memberDiscordId);
    expect(f.gateway.getMemberChannelDiscordId()).toBeNull();
    expect(f.gateway.getChannelMemberCount(room.channelDiscordId)).toBe(1);
  });

  it('moves only into a same-guild native voice channel', async () => {
    const f = fixture();
    await f.gateway.moveMember(room.channelDiscordId, creator.creatorChannelDiscordId);
    expect(f.member.voice.setChannel).toHaveBeenCalledExactlyOnceWith(room.channelDiscordId);
    const g = fixture();
    g.member.guild.id = '82345678901234567';
    await expect(g.gateway.moveMember(room.channelDiscordId)).rejects.toThrow();
    expect(g.member.voice.setChannel).not.toHaveBeenCalled();
  });

  it('rechecks expected voice source after awaited target/permission reads before moving', async () => {
    const f = fixture();
    const started = deferred(); const gate = deferred<typeof f.channel>();
    f.guild.channels.fetch.mockImplementationOnce(async () => { started.resolve(); return gate.promise; });
    const moving = f.gateway.moveMember(room.channelDiscordId, creator.creatorChannelDiscordId);
    await started.promise;
    f.states.delete(entry.memberDiscordId);
    gate.resolve(f.channel);
    await expect(moving).rejects.toThrow();
    expect(f.member.voice.setChannel).not.toHaveBeenCalled();
  });

  it('refreshes voice state after REST moves because Discord.js does not synchronously update its gateway cache', async () => {
    const f = fixture();
    f.member.voice.setChannel.mockImplementationOnce(async (id) => { f.setServerChannel(id); });
    await f.gateway.moveMember(room.channelDiscordId, creator.creatorChannelDiscordId);
    expect(f.guild.voiceStates.fetch).toHaveBeenCalledExactlyOnceWith(entry.memberDiscordId, { force: true });
    expect(f.gateway.getMemberChannelDiscordId()).toBe(room.channelDiscordId);
    expect(f.gateway.getChannelMemberCount(room.channelDiscordId)).toBe(1);
  });

  it('distinguishes a failed move from a successful REST move with unconfirmed voice state', async () => {
    const f = fixture();
    f.guild.voiceStates.fetch.mockRejectedValueOnce(new Error('connection failed'));
    await expect(f.gateway.moveMember(room.channelDiscordId, creator.creatorChannelDiscordId)).rejects.toBeInstanceOf(CallMoveUnconfirmedError);
    expect(f.member.voice.setChannel).toHaveBeenCalledTimes(1);
  });

  it('sends and edits panel payloads in the voice channel chat', async () => {
    const f = fixture();
    await expect(f.gateway.sendControlPanel(room.channelDiscordId, panel)).resolves.toBe(room.controlMessageDiscordId);
    await f.gateway.updateControlPanel(room.channelDiscordId, room.controlMessageDiscordId!, panel);
    expect(f.channel.send).toHaveBeenCalledExactlyOnceWith(panel);
    expect(f.channel.messages.fetch).not.toHaveBeenCalled();
    expect(f.channel.messages.edit).toHaveBeenCalledExactlyOnceWith(room.controlMessageDiscordId!, panel);
  });

  it.each(['moveMember', 'sendControlPanel', 'updateControlPanel', 'deleteChannel'] as const)('rejects cross-guild target channels for %s', async (method) => {
    const f = fixture();
    f.channel.guildId = '82345678901234567';
    const operation = method === 'sendControlPanel' ? f.gateway.sendControlPanel(room.channelDiscordId, panel)
      : method === 'updateControlPanel' ? f.gateway.updateControlPanel(room.channelDiscordId, room.controlMessageDiscordId!, panel)
      : f.gateway[method](room.channelDiscordId);
    await expect(operation).rejects.toThrow();
    expect(f.member.voice.setChannel).not.toHaveBeenCalled();
    expect(f.channel.send).not.toHaveBeenCalled();
    expect(f.channel.delete).not.toHaveBeenCalled();
  });

  it('tolerates unknown-channel at fetch or delete but surfaces permission failures', async () => {
    const f = fixture();
    f.guild.channels.fetch.mockRejectedValueOnce({ code: 10003 });
    await expect(f.gateway.deleteChannel(room.channelDiscordId)).resolves.toBeUndefined();
    f.channel.delete.mockRejectedValueOnce({ code: 10003 });
    await expect(f.gateway.deleteChannel(room.channelDiscordId)).resolves.toBeUndefined();
    f.channel.delete.mockRejectedValueOnce({ code: 50013 });
    await expect(f.gateway.deleteChannel(room.channelDiscordId)).rejects.toEqual({ code: 50013 });
  });

  it('does not delete a room that becomes occupied while the channel fetch awaits', async () => {
    const f = fixture();
    const started = deferred(); const gate = deferred<typeof f.channel>();
    f.guild.channels.fetch.mockImplementationOnce(async () => { started.resolve(); return gate.promise; });
    const deleting = f.gateway.deleteChannel(room.channelDiscordId);
    await started.promise;
    f.states.set(entry.memberDiscordId, { channelId: room.channelDiscordId });
    gate.resolve(f.channel);
    await expect(deleting).rejects.toThrow();
    expect(f.channel.delete).not.toHaveBeenCalled();
  });
});
