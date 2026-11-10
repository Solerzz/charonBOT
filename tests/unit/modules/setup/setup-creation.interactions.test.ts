import { MessageFlags, MessageFlagsBitField, PermissionFlagsBits, PermissionsBitField, type Interaction } from 'discord.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from '../../../../src/core/logger/logger.js';
import { SetupCreationInteractions } from '../../../../src/modules/setup/setup-creation.interactions.js';
import { SetupCreationService } from '../../../../src/modules/setup/setup-creation.service.js';
import type { SetupDraftContext, SetupDraftRef } from '../../../../src/modules/setup/setup-creation.types.js';
import { SetupDraftStore } from '../../../../src/modules/setup/setup-drafts.js';
import { SetupChannelCreationError, SetupDiscordError, type SetupDiscordGateway } from '../../../../src/modules/setup/setup.discord.js';
import type { SetupDiscordGatewayFactory, SetupInteraction } from '../../../../src/modules/setup/setup.interactions.js';
import type { CreateVoiceCreatorInput, VoiceCreatorConfiguration, VoiceCreatorRepository } from '../../../../src/modules/setup/setup.repository.js';

const guildId = '12345678901234567';
const administratorId = '22345678901234567';
const messageId = '32345678901234567';
const categoryId = '42345678901234567';
const channelId = '52345678901234567';
const context: SetupDraftContext = { guildDiscordId: guildId, administratorDiscordId: administratorId, messageDiscordId: messageId };
const stores: SetupDraftStore[] = [];
afterEach(async () => { await Promise.all(stores.splice(0).map((store) => store.dispose())); vi.useRealTimers(); });
const flush = async () => { await new Promise<void>((resolve) => setImmediate(resolve)); };
function gate() { let release!: () => void; const promise = new Promise<void>((resolve) => { release = resolve; }); return { promise, release }; }

