import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  type MessageCreateOptions,
} from 'discord.js';

import type { TemporaryRoom } from '../../generated/prisma/client.js';

export interface CallPanelInput {
  room: Pick<TemporaryRoom, 'id' | 'channelDiscordId' | 'name' | 'ownerDiscordId'>;
  participantCount: number;
}

// Exclude create-only flags so the same panel can be sent and edited unchanged.
export type CallPanelPayload = Pick<
  MessageCreateOptions,
  'embeds' | 'components' | 'allowedMentions'
>;

export function buildCallPanel(input: CallPanelInput): CallPanelPayload {
  const { room, participantCount } = input;
  const embed = new EmbedBuilder()
    .setTitle('Central da Call')
    .setColor(0x2b2d31)
    .setDescription('Controles disponíveis em breve')
    .addFields(
      { name: 'Sala', value: `<#${room.channelDiscordId}> · ${room.name}` },
      { name: 'Proprietário', value: room.ownerDiscordId === null ? 'Sem proprietário' : `<@${room.ownerDiscordId}>` },
      { name: 'Participantes', value: String(participantCount) },
      { name: 'Visibilidade', value: '🟢 Pública' },
    );
  const customId = (action: string) => `call:v1:${action}:${room.id}`;
  const actions = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(customId('rename')).setLabel('Renomear').setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId(customId('limit')).setLabel('Alterar limite').setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId(customId('private')).setLabel('Privatizar').setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId(customId('claim')).setLabel('Assumir sala').setStyle(ButtonStyle.Secondary).setDisabled(true),
  );
  const moderation = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId('moderation'))
      .setPlaceholder('Moderar participantes')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions({ label: 'Moderação em breve', value: 'unavailable' })
      .setDisabled(true),
  );
  return {
    embeds: [embed], components: [actions, moderation],
    allowedMentions: { parse: [] },
  };
}
