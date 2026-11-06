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
import type { VoiceCreatorConfiguration } from './setup.repository.js';
import { encodeSetupCustomId } from './setup.schemas.js';

export interface SetupDashboardInput {
  configurations: readonly VoiceCreatorConfiguration[];
  selectedVoiceCreatorId?: string;
  voiceChannels?: readonly SetupVoiceChannel[];
}

// This reply-compatible subset is also safe for editing the existing ephemeral reply.
export type SetupDashboardPayload = Pick<
  InteractionReplyOptions,
  'embeds' | 'components' | 'allowedMentions'
>;

export function buildSetupDashboard(input: SetupDashboardInput): SetupDashboardPayload {
  const { configurations, voiceChannels = [] } = input;
  const selected = configurations.find((item) => item.id === input.selectedVoiceCreatorId)
    ?? configurations[0];
  const embed = new EmbedBuilder()
    .setTitle('Configuração do Charon')
    .setColor(0x2b2d31);
  const add = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId(encodeSetupCustomId({ version: 'v1', action: 'add' }))
      .setPlaceholder('Adicionar Voice Creator')
      .setChannelTypes(ChannelType.GuildVoice)
      .setMinValues(1)
      .setMaxValues(1),
  );

  if (selected === undefined) {
    embed.setDescription('Nenhum Voice Creator configurado. Adicione um canal de voz existente para começar.');
    return { embeds: [embed], components: [add], allowedMentions: { parse: [] } };
  }

  const customId = (action: 'select' | 'change-category' | 'rename' | 'toggle-commands' | 'delete') =>
    encodeSetupCustomId({ version: 'v1', action, voiceCreatorId: selected.id });
  const nameOf = (item: VoiceCreatorConfiguration) =>
    voiceChannels.find((channel) => channel.id === item.creatorChannelDiscordId)?.name
      ?? item.creatorChannelDiscordId;
  const enabled = selected.roomCommandsEnabled;
  embed
    .setDescription(`${configurations.length} ${configurations.length === 1 ? 'Voice Creator configurado' : 'Voice Creators configurados'}. Selecione um para editar.`)
    .addFields(
      { name: 'Voice Creator', value: `<#${selected.creatorChannelDiscordId}>` },
      { name: 'Categoria das salas', value: `<#${selected.categoryDiscordId}>` },
      { name: 'Nome do canal', value: nameOf(selected) },
      { name: 'Comandos da sala', value: `${enabled ? 'Habilitados' : 'Desabilitados'} · disponíveis em versões futuras` },
      { name: 'Zona de perigo', value: 'Excluir remove apenas a configuração. O canal e as salas ativas são preservados.' },
    );

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
  const category = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId(customId('change-category'))
      .setPlaceholder('Alterar categoria')
      .setChannelTypes(ChannelType.GuildCategory)
      .setDefaultChannels(selected.categoryDiscordId)
      .setMinValues(1)
      .setMaxValues(1),
  );
  const actions = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(customId('rename')).setLabel('Renomear').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(customId('toggle-commands')).setLabel(`Comandos: ${enabled ? 'habilitados' : 'desabilitados'}`).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(customId('delete')).setLabel('Excluir configuração').setStyle(ButtonStyle.Danger),
  );
  return {
    embeds: [embed], components: [creators, add, category, actions],
    allowedMentions: { parse: [] },
  };
}
