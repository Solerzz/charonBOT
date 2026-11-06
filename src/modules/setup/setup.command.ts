import {
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Interaction,
} from 'discord.js';

import type { InteractionHandler } from '../../core/discord/interactions/interaction-handler.js';
import { DiscordSetupGateway, SetupDiscordError } from './setup.discord.js';
import type { SetupService } from './setup.service.js';
import { buildSetupDashboard } from './setup.views.js';

// Registration imports this definition without constructing services or database clients.
export const setupCommandData: SlashCommandBuilder = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Configura os Voice Creators do Charon.')
  .setContexts(InteractionContextType.Guild);

setupCommandData.addSubcommand((subcommand) =>
  subcommand
    .setName('init')
    .setDescription('Abre o painel privado de configuração.'),
);

export class SetupCommand
  implements InteractionHandler<ChatInputCommandInteraction>
{
  public readonly data = setupCommandData;

  constructor(private readonly service: SetupService) {}

  public canHandle(
    interaction: Interaction,
  ): interaction is ChatInputCommandInteraction {
    return (
      interaction.isChatInputCommand()
      && interaction.commandName === 'setup'
      && interaction.options.getSubcommand(false) === 'init'
    );
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inGuild() || interaction.guild === null) {
      await interaction.reply({
        content: 'Use este comando em um servidor.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const permissions = interaction.memberPermissions;
    if (
      !permissions?.has(PermissionFlagsBits.Administrator)
      && !permissions?.has([
        PermissionFlagsBits.ManageGuild,
        PermissionFlagsBits.ManageChannels,
      ])
    ) {
      await interaction.reply({
        content: 'Você precisa de Administrador ou Gerenciar Servidor e Gerenciar Canais.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      const gateway = new DiscordSetupGateway(interaction.guild);
      await gateway.assertCanConfigure(interaction.channelId);
      const configurations = await this.service.list(interaction.guildId);
      const selected = configurations[0];
      const voiceChannels = [];
      const unavailableChannelDiscordIds: string[] = [];
      if (selected !== undefined) {
        const channel = await gateway.getVoiceChannel(
          selected.creatorChannelDiscordId,
        );
        const category = await gateway.getCategory(selected.categoryDiscordId);
        if (channel === null) {
          unavailableChannelDiscordIds.push(selected.creatorChannelDiscordId);
        } else {
          voiceChannels.push(channel);
        }
        if (category === null) {
          unavailableChannelDiscordIds.push(selected.categoryDiscordId);
        }
      }
      await interaction.editReply(
        buildSetupDashboard({ configurations, voiceChannels, unavailableChannelDiscordIds }),
      );
    } catch (error: unknown) {
      if (!(error instanceof SetupDiscordError)) {
        throw error;
      }
      await interaction.editReply({ content: error.message });
    }
  }
}
