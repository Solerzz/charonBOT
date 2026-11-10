import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
  type AnySelectMenuInteraction,
  type ButtonInteraction,
  type Guild,
  type Interaction,
  type ModalSubmitInteraction,
} from 'discord.js';

import type { InteractionHandler } from '../../core/discord/interactions/interaction-handler.js';
import { SetupDiscordError, type SetupDiscordGateway } from './setup.discord.js';
import {
  VoiceCreatorAlreadyConfiguredError,
  VoiceCreatorNotFoundError,
  type VoiceCreatorConfiguration,
} from './setup.repository.js';
import {
  discordIdSchema,
  encodeSetupCustomId,
  setupChannelNameSchema,
  setupCustomIdSchema,
  setupDefaultLimitInputSchema,
  voiceCreatorIdSchema,
  type SetupCustomId,
} from './setup.schemas.js';
import type { SetupService } from './setup.service.js';
import { buildSetupDashboard } from './setup.views.js';

export type SetupInteraction = ButtonInteraction | AnySelectMenuInteraction | ModalSubmitInteraction;
export type GuildBasedInteraction = SetupInteraction & { guild: Guild; guildId: string };
export type SetupDiscordGatewayFactory = (interaction: GuildBasedInteraction) => SetupDiscordGateway;

function isGuildBased(interaction: SetupInteraction): interaction is GuildBasedInteraction {
  return interaction.inGuild()
    && interaction.guild !== null
    && interaction.guild.id === interaction.guildId
    && discordIdSchema.safeParse(interaction.guildId).success;
}

const expiredMessage = 'Esta configuração expirou ou não pertence a este servidor. Abra /setup init novamente.';
const invalidMessage = 'Ação de configuração inválida. Abra /setup init novamente.';

export class SetupInteractions implements InteractionHandler<SetupInteraction> {
  constructor(
    private readonly service: SetupService,
    private readonly gatewayFactory: SetupDiscordGatewayFactory,
  ) {}

  public canHandle(interaction: Interaction): interaction is SetupInteraction {
    return (interaction.isButton() || interaction.isAnySelectMenu() || interaction.isModalSubmit())
      && interaction.customId.startsWith('setup:v1:');
  }

