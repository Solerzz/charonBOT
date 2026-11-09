import {
  ButtonStyle, ComponentType, TextInputStyle, type APIActionRowComponent,
  type APIButtonComponent, type APIEmbed, type APIStringSelectComponent, type APIUserSelectComponent,
} from 'discord.js';
import { describe, expect, it } from 'vitest';

import { buildOwnerMenu, buildTransferPrompt, buildRenameModal, buildLimitModal, buildAccessPrompt, buildTransferTargetPrompt } from '../../../../src/modules/calls/call-controls.view.js';
import type { CallPanelPayload } from '../../../../src/modules/calls/call-panel.view.js';
import { callComponentSchema } from '../../../../src/modules/calls/call.schemas.js';
import type { PendingOwnershipTransfer, RoomActor } from '../../../../src/modules/calls/room.types.js';

const actor: RoomActor = { roomId: '123e4567-e89b-42d3-a456-426614174000', guildDiscordId: '12345678901234567', memberDiscordId: '22345678901234567', controlVersion: 4 };
const pending: PendingOwnershipTransfer = {
  id: '223e4567-e89b-42d3-a456-426614174000', roomId: actor.roomId,
  ownerDiscordId: actor.memberDiscordId, targetDiscordId: '32345678901234567',
  controlVersion: 4, expiresAt: null,
};
type Control = APIButtonComponent | APIStringSelectComponent | APIUserSelectComponent;
function json(payload: CallPanelPayload) {
  return JSON.parse(JSON.stringify(payload)) as { embeds: APIEmbed[]; components: APIActionRowComponent<Control>[]; allowedMentions: { parse: string[] }; flags?: unknown };
}

