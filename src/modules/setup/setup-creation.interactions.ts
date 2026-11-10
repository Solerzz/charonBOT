import { ActionRowBuilder, MessageFlags, ModalBuilder, PermissionFlagsBits, TextInputBuilder, TextInputStyle, type Interaction } from 'discord.js';
import type { InteractionHandler } from '../../core/discord/interactions/interaction-handler.js';
import type { SetupCreationService } from './setup-creation.service.js';
import type { SetupCreationResult, SetupDraft, SetupDraftContext } from './setup-creation.types.js';
import { SetupDraftError, type SetupDraftStore } from './setup-drafts.js';
import { SetupDiscordError } from './setup.discord.js';
import type { GuildBasedInteraction, SetupDiscordGatewayFactory, SetupInteraction } from './setup.interactions.js';
import { discordIdSchema, encodeSetupCreationCustomId, setupChannelNameSchema, setupCreationCustomIdSchema, setupDefaultLimitInputSchema } from './setup.schemas.js';
import { buildSetupCreationCategory, buildSetupCreationReview, buildSetupDashboard } from './setup.views.js';

const expiredMessage = 'Esta criação expirou ou não pertence a este contexto. Abra /setup init novamente.';
const invalidMessage = 'Ação de criação inválida. Abra /setup init novamente.';

function requirePrivateAdministrator(interaction: SetupInteraction): asserts interaction is GuildBasedInteraction & { channelId: string } {
  if (!interaction.inGuild() || interaction.guild === null || interaction.guild.id !== interaction.guildId
    || !discordIdSchema.safeParse(interaction.guildId).success) throw new SetupDraftError();
  const permissions = interaction.memberPermissions;
  if (!permissions?.has(PermissionFlagsBits.Administrator)
    && !permissions?.has([PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ManageChannels])) {
    throw new SetupDiscordError('Você precisa de Administrador ou Gerenciar Servidor e Gerenciar Canais.');
  }
  if ((interaction.isModalSubmit() && !interaction.isFromMessage())
    || !interaction.message?.flags.has(MessageFlags.Ephemeral)
    || interaction.message.guildId !== interaction.guildId
    || !discordIdSchema.safeParse(interaction.channelId).success
    || !discordIdSchema.safeParse(interaction.message.id).success
    || !discordIdSchema.safeParse(interaction.user.id).success
    || (interaction.message.interactionMetadata && interaction.message.interactionMetadata.user.id !== interaction.user.id)) {
    throw new SetupDraftError();
  }
}

function contextOf(interaction: GuildBasedInteraction): SetupDraftContext {
  return { guildDiscordId: interaction.guildId, administratorDiscordId: interaction.user.id, messageDiscordId: interaction.message?.id ?? '' };
}

function resultMessage(result: SetupCreationResult): string {
  switch (result.status) {
    case 'created': return 'Configuração salva. Entrar no canal de entrada gera uma call temporária.';
    case 'failed': return 'A criação não foi concluída. Abra /setup init novamente para iniciar outro rascunho.';
    case 'partial': return `Resultado parcial: o canal ${result.channelDiscordId ?? ''} foi preservado sem configuração confirmada. Inspecione-o manualmente antes de iniciar outra criação.`;
    case 'uncertain': return 'Não foi possível confirmar o resultado da criação. Inspecione os canais e a configuração manualmente. Não repita esta criação.';
  }
}

export class SetupCreationInteractions implements InteractionHandler<SetupInteraction> {
  constructor(
    private readonly drafts: SetupDraftStore,
    private readonly creation: SetupCreationService,
    private readonly gatewayFactory: SetupDiscordGatewayFactory,
  ) {}

  canHandle(interaction: Interaction): interaction is SetupInteraction {
    return (interaction.isButton() || interaction.isAnySelectMenu() || interaction.isModalSubmit())
      && (interaction.customId === 'setup:v2:create' || interaction.customId.startsWith('setup:v2:create:'));
  }

  async execute(interaction: SetupInteraction): Promise<void> {
    let acknowledged = false;
    try {
      requirePrivateAdministrator(interaction);
      const decoded = setupCreationCustomIdSchema.safeParse(interaction.customId);
      if (!decoded.success) throw new SetupDiscordError(invalidMessage);
      const customId = decoded.data;
      const context = contextOf(interaction);
      const contextChannelId = interaction.channelId;
      // Re-read the authoritative interaction and the store after any awaited
      // ACK/preflight, not only the snapshot captured before external work.
      const current = () => {
        requirePrivateAdministrator(interaction);
        const latest = contextOf(interaction);
        if (latest.guildDiscordId !== context.guildDiscordId
          || latest.administratorDiscordId !== context.administratorDiscordId
          || latest.messageDiscordId !== context.messageDiscordId) throw new SetupDraftError();
        if (customId.action !== 'start') return this.drafts.get(customId, latest);
        return undefined;
      };

      if (customId.action === 'start') {
        if (!interaction.isButton()) throw new SetupDiscordError(invalidMessage);
        await interaction.deferUpdate(); acknowledged = true;
        current();
        const gateway = this.gatewayFactory(interaction);
        await gateway.assertCanConfigure(contextChannelId);
        current();
        await interaction.editReply({ content: null, ...buildSetupCreationCategory(this.drafts.begin(context)) });
        return;
      }

      const draft = this.drafts.get(customId, context);
      if (customId.action === 'category') {
        if (!interaction.isChannelSelectMenu() || interaction.values.length !== 1
          || !discordIdSchema.safeParse(interaction.values[0]).success) throw new SetupDiscordError(invalidMessage);
        // Selecting a category changes only memory. The modal MUST be the first
        // response; all Discord/database validation belongs to submit/confirm.
        const updated = this.drafts.selectCategory(customId, context, interaction.values[0]!);
        const name = new TextInputBuilder().setCustomId('name').setLabel('Nome do canal de entrada')
          .setStyle(TextInputStyle.Short).setRequired(true).setMinLength(1).setMaxLength(100);
        if (updated.input.name !== undefined) name.setValue(updated.input.name);
        await interaction.showModal(new ModalBuilder().setTitle('Criar canal de entrada')
          .setCustomId(encodeSetupCreationCustomId({ version: 'v2', action: 'form', id: updated.id, revision: updated.revision }))
          .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(name),
            new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder()
              .setCustomId('default-limit').setLabel('Limite inicial das calls (0 = sem limite)')
              .setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(2)
              .setValue(String(updated.input.defaultUserLimit ?? 0)))));
        acknowledged = true;
        // Dismissing a modal emits no submit. Refresh the original private
        // message after the modal ACK so its category/Cancel controls remain
        // usable at the new revision, without accepting stale forms.
        requirePrivateAdministrator(interaction);
        const editing = this.drafts.get(updated, contextOf(interaction));
        await interaction.editReply({ content: null, ...buildSetupCreationCategory(editing) });
        return;
      }