  public async execute(interaction: SetupInteraction): Promise<void> {
    if (!isGuildBased(interaction)) {
      await interaction.reply({ content: 'Use esta ação em um servidor.', flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
      return;
    }
    const permissions = interaction.memberPermissions;
    if (!permissions?.has(PermissionFlagsBits.Administrator)
      && !permissions?.has([PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ManageChannels])) {
      await interaction.reply({
        content: 'Você precisa de Administrador ou Gerenciar Servidor e Gerenciar Canais.',
        flags: MessageFlags.Ephemeral,
        allowedMentions: { parse: [] },
      });
      return;
    }
    // Never turn a forged/public component or unrelated modal into a public edit.
    if ((interaction.isModalSubmit() && !interaction.isFromMessage())
      || !interaction.message?.flags.has(MessageFlags.Ephemeral)) {
      await interaction.reply({ content: invalidMessage, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
      return;
    }
    const decoded = setupCustomIdSchema.safeParse(interaction.customId);
    if (!decoded.success) {
      await interaction.reply({ content: invalidMessage, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
      return;
    }

    let acknowledged = false;
    try {
      const customId = decoded.data;
      if (customId.action === 'add' || customId.action === 'add-category') {
        await interaction.reply({ content: 'Abra /setup init novamente', flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
        return;
      }
      const value = this.validateInput(interaction, customId);
      // An empty form reads no private configuration. Show it before any
      // external work; the submit independently validates every mutation target.
      if (customId.action === 'rename' && interaction.isButton()) {
        await interaction.showModal(new ModalBuilder()
          .setCustomId(encodeSetupCustomId(customId))
          .setTitle('Renomear Voice Creator')
          .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder().setCustomId('name').setLabel('Nome do canal')
              .setStyle(TextInputStyle.Short).setRequired(true)
              .setMinLength(1).setMaxLength(100),
          )));
        return;
      }
      if (customId.action === 'default-limit' && interaction.isButton()) {
        await interaction.showModal(new ModalBuilder()
          .setCustomId(encodeSetupCustomId(customId)).setTitle('Limite padrão das novas calls')
          .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder().setCustomId('default-limit').setLabel('Limite inicial (0 = sem limite)')
              .setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(2).setValue('0'),
          )));
        return;
      }
      await interaction.deferUpdate();
      acknowledged = true;
      const gateway = this.gatewayFactory(interaction);
      await gateway.assertCanConfigure(interaction.channelId);
      const configurations = await this.service.list(interaction.guildId);
      const selected = 'voiceCreatorId' in customId
        ? this.requireConfiguration(configurations, interaction.guildId, customId.voiceCreatorId)
        : undefined;

      if (selected === undefined) throw new SetupDiscordError(expiredMessage);
      switch (customId.action) {
        case 'select':
          this.requireConfiguration(configurations, interaction.guildId, value);
          await this.refresh(interaction, gateway, value);
          return;
        case 'cancel':
          await this.refresh(interaction, gateway, selected.id);
          return;
        case 'delete': {
          const button = (action: 'confirm-delete' | 'cancel', label: string, style: ButtonStyle) =>
            new ButtonBuilder().setCustomId(encodeSetupCustomId({ version: 'v1', action, voiceCreatorId: selected.id }))
              .setLabel(label).setStyle(style);
          await interaction.editReply({
            content: 'Excluir esta configuração? O canal e as salas ativas serão preservados.',
            embeds: [], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(
              button('confirm-delete', 'Confirmar exclusão', ButtonStyle.Danger),
              button('cancel', 'Cancelar', ButtonStyle.Secondary),
            )], allowedMentions: { parse: [] },
          });
          return;
        }
        case 'confirm-delete':
          // This removes configuration only; externally deleted targets must not
          // lock administrators out of removing/replacing stale configurations.
          await this.service.remove(selected.id);
          await this.refresh(interaction, gateway);
          return;
        case 'change-category':
          await this.requireVoice(gateway, selected.creatorChannelDiscordId);
          await this.requireCategory(gateway, value);
          await this.service.changeCategory(selected.id, value);
          break;
        case 'default-limit':
          // Only the model changes. Missing destinations remain repairable;
          // never move or reconfigure an entry channel or an existing call.
          await this.service.setDefaultUserLimit(selected.id, Number(value));
          break;
        case 'toggle-commands': {
          await this.requireVoice(gateway, selected.creatorChannelDiscordId);
          await this.requireCategory(gateway, selected.categoryDiscordId);
          const { synchronization } = await this.service.toggleRoomCommands(selected.id);
          const status = synchronization === null ? 'Sincronização dos painéis não confirmada.'
            : synchronization.failed > 0 ? `Sincronização parcial: ${synchronization.synced} sala(s) sincronizada(s), ${synchronization.failed} sala(s) com falha.`
            : `Sincronização dos painéis concluída: ${synchronization.synced} sala(s).`;
          const content = `Configuração salva. ${status}`;
          try {
            await this.refresh(interaction, gateway, selected.id, content);
          } catch {
            // Refresh failure cannot turn a committed toggle into a failed save
            // or leave an old toggle available as an apparent retry action.
            await interaction.editReply({
              content: `${content} Não foi possível atualizar a configuração exibida. Abra /setup init para consultar o estado salvo.`,
              embeds: [], components: [], allowedMentions: { parse: [] },
            });
          }
          return;
        }
        case 'rename': {
          await this.requireVoice(gateway, selected.creatorChannelDiscordId);
          await this.requireCategory(gateway, selected.categoryDiscordId);
          await this.service.rename(selected.id, value, gateway);
          break;
        }
      }
      await this.refresh(interaction, gateway, selected.id);
    } catch (error: unknown) {
      const content = error instanceof SetupDiscordError ? error.message
        : error instanceof VoiceCreatorAlreadyConfiguredError ? 'Este canal já possui uma configuração ativa.'
        : error instanceof VoiceCreatorNotFoundError ? expiredMessage
        : null;
      if (content === null) throw error;
      if (acknowledged) {
        await interaction.editReply({ content, allowedMentions: { parse: [] } });
      } else {
        await interaction.reply({ content, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
      }
    }
  }

  private validateInput(interaction: SetupInteraction, customId: SetupCustomId): string {
    switch (customId.action) {
      case 'change-category': {
        if (!interaction.isChannelSelectMenu() || interaction.values.length !== 1) break;
        const parsed = discordIdSchema.safeParse(interaction.values[0]);
        if (parsed.success) return parsed.data;
        break;
      }
      case 'select': {
        if (!interaction.isStringSelectMenu() || interaction.values.length !== 1) break;
        const parsed = voiceCreatorIdSchema.safeParse(interaction.values[0]);
        if (parsed.success) return parsed.data;
        break;
      }
      case 'rename':
        if (interaction.isButton()) return '';
        if (interaction.isModalSubmit()) {
          let name: string;
          try {
            name = interaction.fields.getTextInputValue('name');
          } catch {
            throw new SetupDiscordError(invalidMessage);
          }
          const parsed = setupChannelNameSchema.safeParse(name);
          if (parsed.success) return parsed.data;
          throw new SetupDiscordError('O nome do canal deve ter entre 1 e 100 caracteres.');
        }
        break;
      case 'default-limit':
        if (interaction.isButton()) return '';
        if (interaction.isModalSubmit()) {
          let limit: string;
          try { limit = interaction.fields.getTextInputValue('default-limit'); }
          catch { throw new SetupDiscordError(invalidMessage); }
          const parsed = setupDefaultLimitInputSchema.safeParse(limit);
          if (parsed.success) return String(parsed.data);
          throw new SetupDiscordError('O limite deve ser um inteiro de 0 a 99. 0 significa sem limite.');
        }
        break;
      default:
        if (interaction.isButton()) return '';
    }
    throw new SetupDiscordError(invalidMessage);
  }

  private requireConfiguration(configurations: VoiceCreatorConfiguration[], guildId: string, id: string) {
    const selected = configurations.find((item) => item.id === id && item.guildDiscordId === guildId && item.deletedAt === null);
    if (selected === undefined) throw new SetupDiscordError(expiredMessage);
    return selected;
  }

  private async requireVoice(gateway: SetupDiscordGateway, id: string) {
    const channel = await gateway.getVoiceChannel(id);
    if (channel === null) throw new SetupDiscordError();
    return channel;
  }

  private async requireCategory(gateway: SetupDiscordGateway, id: string): Promise<void> {
    if (await gateway.getCategory(id) === null) throw new SetupDiscordError();
  }

  private async refresh(interaction: GuildBasedInteraction, gateway: SetupDiscordGateway, selectedVoiceCreatorId?: string, content: string | null = null): Promise<void> {
    const configurations = (await this.service.list(interaction.guildId))
      .filter((item) => item.guildDiscordId === interaction.guildId && item.deletedAt === null);
    const selected = configurations.find((item) => item.id === selectedVoiceCreatorId) ?? configurations[0];
    const voiceChannels = [];
    const unavailableChannelDiscordIds: string[] = [];
    if (selected !== undefined) {
      const channel = await gateway.getVoiceChannel(selected.creatorChannelDiscordId);
      if (channel === null) unavailableChannelDiscordIds.push(selected.creatorChannelDiscordId);
      else voiceChannels.push(channel);
      if (await gateway.getCategory(selected.categoryDiscordId) === null) {
        unavailableChannelDiscordIds.push(selected.categoryDiscordId);
      }
    }
    await interaction.editReply({
      content,
      ...buildSetupDashboard({
        configurations, ...(selected === undefined ? {} : { selectedVoiceCreatorId: selected.id }),
        voiceChannels, unavailableChannelDiscordIds,
      }),
    });
  }
}
