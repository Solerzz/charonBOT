import { ButtonStyle, ChannelType, ComponentType } from 'discord.js';
import { describe, expect, it } from 'vitest';

import type { VoiceCreatorConfiguration } from '../../../../src/modules/setup/setup.repository.js';
import { buildSetupDashboard, buildSetupCreationCategory, buildSetupCreationReview } from '../../../../src/modules/setup/setup.views.js';
import type { ReadySetupDraft } from '../../../../src/modules/setup/setup-creation.types.js';

const first: VoiceCreatorConfiguration = {
  id: '123e4567-e89b-42d3-a456-426614174000', guildDiscordId: '12345678901234567',
  creatorChannelDiscordId: '22345678901234567', categoryDiscordId: '32345678901234567',
  roomCommandsEnabled: true, defaultUserLimit: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date(),
};
const second = { ...first, id: '123e4567-e89b-42d3-a456-426614174001', creatorChannelDiscordId: '42345678901234567', roomCommandsEnabled: false };

function json(input: Parameters<typeof buildSetupDashboard>[0]) {
  return JSON.parse(JSON.stringify(buildSetupDashboard(input)));
}

describe('buildSetupDashboard', () => {
  it('offers guided creation rather than adopting an existing voice channel', () => {
    const payload = json({ configurations: [] });
    expect(payload.flags).toBeUndefined();
    expect(payload.allowedMentions).toEqual({ parse: [] });
    expect(payload.embeds[0]).toMatchObject({
      title: 'Configuração do Charon', color: 0x2b2d31,
      description: 'Nenhum Voice Creator configurado. Crie um canal de entrada para começar.',
    });
    expect(payload.components).toEqual([{
      type: ComponentType.ActionRow, components: [{
         type: ComponentType.Button, custom_id: 'setup:v2:create:start',
         label: 'Criar canal de entrada', style: ButtonStyle.Primary,
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
      { name: 'Comandos da sala', value: 'Habilitados' },
      { name: 'Limite padrão das novas calls', value: '0 · sem limite' },
      { name: 'Zona de perigo', value: 'Excluir remove apenas a configuração. O canal e as salas ativas são preservados.' },
    ]);
    const controls = payload.components.flatMap((row: { components: unknown[] }) => row.components);
    expect(controls[0]).toMatchObject({ type: ComponentType.StringSelect, custom_id: `setup:v1:select:${first.id}`, options: [
      { label: 'Criar sala', value: first.id, default: true },
      { label: second.creatorChannelDiscordId, value: second.id, default: false },
    ] });
    expect(controls).toContainEqual(expect.objectContaining({ type: ComponentType.ChannelSelect, custom_id: `setup:v1:change-category:${first.id}`, placeholder: 'Alterar categoria', channel_types: [ChannelType.GuildCategory] }));
    expect(controls).toContainEqual(expect.objectContaining({ type: ComponentType.Button, custom_id: `setup:v1:rename:${first.id}`, label: 'Renomear', style: ButtonStyle.Secondary }));
    expect(controls).toContainEqual(expect.objectContaining({ custom_id: `setup:v1:default-limit:${first.id}`, label: 'Limite padrão' }));
    expect(controls).toContainEqual(expect.objectContaining({ custom_id: `setup:v1:toggle-commands:${first.id}`, label: 'Comandos: habilitados', style: ButtonStyle.Secondary }));
    expect(controls).toContainEqual(expect.objectContaining({ custom_id: `setup:v1:delete:${first.id}`, label: 'Excluir configuração', style: ButtonStyle.Danger }));
    expect(controls.every((control: { emoji?: unknown }) => control.emoji === undefined)).toBe(true);
    expect(payload.components.length).toBeLessThanOrEqual(5);
  });

  it('renders the explicitly selected creator rather than another creator settings', () => {
    const payload = json({ configurations: [first, second], selectedVoiceCreatorId: second.id });
    expect(payload.embeds[0].fields[0].value).toBe('<#42345678901234567>');
    expect(payload.embeds[0].fields[3].value).toBe('Desabilitados');
    expect(payload.components[0].components[0].options[1].default).toBe(true);
  });

  it('falls back to the first creator when the old selection was removed', () => {
    const payload = json({ configurations: [first], selectedVoiceCreatorId: second.id });
    expect(payload.embeds[0].fields[0].value).toBe('<#22345678901234567>');
    expect(payload.embeds[0].description).toBe('1 Voice Creator configurado. Selecione um para editar.');
  });

  it('marks missing voice/category targets unavailable while preserving recovery controls', () => {
    const payload = json({ configurations: [first, second], unavailableChannelDiscordIds: [first.creatorChannelDiscordId, first.categoryDiscordId] });
    expect(payload.flags).toBeUndefined();
    expect(payload.embeds[0].color).toBe(0x2b2d31);
    expect(payload.embeds[0].fields).toContainEqual({ name: 'Atenção', value: 'Canal Voice Creator indisponível. Selecione outro Voice Creator ou exclua esta configuração.\nCategoria indisponível. Escolha outra categoria.' });
    expect(payload.embeds[0].fields[0].value).toBe('Indisponível · ID 22345678901234567');
    expect(payload.embeds[0].fields[1].value).toBe('Indisponível · ID 32345678901234567');
    expect(payload.embeds[0].fields[2].value).toBe('Indisponível');
    const controls = payload.components.flatMap((row: { components: unknown[] }) => row.components);
    expect(controls[0].options[0]).toMatchObject({ label: 'Canal indisponível · 22345678901234567', value: first.id, default: true });
    const category = controls.find((control: { custom_id: string }) => control.custom_id === `setup:v1:change-category:${first.id}`);
    expect(category.default_values).toBeUndefined();
    expect(category.disabled).not.toBe(true);
    expect(controls.find((control: { custom_id: string }) => control.custom_id === `setup:v1:delete:${first.id}`).disabled).not.toBe(true);
    expect(controls.find((control: { custom_id: string }) => control.custom_id === 'setup:v2:create:start').disabled).not.toBe(true);
  });

  it('does not carry another creator unavailable warning onto the selected healthy creator', () => {
    const payload = json({ configurations: [first, second], selectedVoiceCreatorId: second.id, unavailableChannelDiscordIds: [first.creatorChannelDiscordId] });
    expect(payload.embeds[0].fields.some((field: { name: string }) => field.name === 'Atenção')).toBe(false);
    expect(payload.embeds[0].fields[0].value).toBe('<#42345678901234567>');
    expect(payload.components[2].components[0].default_values).toEqual([{ id: second.categoryDiscordId, type: 'channel' }]);
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

describe('guided creation views', () => {
  const draft: ReadySetupDraft = { id: first.id, revision: 2, context: { guildDiscordId: first.guildDiscordId, administratorDiscordId: '42345678901234567', messageDiscordId: '52345678901234567' }, expiresAt: 600000, status: 'review', input: { categoryDiscordId: first.categoryDiscordId, name: 'Entrada @everyone', defaultUserLimit: 4 } };

  it('uses a category-only selector and revision-bound cancel', () => {
    const payload = JSON.parse(JSON.stringify(buildSetupCreationCategory({ ...draft, status: 'editing' })));
    expect(payload.allowedMentions).toEqual({ parse: [] });
    expect(payload.components[0].components[0]).toMatchObject({ type: ComponentType.ChannelSelect, channel_types: [ChannelType.GuildCategory], custom_id: `setup:v2:create:category:${first.id}:2` });
    expect(JSON.stringify(payload.components)).toContain(`setup:v2:create:cancel:${first.id}:2`);
  });

  it.each([0, 1, 99])('shows independent entry/call naming and limit %i in a non-pinging review', (limit) => {
    const payload = JSON.parse(JSON.stringify(buildSetupCreationReview({ ...draft, input: { ...draft.input, defaultUserLimit: limit } })));
    expect(payload.allowedMentions).toEqual({ parse: [] });
    expect(payload.flags).toBeUndefined();
    const content = JSON.stringify(payload.embeds);
    expect(content).toContain('Entrada @everyone');
    expect(content).toContain('<#32345678901234567>');
    expect(content).toContain(String(limit));
    expect(content).toContain('sem limite');
    expect(content).toContain('automático');
    expect(payload.components[0].components).toEqual([
      expect.objectContaining({ custom_id: `setup:v2:create:confirm:${first.id}:2`, label: 'Confirmar criação' }),
      expect.objectContaining({ custom_id: `setup:v2:create:back:${first.id}:2`, label: 'Voltar' }),
      expect.objectContaining({ custom_id: `setup:v2:create:cancel:${first.id}:2`, label: 'Cancelar' }),
    ]);
  });
});
