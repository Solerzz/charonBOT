import {
  ChannelType,
  PermissionFlagsBits,
  type Guild,
  type GuildBasedChannel,
  type GuildMember,
} from 'discord.js';

import { discordIdSchema, setupChannelNameSchema } from './setup.schemas.js';
import type { SetupChannelGateway } from './setup.service.js';

export interface SetupVoiceChannel {
  id: string;
  name: string;
  categoryDiscordId: string | null;
}

export interface SetupCategory {
  id: string;
  name: string;
}

export interface SetupDiscordGateway extends SetupChannelGateway {
  getVoiceChannel(channelDiscordId: string): Promise<SetupVoiceChannel | null>;
  getCategory(categoryDiscordId: string): Promise<SetupCategory | null>;
  assertCanConfigure(channelDiscordId: string): Promise<void>;
  createVoiceCreator(input: { categoryDiscordId: string; name: string }): Promise<SetupVoiceChannel>;
  deleteCreatedVoiceCreatorIfEmpty(channelDiscordId: string): Promise<boolean>;
}

export class SetupDiscordError extends Error {
  constructor(message = 'Canal de voz ou categoria indisponível neste servidor.') {
    super(message);
    this.name = 'SetupDiscordError';
  }
}

export class SetupChannelCreationError extends Error {
  constructor(
    readonly certainty: 'rejected' | 'unknown' | 'created',
    readonly channelDiscordId?: string,
  ) {
    super('Não foi possível confirmar a criação do canal de entrada.');
    this.name = 'SetupChannelCreationError';
  }
}

const botPermissionsMessage =
  'O Charon precisa de Gerenciar Canais, Mover Membros, Conectar e Enviar Mensagens no contexto da configuração.';
const voicePermissions = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.MoveMembers,
  PermissionFlagsBits.Connect,
  PermissionFlagsBits.SendMessages,
];

function discordErrorCode(error: unknown): unknown {
  return typeof error === 'object' && error !== null && 'code' in error
    ? error.code
    : undefined;
}

export class DiscordSetupGateway implements SetupDiscordGateway {
  private readonly createdChannelIds = new Set<string>();

  constructor(private readonly guild: Guild) {}

  public async createVoiceCreator(input: {
    categoryDiscordId: string;
    name: string;
  }): Promise<SetupVoiceChannel> {
    let options;
    try {
      const name = setupChannelNameSchema.parse(input.name);
      const category = await this.fetchChannel(input.categoryDiscordId);
      if (category?.type !== ChannelType.GuildCategory || category.id !== input.categoryDiscordId) {
        throw new SetupDiscordError();
      }
      this.assertChannelPermissions(category, await this.guild.members.fetchMe({ force: true }), voicePermissions);
      options = {
        name, type: ChannelType.GuildVoice as const, parent: category.id, userLimit: 0,
        // Entry channels inherit restrictions, unlike the public temporary rooms.
        permissionOverwrites: category.permissionOverwrites.cache.map((overwrite) => ({
          id: overwrite.id, type: overwrite.type,
          allow: overwrite.allow.bitfield, deny: overwrite.deny.bitfield,
        })),
      };
    } catch {
      // No POST has started, so even an uncertain preflight read cannot create.
      throw new SetupChannelCreationError('rejected');
    }

    let channel;
    try {
      channel = await this.guild.channels.create(options);
    } catch (error: unknown) {
      const status = typeof error === 'object' && error !== null && 'status' in error ? error.status : undefined;
      const rejected = typeof status === 'number' && status >= 400 && status < 500 && status !== 408;
      throw new SetupChannelCreationError(rejected ? 'rejected' : 'unknown');
    }
    if (!discordIdSchema.safeParse(channel.id).success) {
      throw new SetupChannelCreationError('unknown');
    }

    // Retain only IDs returned by our own POST; never compensate by name.
    if (channel.guildId === this.guild.id && channel.type === ChannelType.GuildVoice) {
      this.createdChannelIds.add(channel.id);
    }
    try {
      const fresh = await this.fetchChannel(channel.id);
      if (
        channel.guildId !== this.guild.id || channel.type !== ChannelType.GuildVoice ||
        fresh?.id !== channel.id || fresh.type !== ChannelType.GuildVoice ||
        fresh.parentId !== input.categoryDiscordId || fresh.userLimit !== 0
      ) {
        throw new SetupDiscordError();
      }
      this.assertChannelPermissions(fresh, await this.guild.members.fetchMe({ force: true }), voicePermissions);
      return { id: fresh.id, name: fresh.name, categoryDiscordId: fresh.parentId };
    } catch {
      // The service must verify persistence before deciding whether to compensate.
      throw new SetupChannelCreationError('created', channel.id);
    }
  }