describe('private native controls', () => {
  it('offers exactly the five approved actions through a single-choice private menu', () => {
    const payload = json(buildOwnerMenu(actor));
    expect(payload.components).toHaveLength(1);
    expect(payload.components[0]).toEqual({ type: ComponentType.ActionRow, components: [{
      type: ComponentType.StringSelect, custom_id: 'call:v2:menu:123e4567-e89b-42d3-a456-426614174000:4',
      placeholder: 'Escolher ação', min_values: 1, max_values: 1,
      options: [
        { label: 'Renomear sala', value: 'rename' }, { label: 'Alterar limite', value: 'limit' },
        { label: 'Alternar pública / privada', value: 'visibility' },
        { label: 'Gerenciar autorizados', value: 'access' }, { label: 'Transferir propriedade', value: 'transfer' },
      ],
    }] });
  });

  it.each([5, 4, 3, 2, 1, 0])('renders the supplied %s-second countdown and current target without recipient acceptance', (remainingSeconds) => {
    const payload = json(buildTransferPrompt(actor, pending, remainingSeconds));
    expect(payload.embeds[0]!.fields).toEqual(expect.arrayContaining([
      { name: 'Proprietário atual', value: '<@22345678901234567>' },
      { name: 'Novo proprietário', value: '<@32345678901234567>' },
      { name: 'Transferência automática', value: `${remainingSeconds} s` },
    ]));
    expect(payload.components).toHaveLength(1);
    expect(payload.components[0]!.components).toEqual([
      { type: ComponentType.Button, style: ButtonStyle.Secondary, label: 'Confirmar', custom_id: 'call:v2:confirm:123e4567-e89b-42d3-a456-426614174000:223e4567-e89b-42d3-a456-426614174000' },
      { type: ComponentType.Button, style: ButtonStyle.Secondary, label: 'Desfazer', custom_id: 'call:v2:undo:123e4567-e89b-42d3-a456-426614174000:223e4567-e89b-42d3-a456-426614174000' },
    ]);
  });

  it('uses the latest supplied target and explicit countdown rather than expiresAt/clock', () => {
    const payload = json(buildTransferPrompt(actor, { ...pending, targetDiscordId: '42345678901234567', expiresAt: new Date(0) }, 3));
    expect(payload.embeds[0]!.fields).toContainEqual({ name: 'Novo proprietário', value: '<@42345678901234567>' });
    expect(payload.embeds[0]!.fields).toContainEqual({ name: 'Transferência automática', value: '3 s' });
  });

  it.each([-1, 6, 1.5, NaN])('rejects nonpresentable countdown %s', (seconds) => {
    expect(() => buildTransferPrompt(actor, pending, seconds)).toThrow();
  });

  it('builds a rename modal that does not mistake UTF-16 length for graphemes', () => {
    const name = '👩🏽‍💻'.repeat(11);
    const modal = buildRenameModal(actor, name).toJSON();
    expect(modal.custom_id).toBe('call:v2:rename-save:123e4567-e89b-42d3-a456-426614174000:4');
    expect(modal.title.length).toBeLessThanOrEqual(45);
    expect(modal.components).toEqual([{ type: ComponentType.ActionRow, components: [{
      type: ComponentType.TextInput, custom_id: 'name', label: 'Nome (até 11 grafemas)',
      style: TextInputStyle.Short, required: true, min_length: 1, max_length: 4000, value: name,
    }] }]);
  });

  it.each([0, 99])('builds a limit modal with current value %s and native text constraints', (limit) => {
    const modal = buildLimitModal(actor, limit).toJSON();
    expect(modal.custom_id).toBe('call:v2:limit-save:123e4567-e89b-42d3-a456-426614174000:4');
    expect(modal.components).toEqual([{ type: ComponentType.ActionRow, components: [{
      type: ComponentType.TextInput, custom_id: 'limit', label: 'Limite (0 = ilimitado; 1–99)',
      style: TextInputStyle.Short, required: true, min_length: 1, max_length: 2, value: String(limit),
    }] }]);
  });

  it('uses separate single-user selects for adding/removing allowed members', () => {
    const payload = json(buildAccessPrompt(actor));
    expect(payload.components).toEqual([
      { type: ComponentType.ActionRow, components: [{ type: ComponentType.UserSelect, custom_id: 'call:v2:allow-add:123e4567-e89b-42d3-a456-426614174000:4', placeholder: 'Adicionar autorizado', min_values: 1, max_values: 1 }] },
      { type: ComponentType.ActionRow, components: [{ type: ComponentType.UserSelect, custom_id: 'call:v2:allow-remove:123e4567-e89b-42d3-a456-426614174000:4', placeholder: 'Remover autorizado', min_values: 1, max_values: 1 }] },
    ]);
  });

  it('uses one native user select for a transfer target without filtering/authorizing in the view', () => {
    expect(json(buildTransferTargetPrompt(actor)).components).toEqual([
      { type: ComponentType.ActionRow, components: [{ type: ComponentType.UserSelect, custom_id: 'call:v2:transfer-target:123e4567-e89b-42d3-a456-426614174000:4', placeholder: 'Selecionar novo proprietário', min_values: 1, max_values: 1 }] },
    ]);
  });

  it('keeps every reusable private message monochrome, mention-safe and inside native row/option/ID limits', () => {
    for (const view of [buildOwnerMenu(actor), buildTransferPrompt(actor, pending, 5), buildAccessPrompt(actor), buildTransferTargetPrompt(actor)]) {
      const payload = json(view);
      expect(payload.allowedMentions).toEqual({ parse: [] });
      expect(payload.flags).toBeUndefined();
      expect(payload.embeds).toHaveLength(1);
      expect(payload.embeds[0]!.color).toBe(0x2b2d31);
      expect(payload.embeds[0]!.image).toBeUndefined();
      expect(payload.components.length).toBeLessThanOrEqual(5);
      for (const row of payload.components) {
        expect(row.type).toBe(ComponentType.ActionRow);
        expect(row.components.length).toBeLessThanOrEqual(row.components.every((c) => c.type === ComponentType.Button) ? 5 : 1);
        for (const component of row.components) {
          expect(component).toHaveProperty('custom_id');
          if ('custom_id' in component) {
            expect(component.custom_id.length).toBeLessThanOrEqual(100);
            expect(callComponentSchema.safeParse(component.custom_id).success).toBe(true);
          }
          if (component.type === ComponentType.StringSelect) {
            expect(component.options.length).toBeLessThanOrEqual(25);
            for (const option of component.options) {
              expect(option.label.length).toBeLessThanOrEqual(100);
              expect(option.value.length).toBeLessThanOrEqual(100);
            }
          }
        }
      }
    }
  });
});