function fixture() {
  let now = 0;
  const drafts = new SetupDraftStore({ now: () => now }); stores.push(drafts);
  const events: string[] = [];
  const configurations: VoiceCreatorConfiguration[] = [];
  const create = vi.fn(async (input: CreateVoiceCreatorInput): Promise<VoiceCreatorConfiguration> => {
    events.push('persist');
    const row = { ...input, id: '123e4567-e89b-42d3-a456-426614174000', defaultUserLimit: input.defaultUserLimit ?? 0, roomCommandsEnabled: true, deletedAt: null, createdAt: new Date(0), updatedAt: new Date(0) };
    configurations.push(row); return structuredClone(row);
  });
  const repository: VoiceCreatorRepository = {
    create, listByGuild: vi.fn(async () => structuredClone(configurations)),
    findById: vi.fn(async () => null), findByChannel: vi.fn(async () => null),
    findStoredByChannel: vi.fn(async () => null), updateCategory: vi.fn(),
    setDefaultUserLimit: vi.fn(), setRoomCommandsEnabled: vi.fn(), delete: vi.fn(),
  };
  const assertCanConfigure = vi.fn(async () => { events.push('preflight'); });
  const getCategory = vi.fn<SetupDiscordGateway['getCategory']>(async (id) => { events.push('category'); return { id, name: 'Categoria' }; });
  const createVoiceCreator = vi.fn(async () => { events.push('create'); return { id: channelId, name: 'Entrada', categoryDiscordId: categoryId }; });
  const deleteCreatedVoiceCreatorIfEmpty = vi.fn(async () => true);
  const gateway: SetupDiscordGateway = { assertCanConfigure, getCategory, createVoiceCreator, deleteCreatedVoiceCreatorIfEmpty, getVoiceChannel: vi.fn(async (id) => ({ id, name: 'Entrada', categoryDiscordId: categoryId })), renameVoiceChannel: vi.fn() };
  const factory = vi.fn<SetupDiscordGatewayFactory>(() => gateway);
  const handler = new SetupCreationInteractions(drafts, new SetupCreationService(repository, createLogger({ level: 'silent' })), factory);
  function event(customId: string, kind: 'button' | 'category' | 'form' = 'button', fields = { name: '  Entrada  ', 'default-limit': '4' }) {
    const reply = vi.fn(async (_payload: unknown) => { events.push('reply'); });
    const deferUpdate = vi.fn(async () => { events.push('ack'); });
    const editReply = vi.fn(async (_payload: unknown) => { events.push('render'); });
    const showModal = vi.fn(async (_payload: unknown) => { events.push('modal'); });
    const interaction = {
      id: '62345678901234567', customId, guildId, guild: { id: guildId }, user: { id: administratorId },
      channelId: '72345678901234567', inGuild: () => true,
      memberPermissions: new PermissionsBitField(PermissionFlagsBits.Administrator),
      message: { id: messageId, guildId, interactionMetadata: { user: { id: administratorId } }, flags: new MessageFlagsBitField(MessageFlags.Ephemeral), embeds: [{ description: 'forged data' }] },
      isButton: () => kind === 'button', isAnySelectMenu: () => kind === 'category', isChannelSelectMenu: () => kind === 'category',
      isModalSubmit: () => kind === 'form', isFromMessage: () => true,
      values: [categoryId], fields: { getTextInputValue: (key: string) => { if (!(key in fields)) throw new Error('missing'); return fields[key as keyof typeof fields]; } },
      reply, deferUpdate, editReply, showModal,
    } as unknown as SetupInteraction;
    return { interaction, reply, deferUpdate, editReply, showModal };
  }
  async function start() {
    const e = event('setup:v2:create:start'); await handler.execute(e.interaction);
    const id = json(e.editReply.mock.calls[0]![0]).components[0].components[0].custom_id;
    return { id: id.split(':')[4] as string, revision: 0 };
  }
  async function review() {
    const ref = await start();
    await handler.execute(event(`setup:v2:create:category:${ref.id}:0`, 'category').interaction);
    await handler.execute(event(`setup:v2:create:form:${ref.id}:1`, 'form').interaction);
    return { id: ref.id, revision: 2 };
  }
  return { drafts, handler, factory, gateway, repository, configurations, events, create, createVoiceCreator, assertCanConfigure, getCategory, deleteCreatedVoiceCreatorIfEmpty, event, start, review, advance: () => { now = 600000; } };
}
const json = (value: unknown) => JSON.parse(JSON.stringify(value));
const confirmId = (ref: SetupDraftRef) => `setup:v2:create:confirm:${ref.id}:${ref.revision}`;

