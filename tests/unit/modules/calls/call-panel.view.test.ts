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
  visibility: 'PRIVATE' as const, isLocked: true, controlVersion: 7,
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
      { name: 'Sala', value: 'Conversa', inline: true },
      { name: 'Proprietário', value: '<@32345678901234567>', inline: true },
      { name: '\u200b', value: '\u200b', inline: false },
      { name: 'Participantes', value: '3 / 4', inline: true },
      { name: 'Acesso e visibilidade', value: 'Trancada · Oculta', inline: true },
    ]));
  });

  it('shows zero/unlimited, public visibility and absent ownership without null mentions', () => {
    const payload = json({ room: { ...room, ownerDiscordId: null, userLimit: 0, visibility: 'PUBLIC' }, participantCount: 0 });
    expect(payload.embeds[0]!.fields).toEqual(expect.arrayContaining([
      { name: 'Proprietário', value: 'Sem proprietário', inline: true },
      { name: 'Participantes', value: '0 / Ilimitado', inline: true },
      { name: 'Acesso e visibilidade', value: 'Trancada · Visível', inline: true },
    ]));
    expect(JSON.stringify(payload)).not.toContain('<@null>');
  });

  it.each([room.ownerDiscordId, null])('exposes 3+3+2 public controls with owner %s', (ownerDiscordId) => {
    const payload = json({ room: { ...room, ownerDiscordId }, participantCount: 12 });
    expect(payload.components.map(row => row.components.length)).toEqual([3, 3, 2]);
    const buttons = payload.components.flatMap(row => row.components);
    expect(buttons.map(button => 'custom_id' in button && button.custom_id.split(':')[2])).toEqual(['lock', 'visibility', 'rename', 'limit', 'access', 'transfer', 'claim', 'moderation']);
    expect(buttons.slice(0, 6).every(button => button.disabled === (ownerDiscordId === null))).toBe(true);
    expect(buttons[6]).toMatchObject({ type: ComponentType.Button, custom_id: 'call:v3:claim:123e4567-e89b-42d3-a456-426614174000:7', label: 'Assumir sala', style: ButtonStyle.Secondary, disabled: ownerDiscordId !== null });
    expect(buttons[7]).toMatchObject({ label: 'Moderação', disabled: ownerDiscordId === null });
    expect(JSON.stringify(payload)).not.toContain('Abrir controles');
  });

  it.each([
    [false, 'PUBLIC', 'Aberta · Visível', 'Trancar', 'Ocultar'],
    [true, 'PUBLIC', 'Trancada · Visível', 'Destrancar', 'Ocultar'],
    [false, 'PRIVATE', 'Aberta · Oculta', 'Trancar', 'Mostrar'],
    [true, 'PRIVATE', 'Trancada · Oculta', 'Destrancar', 'Mostrar'],
  ] as const)('renders independent state/available actions %s %s', (isLocked, visibility, state, lock, show) => {
    const payload = json({ room: { ...room, isLocked, visibility }, participantCount: 1 });
    expect(payload.embeds[0]!.fields).toContainEqual({ name: 'Acesso e visibilidade', value: state, inline: true });
    expect(payload.components[0]!.components.map(button => 'label' in button ? button.label : undefined)).toEqual([lock, show, 'Renomear']);
  });

  it('displays priority supplied by the caller without deciding eligibility or reading a clock', () => {
    const payload = json({ room: { ...room, ownerDiscordId: null,
      priorityMemberDiscordId: '42345678901234567', priorityExpiresAt: new Date(300_000),
    }, participantCount: 2 });
    expect(payload.embeds[0]!.fields).toContainEqual({ name: 'Prioridade para assumir', value: '<@42345678901234567> · até <t:300:R>' });
    expect(payload.components[2]!.components[0]!.disabled).toBe(false);
  });

  it('escapes user-controlled Markdown while suppressing all mention notifications', () => {
    const payload = json({ room: { ...room, name: '**@everyone' }, participantCount: 1 });
    expect(payload.embeds[0]!.fields![0]!.value).toBe('\\*\\*@\u200beveryone');
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
