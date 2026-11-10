import {
  ChannelType, OverwriteType, PermissionFlagsBits as P, PermissionsBitField,
  type Guild, type GuildMember, type OverwriteData, type VoiceChannel,
} from 'discord.js';

import { discordIdSchema } from '../setup/setup.schemas.js';
import type { CallPanelPayload } from './call-panel.view.js';
import { temporaryRoomNameSchema } from './call.schemas.js';
import { RoomActionError, type RoomAccessPolicy, type RoomDiscordGateway, type RoomMember, type RoomSnapshot } from './room.types.js';

export type { RoomDiscordGateway } from './room.types.js';

const accessBits = P.ViewChannel | P.Connect | P.SendMessages;
const botBits = accessBits | P.EmbedLinks | P.ManageChannels | P.ManageRoles | P.MoveMembers | P.ReadMessageHistory;
type Overwrite = { id: string; type: OverwriteType; allow: bigint; deny: bigint };
const hasCode = (error: unknown, code: number): boolean => typeof error === 'object' && error !== null && 'code' in error && error.code === code;

export class DiscordRoomGateway implements RoomDiscordGateway {
  constructor(private readonly guild: Guild) {}

  snapshot(channelId: string): Promise<RoomSnapshot | null> {
    return this.checked(async () => {
      const channel = await this.fetchChannel(channelId);
      if (!channel) return null;
      // Member REST reads can yield while gateway voice states change. Retry a
      // changed roster, and fail closed under sustained churn rather than
      // returning stale people or assuming an unresolvable person is human.
      for (let attempt = 0; attempt < 3; attempt++) {
        const ids = this.memberIds(channelId);
        const members = await Promise.all(ids.map((id) => this.resolveMember(id)));
        if (ids.join(',') !== this.memberIds(channelId).join(',')) continue;
        if (members.some((member) => member === null)) throw new RoomActionError('ROOM_UNAVAILABLE');
        return { guildDiscordId: this.guild.id, channelDiscordId: channel.id, name: channel.name, userLimit: channel.userLimit, members: members as RoomMember[] };
      }
      throw new RoomActionError('ROOM_UNAVAILABLE');
    });
  }

  resolveMember(memberId: string): Promise<RoomMember | null> {
    return this.checked(async () => {
      const member = await this.fetchMember(memberId);
      return member ? { memberDiscordId: member.id, isBot: member.user.bot } : null;
    });
  }

  rename(channelId: string, name: string): Promise<void> {
    return this.checked(async () => {
      const normalized = temporaryRoomNameSchema.parse(name);
      const { channel } = await this.authorized(channelId, [P.ManageChannels]);
      await channel.setName(normalized);
    });
  }

  restoreName(channelId: string, previousName: string): Promise<void> {
    return this.checked(async () => {
      const { channel } = await this.authorized(channelId, [P.ManageChannels]);
      // Captured native state: Discord validates its own channel-name contract.
      // Do not trim, truncate or impose the owner's 11-grapheme input limit.
      await channel.setName(previousName);
    });
  }

  setLimit(channelId: string, limit: number): Promise<void> {
    return this.checked(async () => {
      if (!Number.isInteger(limit) || limit < 0 || limit > 99) throw new RangeError('Invalid room limit');
      const { channel } = await this.authorized(channelId, [P.ManageChannels]);
      await channel.setUserLimit(limit);
    });
  }

  readAccess(channelId: string): Promise<OverwriteData[]> {
    return this.checked(async () => this.overwrites(await this.requireChannel(channelId)));
  }

