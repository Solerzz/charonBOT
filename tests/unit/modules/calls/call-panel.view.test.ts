import {
  ButtonStyle,
  ComponentType,
  type APIActionRowComponent,
  type APIButtonComponent,
  type APIEmbed,
  type APIStringSelectComponent,
  type MessageCreateOptions,
  type MessageEditOptions,
} from 'discord.js';
import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  buildCallPanel,
  type CallPanelInput,
  type CallPanelPayload,
} from '../../../../src/modules/calls/call-panel.view.js';

const room: CallPanelInput['room'] = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  channelDiscordId: '22345678901234567',
  name: 'Conversa',
  ownerDiscordId: '32345678901234567',
};

function json(input: CallPanelInput) {
  return JSON.parse(JSON.stringify(buildCallPanel(input))) as {
    embeds: APIEmbed[];
    components: APIActionRowComponent<APIButtonComponent | APIStringSelectComponent>[];
    allowedMentions: { parse: string[] };
    flags?: unknown;
  };
}

describe('buildCallPanel', () => {
  it('shows the current room, owner, participants and public status in a neutral native embed', () => {
    const payload = json({ room, participantCount: 3 });
    expect(payload.embeds).toHaveLength(1);
    expect(payload.embeds[0]).toMatchObject({
      title: 'Central da Call',
      color: 0x2b2d31,
      description: 'Controles disponíveis em breve',
    });
    expect(payload.embeds[0]!.fields).toEqual(expect.arrayContaining([
      { name: 'Sala', value: '<#22345678901234567> · Conversa' },
      { name: 'Proprietário', value: '<@32345678901234567>' },
      { name: 'Participantes', value: '3' },
      { name: 'Visibilidade', value: '🟢 Pública' },
    ]));
  });

  it('renders an ownerless empty room without a null mention or missing zero count', () => {
    const payload = json({ room: { ...room, ownerDiscordId: null }, participantCount: 0 });
    expect(payload.embeds[0]!.fields).toContainEqual({ name: 'Proprietário', value: 'Sem proprietário' });
    expect(payload.embeds[0]!.fields).toContainEqual({ name: 'Participantes', value: '0' });
    expect(JSON.stringify(payload)).not.toContain('<@null>');
  });

  it('reflects the supplied room and live participant count rather than stale panel state', () => {
    const payload = json({ room: {
      ...room, name: 'Jogos', channelDiscordId: '42345678901234567',
      ownerDiscordId: '52345678901234567',
    }, participantCount: 12 });
    expect(payload.embeds[0]!.fields).toEqual(expect.arrayContaining([
      { name: 'Sala', value: '<#42345678901234567> · Jogos' },
      { name: 'Proprietário', value: '<@52345678901234567>' },
      { name: 'Participantes', value: '12' },
    ]));
  });

  it.each([room.ownerDiscordId, null])('disables every serialized future control with owner %s within native row limits', (ownerDiscordId) => {
    const payload = json({ room: { ...room, ownerDiscordId }, participantCount: 2 });
    expect(payload.components.length).toBeGreaterThan(0);
    expect(payload.components.length).toBeLessThanOrEqual(5);
    for (const row of payload.components) {
      expect(row.type).toBe(ComponentType.ActionRow);
      expect(row.components.length).toBeGreaterThan(0);
      const buttonsOnly = row.components.every((component) => component.type === ComponentType.Button);
      expect(row.components.length).toBeLessThanOrEqual(buttonsOnly ? 5 : 1);
    }
    const controls = payload.components.flatMap((row) => row.components);
    expect(controls).toHaveLength(5);
    for (const control of controls) {
      expect(control.disabled).toBe(true);
      expect(control).toHaveProperty('custom_id', expect.stringMatching(/^.{1,100}$/));
      if (control.type === ComponentType.Button) {
        expect(control.style).toBe(ButtonStyle.Secondary);
      } else {
        expect(control.type).toBe(ComponentType.StringSelect);
        expect(control.options.length).toBeGreaterThan(0);
        expect(control.options.length).toBeLessThanOrEqual(25);
      }
    }
    expect(new Set(controls.map((control) => 'custom_id' in control ? control.custom_id : undefined)).size).toBe(5);
    for (const label of ['Renomear', 'Alterar limite', 'Privatizar', 'Assumir sala']) {
      expect(controls).toContainEqual(expect.objectContaining({ type: ComponentType.Button, label, disabled: true }));
    }
    expect(controls).toContainEqual(expect.objectContaining({
      type: ComponentType.StringSelect, placeholder: 'Moderar participantes', disabled: true,
    }));
  });

  it('can be sent or edited unchanged with no flags and no mention notifications', () => {
    expectTypeOf<CallPanelPayload>().toMatchTypeOf<MessageCreateOptions>();
    expectTypeOf<CallPanelPayload>().toMatchTypeOf<MessageEditOptions>();
    const payload = buildCallPanel({ room, participantCount: 1 });
    const create: MessageCreateOptions = payload;
    const edit: MessageEditOptions = payload;
    expect(create).toBe(edit);
    expect(json({ room, participantCount: 1 }).flags).toBeUndefined();
    expect(payload.allowedMentions).toEqual({ parse: [] });
  });
});
