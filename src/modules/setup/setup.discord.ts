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
}

export class SetupDiscordError extends Error {
  constructor(message = 'Canal de voz ou categoria indisponível neste servidor.') {
    super(message);
    this.name = 'SetupDiscordError';
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
  constructor(private readonly guild: Guild) {}

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