  setRoomAccess(channelId: string, policy: RoomAccessPolicy, allowedIds: string[]): Promise<void> {
    return this.checked(async () => {
      if (typeof policy.isLocked !== 'boolean' || !['PUBLIC', 'PRIVATE'].includes(policy.visibility)) throw new RangeError('Invalid room access policy');
      const { channel, bot } = await this.authorized(channelId, [P.ViewChannel, P.ManageRoles]);
      const allowed = new Set(allowedIds.map((id) => discordIdSchema.parse(id)));
      if (allowed.has(this.guild.roles.everyone.id)) throw new RoomActionError('PERMISSIONS_UNAVAILABLE', 'INCOMPATIBLE_OVERWRITES');
      allowed.add(bot.id);
      const restricted = policy.visibility === 'PRIVATE' ? accessBits : policy.isLocked ? P.Connect : 0n;
      const previous = this.overwrites(channel);
      const projected = new Map(previous.map((overwrite) => [overwrite.id, overwrite]));
      for (const overwrite of previous) {
        if (overwrite.id === this.guild.id || (overwrite.type === OverwriteType.Member && allowed.has(overwrite.id))) continue;
        // A complete member access projection is compatible with our managed
        // allow set, including after restart. Revoke only its access bits when
        // the member leaves that set; retain any unrelated grants/denies.
        if (overwrite.type === OverwriteType.Member && (overwrite.allow & accessBits) === accessBits && !(overwrite.deny & accessBits)) {
          const revoked = { ...overwrite, allow: overwrite.allow & ~accessBits };
          if (revoked.allow || revoked.deny) projected.set(overwrite.id, revoked);
          else projected.delete(overwrite.id);
          continue;
        }
        // Role allows override @everyone denies. An unlisted member allow does
        // too. Never report privacy while leaving such an external grant open.
        if (!(overwrite.allow & restricted)) continue;
        const administrator = overwrite.type === OverwriteType.Role
          ? (await this.guild.roles.fetch(overwrite.id, { force: true }))?.permissions.has(P.Administrator)
          : (await this.fetchMember(overwrite.id))?.permissions.has(P.Administrator);
        if (!administrator) throw new RoomActionError('PERMISSIONS_UNAVAILABLE', 'INCOMPATIBLE_OVERWRITES');
      }
      this.project(projected, this.guild.roles.everyone.id, OverwriteType.Role, accessBits & ~restricted, restricted);
      for (const id of allowed) this.project(projected, id, OverwriteType.Member, id === bot.id ? botBits : accessBits, 0n);
      if (projected.size > 100) throw new RoomActionError('PERMISSIONS_UNAVAILABLE', 'OVERWRITE_CAPACITY');
      await channel.permissionOverwrites.set([...projected.values()]);
    });
  }

  restoreAccess(channelId: string, previous: OverwriteData[]): Promise<void> {
    return this.checked(async () => {
      const { channel, bot } = await this.authorized(channelId, [P.ViewChannel, P.ManageRoles]);
      const isBot = ({ id }: OverwriteData) => (typeof id === 'string' ? id : id.id) === bot.id;
      const oldBot = previous.find(isBot);
      // Rollback must not remove our operational access, even when the saved
      // state relied on broader role permissions rather than a bot overwrite.
      const restored: OverwriteData[] = [...previous.filter((overwrite) => !isBot(overwrite)), {
        id: bot.id, type: OverwriteType.Member,
        allow: new PermissionsBitField(oldBot?.allow).bitfield | botBits,
        deny: new PermissionsBitField(oldBot?.deny).bitfield & ~botBits,
      }];
      if (restored.length > 100) throw new RoomActionError('PERMISSIONS_UNAVAILABLE', 'OVERWRITE_CAPACITY');
      await channel.permissionOverwrites.set(restored);
    });
  }

  sendControlPanel(channelId: string, payload: CallPanelPayload): Promise<string> {
    return this.checked(async () => {
      const { channel } = await this.authorized(channelId, [P.ViewChannel, P.SendMessages, P.EmbedLinks]);
      return (await channel.send(payload)).id;
    });
  }

  updateControlPanel(channelId: string, messageId: string, payload: CallPanelPayload): Promise<void> {
    return this.checked(async () => {
      const { channel } = await this.authorized(channelId, [P.ViewChannel, P.SendMessages, P.EmbedLinks, P.ReadMessageHistory]);
      try {
        await (await channel.messages.fetch(discordIdSchema.parse(messageId))).edit(payload);
      } catch (error) {
        if (hasCode(error, 10008)) throw new RoomActionError('PANEL_MISSING');
        throw error;
      }
    });
  }

