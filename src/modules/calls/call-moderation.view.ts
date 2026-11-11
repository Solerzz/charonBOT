import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder,
  UserSelectMenuBuilder, escapeMarkdown,
} from 'discord.js';

import type { CallPanelPayload, CallPanelRow } from './call-panel.view.js';
import { encodeCallComponent, type CallControlAction } from './call.schemas.js';
import type { ModerationResult } from './room-moderation.service.js';
import type { RoomActor, RoomMemberBlock } from './room.types.js';

// The handler creates a fresh random UUID for each confirmation, never an authority token.
export type ModerationSelection = { id: string } & (
  | { kind: 'block'; memberId: string }
  | { kind: 'unblock'; blockId: string }
);

const text = (value: string) => escapeMarkdown(value).replaceAll('@', '@\u200b');
const member = (id: string) => /^\d{17,20}$/.test(id) ? `<@${id}>` : text(id);
const id = (actor: RoomActor, action: CallControlAction) => encodeCallComponent({ version: 'v3', action, roomId: actor.roomId, controlVersion: actor.controlVersion });
const button = (customId: string, label: string) => new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(ButtonStyle.Secondary);
const back = (actor: RoomActor) => button(id(actor, 'mod-home'), 'Voltar');
function payload(title: string, description: string, components: readonly CallPanelRow[]): CallPanelPayload {
  return { embeds: [new EmbedBuilder().setTitle(title).setColor(0x2b2d31).setDescription(description)], components, allowedMentions: { parse: [] } };
}

export function buildModerationHome(actor: RoomActor): CallPanelPayload {
  return payload('Moderação', 'Gerencie bloqueios desta sala. Somente o dono atual pode moderar.', [
    new ActionRowBuilder<ButtonBuilder>().addComponents(button(id(actor, 'mod-block'), 'Bloquear membro'), button(id(actor, 'mod-list'), 'Desbloquear membro')),
  ]);
}

export function buildModerationBlockPrompt(actor: RoomActor): CallPanelPayload {
  return payload('Bloquear membro', 'Selecione um membro do servidor, inclusive fora da call. Dono, administradores e bots são protegidos.', [
    new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(new UserSelectMenuBuilder().setCustomId(id(actor, 'mod-target')).setPlaceholder('Selecionar membro').setMinValues(1).setMaxValues(1)),
    new ActionRowBuilder<ButtonBuilder>().addComponents(back(actor)),
  ]);
}

export function buildModerationBlockedPage(actor: RoomActor, records: readonly RoomMemberBlock[], page: number): CallPanelPayload {
  if (!Number.isSafeInteger(page) || page < 0) throw new RangeError('Page must be a non-negative safe integer');
  const sorted = [...records].sort((a, b) => a.memberDiscordId < b.memberDiscordId ? -1 : a.memberDiscordId > b.memberDiscordId ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const lastPage = Math.max(0, Math.ceil(sorted.length / 25) - 1);
  const currentPage = Math.min(page, lastPage);
  const rows: CallPanelRow[] = [];
  if (sorted.length) {
    rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder()
      .setCustomId(id(actor, 'mod-unblock')).setPlaceholder('Selecionar bloqueio').setMinValues(1).setMaxValues(1)
      .addOptions(sorted.slice(currentPage * 25, (currentPage + 1) * 25).map(record => ({
        label: text(record.memberDiscordId).slice(0, 100), value: record.id,
        description: record.state === 'UNBLOCK_PENDING' ? 'Desbloqueio pendente — selecionar para recuperar' : 'Bloqueado nesta sala',
      })))));
  }
  const navigation = new ActionRowBuilder<ButtonBuilder>();
  const pageButton = (value: number, label: string) => button(encodeCallComponent({ version: 'v3', action: 'mod-page', roomId: actor.roomId, controlVersion: actor.controlVersion, page: value }), label);
  if (currentPage > 0) navigation.addComponents(pageButton(currentPage - 1, 'Anterior'));
  if (currentPage < lastPage) navigation.addComponents(pageButton(currentPage + 1, 'Próximo'));
  navigation.addComponents(back(actor)); rows.push(navigation);
  return payload('Desbloquear membro', sorted.length ? `Página ${currentPage + 1}/${lastPage + 1}. Selecione um bloqueio, mesmo que o membro tenha saído do servidor. Pendências podem ser recuperadas aqui.` : 'Nenhum membro bloqueado nesta sala.', rows);
}

export function buildModerationConfirmation(actor: RoomActor, selection: ModerationSelection, memberId: string): CallPanelPayload {
  const blocking = selection.kind === 'block';
  const customId = (action: 'mod-confirm' | 'mod-cancel') => encodeCallComponent({ version: 'v3', action, roomId: actor.roomId, selectionId: selection.id });
  return payload(blocking ? 'Confirmar bloqueio' : 'Confirmar desbloqueio', `${member(memberId)}\n${blocking
    ? 'Não poderá entrar na voz nem enviar mensagens no chat desta sala. A autorização anterior será removida. Se estiver na call, será removido. Continua vendo a sala se ela estiver visível.'
    : 'O bloqueio será removido. A autorização anterior não será restaurada: o dono precisa autorizar novamente para conceder uma exceção de acesso.'}`, [
    new ActionRowBuilder<ButtonBuilder>().addComponents(button(customId('mod-confirm'), 'Confirmar'), button(customId('mod-cancel'), 'Cancelar')),
  ]);
}

export function buildModerationResult(actor: RoomActor, result: ModerationResult): CallPanelPayload {
  const blocking = result.kind === 'blocked';
  return payload(blocking ? 'Membro bloqueado' : 'Membro desbloqueado', `${member(result.memberDiscordId)}\n${blocking
    ? `Bloqueado na voz e no chat desta sala. Autorização anterior removida.${result.removedFromRoom ? ' Membro removido da call.' : ''}`
    : 'Bloqueio removido. O dono precisa autorizar novamente se quiser conceder uma exceção de acesso.'}`, [new ActionRowBuilder<ButtonBuilder>().addComponents(back(actor))]);
}
