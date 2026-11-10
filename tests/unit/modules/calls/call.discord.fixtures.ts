import { ChannelType, Collection, PermissionFlagsBits, PermissionsBitField, type Guild, type GuildMember, type GuildChannelCreateOptions } from 'discord.js';
import { vi } from 'vitest';

import { DiscordCallGateway } from '../../../../src/modules/calls/call.discord.js';
import { creator, entry, room } from './call.fixtures.js';

const rights = new PermissionsBitField(Object.values(PermissionFlagsBits));
export function discordFixture() {
  const message = { id: room.controlMessageDiscordId!, edit: vi.fn(async () => {}), delete: vi.fn(async () => {}) };
  const channel = {
    id: room.channelDiscordId, guildId: creator.guildDiscordId, type: ChannelType.GuildVoice, parentId: creator.categoryDiscordId, name: 'Game', userLimit: 0,
    isThread: () => false,
    permissionsFor: vi.fn(() => rights), delete: vi.fn(async () => {}),
    send: vi.fn(async () => message), messages: { fetch: vi.fn(async () => message) },
    setName: vi.fn(async (_name: string) => {}), setUserLimit: vi.fn(async (_limit: number) => {}),
    permissionOverwrites: { cache: new Collection<string, { id: string; type: number; allow: PermissionsBitField; deny: PermissionsBitField }>(), set: vi.fn(async (_overwrites: unknown) => {}) },
  };
  const category = { ...channel, id: creator.categoryDiscordId, type: ChannelType.GuildCategory, permissionsFor: vi.fn(() => rights) };
  const entryChannel = { ...channel, id: creator.creatorChannelDiscordId, name: 'Entry', userLimit: 0,
    setUserLimit: vi.fn(async (_limit: number) => {}) };
  entryChannel.setUserLimit.mockImplementation(async (limit) => { entryChannel.userLimit = limit; });
  channel.setName.mockImplementation(async (name) => { channel.name = name; });
  channel.setUserLimit.mockImplementation(async (limit) => { channel.userLimit = limit; });
  const states = new Collection<string, { channelId: string | null }>([[entry.memberDiscordId, { channelId: creator.creatorChannelDiscordId }]]);
  let serverChannel: string | null = creator.creatorChannelDiscordId;
  const bot = { id: '92345678901234567', guild: { id: creator.guildDiscordId }, permissions: rights, user: { bot: true } };
  const member = {
    id: entry.memberDiscordId, guild: { id: creator.guildDiscordId }, user: { bot: false }, permissions: new PermissionsBitField(),
    voice: {
      get channelId() { return states.get(entry.memberDiscordId)?.channelId ?? null; },
      setChannel: vi.fn(async (id: string) => { serverChannel = id; states.set(entry.memberDiscordId, { channelId: id }); }),
    },
  };
  const guild = {
    id: creator.guildDiscordId, roles: { everyone: { id: creator.guildDiscordId }, fetch: vi.fn(async (_id: string, _options?: unknown) => ({ permissions: new PermissionsBitField() })) },
    voiceStates: {
      cache: states,
      fetch: vi.fn(async (id: string) => { const state = { channelId: serverChannel }; states.set(id, state); return state; }),
    }, members: { fetchMe: vi.fn(async () => bot), fetch: vi.fn(async (options: unknown) => {
      const id = (options as { user: string }).user;
      return id === member.id ? member : { ...member, id };
    }) },
    channels: {
      fetch: vi.fn(async (id: string) => id === creator.categoryDiscordId ? category : id === entryChannel.id ? entryChannel : channel),
      create: vi.fn(async (input: GuildChannelCreateOptions) => {
        channel.name = input.name;
        channel.userLimit = input.userLimit!;
        return channel;
      }),
    },
  };
  const gateway = new DiscordCallGateway(guild as unknown as Guild, member as unknown as GuildMember);
  return { guild, member, bot, channel, entryChannel, category, message, states, gateway, setServerChannel: (id: string) => { serverChannel = id; } };
}
