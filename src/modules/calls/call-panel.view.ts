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
import { encodeCallComponent, type CallControlAction } from './call.schemas.js';

export interface CallPanelInput {
  room: Pick<TemporaryRoom,
    'id' | 'channelDiscordId' | 'name' | 'ownerDiscordId' | 'userLimit' | 'visibility' |
    'isLocked' | 'controlVersion' | 'priorityMemberDiscordId' | 'priorityExpiresAt'>;
  participantCount: number;
  observedAt: Date;
}

// Exclude create-only flags so the same panel can be sent and edited unchanged.
export type CallPanelRow = ActionRowBuilder<ButtonBuilder> |
  ActionRowBuilder<StringSelectMenuBuilder> | ActionRowBuilder<UserSelectMenuBuilder>;
export type CallPanelPayload = Pick<MessageCreateOptions, 'content' | 'embeds' | 'allowedMentions'> & {
  components: readonly CallPanelRow[];
};

export function buildCallPanel(input: CallPanelInput): CallPanelPayload {
  const { room, participantCount } = input;
  const embed = new EmbedBuilder()
    .setTitle('Central da Call')
    .setColor(0x2b2d31)
    .addFields(
      { name: 'Sala', value: escapeMarkdown(room.name).replaceAll('@', '@\u200b'), inline: true },
      { name: 'Proprietário', value: room.ownerDiscordId === null ? 'Sem proprietário' : `<@${room.ownerDiscordId}>`, inline: true },
      { name: '\u200b', value: '\u200b', inline: false },
      { name: 'Participantes', value: `${participantCount} / ${room.userLimit === 0 ? 'Ilimitado' : room.userLimit}`, inline: true },
      { name: 'Acesso e visibilidade', value: `${room.isLocked ? 'Trancada' : 'Aberta'} · ${room.visibility === 'PRIVATE' ? 'Oculta' : 'Visível'}`, inline: true },
    );
  if (room.ownerDiscordId === null && room.priorityMemberDiscordId !== null && room.priorityExpiresAt !== null) {
    embed.addFields(room.priorityExpiresAt > input.observedAt
      ? { name: 'Prioridade para assumir', value: `<@${room.priorityMemberDiscordId}> · até <t:${Math.floor(room.priorityExpiresAt.getTime() / 1000)}:R>` }
      : { name: 'Sala disponível', value: 'Qualquer participante elegível presente pode assumir a sala.' });
  }
  const customId = (action: CallControlAction) => encodeCallComponent({
    version: 'v3', action, roomId: room.id, controlVersion: room.controlVersion,
  });
  const button = (action: CallControlAction, label: string) => new ButtonBuilder().setCustomId(customId(action))
    .setLabel(label).setStyle(ButtonStyle.Secondary).setDisabled(action === 'claim' ? room.ownerDiscordId !== null : room.ownerDiscordId === null);
  const actions = [
    new ActionRowBuilder<ButtonBuilder>().addComponents(button('lock', room.isLocked ? 'Destrancar' : 'Trancar'), button('visibility', room.visibility === 'PRIVATE' ? 'Mostrar' : 'Ocultar'), button('rename', 'Renomear')),
    new ActionRowBuilder<ButtonBuilder>().addComponents(button('limit', 'Alterar limite'), button('access', 'Autorizados'), button('transfer', 'Transferir posse')),
    new ActionRowBuilder<ButtonBuilder>().addComponents(button('claim', 'Assumir sala'), button('moderation', 'Moderação')),
  ];
  return {
    embeds: [embed], components: actions,
    allowedMentions: { parse: [] },
  };
}
