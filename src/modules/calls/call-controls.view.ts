import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder,
  TextInputBuilder, TextInputStyle, UserSelectMenuBuilder,
} from 'discord.js';

import type { CallPanelPayload } from './call-panel.view.js';
import { encodeCallComponent, type CallControlAction } from './call.schemas.js';
import type { PendingOwnershipTransfer, RoomActor } from './room.types.js';

function customId(actor: RoomActor, action: CallControlAction): string {
  return encodeCallComponent({ version: 'v3', action, roomId: actor.roomId, controlVersion: actor.controlVersion });
}

export function buildTransferPrompt(actor: RoomActor, pending: PendingOwnershipTransfer, remainingSeconds: number): CallPanelPayload {
  if (!Number.isInteger(remainingSeconds) || remainingSeconds < 0 || remainingSeconds > 5) {
    throw new RangeError('Transfer countdown must be an integer from 0 to 5');
  }
  const embed = new EmbedBuilder().setTitle('Transferir propriedade').setColor(0x2b2d31)
    .setDescription('Sem ação, a transferência será automática. Não é necessário aceite do destinatário.')
    .addFields(
      { name: 'Proprietário atual', value: `<@${pending.ownerDiscordId}>` },
      { name: 'Novo proprietário', value: `<@${pending.targetDiscordId}>` },
      { name: 'Transferência automática', value: `${remainingSeconds} s` },
    );
  const id = (action: 'confirm' | 'undo') => encodeCallComponent({ version: 'v3', action, roomId: actor.roomId, operationId: pending.id });
  return {
    embeds: [embed],
    components: [new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(id('confirm')).setLabel('Confirmar').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(id('undo')).setLabel('Desfazer').setStyle(ButtonStyle.Secondary),
    )],
    allowedMentions: { parse: [] },
  };
}

export function buildRenameModal(actor: RoomActor, currentName: string): ModalBuilder {
  // Discord text lengths are not grapheme counts; validate the 11-grapheme rule on submission.
  const input = new TextInputBuilder().setCustomId('name').setLabel('Nome (até 11 grafemas)')
    .setStyle(TextInputStyle.Short).setRequired(true).setMinLength(1).setMaxLength(4000).setValue(currentName);
  return new ModalBuilder().setCustomId(customId(actor, 'rename-save')).setTitle('Renomear sala')
    .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
}

export function buildLimitModal(actor: RoomActor, currentLimit: number): ModalBuilder {
  const input = new TextInputBuilder().setCustomId('limit').setLabel('Limite (0 = ilimitado; 1–99)')
    .setStyle(TextInputStyle.Short).setRequired(true).setMinLength(1).setMaxLength(2).setValue(String(currentLimit));
  return new ModalBuilder().setCustomId(customId(actor, 'limit-save')).setTitle('Alterar limite')
    .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
}

function memberSelect(actor: RoomActor, action: 'allow-add' | 'allow-remove' | 'transfer-target', placeholder: string): ActionRowBuilder<UserSelectMenuBuilder> {
  return new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
    new UserSelectMenuBuilder().setCustomId(customId(actor, action)).setPlaceholder(placeholder).setMinValues(1).setMaxValues(1),
  );
}

export function buildAccessPrompt(actor: RoomActor): CallPanelPayload {
  return {
    embeds: [new EmbedBuilder().setTitle('Gerenciar autorizados').setColor(0x2b2d31)],
    components: [memberSelect(actor, 'allow-add', 'Adicionar autorizado'), memberSelect(actor, 'allow-remove', 'Remover autorizado')],
    allowedMentions: { parse: [] },
  };
}

export function buildTransferTargetPrompt(actor: RoomActor): CallPanelPayload {
  return {
    embeds: [new EmbedBuilder().setTitle('Transferir propriedade').setColor(0x2b2d31)
      .setDescription('Selecione um participante da call. A elegibilidade será validada ao enviar.')],
    components: [memberSelect(actor, 'transfer-target', 'Selecionar novo proprietário')],
    allowedMentions: { parse: [] },
  };
}
