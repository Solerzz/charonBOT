import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  EmbedBuilder,
  StringSelectMenuBuilder,
  type InteractionReplyOptions,
} from 'discord.js';

import type { SetupVoiceChannel } from './setup.discord.js';
import type { ReadySetupDraft, SetupDraft } from './setup-creation.types.js';
import type { VoiceCreatorConfiguration } from './setup.repository.js';
import { encodeSetupCustomId, encodeSetupCreationCustomId } from './setup.schemas.js';

export interface SetupDashboardInput {
  configurations: readonly VoiceCreatorConfiguration[];
  selectedVoiceCreatorId?: string;
  voiceChannels?: readonly SetupVoiceChannel[];
  unavailableChannelDiscordIds?: readonly string[];
}

// This reply-compatible subset is also safe for editing the existing ephemeral reply.
export type SetupDashboardPayload = Pick<
  InteractionReplyOptions,
  'embeds' | 'components' | 'allowedMentions'
>;

export function buildSetupDashboard(input: SetupDashboardInput): SetupDashboardPayload {
  const { configurations, voiceChannels = [], unavailableChannelDiscordIds = [] } = input;
  const selected = configurations.find((item) => item.id === input.selectedVoiceCreatorId)
    ?? configurations[0];
  const embed = new EmbedBuilder()
    .setTitle('Configuração do Charon')
    .setColor(0x2b2d31);
  const add = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(encodeSetupCreationCustomId({ version: 'v2', action: 'start' }))
      .setLabel('Criar canal de entrada').setStyle(ButtonStyle.Primary),
  );

  if (selected === undefined) {
    embed.setDescription('Nenhum Voice Creator configurado. Crie um canal de entrada para começar.');
    return { embeds: [embed], components: [add], allowedMentions: { parse: [] } };
  }

  const customId = (action: 'select' | 'change-category' | 'rename' | 'default-limit' | 'toggle-commands' | 'delete') =>
    encodeSetupCustomId({ version: 'v1', action, voiceCreatorId: selected.id });
  const nameOf = (item: VoiceCreatorConfiguration) =>
    unavailableChannelDiscordIds.includes(item.creatorChannelDiscordId)
      ? `Canal indisponível · ${item.creatorChannelDiscordId}`
      : voiceChannels.find((channel) => channel.id === item.creatorChannelDiscordId)?.name
        ?? item.creatorChannelDiscordId;
  const voiceUnavailable = unavailableChannelDiscordIds.includes(selected.creatorChannelDiscordId);
  const categoryUnavailable = unavailableChannelDiscordIds.includes(selected.categoryDiscordId);
  const enabled = selected.roomCommandsEnabled;
  embed
    .setDescription(`${configurations.length} ${configurations.length === 1 ? 'Voice Creator configurado' : 'Voice Creators configurados'}. Selecione um para editar.`)
    .addFields(
      { name: 'Voice Creator', value: voiceUnavailable ? `Indisponível · ID ${selected.creatorChannelDiscordId}` : `<#${selected.creatorChannelDiscordId}>` },
      { name: 'Categoria das salas', value: categoryUnavailable ? `Indisponível · ID ${selected.categoryDiscordId}` : `<#${selected.categoryDiscordId}>` },
      { name: 'Nome do canal', value: voiceUnavailable ? 'Indisponível' : nameOf(selected) },
      { name: 'Comandos da sala', value: enabled ? 'Habilitados' : 'Desabilitados' },
      { name: 'Limite padrão das novas calls', value: formatDefaultLimit(selected.defaultUserLimit) },
      { name: 'Zona de perigo', value: 'Excluir remove apenas a configuração. O canal e as salas ativas são preservados.' },
    );
  const warnings: string[] = [];
  if (voiceUnavailable) {
    warnings.push('Canal Voice Creator indisponível. Selecione outro Voice Creator ou exclua esta configuração.');
  }
  if (categoryUnavailable) {
    warnings.push('Categoria indisponível. Escolha outra categoria.');
  }
  if (warnings.length > 0) {
    embed.addFields({ name: 'Atenção', value: warnings.join('\n') });
  }

  // Navigation selects the first creator on the adjacent page, using the same
  // UUID selection contract as any other option (no extra action handlers).
  const paginated = configurations.length > 25;
  const pageSize = paginated ? 23 : 25;
  const page = Math.floor(
    configurations.findIndex((item) => item.id === selected.id) / pageSize,
  );
  const start = page * pageSize;
  const options = configurations.slice(start, start + pageSize).map((item) => ({
    label: nameOf(item), value: item.id, default: item.id === selected.id,
  }));
  const previous = configurations[start - pageSize];
  const next = configurations[start + pageSize];
  if (previous !== undefined) {
    options.unshift({ label: 'Voice Creators anteriores', value: previous.id, default: false });
  }
  if (next !== undefined) {
    options.push({ label: 'Próximos Voice Creators', value: next.id, default: false });
  }
  if (paginated) {
    embed.setFooter({
      text: `Página ${page + 1} de ${Math.ceil(configurations.length / pageSize)} · ${configurations.length} Voice Creators`,
    });
  }

  const creators = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId('select'))
      .setPlaceholder('Selecionar Voice Creator')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(options),
  );
  const categorySelector = new ChannelSelectMenuBuilder()
      .setCustomId(customId('change-category'))
      .setPlaceholder('Alterar categoria')
      .setChannelTypes(ChannelType.GuildCategory)
      .setMinValues(1)
      .setMaxValues(1);
  if (!categoryUnavailable) {
    categorySelector.setDefaultChannels(selected.categoryDiscordId);
  }
  const category = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
    categorySelector,
  );
  const actions = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(customId('rename')).setLabel('Renomear').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(customId('default-limit')).setLabel('Limite padrão').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(customId('toggle-commands')).setLabel(`Comandos: ${enabled ? 'habilitados' : 'desabilitados'}`).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(customId('delete')).setLabel('Excluir configuração').setStyle(ButtonStyle.Danger),
  );
  return {
    embeds: [embed], components: [creators, add, category, actions],
    allowedMentions: { parse: [] },
  };
}