  deleteControlPanel(channelId: string, messageId: string): Promise<void> {
    return this.checked(async () => {
      try {
        const channel = await this.fetchChannel(channelId);
        if (!channel) return;
        await this.assertPermissions(channel, [P.ViewChannel, P.ReadMessageHistory]);
        await (await channel.messages.fetch(discordIdSchema.parse(messageId))).delete();
      } catch (error) {
        if (!hasCode(error, 10008) && !hasCode(error, 10003)) throw error;
      }
    });
  }

  private project(overwrites: Map<string, Overwrite>, id: string, type: OverwriteType, allow: bigint, deny: bigint): void {
    const previous = overwrites.get(id) ?? { id, type, allow: 0n, deny: 0n };
    const mask = allow | deny;
    overwrites.set(id, { ...previous, allow: (previous.allow & ~mask) | allow, deny: (previous.deny & ~mask) | deny });
  }

  private overwrites(channel: VoiceChannel): Overwrite[] {
    return [...channel.permissionOverwrites.cache.values()].map(({ id, type, allow, deny }) => ({ id, type, allow: allow.bitfield, deny: deny.bitfield }));
  }

  private memberIds(channelId: string): string[] {
    return [...this.guild.voiceStates.cache.filter((state) => state.channelId === channelId).keys()].sort();
  }

  private async fetchMember(memberId: string): Promise<GuildMember | null> {
    discordIdSchema.parse(memberId);
    try {
      const member = await this.guild.members.fetch({ user: memberId, force: true });
      if (member.id !== memberId || member.guild.id !== this.guild.id || typeof member.user.bot !== 'boolean') throw new RoomActionError('UNKNOWN_MEMBER');
      return member;
    } catch (error) {
      if (hasCode(error, 10007)) return null;
      throw error;
    }
  }

  private async fetchChannel(channelId: string): Promise<VoiceChannel | null> {
    discordIdSchema.parse(channelId);
    try {
      const channel = await this.guild.channels.fetch(channelId, { force: true });
      if (channel === null) return null;
      if (channel.guildId !== this.guild.id || channel.id !== channelId || channel.type !== ChannelType.GuildVoice) throw new RoomActionError('ROOM_UNAVAILABLE');
      return channel;
    } catch (error) {
      if (hasCode(error, 10003)) return null;
      throw error;
    }
  }

  private async requireChannel(channelId: string): Promise<VoiceChannel> {
    const channel = await this.fetchChannel(channelId);
    if (!channel) throw new RoomActionError('ROOM_UNAVAILABLE');
    return channel;
  }

  private async assertPermissions(channel: VoiceChannel, permissions: bigint[]): Promise<GuildMember> {
    const bot = await this.guild.members.fetchMe({ force: true });
    if (bot.guild.id !== this.guild.id) throw new RoomActionError('PERMISSIONS_UNAVAILABLE');
    const actual = channel.permissionsFor(bot);
    const named = [[P.ManageRoles, 'MANAGE_ROLES'], [P.ManageChannels, 'MANAGE_CHANNELS'], [P.ViewChannel, 'VIEW_CHANNEL'],
      [P.SendMessages, 'SEND_MESSAGES'], [P.EmbedLinks, 'EMBED_LINKS'], [P.ReadMessageHistory, 'READ_MESSAGE_HISTORY']] as const;
    for (const [permission, reason] of named) {
      if (permissions.includes(permission) && !actual?.has(permission)) throw new RoomActionError('PERMISSIONS_UNAVAILABLE', reason);
    }
    if (!actual?.has(permissions)) throw new RoomActionError('PERMISSIONS_UNAVAILABLE');
    return bot;
  }

  private async authorized(channelId: string, permissions: bigint[]): Promise<{ channel: VoiceChannel; bot: GuildMember }> {
    const channel = await this.requireChannel(channelId);
    return { channel, bot: await this.assertPermissions(channel, permissions) };
  }

  private async checked<T>(work: () => Promise<T>): Promise<T> {
    try { return await work(); } catch (error) {
      if (error instanceof RoomActionError) throw error;
      throw new RoomActionError('DISCORD_FAILURE');
    }
  }
}
