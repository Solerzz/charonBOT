import { ButtonStyle, ChannelType, ComponentType } from 'discord.js';
import { describe, expect, it } from 'vitest';

import type { VoiceCreatorConfiguration } from '../../../../src/modules/setup/setup.repository.js';
import { buildSetupDashboard } from '../../../../src/modules/setup/setup.views.js';

const first: VoiceCreatorConfiguration = {
  id: '123e4567-e89b-42d3-a456-426614174000', guildDiscordId: '12345678901234567',
  creatorChannelDiscordId: '22345678901234567', categoryDiscordId: '32345678901234567',
  roomCommandsEnabled: true, deletedAt: null, createdAt: new Date(), updatedAt: new Date(),
};
const second = { ...first, id: '123e4567-e89b-42d3-a456-426614174001', creatorChannelDiscordId: '42345678901234567', roomCommandsEnabled: false };

function json(input: Parameters<typeof buildSetupDashboard>[0]) {
  return JSON.parse(JSON.stringify(buildSetupDashboard(input)));
}

describe('buildSetupDashboard', () => {
  it('renders an empty monochrome dashboard with a native existing voice-channel selector', () => {
    const payload = json({ configurations: [] });
    expect(payload.flags).toBeUndefined();
    expect(payload.allowedMentions).toEqual({ parse: [] });
    expect(payload.embeds[0]).toMatchObject({
      title: 'Configuração do Charon', color: 0x2b2d31,
      description: 'Nenhum Voice Creator configurado. Adicione um canal de voz existente para começar.',
    });
    expect(payload.components).toEqual([{
      type: ComponentType.ActionRow, components: [{
        type: ComponentType.ChannelSelect, custom_id: 'setup:v1:add',
        placeholder: 'Adicionar Voice Creator', channel_types: [ChannelType.GuildVoice],
        min_values: 1, max_values: 1,
      }],
    }]);
  });

  it('selects the first creator and renders persisted settings with native controls', () => {
    const payload = json({ configurations: [first, second], voiceChannels: [{ id: first.creatorChannelDiscordId, name: 'Criar sala', categoryDiscordId: first.categoryDiscordId }] });
    expect(payload.embeds[0].description).toBe('2 Voice Creators configurados. Selecione um para editar.');
    expect(payload.embeds[0].fields).toEqual([
      { name: 'Voice Creator', value: '<#22345678901234567>' },
      { name: 'Categoria das salas', value: '<#32345678901234567>' },
      { name: 'Nome do canal', value: 'Criar sala' },
      { name: 'Comandos da sala', value: 'Habilitados · disponíveis em versões futuras' },
      { name: 'Zona de perigo', value: 'Excluir remove apenas a configuração. O canal e as salas ativas são preservados.' },
    ]);
    const controls = payload.components.flatMap((row: { components: unknown[] }) => row.components);
    expect(controls[0]).toMatchObject({ type: ComponentType.StringSelect, custom_id: `setup:v1:select:${first.id}`, options: [
      { label: 'Criar sala', value: first.id, default: true },
      { label: second.creatorChannelDiscordId, value: second.id, default: false },
    ] });
    expect(controls).toContainEqual(expect.objectContaining({ type: ComponentType.ChannelSelect, custom_id: `setup:v1:change-category:${first.id}`, placeholder: 'Alterar categoria', channel_types: [ChannelType.GuildCategory] }));
    expect(controls).toContainEqual(expect.objectContaining({ type: ComponentType.Button, custom_id: `setup:v1:rename:${first.id}`, label: 'Renomear', style: ButtonStyle.Secondary }));
    expect(controls).toContainEqual(expect.objectContaining({ custom_id: `setup:v1:toggle-commands:${first.id}`, label: 'Comandos: habilitados', style: ButtonStyle.Secondary }));
    expect(controls).toContainEqual(expect.objectContaining({ custom_id: `setup:v1:delete:${first.id}`, label: 'Excluir configuração', style: ButtonStyle.Danger }));
    expect(controls.every((control: { emoji?: unknown }) => control.emoji === undefined)).toBe(true);
    expect(payload.components.length).toBeLessThanOrEqual(5);
  });

  it('renders the explicitly selected creator rather than another creator settings', () => {
    const payload = json({ configurations: [first, second], selectedVoiceCreatorId: second.id });
    expect(payload.embeds[0].fields[0].value).toBe('<#42345678901234567>');
    expect(payload.embeds[0].fields[3].value).toBe('Desabilitados · disponíveis em versões futuras');
    expect(payload.components[0].components[0].options[1].default).toBe(true);
  });

  it('falls back to the first creator when the old selection was removed', () => {
    const payload = json({ configurations: [first], selectedVoiceCreatorId: second.id });
    expect(payload.embeds[0].fields[0].value).toBe('<#22345678901234567>');
    expect(payload.embeds[0].description).toBe('1 Voice Creator configurado. Selecione um para editar.');
  });

  it('navigates all creators in large guilds with existing UUID selection actions', () => {
    const configurations = Array.from({ length: 30 }, (_, i) => ({ ...first, id: `123e4567-e89b-42d3-a456-${String(i).padStart(12, '0')}` }));
    const firstPage = json({ configurations });
    expect(firstPage.components[0].components[0].options).toHaveLength(24);
    expect(firstPage.components[0].components[0].options).toContainEqual({
      label: 'Próximos Voice Creators', value: configurations[23]!.id, default: false,
    });
    const payload = json({ configurations, selectedVoiceCreatorId: configurations[29]!.id });
    expect(payload.components[0].components[0].options).toHaveLength(8);
    expect(payload.components[0].components[0].options).toContainEqual(expect.objectContaining({ value: configurations[29]!.id, default: true }));
    expect(payload.components[0].components[0].options).toContainEqual({
      label: 'Voice Creators anteriores', value: configurations[0]!.id, default: false,
    });
    expect(payload.embeds[0].footer.text).toBe('Página 2 de 2 · 30 Voice Creators');
  });

  it('fits previous and next navigation alongside the selected page within 25 options', () => {
    const configurations = Array.from({ length: 70 }, (_, i) => ({ ...first, id: `123e4567-e89b-42d3-a456-${String(i).padStart(12, '0')}` }));
    const payload = json({ configurations, selectedVoiceCreatorId: configurations[24]!.id });
    const options = payload.components[0].components[0].options;
    expect(options).toHaveLength(25);
    expect(options[0]).toEqual({ label: 'Voice Creators anteriores', value: configurations[0]!.id, default: false });
    expect(options[24]).toEqual({ label: 'Próximos Voice Creators', value: configurations[46]!.id, default: false });
    expect(options[2]).toMatchObject({ value: configurations[24]!.id, default: true });
  });
});