function formatDefaultLimit(limit: number): string {
  return limit === 0 ? '0 · sem limite' : String(limit);
}

export function buildSetupCreationCategory(draft: SetupDraft): SetupDashboardPayload {
  const category = new ChannelSelectMenuBuilder()
    .setCustomId(encodeSetupCreationCustomId({ version: 'v2', action: 'category', id: draft.id, revision: draft.revision }))
    .setPlaceholder('Categoria do canal de entrada e das calls')
    .setChannelTypes(ChannelType.GuildCategory).setMinValues(1).setMaxValues(1);
  if (draft.input.categoryDiscordId !== undefined) category.setDefaultChannels(draft.input.categoryDiscordId);
  return {
    embeds: [new EmbedBuilder().setTitle('Criar canal de entrada').setColor(0x2b2d31)
      .setDescription('Escolha uma categoria existente para o canal de entrada e as novas calls.')],
    components: [new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(category),
      new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder()
        .setCustomId(encodeSetupCreationCustomId({ version: 'v2', action: 'cancel', id: draft.id, revision: draft.revision }))
        .setLabel('Cancelar').setStyle(ButtonStyle.Secondary))],
    allowedMentions: { parse: [] },
  };
}

export function buildSetupCreationReview(draft: ReadySetupDraft): SetupDashboardPayload {
  const button = (action: 'confirm' | 'back' | 'cancel', label: string, style: ButtonStyle) => new ButtonBuilder()
    .setCustomId(encodeSetupCreationCustomId({ version: 'v2', action, id: draft.id, revision: draft.revision }))
    .setLabel(label).setStyle(style);
  return {
    embeds: [new EmbedBuilder().setTitle('Confirmar canal de entrada').setColor(0x2b2d31).addFields(
      { name: 'Nome do canal de entrada', value: draft.input.name },
      { name: 'Categoria de entrada e das calls', value: `<#${draft.input.categoryDiscordId}>` },
      { name: 'Limite inicial das calls', value: formatDefaultLimit(draft.input.defaultUserLimit) },
      { name: 'Canal de entrada', value: 'Sempre sem limite de participantes.' },
      { name: 'Nome das calls', value: 'Nome automático baseado no jogo ou nome de exibição.' },
    )],
    components: [new ActionRowBuilder<ButtonBuilder>().addComponents(
      button('confirm', 'Confirmar criação', ButtonStyle.Primary),
      button('back', 'Voltar', ButtonStyle.Secondary), button('cancel', 'Cancelar', ButtonStyle.Secondary),
    )], allowedMentions: { parse: [] },
  };
}