  public async deleteCreatedVoiceCreatorIfEmpty(channelDiscordId: string): Promise<boolean> {
    if (!this.createdChannelIds.has(channelDiscordId)) return false;
    try {
      const channel = await this.guild.channels.fetch(channelDiscordId, { force: true });
      if (channel !== null) {
        if (channel.id !== channelDiscordId || channel.guildId !== this.guild.id || channel.type !== ChannelType.GuildVoice) return false;
        // Recheck the live voice cache after the awaited fetch, next to DELETE.
        if (this.guild.voiceStates.cache.some((state) => state.channelId === channelDiscordId)) return false;
        await channel.delete();
      }
      this.createdChannelIds.delete(channelDiscordId);
      return true;
    } catch (error: unknown) {
      if (discordErrorCode(error) === 10003) {
        this.createdChannelIds.delete(channelDiscordId);
        return true;
      }
      return false;
    }
  }

  public async assertCanConfigure(channelDiscordId: string): Promise<void> {
    const channel = await this.fetchChannel(channelDiscordId);
    if (channel === null) {
      throw new SetupDiscordError();
    }
    const member = await this.guild.members.fetchMe({ force: true });
    if (
      !member.permissions.has([
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.MoveMembers,
        PermissionFlagsBits.Connect,
      ])
    ) {
      throw new SetupDiscordError(botPermissionsMessage);
    }
    this.assertChannelPermissions(channel, member, [
      PermissionFlagsBits.ViewChannel,
      channel.isThread()
        ? PermissionFlagsBits.SendMessagesInThreads
        : PermissionFlagsBits.SendMessages,
    ]);
  }

  public async getVoiceChannel(
    channelDiscordId: string,
  ): Promise<SetupVoiceChannel | null> {
    const channel = await this.fetchVoiceChannel(channelDiscordId);
    return channel === null
      ? null
      : {
          id: channel.id,
          name: channel.name,
          categoryDiscordId: channel.parentId,
        };
  }

  public async getCategory(
    categoryDiscordId: string,
  ): Promise<SetupCategory | null> {
    const channel = await this.fetchChannel(categoryDiscordId);
    if (channel?.type !== ChannelType.GuildCategory) {
      return null;
    }
    this.assertChannelPermissions(
      channel,
      await this.guild.members.fetchMe({ force: true }),
      voicePermissions,
    );
    return { id: channel.id, name: channel.name };
  }

  public async renameVoiceChannel(
    channelDiscordId: string,
    name: string,
  ): Promise<void> {
    const parsedName = setupChannelNameSchema.safeParse(name);
    if (!parsedName.success) {
      throw new SetupDiscordError(
        'O nome do canal deve ter entre 1 e 100 caracteres.',
      );
    }
    const channel = await this.fetchVoiceChannel(channelDiscordId);
    if (channel === null) {
      throw new SetupDiscordError();
    }
    try {
      await channel.setName(parsedName.data);
    } catch (error: unknown) {
      const code = discordErrorCode(error);
      if (code === 10003) {
        throw new SetupDiscordError();
      }
      if (code === 50001 || code === 50013) {
        throw new SetupDiscordError(botPermissionsMessage);
      }
      throw error;
    }
  }

  private async fetchVoiceChannel(channelDiscordId: string) {
    const channel = await this.fetchChannel(channelDiscordId);
    if (channel?.type !== ChannelType.GuildVoice) {
      return null;
    }
    this.assertChannelPermissions(
      channel,
      await this.guild.members.fetchMe({ force: true }),
      voicePermissions,
    );
    return channel;
  }

  private async fetchChannel(
    channelDiscordId: string,
  ): Promise<GuildBasedChannel | null> {
    if (!discordIdSchema.safeParse(channelDiscordId).success) {
      throw new SetupDiscordError();
    }
    try {
      const channel = await this.guild.channels.fetch(channelDiscordId, {
        force: true,
      });
      return channel?.guildId === this.guild.id ? channel : null;
    } catch (error: unknown) {
      const code = discordErrorCode(error);
      if (code === 10003) {
        return null;
      }
      if (code === 50001 || code === 50013) {
        throw new SetupDiscordError(botPermissionsMessage);
      }
      throw error;
    }
  }

  private assertChannelPermissions(
    channel: GuildBasedChannel,
    member: GuildMember,
    permissions: bigint[],
  ): void {
    if (!channel.permissionsFor(member)?.has(permissions)) {
      throw new SetupDiscordError(botPermissionsMessage);
    }
  }
}
