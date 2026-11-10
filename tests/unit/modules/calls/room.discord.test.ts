import { ChannelType, OverwriteType, PermissionFlagsBits as P, PermissionsBitField, type Guild, type OverwriteData } from 'discord.js';
import { describe, expect, it } from 'vitest';

import { DiscordRoomGateway } from '../../../../src/modules/calls/room.discord.js';
import { creator, deferred, room } from './call.fixtures.js';
import { discordFixture } from './call.discord.fixtures.js';

const panel = { embeds: [], components: [], allowedMentions: { parse: [] as never[] } };
const access = P.ViewChannel | P.Connect | P.SendMessages;
function fixture() {
  const f = discordFixture();
  f.states.clear(); f.states.set(f.member.id, { channelId: room.channelDiscordId });
  const gateway = new DiscordRoomGateway(f.guild as unknown as Guild);
  const put = (id: string, type: OverwriteType, allow = 0n, deny = 0n) => f.channel.permissionOverwrites.cache.set(id, { id, type, allow: new PermissionsBitField(allow), deny: new PermissionsBitField(deny) });
  return { ...f, gateway, put };
}
function bits(value: OverwriteData['allow']) { return new PermissionsBitField(value).bitfield; }

describe('DiscordRoomGateway', () => {
  it('edits a panel by ID without fetching the message, retaining forced authority reads', async () => {
    const f = fixture();
    await f.gateway.updateControlPanel(room.channelDiscordId, room.controlMessageDiscordId!, panel);
    expect(f.channel.messages.fetch).not.toHaveBeenCalled();
    expect(f.channel.messages.edit).toHaveBeenCalledExactlyOnceWith(room.controlMessageDiscordId!, panel);
    expect(f.guild.channels.fetch).toHaveBeenCalledExactlyOnceWith(room.channelDiscordId, { force: true });
    expect(f.guild.members.fetchMe).toHaveBeenCalledExactlyOnceWith({ force: true });
  });
  it('accepts exactly 100 projected overwrites without dropping an authorized member', async () => {
    const f = fixture(); const allowed = Array.from({ length: 98 }, (_, i) => String(70000000000000000n + BigInt(i)));
    await f.gateway.setRoomAccess(room.channelDiscordId, { visibility: 'PUBLIC', isLocked: true }, allowed);
    const sent = f.channel.permissionOverwrites.set.mock.lastCall![0] as OverwriteData[];
    expect(sent).toHaveLength(100);
    for (const id of allowed) expect(bits(sent.find((p) => p.id === id)!.allow) & access).toBe(access);
  });
  it.each([P.ViewChannel, P.SendMessages])('allows external %s grants in visible locked rooms but rejects Connect grants', async (grant) => {
    const f = fixture(); f.put('72345678901234567', OverwriteType.Role, grant);
    await f.gateway.setRoomAccess(room.channelDiscordId, { isLocked: true, visibility: 'PUBLIC' }, [f.member.id]);
    const sent = f.channel.permissionOverwrites.set.mock.lastCall![0] as OverwriteData[];
    expect(bits(sent.find(({ id }) => id === creator.guildDiscordId)!.allow)).toBe(P.ViewChannel | P.SendMessages);
    expect(bits(sent.find(({ id }) => id === creator.guildDiscordId)!.deny)).toBe(P.Connect);
    f.put('72345678901234567', OverwriteType.Role, P.Connect);
    await expect(f.gateway.setRoomAccess(room.channelDiscordId, { isLocked: true, visibility: 'PUBLIC' }, [])).rejects.toMatchObject({ code: 'PERMISSIONS_UNAVAILABLE' });
    expect(f.channel.permissionOverwrites.set).toHaveBeenCalledTimes(1);
  });
  it('exposes only genuine unknown-message edits as replaceable, not forbidden or missing channels', async () => {
    const f = fixture();
    f.channel.messages.edit.mockRejectedValueOnce({ code: 10008 });
    await expect(f.gateway.updateControlPanel(room.channelDiscordId, room.controlMessageDiscordId!, panel)).rejects.toMatchObject({ code: 'PANEL_MISSING' });
    f.channel.messages.edit.mockRejectedValueOnce({ code: 50013 });
    await expect(f.gateway.updateControlPanel(room.channelDiscordId, room.controlMessageDiscordId!, panel)).rejects.toMatchObject({ code: 'DISCORD_FAILURE' });
    f.guild.channels.fetch.mockRejectedValueOnce({ code: 10003 });
    await expect(f.gateway.updateControlPanel(room.channelDiscordId, room.controlMessageDiscordId!, panel)).rejects.toMatchObject({ code: 'ROOM_UNAVAILABLE' });
  });
  it('reads forced native channels and resolves real participant bot flags without bulk fetching', async () => {
    const f = fixture();
    expect(await f.gateway.snapshot(room.channelDiscordId)).toEqual({ guildDiscordId: creator.guildDiscordId, channelDiscordId: room.channelDiscordId, name: 'Game', userLimit: 0, members: [{ memberDiscordId: f.member.id, isBot: false }] });
    expect(f.guild.channels.fetch).toHaveBeenCalledWith(room.channelDiscordId, { force: true });
    expect(f.guild.members.fetch).toHaveBeenCalledExactlyOnceWith({ user: f.member.id, force: true });
    f.member.user.bot = true;
    expect(await f.gateway.resolveMember(f.member.id)).toEqual({ memberDiscordId: f.member.id, isBot: true });
  });
  it('returns a roster current after awaited member reads, not the roster before I/O', async () => {
    const f = fixture(); const started = deferred(); const gate = deferred<typeof f.member>();
    f.guild.members.fetch.mockImplementationOnce(async () => { started.resolve(); return gate.promise; });
    const snapshot = f.gateway.snapshot(room.channelDiscordId); await started.promise;
    f.states.clear(); gate.resolve(f.member);
    await expect(snapshot).resolves.toMatchObject({ members: [] });
  });
  it('distinguishes missing channels from forbidden/uncertain state and rejects wrong type/guild', async () => {
    const f = fixture(); f.guild.channels.fetch.mockRejectedValueOnce({ code: 10003 });
    expect(await f.gateway.snapshot(room.channelDiscordId)).toBeNull();
    f.guild.channels.fetch.mockResolvedValueOnce(null as never); expect(await f.gateway.snapshot(room.channelDiscordId)).toBeNull();
    f.guild.channels.fetch.mockRejectedValueOnce({ code: 50013 });
    await expect(f.gateway.snapshot(room.channelDiscordId)).rejects.toMatchObject({ code: 'DISCORD_FAILURE' });
    f.channel.type = ChannelType.GuildStageVoice;
    await expect(f.gateway.rename(room.channelDiscordId, 'New')).rejects.toMatchObject({ code: 'ROOM_UNAVAILABLE' });
    f.channel.type = ChannelType.GuildVoice; f.channel.guildId = '82345678901234567';
    await expect(f.gateway.snapshot(room.channelDiscordId)).rejects.toMatchObject({ code: 'ROOM_UNAVAILABLE' });
  });
  it('fails safely for unknown/unconfirmed participants and foreign member responses', async () => {
    const f = fixture(); f.guild.members.fetch.mockRejectedValueOnce({ code: 10007 });
    expect(await f.gateway.resolveMember(f.member.id)).toBeNull();
    f.guild.members.fetch.mockRejectedValueOnce({ code: 50013 });
    await expect(f.gateway.resolveMember(f.member.id)).rejects.toMatchObject({ code: 'DISCORD_FAILURE' });
    f.guild.members.fetch.mockRejectedValueOnce({ code: 10007 });
    await expect(f.gateway.snapshot(room.channelDiscordId)).rejects.toMatchObject({ code: 'ROOM_UNAVAILABLE' });
    f.member.guild.id = '82345678901234567';
    await expect(f.gateway.resolveMember(f.member.id)).rejects.toMatchObject({ code: 'UNKNOWN_MEMBER' });
  });
  it('renames/limits only with Manage Channels and never disconnects participants', async () => {
    const f = fixture(); await f.gateway.rename(room.channelDiscordId, 'New'); await f.gateway.setLimit(room.channelDiscordId, 1);
    expect(f.channel.setName).toHaveBeenCalledExactlyOnceWith('New'); expect(f.channel.setUserLimit).toHaveBeenCalledExactlyOnceWith(1);
    expect(f.member.voice.setChannel).not.toHaveBeenCalled();
    f.channel.permissionsFor.mockReturnValue(new PermissionsBitField([P.ViewChannel]));
    await expect(f.gateway.rename(room.channelDiscordId, 'No')).rejects.toMatchObject({ code: 'PERMISSIONS_UNAVAILABLE' });
    await expect(f.gateway.setLimit(room.channelDiscordId, 0)).rejects.toMatchObject({ code: 'PERMISSIONS_UNAVAILABLE' });
  });
  it('normalizes valid names before Discord writes', async () => {
    const f = fixture();
    await f.gateway.rename(room.channelDiscordId, '  🎮Game  ');
    expect(f.channel.setName).toHaveBeenCalledExactlyOnceWith('🎮Game');
  });
  it.each(['x'.repeat(100), '  External  ', '👨‍👩‍👧‍👦'.repeat(12)])('restores captured native names exactly without user-name normalization: %j', async (previous) => {
    const f = fixture(); f.channel.setName.mockImplementation(async (name) => { f.channel.name = name; });
    await f.gateway.restoreName(room.channelDiscordId, previous);
    expect((await f.gateway.snapshot(room.channelDiscordId))?.name).toBe(previous);
    expect(f.channel.setName).toHaveBeenCalledExactlyOnceWith(previous);
  });
  it.each(['foreign guild', 'wrong channel', 'wrong type', 'missing channel', 'permissions', 'foreign bot'] as const)('guards native name restoration against %s', async (cause) => {
    const f = fixture();
    if (cause === 'foreign guild') f.channel.guildId = '82345678901234567';
    if (cause === 'wrong channel') f.channel.id = '82345678901234567';
    if (cause === 'wrong type') f.channel.type = ChannelType.GuildStageVoice;
    if (cause === 'missing channel') f.guild.channels.fetch.mockResolvedValueOnce(null as never);
    if (cause === 'permissions') f.channel.permissionsFor.mockReturnValue(new PermissionsBitField(P.ViewChannel));
    if (cause === 'foreign bot') f.bot.guild.id = '82345678901234567';
    await expect(f.gateway.restoreName(room.channelDiscordId, '  External previous name  ')).rejects.toMatchObject({
      code: cause === 'permissions' || cause === 'foreign bot' ? 'PERMISSIONS_UNAVAILABLE' : 'ROOM_UNAVAILABLE',
    });
    expect(f.channel.setName).not.toHaveBeenCalled();
  });
  it('reports a fixed error when native name restoration is rejected by Discord', async () => {
    const f = fixture(); f.channel.setName.mockRejectedValueOnce(new Error('private native validation response'));
    await expect(f.gateway.restoreName(room.channelDiscordId, 'External previous name')).rejects.toMatchObject({ code: 'DISCORD_FAILURE', message: 'DISCORD_FAILURE' });
  });
  it.each(['', '   ', 'abcdefghijkl'])('rejects invalid name %j before Discord writes', async (name) => {
    const f = fixture(); await expect(f.gateway.rename(room.channelDiscordId, name)).rejects.toThrow();
    expect(f.channel.setName).not.toHaveBeenCalled();
  });
  it.each([-1, 100, 1.5, Number.NaN])('rejects invalid limit %s before Discord writes', async (limit) => {
    const f = fixture(); await expect(f.gateway.setLimit(room.channelDiscordId, limit)).rejects.toThrow();
    expect(f.channel.setUserLimit).not.toHaveBeenCalled();
  });
  it('accepts unlimited and maximum finite limits', async () => {
    const f = fixture();
    await f.gateway.setLimit(room.channelDiscordId, 0); await f.gateway.setLimit(room.channelDiscordId, 99);
    expect(f.channel.setUserLimit.mock.calls).toEqual([[0], [99]]);
  });
  it('returns observable settings and roster after an awaited channel mutation', async () => {
    const f = fixture();
    f.channel.setName.mockImplementationOnce(async (name) => { f.channel.name = name; f.states.clear(); });
    f.channel.setUserLimit.mockImplementationOnce(async (limit) => { f.channel.userLimit = limit; });
    await f.gateway.rename(room.channelDiscordId, 'Renamed'); await f.gateway.setLimit(room.channelDiscordId, 2);
    await expect(f.gateway.snapshot(room.channelDiscordId)).resolves.toMatchObject({ name: 'Renamed', userLimit: 2, members: [] });
  });
  it('projects private access without touching unrelated bits and retains bot operational access', async () => {
    const f = fixture(); f.put(creator.guildDiscordId, OverwriteType.Role, access | P.Speak, P.Stream);
    f.put(f.member.id, OverwriteType.Member, P.Speak, access | P.Stream);
    await f.gateway.setRoomAccess(room.channelDiscordId, { visibility: 'PRIVATE', isLocked: false }, [f.member.id, f.member.id]);
    const sent = f.channel.permissionOverwrites.set.mock.calls[0]![0] as OverwriteData[];
    const everyone = sent.find(({ id }) => id === creator.guildDiscordId)!; const member = sent.find(({ id }) => id === f.member.id)!;
    const bot = sent.find(({ id }) => id === f.bot.id)!;
    expect(bits(everyone.allow)).toBe(P.Speak); expect(bits(everyone.deny)).toBe(access | P.Stream);
    expect(bits(member.allow)).toBe(access | P.Speak); expect(bits(member.deny)).toBe(P.Stream);
    expect(bits(bot.allow) & (access | P.ManageChannels | P.ManageRoles | P.MoveMembers | P.EmbedLinks | P.ReadMessageHistory)).toBe(access | P.ManageChannels | P.ManageRoles | P.MoveMembers | P.EmbedLinks | P.ReadMessageHistory);
  });
  it.each([OverwriteType.Role, OverwriteType.Member])('rejects incompatible external grants (%s) without making a partial permission edit', async (type) => {
    const f = fixture(); f.put('72345678901234567', type, P.Connect);
    await expect(f.gateway.setRoomAccess(room.channelDiscordId, { visibility: 'PRIVATE', isLocked: false }, [f.member.id])).rejects.toMatchObject({ code: 'PERMISSIONS_UNAVAILABLE' });
    expect(f.channel.permissionOverwrites.set).not.toHaveBeenCalled();
  });
  it('revokes a previous complete member projection on resync while preserving unrelated overwrite bits', async () => {
    const f = fixture();
    f.put('72345678901234567', OverwriteType.Member, access | P.Speak, P.Stream);
    f.put('82345678901234567', OverwriteType.Member, access);
    await f.gateway.setRoomAccess(room.channelDiscordId, { visibility: 'PRIVATE', isLocked: false }, [f.member.id]);
    const sent = f.channel.permissionOverwrites.set.mock.lastCall![0] as OverwriteData[];
    expect(sent.find(({ id }) => id === '72345678901234567')).toEqual({ id: '72345678901234567', type: OverwriteType.Member, allow: P.Speak, deny: P.Stream });
    expect(sent.find(({ id }) => id === '82345678901234567')).toBeUndefined();
    expect(bits(sent.find(({ id }) => id === f.member.id)!.allow) & access).toBe(access);
  });
  it('does not mistake a complete role grant for a revocable member projection', async () => {
    const f = fixture(); f.put('72345678901234567', OverwriteType.Role, access);
    await expect(f.gateway.setRoomAccess(room.channelDiscordId, { visibility: 'PRIVATE', isLocked: false }, [])).rejects.toMatchObject({ code: 'PERMISSIONS_UNAVAILABLE' });
    expect(f.channel.permissionOverwrites.set).not.toHaveBeenCalled();
  });
  it('acknowledges the Administrator bypass instead of requesting Administrator for the bot', async () => {
    const f = fixture(); f.put('72345678901234567', OverwriteType.Role, P.Connect);
    f.guild.roles.fetch.mockResolvedValueOnce({ permissions: new PermissionsBitField([P.Administrator]) });
    f.channel.permissionsFor.mockReturnValue(new PermissionsBitField([P.ViewChannel, P.ManageRoles]));
    await f.gateway.setRoomAccess(room.channelDiscordId, { visibility: 'PRIVATE', isLocked: false }, []);
    const sent = f.channel.permissionOverwrites.set.mock.calls[0]![0] as OverwriteData[];
    expect(bits(sent.find(({ id }) => id === f.bot.id)!.allow) & P.Administrator).toBe(0n);
    expect(bits(sent.find(({ id }) => id === '72345678901234567')!.allow)).toBe(P.Connect);
  });
  it('accepts the bot Administrator exception to Manage Roles through SDK permission semantics', async () => {
    const f = fixture(); f.channel.permissionsFor.mockReturnValue(new PermissionsBitField([P.Administrator]));
    await f.gateway.setRoomAccess(room.channelDiscordId, { visibility: 'PRIVATE', isLocked: false }, [f.member.id]);
    expect(f.channel.permissionOverwrites.set).toHaveBeenCalledOnce();
    expect(f.guild.members.fetchMe).toHaveBeenCalledWith({ force: true });
  });
  it('does not mutate panel messages without the required current channel permissions', async () => {
    const f = fixture(); f.channel.permissionsFor.mockReturnValue(new PermissionsBitField());
    await expect(f.gateway.sendControlPanel(room.channelDiscordId, panel)).rejects.toMatchObject({ code: 'PERMISSIONS_UNAVAILABLE' });
    await expect(f.gateway.updateControlPanel(room.channelDiscordId, room.controlMessageDiscordId!, panel)).rejects.toMatchObject({ code: 'PERMISSIONS_UNAVAILABLE' });
    await expect(f.gateway.deleteControlPanel(room.channelDiscordId, room.controlMessageDiscordId!)).rejects.toMatchObject({ code: 'PERMISSIONS_UNAVAILABLE' });
    expect(f.channel.send).not.toHaveBeenCalled(); expect(f.channel.messages.fetch).not.toHaveBeenCalled();
    expect(f.channel.messages.edit).not.toHaveBeenCalled();
  });
  it('requires Manage Roles (not merely Manage Channels) and rejects capacity instead of truncating allowed users', async () => {
    const f = fixture(); f.channel.permissionsFor.mockReturnValue(new PermissionsBitField([P.ManageChannels, P.ViewChannel]));
    await expect(f.gateway.setRoomAccess(room.channelDiscordId, { visibility: 'PRIVATE', isLocked: false }, [])).rejects.toMatchObject({ code: 'PERMISSIONS_UNAVAILABLE' });
    await expect(f.gateway.setRoomAccess(room.channelDiscordId, { visibility: 'PUBLIC', isLocked: false }, [])).rejects.toMatchObject({ code: 'PERMISSIONS_UNAVAILABLE' });
    await expect(f.gateway.restoreAccess(room.channelDiscordId, [])).rejects.toMatchObject({ code: 'PERMISSIONS_UNAVAILABLE' });
    const g = fixture();
    await expect(g.gateway.setRoomAccess(room.channelDiscordId, { visibility: 'PRIVATE', isLocked: false }, Array.from({ length: 99 }, (_, i) => String(70000000000000000n + BigInt(i))))).rejects.toMatchObject({ code: 'PERMISSIONS_UNAVAILABLE' });
    expect(g.channel.permissionOverwrites.set).not.toHaveBeenCalled();
  });
  it('cannot turn an everyone-role ID in the allowlist into a public privacy projection', async () => {
    const f = fixture();
    await expect(f.gateway.setRoomAccess(room.channelDiscordId, { visibility: 'PRIVATE', isLocked: false }, [creator.guildDiscordId])).rejects.toMatchObject({ code: 'PERMISSIONS_UNAVAILABLE' });
    expect(f.channel.permissionOverwrites.set).not.toHaveBeenCalled();
  });
  it('reads restorable detached overwrites and public projection preserves other bits and entries', async () => {
    const f = fixture(); f.put(creator.guildDiscordId, OverwriteType.Role, P.Speak, access | P.Stream);
    f.put(f.member.id, OverwriteType.Member, P.Speak, P.Stream);
    const previous = await f.gateway.readAccess(room.channelDiscordId);
    await f.gateway.setRoomAccess(room.channelDiscordId, { visibility: 'PUBLIC', isLocked: false }, []);
    const sent = f.channel.permissionOverwrites.set.mock.calls[0]![0] as OverwriteData[];
    expect(bits(sent.find(({ id }) => id === creator.guildDiscordId)!.allow)).toBe(access | P.Speak);
    expect(bits(sent.find(({ id }) => id === creator.guildDiscordId)!.deny)).toBe(P.Stream);
    expect(sent.find(({ id }) => id === f.member.id)).toEqual({ id: f.member.id, type: OverwriteType.Member, allow: P.Speak, deny: P.Stream });
    f.channel.permissionOverwrites.cache.get(creator.guildDiscordId)!.deny.remove(P.Stream);
    expect(bits(previous.find(({ id }) => id === creator.guildDiscordId)!.deny)).toBe(access | P.Stream);
    await f.gateway.restoreAccess(room.channelDiscordId, previous);
    const restored = f.channel.permissionOverwrites.set.mock.lastCall![0] as OverwriteData[];
    expect(restored).toEqual(expect.arrayContaining(previous));
    expect(bits(restored.find(({ id }) => id === f.bot.id)!.allow) & access).toBe(access);
  });
  it('sends/edits/deletes panels and treats only unknown message/channel deletion as idempotent', async () => {
    const f = fixture(); expect(await f.gateway.sendControlPanel(room.channelDiscordId, panel)).toBe(room.controlMessageDiscordId);
    await f.gateway.updateControlPanel(room.channelDiscordId, room.controlMessageDiscordId!, panel);
    await f.gateway.deleteControlPanel(room.channelDiscordId, room.controlMessageDiscordId!);
    expect(f.channel.messages.edit).toHaveBeenCalledExactlyOnceWith(room.controlMessageDiscordId!, panel); expect(f.message.delete).toHaveBeenCalledOnce();
    f.channel.messages.fetch.mockRejectedValueOnce({ code: 10008 });
    await expect(f.gateway.deleteControlPanel(room.channelDiscordId, room.controlMessageDiscordId!)).resolves.toBeUndefined();
    f.message.delete.mockRejectedValueOnce({ code: 10008 });
    await expect(f.gateway.deleteControlPanel(room.channelDiscordId, room.controlMessageDiscordId!)).resolves.toBeUndefined();
    f.guild.channels.fetch.mockRejectedValueOnce({ code: 10003 });
    await expect(f.gateway.deleteControlPanel(room.channelDiscordId, room.controlMessageDiscordId!)).resolves.toBeUndefined();
    f.message.delete.mockRejectedValueOnce({ code: 50013 });
    await expect(f.gateway.deleteControlPanel(room.channelDiscordId, room.controlMessageDiscordId!)).rejects.toMatchObject({ code: 'DISCORD_FAILURE' });
  });
});
