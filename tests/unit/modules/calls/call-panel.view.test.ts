import {
  ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, TextInputBuilder, UserSelectMenuBuilder,
  ButtonStyle, ComponentType, type APIActionRowComponent, type APIButtonComponent,
  type APIEmbed, type MessageCreateOptions, type MessageEditOptions,
} from 'discord.js';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { buildCallPanel, type CallPanelInput, type CallPanelPayload, type CallPanelRow } from '../../../../src/modules/calls/call-panel.view.js';

const room = {
  id: '123e4567-e89b-42d3-a456-426614174000', channelDiscordId: '22345678901234567',
  name: 'Conversa', ownerDiscordId: '32345678901234567', userLimit: 4,
  visibility: 'PRIVATE' as const, controlVersion: 7,
  priorityMemberDiscordId: null, priorityExpiresAt: null,
};

function json(input: Omit<CallPanelInput, 'observedAt'> & { observedAt?: Date }) {
  return JSON.parse(JSON.stringify(buildCallPanel({ observedAt: new Date(0), ...input }))) as {
    embeds: APIEmbed[]; components: APIActionRowComponent<APIButtonComponent>[];
    allowedMentions: { parse: string[] }; flags?: unknown;
  };
}

describe('buildCallPanel', () => {
  it.each([300_000, 300_001])('shows open claim at observation %s without removing the durable marker', (at) => {
    const marked = { ...room, ownerDiscordId: null, priorityMemberDiscordId: '42345678901234567', priorityExpiresAt: new Date(300_000) };
    const payload = json({ room: marked, participantCount: 2, observedAt: new Date(at) } as CallPanelInput);
    expect(JSON.stringify(payload)).toContain('Qualquer participante elegível');
    expect(JSON.stringify(payload)).not.toContain('até <t:300:R>');
    expect(marked.priorityExpiresAt).toEqual(new Date(300_000));
  });
  it('shows the current owner, occupancy/limit and actual private visibility', () => {
    const payload = json({ room, participantCount: 3 });
    expect(payload.embeds).toHaveLength(1);
    expect(payload.embeds[0]).toMatchObject({ title: 'Central da Call', color: 0x2b2d31 });
    expect(payload.embeds[0]!.fields).toEqual(expect.arrayContaining([
      { name: 'Sala', value: '<#22345678901234567> · Conversa' },
      { name: 'Proprietário', value: '<@32345678901234567>' },
      { name: 'Participantes', value: '3 / 4' },
      { name: 'Visibilidade', value: 'Privada' },
    ]));
  });

  it('shows zero/unlimited, public visibility and absent ownership without null mentions', () => {
    const payload = json({ room: { ...room, ownerDiscordId: null, userLimit: 0, visibility: 'PUBLIC' }, participantCount: 0 });
    expect(payload.embeds[0]!.fields).toEqual(expect.arrayContaining([
      { name: 'Proprietário', value: 'Sem proprietário' },
      { name: 'Participantes', value: '0 / Ilimitado' },
      { name: 'Visibilidade', value: 'Pública' },
    ]));
    expect(JSON.stringify(payload)).not.toContain('<@null>');
  });

  it.each([room.ownerDiscordId, null])('exposes only two public buttons with owner %s', (ownerDiscordId) => {
    const payload = json({ room: { ...room, ownerDiscordId }, participantCount: 12 });
    expect(payload.components).toHaveLength(1);
    expect(payload.components[0]).toEqual({ type: ComponentType.ActionRow, components: [
      { type: ComponentType.Button, custom_id: 'call:v2:open:123e4567-e89b-42d3-a456-426614174000:7', label: 'Abrir controles', style: ButtonStyle.Secondary, disabled: false },
      { type: ComponentType.Button, custom_id: 'call:v2:claim:123e4567-e89b-42d3-a456-426614174000:7', label: 'Assumir sala', style: ButtonStyle.Secondary, disabled: ownerDiscordId !== null },
    ] });
  });

  it('displays priority supplied by the caller without deciding eligibility or reading a clock', () => {
    const payload = json({ room: { ...room, ownerDiscordId: null,
      priorityMemberDiscordId: '42345678901234567', priorityExpiresAt: new Date(300_000),
    }, participantCount: 2 });
    expect(payload.embeds[0]!.fields).toContainEqual({ name: 'Prioridade para assumir', value: '<@42345678901234567> · até <t:300:R>' });
    expect(payload.components[0]!.components[1]!.disabled).toBe(false);
  });

  it('escapes user-controlled Markdown while suppressing all mention notifications', () => {
    const payload = json({ room: { ...room, name: '**@everyone' }, participantCount: 1 });
    expect(payload.embeds[0]!.fields![0]!.value).toBe('<#22345678901234567> · \\*\\*@everyone');
    expect(payload.allowedMentions).toEqual({ parse: [] });
  });

  it('supports sending/editing unchanged without create-only flags', () => {
    expectTypeOf<ActionRowBuilder<ButtonBuilder>>().toMatchTypeOf<CallPanelRow>();
    expectTypeOf<ActionRowBuilder<StringSelectMenuBuilder>>().toMatchTypeOf<CallPanelRow>();
    expectTypeOf<ActionRowBuilder<UserSelectMenuBuilder>>().toMatchTypeOf<CallPanelRow>();
    expectTypeOf<ActionRowBuilder<TextInputBuilder>>().not.toMatchTypeOf<CallPanelRow>();
    expectTypeOf<CallPanelPayload>().toMatchTypeOf<MessageCreateOptions>();
    expectTypeOf<CallPanelPayload>().toMatchTypeOf<MessageEditOptions>();
    const payload = buildCallPanel({ room, participantCount: 1, observedAt: new Date(0) });
    const create: MessageCreateOptions = payload;
    const edit: MessageEditOptions = payload;
    expect(create).toBe(edit);
    expect(json({ room, participantCount: 1 }).flags).toBeUndefined();
    expect(payload.allowedMentions).toEqual({ parse: [] });
  });
});