describe('private guided setup', () => {
  it('routes creation including malformed IDs but never steals v1 editing', () => {
    const f = fixture();
    for (const id of ['setup:v2:create:start', 'setup:v2:create:garbage']) expect(f.handler.canHandle(f.event(id).interaction)).toBe(true);
    for (const id of ['setup:v1:rename:x', 'call:v2:open:x', 'setup:v2:creation:start']) expect(f.handler.canHandle(f.event(id).interaction)).toBe(false);
    expect(f.handler.canHandle({ ...f.event('setup:v2:create:start').interaction, isButton: () => false, isAnySelectMenu: () => false, isModalSubmit: () => false } as unknown as Interaction)).toBe(false);
  });

  it('binds start to authenticated guild/current user/original private message without persistent writes', async () => {
    const f = fixture(); const ref = await f.start();
    expect(f.drafts.get(ref, context)).toMatchObject({ status: 'editing', context, input: {} });
    expect(f.configurations).toEqual([]); expect(f.createVoiceCreator).not.toHaveBeenCalled();
    expect(f.events[0]).toBe('ack');
  });

  it('opens the category form immediately without factory, gateway or repository I/O', async () => {
    const f = fixture(); const ref = await f.start(); f.factory.mockClear(); f.events.length = 0;
    f.assertCanConfigure.mockReturnValue(new Promise(() => {}));
    vi.mocked(f.repository.listByGuild).mockReturnValue(new Promise(() => {}));
    const e = f.event(`setup:v2:create:category:${ref.id}:0`, 'category');
    const pending = f.handler.execute(e.interaction);
    expect(e.showModal).toHaveBeenCalledOnce(); await pending;
    expect(f.events).toEqual(['modal', 'render']); expect(f.factory).not.toHaveBeenCalled();
    expect(e.deferUpdate).not.toHaveBeenCalled();
    expect(json(e.editReply.mock.calls[0]![0])).toMatchObject({ allowedMentions: { parse: [] } });
    const modal = json(e.showModal.mock.calls[0]![0]);
    expect(modal).toMatchObject({ title: 'Criar canal de entrada', custom_id: `setup:v2:create:form:${ref.id}:1` });
    expect(modal.components.map((row: { components: unknown[] }) => row.components[0])).toEqual([
      expect.objectContaining({ custom_id: 'name', min_length: 1, max_length: 100 }),
      expect.objectContaining({ custom_id: 'default-limit', value: '0' }),
    ]);
    expect(f.drafts.get({ ...ref, revision: 1 }, context).input.categoryDiscordId).toBe(categoryId);
  });

  it.each(['0', '1', '99'])('validates and acknowledges form limit %s before dependencies, then reviews server state', async (limit) => {
    const f = fixture(); const ref = await f.start();
    await f.handler.execute(f.event(`setup:v2:create:category:${ref.id}:0`, 'category').interaction);
    f.events.length = 0;
    const e = f.event(`setup:v2:create:form:${ref.id}:1`, 'form', { name: '  Entrada @everyone  ', 'default-limit': limit });
    await f.handler.execute(e.interaction);
    expect(f.events[0]).toBe('ack');
    expect(f.drafts.get({ ...ref, revision: 2 }, context)).toMatchObject({ status: 'review', input: { name: 'Entrada @everyone', defaultUserLimit: Number(limit), categoryDiscordId: categoryId } });
    expect(json(e.editReply.mock.calls[0]![0]).allowedMentions).toEqual({ parse: [] });
    expect(f.createVoiceCreator).not.toHaveBeenCalled(); expect(f.configurations).toEqual([]);
  });

  it.each(['cancel', 'reselect'] as const)('keeps rendered controls usable after modal dismissal: %s', async (action) => {
    const f = fixture(); const start = f.event('setup:v2:create:start');
    await f.handler.execute(start.interaction);
    const initial = json(start.editReply.mock.calls[0]![0]);
    const select = f.event(initial.components[0].components[0].custom_id, 'category');
    await f.handler.execute(select.interaction);
    // Dismissal sends no event. Use only controls actually sent to the message.
    const visible = select.editReply.mock.calls.length ? json(select.editReply.mock.calls.at(-1)![0]) : initial;
    const formId: string = json(select.showModal.mock.calls[0]![0]).custom_id;
    const id = formId.split(':')[4]!;
    const next = f.event(visible.components[action === 'cancel' ? 1 : 0].components[0].custom_id, action === 'cancel' ? 'button' : 'category');
    await f.handler.execute(next.interaction);
    if (action === 'cancel') {
      expect(next.editReply).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining('cancelada'), components: [] }));
      expect(() => f.drafts.get({ id, revision: 1 }, context)).toThrow();
    } else {
      expect(next.showModal).toHaveBeenCalledOnce();
      expect(json(next.showModal.mock.calls[0]![0]).custom_id).toBe(`setup:v2:create:form:${id}:2`);
      const old = f.event(formId, 'form'); await f.handler.execute(old.interaction);
      expect(old.reply).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining('expirou') }));
      expect(f.drafts.get({ id, revision: 2 }, context).status).toBe('editing');
    }
    expect(f.createVoiceCreator).not.toHaveBeenCalled(); expect(f.configurations).toEqual([]);
  });

  it.each(['retry', 'cancel'] as const)('recovers from invalid submission through rendered editing controls: %s', async (action) => {
    const f = fixture(); const start = f.event('setup:v2:create:start'); await f.handler.execute(start.interaction);
    const initial = json(start.editReply.mock.calls[0]![0]);
    const select = f.event(initial.components[0].components[0].custom_id, 'category'); await f.handler.execute(select.interaction);
    const visible = select.editReply.mock.calls.length ? json(select.editReply.mock.calls.at(-1)![0]) : initial;
    const formId: string = json(select.showModal.mock.calls[0]![0]).custom_id;
    const invalid = f.event(formId, 'form', { name: 'Entrada', 'default-limit': '100' });
    await f.handler.execute(invalid.interaction);
    expect(invalid.reply).toHaveBeenCalledWith(expect.objectContaining({ flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } }));
    const next = f.event(visible.components[action === 'cancel' ? 1 : 0].components[0].custom_id, action === 'cancel' ? 'button' : 'category');
    await f.handler.execute(next.interaction);
    if (action === 'cancel') {
      expect(next.editReply).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining('cancelada'), components: [] }));
      expect(() => f.drafts.get({ id: formId.split(':')[4]!, revision: 1 }, context)).toThrow();
    } else {
      expect(next.showModal).toHaveBeenCalledOnce();
      const retryId: string = json(next.showModal.mock.calls[0]![0]).custom_id;
      expect(retryId).not.toBe(formId);
      const stale = f.event(formId, 'form'); await f.handler.execute(stale.interaction);
      expect(stale.reply).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining('expirou') }));
      const corrected = f.event(retryId, 'form', { name: '  Corrigido  ', 'default-limit': '9' });
      await f.handler.execute(corrected.interaction);
      const review = json(corrected.editReply.mock.calls[0]![0]);
      expect(review.components[0].components[0].label).toBe('Confirmar criação');
      expect(f.drafts.get({ id: retryId.split(':')[4]!, revision: 3 }, context)).toMatchObject({ status: 'review', input: { name: 'Corrigido', defaultUserLimit: 9 } });
      const cancel = f.event(review.components[0].components[2].custom_id); await f.handler.execute(cancel.interaction);
      expect(cancel.editReply).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining('cancelada'), components: [] }));
    }
    expect(f.createVoiceCreator).not.toHaveBeenCalled(); expect(f.create).not.toHaveBeenCalled();
  });

  it.each([{ name: '', 'default-limit': '4' }, { name: 'x'.repeat(101), 'default-limit': '4' }, ...['', '-1', '100', '1.5', '01'].map((limit) => ({ name: 'Entrada', 'default-limit': limit }))])('rejects invalid form without external work: %j', async (fields) => {
    const f = fixture(); const ref = await f.start();
    await f.handler.execute(f.event(`setup:v2:create:category:${ref.id}:0`, 'category').interaction);
    f.factory.mockClear(); const e = f.event(`setup:v2:create:form:${ref.id}:1`, 'form', fields);
    await f.handler.execute(e.interaction);
    expect(e.reply).toHaveBeenCalledWith(expect.objectContaining({ flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } }));
    expect(f.factory).not.toHaveBeenCalled(); expect(f.createVoiceCreator).not.toHaveBeenCalled();
  });

  it('returns to category selection with a new revision and cancels without configuration/channel creation', async () => {
    const f = fixture(); const ref = await f.review();
    const back = f.event(`setup:v2:create:back:${ref.id}:2`); await f.handler.execute(back.interaction);
    expect(json(back.editReply.mock.calls[0]![0]).components[0].components[0].custom_id).toBe(`setup:v2:create:category:${ref.id}:3`);
    const cancel = f.event(`setup:v2:create:cancel:${ref.id}:3`); await f.handler.execute(cancel.interaction);
    expect(() => f.drafts.get({ ...ref, revision: 3 }, context)).toThrow();
    expect(json(cancel.editReply.mock.calls[0]![0])).toMatchObject({ components: [], allowedMentions: { parse: [] } });
    expect(f.configurations).toEqual([]); expect(f.createVoiceCreator).not.toHaveBeenCalled();
  });

  it('confirms once from validated state, records success before rendering, selects the saved creator and replays', async () => {
    const f = fixture(); const ref = await f.review(); f.events.length = 0;
    const e = f.event(confirmId(ref));
    e.editReply.mockImplementation(async () => { expect(f.drafts.get(ref, context)).toMatchObject({ status: 'created', result: { status: 'created' } }); });
    await f.handler.execute(e.interaction);
    expect(f.events).toEqual(['ack', 'preflight', 'category', 'create', 'persist']);
    expect(f.factory).toHaveBeenLastCalledWith(e.interaction);
    expect(f.createVoiceCreator).toHaveBeenCalledExactlyOnceWith({ name: 'Entrada', categoryDiscordId: categoryId });
    expect(f.configurations).toEqual([expect.objectContaining({ guildDiscordId: guildId, creatorChannelDiscordId: channelId, categoryDiscordId: categoryId, defaultUserLimit: 4 })]);
    const payload = json(e.editReply.mock.calls[0]![0]);
    expect(payload.components[0].components[0].options).toContainEqual(expect.objectContaining({ value: f.configurations[0]!.id, default: true }));
    expect(payload.content).toContain('call temporária'); expect(payload.allowedMentions).toEqual({ parse: [] });
    await f.handler.execute(f.event(confirmId(ref)).interaction);
    expect(f.createVoiceCreator).toHaveBeenCalledOnce(); expect(f.create).toHaveBeenCalledOnce();
  });

  it('joins simultaneous confirms and never starts a second create while the first is pending', async () => {
    const f = fixture(); const ref = await f.review(); const held = gate();
    f.createVoiceCreator.mockImplementation(async () => { await held.promise; return { id: channelId, name: 'Entrada', categoryDiscordId: categoryId }; });
    const first = f.handler.execute(f.event(confirmId(ref)).interaction);
    await flush(); const second = f.handler.execute(f.event(confirmId(ref)).interaction); await flush();
    try { expect(f.createVoiceCreator).toHaveBeenCalledOnce(); expect(f.drafts.get(ref, context).status).toBe('creating'); }
    finally { held.release(); await Promise.all([first, second]); }
    expect(f.createVoiceCreator).toHaveBeenCalledOnce(); expect(f.configurations).toHaveLength(1);
  });

  it('keeps previously configured creators navigable after selecting the newly saved creator', async () => {
    const f = fixture(); const ref = await f.review();
    f.configurations.push(...Array.from({ length: 30 }, (_, index) => ({
      id: `223e4567-e89b-42d3-a456-${String(index).padStart(12, '0')}`, guildDiscordId: guildId,
      creatorChannelDiscordId: String(82345678901234567n + BigInt(index)), categoryDiscordId: categoryId,
      roomCommandsEnabled: true, defaultUserLimit: 0, deletedAt: null, createdAt: new Date(0), updatedAt: new Date(0),
    })));
    const e = f.event(confirmId(ref)); await f.handler.execute(e.interaction);
    const payload = json(e.editReply.mock.calls[0]![0]);
    expect(payload.embeds[0].footer.text).toBe('Página 2 de 2 · 31 Voice Creators');
    expect(payload.components[0].components[0].options).toContainEqual(expect.objectContaining({ label: 'Voice Creators anteriores', value: '223e4567-e89b-42d3-a456-000000000000' }));
    expect(payload.components[0].components[0].options).toContainEqual(expect.objectContaining({ value: '123e4567-e89b-42d3-a456-426614174000', default: true }));
  });

  it('keeps created truth if post-commit dashboard reads fail', async () => {
    const f = fixture(); const ref = await f.review();
    vi.mocked(f.repository.listByGuild).mockRejectedValue(new Error('SQL private details'));
    const e = f.event(confirmId(ref)); await f.handler.execute(e.interaction);
    expect(f.drafts.get(ref, context).status).toBe('created');
    expect(json(e.editReply.mock.calls.at(-1)![0])).toMatchObject({ content: expect.stringContaining('salva'), components: [] });
    expect(JSON.stringify(e.editReply.mock.calls)).not.toContain('SQL private details');
    await f.handler.execute(f.event(confirmId(ref)).interaction);
    expect(f.createVoiceCreator).toHaveBeenCalledOnce();
  });

  it.each(['uncertain', 'partial', 'failed'] as const)('records %s terminal outcomes and never offers/retries create', async (outcome) => {
    const f = fixture(); const ref = await f.review();
    f.factory.mockClear();
    if (outcome === 'uncertain') f.createVoiceCreator.mockRejectedValue(new SetupChannelCreationError('unknown'));
    else {
      f.create.mockRejectedValue(new Error('private-form-value'));
      f.deleteCreatedVoiceCreatorIfEmpty.mockResolvedValue(outcome === 'failed');
    }
    const e = f.event(confirmId(ref)); await f.handler.execute(e.interaction);
    expect(f.factory).toHaveBeenCalledOnce();
    expect(f.drafts.get(ref, context).status).toBe(outcome);
    expect(json(e.editReply.mock.calls[0]![0])).toMatchObject({ components: [], allowedMentions: { parse: [] } });
    expect(JSON.stringify(e.editReply.mock.calls)).not.toContain('private-form-value');
    await f.handler.execute(f.event(confirmId(ref)).interaction);
    expect(f.createVoiceCreator).toHaveBeenCalledOnce();
    if (outcome !== 'uncertain') {
      expect(f.factory.mock.results.at(-1)!.value).toBe(f.gateway);
      expect(f.deleteCreatedVoiceCreatorIfEmpty).toHaveBeenCalledExactlyOnceWith(channelId);
    }
  });

  it('does not turn a saved result into retry controls if editReply fails', async () => {
    const f = fixture(); const ref = await f.review(); const e = f.event(confirmId(ref));
    e.editReply.mockRejectedValueOnce(new Error('render failed'));
    await f.handler.execute(e.interaction);
    expect(f.drafts.get(ref, context).status).toBe('created');
    expect(json(e.editReply.mock.calls.at(-1)![0])).toMatchObject({ content: expect.stringContaining('salva'), components: [], embeds: [], allowedMentions: { parse: [] } });
    await f.handler.execute(f.event(confirmId(ref)).interaction);
    expect(f.createVoiceCreator).toHaveBeenCalledOnce(); expect(f.create).toHaveBeenCalledOnce();
  });

  it.each(['created', 'partial', 'uncertain'] as const)('replays stored %s truth even when subsequent bot preflight is unavailable', async (outcome) => {
    const f = fixture(); const ref = await f.review();
    if (outcome === 'uncertain') f.createVoiceCreator.mockRejectedValue(new SetupChannelCreationError('unknown'));
    if (outcome === 'partial') { f.create.mockRejectedValue(new Error('SQL unavailable')); f.deleteCreatedVoiceCreatorIfEmpty.mockResolvedValue(false); }
    const initial = f.event(confirmId(ref)); await f.handler.execute(initial.interaction);
    f.assertCanConfigure.mockRejectedValue(new SetupDiscordError('Permissões insuficientes.'));
    f.factory.mockClear();
    const replay = f.event(confirmId(ref)); await f.handler.execute(replay.interaction);
    expect(json(replay.editReply.mock.calls[0]![0]).content).toBe(json(initial.editReply.mock.calls[0]![0]).content);
    expect(f.factory).not.toHaveBeenCalled();
    expect(f.createVoiceCreator).toHaveBeenCalledOnce();
  });

  it.each([
    { guild: { id: '92345678901234567' } }, { guildId: '92345678901234567', guild: { id: '92345678901234567' } },
    { user: { id: '92345678901234567' } }, { message: { id: '92345678901234567', guildId, flags: new MessageFlagsBitField(MessageFlags.Ephemeral) } },
    { memberPermissions: new PermissionsBitField(PermissionFlagsBits.ManageChannels) },
    { message: { id: messageId, guildId, flags: new MessageFlagsBitField() } },
    { guild: null, guildId: null, inGuild: () => false },
    { channelId: null },
  ])('rejects forged/unprivileged confirm context before store mutation: %j', async (overrides) => {
    const f = fixture(); const ref = await f.review(); const e = f.event(confirmId(ref));
    Object.assign(e.interaction, overrides); f.factory.mockClear();
    await f.handler.execute(e.interaction);
    expect(e.reply).toHaveBeenCalledWith(expect.objectContaining({ flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } }));
    expect(f.factory).not.toHaveBeenCalled(); expect(f.createVoiceCreator).not.toHaveBeenCalled();
    expect(f.drafts.get(ref, context).status).toBe('review');
  });

  it.each(['start', 'category', 'form', 'back', 'cancel', 'confirm'] as const)('checks private administrator authority before %s can touch draft state', async (action) => {
    const f = fixture(); const ref = await f.start(); f.factory.mockClear();
    const e = f.event(action === 'start' ? 'setup:v2:create:start' : `setup:v2:create:${action}:${ref.id}:0`, action === 'category' ? 'category' : action === 'form' ? 'form' : 'button');
    Object.assign(e.interaction, { memberPermissions: new PermissionsBitField() });
    await f.handler.execute(e.interaction);
    expect(e.reply).toHaveBeenCalledWith(expect.objectContaining({ flags: MessageFlags.Ephemeral }));
    expect(f.drafts.get(ref, context)).toMatchObject({ status: 'editing', revision: 0, input: {} });
    expect(f.factory).not.toHaveBeenCalled(); expect(f.createVoiceCreator).not.toHaveBeenCalled();
  });

  it('accepts ManageGuild plus ManageChannels without Administrator', async () => {
    const f = fixture(); const ref = await f.review(); const e = f.event(confirmId(ref));
    Object.assign(e.interaction, { memberPermissions: new PermissionsBitField([PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ManageChannels]) });
    await f.handler.execute(e.interaction);
    expect(f.drafts.get(ref, context).status).toBe('created');
  });

  it('rejects creation start from another original interaction owner', async () => {
    const f = fixture(); const e = f.event('setup:v2:create:start');
    if (e.interaction.message) Object.assign(e.interaction.message, { interactionMetadata: { user: { id: '92345678901234567' } } });
    await f.handler.execute(e.interaction);
    expect(e.reply).toHaveBeenCalledWith(expect.objectContaining({ flags: MessageFlags.Ephemeral }));
    expect(f.factory).not.toHaveBeenCalled();
  });

  it.each(['old-revision', 'expired', 'restart', 'malformed'] as const)('rejects %s confirmation without a create', async (state) => {
    const f = fixture(); const ref = await f.review();
    if (state === 'expired') f.advance();
    if (state === 'restart') await f.drafts.dispose();
    const e = f.event(state === 'malformed' ? 'setup:v2:create:confirm:forged:0' : confirmId({ ...ref, revision: state === 'old-revision' ? 1 : 2 }));
    await f.handler.execute(e.interaction);
    expect(e.reply).toHaveBeenCalledWith(expect.objectContaining({ flags: MessageFlags.Ephemeral }));
    expect(f.createVoiceCreator).not.toHaveBeenCalled();
  });

  it('rejects a form not attached to the original message before field/store/dependency access', async () => {
    const f = fixture(); const ref = await f.start(); const e = f.event(`setup:v2:create:form:${ref.id}:0`, 'form');
    Object.assign(e.interaction, { message: null, isFromMessage: () => false }); f.factory.mockClear();
    await f.handler.execute(e.interaction);
    expect(e.reply).toHaveBeenCalledWith(expect.objectContaining({ flags: MessageFlags.Ephemeral })); expect(f.factory).not.toHaveBeenCalled();
  });

  it.each(['expired', 'revision', 'admin', 'message', 'guild'] as const)('rechecks %s after awaited confirmation preflight before acquiring the create latch', async (change) => {
    const f = fixture(); const ref = await f.review(); const e = f.event(confirmId(ref));
    const held = gate(); f.assertCanConfigure.mockImplementation(async () => { await held.promise; });
    const pending = f.handler.execute(e.interaction); await flush();
    if (change === 'expired') f.advance();
    if (change === 'revision') f.drafts.back(ref, context);
    if (change === 'admin') Object.assign(e.interaction, { memberPermissions: new PermissionsBitField() });
    if (change === 'message') Object.assign(e.interaction, { message: { id: '92345678901234567', guildId, flags: new MessageFlagsBitField(MessageFlags.Ephemeral) } });
    if (change === 'guild') Object.assign(e.interaction, { guild: { id: '92345678901234567' } });
    held.release(); await pending;
    expect(f.createVoiceCreator).not.toHaveBeenCalled(); expect(f.configurations).toEqual([]);
    expect(json(e.editReply.mock.calls.at(-1)![0]).components).toEqual([]);
  });

  it('checks TTL again inside the queued single-operation callback, not just before calling confirm', async () => {
    const f = fixture(); const ref = await f.review();
    f.assertCanConfigure.mockImplementation(async () => { queueMicrotask(() => queueMicrotask(() => f.advance())); });
    const e = f.event(confirmId(ref)); await f.handler.execute(e.interaction);
    expect(f.createVoiceCreator).not.toHaveBeenCalled(); expect(f.configurations).toEqual([]);
    expect(json(e.editReply.mock.calls.at(-1)![0]).components).toEqual([]);
  });

  it.each(['expired', 'revision', 'admin'] as const)('rechecks %s after awaited form category validation before storing review', async (change) => {
    const f = fixture(); const ref = await f.start();
    await f.handler.execute(f.event(`setup:v2:create:category:${ref.id}:0`, 'category').interaction);
    const e = f.event(`setup:v2:create:form:${ref.id}:1`, 'form'); const held = gate();
    f.getCategory.mockImplementation(async (id) => { await held.promise; return { id, name: 'Categoria' }; });
    const pending = f.handler.execute(e.interaction); await flush();
    if (change === 'expired') f.advance();
    if (change === 'revision') f.drafts.selectCategory({ ...ref, revision: 1 }, context, '92345678901234567');
    if (change === 'admin') Object.assign(e.interaction, { memberPermissions: new PermissionsBitField() });
    held.release(); await pending;
    expect(json(e.editReply.mock.calls.at(-1)![0])).toMatchObject({ components: [], embeds: [] });
    expect(f.createVoiceCreator).not.toHaveBeenCalled(); expect(f.configurations).toEqual([]);
  });

  it.each(['bot', 'category'])('revalidates revoked %s access before channel creation', async (target) => {
    const f = fixture(); const ref = await f.review();
    if (target === 'bot') f.assertCanConfigure.mockRejectedValue(new SetupDiscordError('Permissões insuficientes.'));
    else f.getCategory.mockResolvedValue(null);
    const e = f.event(confirmId(ref)); await f.handler.execute(e.interaction);
    expect(e.deferUpdate).toHaveBeenCalledOnce(); expect(f.createVoiceCreator).not.toHaveBeenCalled(); expect(f.configurations).toEqual([]);
  });
});