      if (customId.action === 'form') {
        if (!interaction.isModalSubmit()) throw new SetupDiscordError(invalidMessage);
        let name; let limit;
        try {
          name = setupChannelNameSchema.safeParse(interaction.fields.getTextInputValue('name'));
          limit = setupDefaultLimitInputSchema.safeParse(interaction.fields.getTextInputValue('default-limit'));
        } catch { throw new SetupDiscordError(invalidMessage); }
        if (!name.success || !limit.success) throw new SetupDiscordError('Informe nome de 1 a 100 caracteres e limite inteiro de 0 a 99 (0 = sem limite).');
        await interaction.deferUpdate(); acknowledged = true;
        current();
        const gateway = this.gatewayFactory(interaction);
        await gateway.assertCanConfigure(contextChannelId);
        current();
        if (!draft.input.categoryDiscordId || await gateway.getCategory(draft.input.categoryDiscordId) === null) throw new SetupDiscordError();
        current();
        const review = this.drafts.review(customId, context, { name: name.data, defaultUserLimit: limit.data });
        await interaction.editReply({ content: null, ...buildSetupCreationReview(review) });
        return;
      }

      if (!interaction.isButton()) throw new SetupDiscordError(invalidMessage);
      await interaction.deferUpdate(); acknowledged = true;
      const latest = current();
      switch (customId.action) {
        case 'back':
          await interaction.editReply({ content: null, ...buildSetupCreationCategory(this.drafts.back(customId, context)) });
          return;
        case 'cancel':
          this.drafts.cancel(customId, context);
          await interaction.editReply({ content: 'Criação cancelada. Nenhum canal foi criado. Abra /setup init para voltar ao painel.', embeds: [], components: [], allowedMentions: { parse: [] } });
          return;
        case 'confirm': {
          // A replay is presentation only. Lost bot/API access cannot replace
          // already-recorded persistence truth with a misleading failed save.
          if (latest?.result !== undefined) {
            await this.renderResult(interaction, latest, latest.result);
            return;
          }
          const gateway = this.gatewayFactory(interaction);
          await gateway.assertCanConfigure(contextChannelId);
          current();
          const result = await this.drafts.confirm(customId, context, (ready) => {
            // The store schedules this callback in a microtask. Check the live
            // binding/revision/TTL again inside the single latched operation.
            current();
            return this.creation.create(ready, gateway);
          });
          // confirm records terminal state before this presentation can fail.
          await this.renderResult(interaction, draft, result);
        }
      }
    } catch (error: unknown) {
      const content = error instanceof SetupDraftError ? expiredMessage
        : error instanceof SetupDiscordError ? error.message : null;
      if (content === null) throw error;
      if (acknowledged) await interaction.editReply({ content, embeds: [], components: [], allowedMentions: { parse: [] } });
      else await interaction.reply({ content, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
    }
  }

  private async renderResult(interaction: SetupInteraction, draft: SetupDraft, result: SetupCreationResult): Promise<void> {
    const content = resultMessage(result);
    try {
      const configurations = result.status === 'created'
        ? (await this.creation.list(draft.context.guildDiscordId))
          .filter((item) => item.guildDiscordId === draft.context.guildDiscordId && item.deletedAt === null)
        : [];
      // Keep the confirmed result selectable even if a read is stale. This
      // never adopts a different row or turns a committed save into a retry.
      if (result.status === 'created' && !configurations.some((item) => item.id === result.configuration.id)) {
        configurations.push(result.configuration);
      }
      await interaction.editReply(result.status === 'created' ? {
        content,
        ...buildSetupDashboard({ configurations, selectedVoiceCreatorId: result.configuration.id,
          voiceChannels: [{ id: result.configuration.creatorChannelDiscordId, name: draft.input.name ?? result.configuration.creatorChannelDiscordId, categoryDiscordId: result.configuration.categoryDiscordId }] }),
      } : { content, embeds: [], components: [], allowedMentions: { parse: [] } });
    } catch {
      // Rendering cannot change persistence truth or reoffer the old confirmation.
      await interaction.editReply({ content: `${content} Não foi possível atualizar o painel. Abra /setup init para consultar o estado.`,
        embeds: [], components: [], allowedMentions: { parse: [] } });
    }
  }
}
