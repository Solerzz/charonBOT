import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  escapeMarkdown,
  type MessageCreateOptions,
  type StringSelectMenuBuilder,
  type UserSelectMenuBuilder,
} from 'discord.js';

import type { TemporaryRoom } from '../../generated/prisma/client.js';
import { encodeCallComponent } from './call.schemas.js';

export interface CallPanelInput {
  room: Pick<TemporaryRoom,
    'id' | 'channelDiscordId' | 'name' | 'ownerDiscordId' | 'userLimit' | 'visibility' |
    'controlVersion' | 'priorityMemberDiscordId' | 'priorityExpiresAt'>;
  participantCount: number;
  observedAt: Date;
}

// Exclude create-only flags so the same panel can be sent and edited unchanged.
export type CallPanelRow = ActionRowBuilder<ButtonBuilder> |
  ActionRowBuilder<StringSelectMenuBuilder> | ActionRowBuilder<UserSelectMenuBuilder>;
export type CallPanelPayload = Pick<MessageCreateOptions, 'embeds' | 'allowedMentions'> & {
  components: readonly CallPanelRow[];
};

export function buildCallPanel(input: CallPanelInput): CallPanelPayload {
  const { room, participantCount } = input;
  const embed = new EmbedBuilder()
    .setTitle('Central da Call')
    .setColor(0x2b2d31)
    .addFields(
      { name: 'Sala', value: `<#${room.channelDiscordId}> · ${escapeMarkdown(room.name)}` },
      { name: 'Proprietário', value: room.ownerDiscordId === null ? 'Sem proprietário' : `<@${room.ownerDiscordId}>` },
      { name: 'Participantes', value: `${participantCount} / ${room.userLimit === 0 ? 'Ilimitado' : room.userLimit}` },
      { name: 'Visibilidade', value: room.visibility === 'PRIVATE' ? 'Privada' : 'Pública' },
    );
  if (room.ownerDiscordId === null && room.priorityMemberDiscordId !== null && room.priorityExpiresAt !== null) {
    embed.addFields(room.priorityExpiresAt > input.observedAt
      ? { name: 'Prioridade para assumir', value: `<@${room.priorityMemberDiscordId}> · até <t:${Math.floor(room.priorityExpiresAt.getTime() / 1000)}:R>` }
      : { name: 'Sala disponível', value: 'Qualquer participante elegível presente pode assumir a sala.' });
  }
  const customId = (action: 'open' | 'claim') => encodeCallComponent({
    version: 'v2', action, roomId: room.id, controlVersion: room.controlVersion,
  });
  const actions = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(customId('open')).setLabel('Abrir controles').setStyle(ButtonStyle.Secondary).setDisabled(false),
    new ButtonBuilder().setCustomId(customId('claim')).setLabel('Assumir sala').setStyle(ButtonStyle.Secondary).setDisabled(room.ownerDiscordId !== null),
  );
  return {
    embeds: [embed], components: [actions],
    allowedMentions: { parse: [] },
  };
}
