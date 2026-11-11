import { OverwriteType, PermissionFlagsBits as P, PermissionsBitField, type OverwriteData } from 'discord.js';
import { describe, expect, it } from 'vitest';

import { DiscordRoomGateway } from '../../../../src/modules/calls/room.discord.js';
import { moderationDeniedBefore, moderationDenyBits } from '../../../../src/modules/calls/room-moderation.permissions.js';
import { discordFixture } from './call.discord.fixtures.js';
import { room } from './call.fixtures.js';
import type { Guild } from 'discord.js';

const mask = P.Connect | P.SendMessages | P.SendTTSMessages | P.SendVoiceMessages | P.SendPolls;
const access = P.ViewChannel | P.Connect | P.SendMessages;
const block = (memberDiscordId: string, state: 'BLOCKED' | 'UNBLOCK_PENDING' = 'BLOCKED', deniedBefore = 0n) => ({ id: 'block', roomId: room.id, memberDiscordId, state, deniedBefore, createdAt: new Date(0) });
const bits = (value: OverwriteData['allow']) => new PermissionsBitField(value).bitfield;

describe('room moderation projection', () => {
  it('captures only preexisting managed denies from readAccess, not visibility or unrelated bits', async () => {
    const f = discordFixture(); const gateway = new DiscordRoomGateway(f.guild as unknown as Guild);
    f.channel.permissionOverwrites.cache.set(f.member.id, { id: f.member.id, type: OverwriteType.Member, allow: new PermissionsBitField(), deny: new PermissionsBitField(P.SendPolls | P.ViewChannel | P.Stream) });
    const captured = await gateway.readAccess(room.channelDiscordId);
    expect(moderationDeniedBefore(captured, f.member.id)).toBe(P.SendPolls);
    expect(moderationDeniedBefore(captured, '72345678901234567')).toBe(0n);
  });
  it.each([false, true].flatMap(isLocked => ['PUBLIC', 'PRIVATE'].flatMap(visibility => [false, true].map(present => ({ isLocked, visibility: visibility as 'PUBLIC' | 'PRIVATE', present })))))('blocks voice/chat without resurrecting presence/authorization: $visibility locked=$isLocked present=$present', async ({ isLocked, visibility, present }) => {
    const f = discordFixture(); f.states.clear();
    if (present) f.states.set(f.member.id, { channelId: room.channelDiscordId });
    f.channel.permissionOverwrites.cache.set(f.member.id, { id: f.member.id, type: OverwriteType.Member, allow: new PermissionsBitField(access | mask | P.Speak), deny: new PermissionsBitField(P.Stream) });
    const gateway = new DiscordRoomGateway(f.guild as unknown as Guild);
    await gateway.setRoomAccess(room.channelDiscordId, { isLocked, visibility }, [f.member.id], [block(f.member.id)]);
    const sent = f.channel.permissionOverwrites.set.mock.lastCall![0] as OverwriteData[];
    const target = sent.find(p => p.id === f.member.id)!;
    expect(bits(target.deny) & mask).toBe(mask);
    expect(bits(target.allow) & mask).toBe(0n);
    expect(bits(target.allow) & P.ViewChannel).toBe(visibility === 'PUBLIC' ? P.ViewChannel : 0n);
    expect(bits(target.deny) & P.ViewChannel).toBe(visibility === 'PRIVATE' ? P.ViewChannel : 0n);
    expect(bits(target.allow) & P.Speak).toBe(P.Speak); expect(bits(target.deny) & P.Stream).toBe(P.Stream);
    expect(bits(sent.find(p => p.id === f.bot.id)!.allow) & access).toBe(access);
    expect(moderationDenyBits).toBe(mask);
  });

  it.each(['PUBLIC', 'PRIVATE'] as const)('unblock cleans only managed bits, restores previous denies, not old authorization: %s', async visibility => {
    const f = discordFixture(); const gateway = new DiscordRoomGateway(f.guild as unknown as Guild);
    f.channel.permissionOverwrites.cache.set(f.member.id, { id: f.member.id, type: OverwriteType.Member, allow: new PermissionsBitField(P.ViewChannel | P.Speak), deny: new PermissionsBitField(mask | P.Stream) });
    await gateway.setRoomAccess(room.channelDiscordId, { isLocked: true, visibility }, [], [block(f.member.id, 'UNBLOCK_PENDING', P.SendPolls)]);
    const target = (f.channel.permissionOverwrites.set.mock.lastCall![0] as OverwriteData[]).find(p => p.id === f.member.id)!;
    expect(bits(target.deny) & mask).toBe(P.SendPolls);
    expect(bits(target.allow) & access).toBe(0n);
    expect(bits(target.allow) & P.Speak).toBe(P.Speak); expect(bits(target.deny) & P.Stream).toBe(P.Stream);
  });

  it('counts blocked overwrite capacity before any edit', async () => {
    const f = discordFixture(); const gateway = new DiscordRoomGateway(f.guild as unknown as Guild);
    const blocks = Array.from({ length: 99 }, (_, i) => block(String(70000000000000000n + BigInt(i))));
    await gateway.setRoomAccess(room.channelDiscordId, { isLocked: false, visibility: 'PUBLIC' }, [], blocks.slice(0, 98));
    expect(f.channel.permissionOverwrites.set).toHaveBeenCalledOnce();
    await expect(gateway.setRoomAccess(room.channelDiscordId, { isLocked: false, visibility: 'PUBLIC' }, [], blocks)).rejects.toMatchObject({ code: 'PERMISSIONS_UNAVAILABLE' });
    expect(f.channel.permissionOverwrites.set).toHaveBeenCalledOnce();
  });
  it('member block denies outrank role voice/chat grants; incompatible room-wide privacy fails before writes', async () => {
    const f = discordFixture(); const gateway = new DiscordRoomGateway(f.guild as unknown as Guild);
    const id = '72345678901234567';
    f.channel.permissionOverwrites.cache.set(id, { id, type: OverwriteType.Role, allow: new PermissionsBitField(mask | P.ViewChannel), deny: new PermissionsBitField() });
    await gateway.setRoomAccess(room.channelDiscordId, { isLocked: false, visibility: 'PUBLIC' }, [], [block(f.member.id)]);
    const sent = f.channel.permissionOverwrites.set.mock.lastCall![0] as OverwriteData[];
    expect(bits(sent.find(p => p.id === id)!.allow) & mask).toBe(mask);
    expect(bits(sent.find(p => p.id === f.member.id)!.deny) & mask).toBe(mask);
    await expect(gateway.setRoomAccess(room.channelDiscordId, { isLocked: true, visibility: 'PRIVATE' }, [], [block(f.member.id)])).rejects.toMatchObject({ code: 'PERMISSIONS_UNAVAILABLE' });
    expect(f.channel.permissionOverwrites.set).toHaveBeenCalledOnce();
  });
});
