import {
  ChannelType,
  PermissionFlagsBits,
  type Guild,
  type GuildBasedChannel,
  type GuildMember,
  type VoiceChannel,
} from 'discord.js';

import { discordIdSchema } from '../setup/setup.schemas.js';
import type { CallPanelPayload } from './call-panel.view.js';
import { temporaryRoomNameSchema } from './call.schemas.js';
import { DiscordRoomGateway } from './room.discord.js';
import type { RoomDiscordGateway } from './room.types.js';

export interface CreateDiscordRoomInput {
  categoryDiscordId: string;
  name: string;
}
export interface CreatedDiscordRoom {
  channelDiscordId: string;
}
export interface CallDiscordGateway extends RoomDiscordGateway {
  createTemporaryChannel(input: CreateDiscordRoomInput): Promise<CreatedDiscordRoom>;
  moveMember(channelDiscordId: string, expectedChannelDiscordId?: string): Promise<void>;
  deleteChannel(channelDiscordId: string): Promise<void>;
  // Synchronous reads of the current gateway cache, not event-time snapshots.
  getMemberChannelDiscordId(): string | null;
  getChannelMemberCount(channelDiscordId: string): number;
}

export class CallDiscordError extends Error {
  constructor(readonly channelDiscordId?: string) {
    super('Canal de voz ou permissões indisponíveis neste servidor.');
    this.name = 'CallDiscordError';
  }
}

export class CallMoveUnconfirmedError extends Error {
  constructor() {
    super('Discord acknowledged the move but voice state could not be confirmed');
    this.name = 'CallMoveUnconfirmedError';
  }
}

function isUnknownChannel(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 10003;
}

const botRoomPermissions = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.Connect,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.MoveMembers,
  PermissionFlagsBits.ReadMessageHistory,
];

export class DiscordCallGateway implements CallDiscordGateway {
  private readonly rooms: DiscordRoomGateway;

  constructor(private readonly guild: Guild, private readonly member: GuildMember) {
    this.rooms = new DiscordRoomGateway(guild);
  }

  snapshot(channelId: string) { return this.rooms.snapshot(channelId); }
  resolveMember(memberId: string) { return this.rooms.resolveMember(memberId); }
  rename(channelId: string, name: string) { return this.rooms.rename(channelId, name); }
  setLimit(channelId: string, limit: number) { return this.rooms.setLimit(channelId, limit); }
  readAccess(channelId: string) { return this.rooms.readAccess(channelId); }
  setPrivateAccess(channelId: string, allowedIds: string[]) { return this.rooms.setPrivateAccess(channelId, allowedIds); }
  setPublicAccess(channelId: string) { return this.rooms.setPublicAccess(channelId); }
  restoreAccess(channelId: string, previous: Parameters<RoomDiscordGateway['restoreAccess']>[1]) { return this.rooms.restoreAccess(channelId, previous); }
  deleteControlPanel(channelId: string, messageId: string) { return this.rooms.deleteControlPanel(channelId, messageId); }

  getMemberChannelDiscordId(): string | null {
    this.assertMemberGuild();
    return this.guild.voiceStates.cache.get(this.member.id)?.channelId ?? null;
  }

  getChannelMemberCount(channelDiscordId: string): number {
    return this.guild.voiceStates.cache.filter((state) => state.channelId === channelDiscordId).size;
  }

  async createTemporaryChannel(input: CreateDiscordRoomInput): Promise<CreatedDiscordRoom> {
    const name = temporaryRoomNameSchema.parse(input.name);
    const category = await this.fetchChannel(input.categoryDiscordId);
    if (category?.type !== ChannelType.GuildCategory) throw new CallDiscordError();
    const bot = await this.guild.members.fetchMe({ force: true });
    this.assertPermissions(category, bot, [PermissionFlagsBits.ManageChannels]);
    const channel = await this.guild.channels.create({
      name, type: ChannelType.GuildVoice, parent: category.id, userLimit: 0,
      // Explicit overwrites prevent inheriting hidden/private category denies.
      // Role/member-specific category denies are intentionally not copied.
      permissionOverwrites: [
        { id: this.guild.roles.everyone.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.SendMessages] },
        { id: bot.id, allow: botRoomPermissions },
      ],
    });
    try {
      if (channel.guildId !== this.guild.id || channel.type !== ChannelType.GuildVoice) throw new CallDiscordError();
      this.assertPermissions(channel, bot, botRoomPermissions);
      return { channelDiscordId: channel.id };
    } catch (error: unknown) {
      // Do not leak a just-created unusable channel when postflight fails.
      try {
        await this.deleteChannel(channel.id);
      } catch {
        // Persistence has not started, so retain the cleanup handle for logging.
        throw new CallDiscordError(channel.id);
      }
      throw error;
    }
  }

  async moveMember(channelDiscordId: string, expectedChannelDiscordId?: string): Promise<void> {
    this.assertMemberGuild();
    const channel = await this.fetchVoiceChannel(channelDiscordId);
    const bot = await this.guild.members.fetchMe({ force: true });
    this.assertPermissions(channel, bot, [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.MoveMembers]);
    if (expectedChannelDiscordId !== undefined && this.getMemberChannelDiscordId() !== expectedChannelDiscordId) {
      throw new CallDiscordError();
    }
    await this.member.voice.setChannel(channelDiscordId);
    try {
      // VoiceState.setChannel only PATCHes the guild member; it does not update
      // the voice cache. Refresh independently of our serialized event handler.
      await this.guild.voiceStates.fetch(this.member.id, { force: true });
    } catch {
      throw new CallMoveUnconfirmedError();
    }
  }

  async sendControlPanel(channelDiscordId: string, payload: CallPanelPayload): Promise<string> {
    return this.rooms.sendControlPanel(channelDiscordId, payload);
  }

  async updateControlPanel(channelDiscordId: string, messageDiscordId: string, payload: CallPanelPayload): Promise<void> {
    return this.rooms.updateControlPanel(channelDiscordId, messageDiscordId, payload);
  }

  async deleteChannel(channelDiscordId: string): Promise<void> {
    try {
      const channel = await this.fetchChannel(channelDiscordId);
      if (channel === null) return;
      if (channel.type !== ChannelType.GuildVoice) throw new CallDiscordError();
      // fetchChannel awaited I/O, so the service's earlier empty check is no
      // longer sufficient. Throw (do not report success) if somebody joined.
      if (this.getChannelMemberCount(channelDiscordId) !== 0) throw new CallDiscordError();
      await channel.delete();
    } catch (error: unknown) {
      if (!isUnknownChannel(error)) throw error;
    }
  }

  private assertMemberGuild(): void {
    if (this.member.guild.id !== this.guild.id) throw new CallDiscordError();
  }

  private async fetchChannel(channelDiscordId: string): Promise<GuildBasedChannel | null> {
    discordIdSchema.parse(channelDiscordId);
    try {
      const channel = await this.guild.channels.fetch(channelDiscordId, { force: true });
      if (channel !== null && channel.guildId !== this.guild.id) throw new CallDiscordError();
      return channel;
    } catch (error: unknown) {
      if (isUnknownChannel(error)) return null;
      throw error;
    }
  }

  private async fetchVoiceChannel(channelDiscordId: string): Promise<VoiceChannel> {
    const channel = await this.fetchChannel(channelDiscordId);
    if (channel?.type !== ChannelType.GuildVoice) throw new CallDiscordError();
    return channel;
  }

  private assertPermissions(channel: GuildBasedChannel, bot: GuildMember, permissions: bigint[]): void {
    if (!channel.permissionsFor(bot)?.has(permissions)) throw new CallDiscordError();
  }
}
