import {
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Interaction,
} from 'discord.js';

import type { InteractionHandler } from '../../core/discord/interactions/interaction-handler.js';

export class StatusCommand
  implements InteractionHandler<ChatInputCommandInteraction>
{
  public readonly data = new SlashCommandBuilder()
    .setName('status')
    .setDescription('Mostra o estado atual do Charon.');

  public canHandle(
    interaction: Interaction,
  ): interaction is ChatInputCommandInteraction {
    return interaction.isChatInputCommand() && interaction.commandName === 'status';
  }

  public async execute(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    await interaction.reply({
      content: 'Charon está online.',
      flags: MessageFlags.Ephemeral,
    });
  }
}
