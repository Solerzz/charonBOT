import { ChannelType, Events, MessageFlags, PermissionFlagsBits, PermissionsBitField, type Guild, type Interaction, type VoiceState } from 'discord.js';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { createApplication, type DiscordClientPort } from '../../src/application.js';
import { createPrismaClient } from '../../src/core/database/prisma.js';
import { createLogger } from '../../src/core/logger/logger.js';
import { CallPrivateWorkspace } from '../../src/modules/calls/call-workspace.js';
import type { PendingOwnershipTransfer, RoomPresence } from '../../src/modules/calls/room.types.js';
import { creator, room, deferred } from './modules/calls/call.fixtures.js';
import { discordFixture } from './modules/calls/call.discord.fixtures.js';
import { OTHER, OWNER } from './modules/ownership/ownership.fixtures.js';

const config = { nodeEnv: 'test' as const, logLevel: 'silent' as const, discord: { token: 'test-token', clientId: creator.guildDiscordId },
  database: { url: 'postgresql://test:test@127.0.0.1:1/test', directUrl: 'postgresql://test:test@127.0.0.1:1/test' } };

// Replace only the SQL transport. These tests await results, not Prisma's fluent relation clients.
function sqlSpy<T extends object, K extends keyof T>(delegate: T, method: K) {
  type Method = Extract<T[K], (...args: never[]) => unknown>;
  return vi.spyOn(delegate, method as never) as unknown as Mock<(...args: Parameters<Method>) => Promise<Awaited<ReturnType<Method>>>>;
}

function fixture(tracked = true, logger = createLogger({ level: 'silent' })) {
  const native = discordFixture(); native.states.set(OWNER, { channelId: room.channelDiscordId }); native.states.set(OTHER, { channelId: room.channelDiscordId });
  const record = structuredClone(room); const configuration = structuredClone(creator);
  const presences: RoomPresence[] = []; let pending: PendingOwnershipTransfer | null = null;
  const database = createPrismaClient(config.database);
  vi.spyOn(database, '$connect').mockResolvedValue(undefined);
  vi.spyOn(database, '$queryRawUnsafe').mockResolvedValue([]);
  vi.spyOn(database, '$queryRaw').mockResolvedValue([]);
  vi.spyOn(database, '$transaction').mockImplementation((async (work: (tx: typeof database) => Promise<unknown>) => work(database)) as never);
  const disconnect = vi.spyOn(database, '$disconnect').mockResolvedValue(undefined);
  const rows = () => tracked && record.status !== 'CLOSED' ? [structuredClone(record)] : [];
  const list = sqlSpy(database.temporaryRoom, 'findMany').mockImplementation(async () => rows());
  sqlSpy(database.temporaryRoom, 'findUnique').mockImplementation(async () => ({ ...structuredClone(record), voiceCreator: structuredClone(configuration), presences: structuredClone(presences), allowedMembers: [], memberBlocks: [], pendingTransfer: structuredClone(pending) }));
  sqlSpy(database.temporaryRoom, 'findUniqueOrThrow').mockImplementation(async () => structuredClone(record));
  sqlSpy(database.temporaryRoom, 'findFirst').mockImplementation(async (input) => {
    const where = input?.where;
    if (where?.ownerDiscordId) return where.ownerDiscordId === record.ownerDiscordId ? structuredClone(record) as never : null;
    return where?.channelDiscordId === record.channelDiscordId && tracked ? structuredClone(record) as never : null;
  });
  sqlSpy(database.temporaryRoom, 'updateMany').mockImplementation(async (input) => {
    const where = input.where as { controlVersion?: number; ownerDiscordId?: string | null };
    if (where?.controlVersion !== undefined && where.controlVersion !== record.controlVersion) return { count: 0 };
    if (where && 'ownerDiscordId' in where && where.ownerDiscordId !== record.ownerDiscordId) return { count: 0 };
    for (const [key, value] of Object.entries(input.data)) {
      if (key === 'controlVersion' && typeof value === 'object') record.controlVersion += (value as { increment: number }).increment;
      else Object.assign(record, { [key]: value });
    }
    return { count: 1 };
  });
  sqlSpy(database.roomPresence, 'deleteMany').mockImplementation(async (input) => {
    const ids = (input?.where?.memberDiscordId as { notIn: string[] }).notIn;
    for (let n = presences.length - 1; n >= 0; n--) if (!ids.includes(presences[n]!.memberDiscordId)) presences.splice(n, 1);
    return { count: 0 };
  });
  sqlSpy(database.roomPresence, 'upsert').mockImplementation(async (input) => {
    const member = presences.find((p) => p.memberDiscordId === input.create.memberDiscordId);
    if (member) Object.assign(member, input.update);
    else presences.push({ ...input.create, id: `presence-${presences.length}` } as RoomPresence);
    return presences.at(-1)! as never;
  });
  sqlSpy(database.pendingOwnershipTransfer, 'findUnique').mockImplementation(async (input) => pending?.id === input.where.id ? structuredClone(pending) : null);
  sqlSpy(database.roomMemberBlock, 'findUnique').mockResolvedValue(null);
  sqlSpy(database.roomMemberBlock, 'deleteMany').mockResolvedValue({ count: 0 });
  sqlSpy(database.pendingOwnershipTransfer, 'deleteMany').mockImplementation(async () => { pending = null; return { count: 1 }; });
  sqlSpy(database.pendingOwnershipTransfer, 'create').mockImplementation(async (input) => {
    pending = { ...input.data, id: '323e4567-e89b-42d3-a456-426614174000', expiresAt: null } as PendingOwnershipTransfer; return structuredClone(pending);
  });
  sqlSpy(database.pendingOwnershipTransfer, 'updateMany').mockImplementation(async (input) => {
    if (!pending || pending.id !== input.where?.id) return { count: 0 };
    Object.assign(pending, input.data); return { count: 1 };
  });
  sqlSpy(database.voiceCreator, 'findFirst').mockImplementation(async () => structuredClone(configuration));
  sqlSpy(database.voiceCreator, 'findMany').mockImplementation(async () => [structuredClone(configuration)]);
  sqlSpy(database.voiceCreator, 'update').mockImplementation(async (input) => { Object.assign(configuration, input.data); return structuredClone(configuration); });
  const listeners = new Map<string, (...args: never[]) => void>(); let ready = false;
  const client = {
    on: vi.fn((event: string, listener: (...args: never[]) => void) => { listeners.set(event, listener); }),
    off: vi.fn((event: string) => { listeners.delete(event); }), isReady: () => ready,
    guilds: { fetch: vi.fn(async () => native.guild as unknown as Guild) }, login: vi.fn(async () => {}), destroy: vi.fn(),
  };
  const app = createApplication(config, { database, discord: client as unknown as DiscordClientPort, logger });
  const emit = (event: string, ...args: unknown[]) => listeners.get(event)?.(...args as never[]);
  const markReady = () => { ready = true; emit(Events.ClientReady); };
  const interaction = (customId: string, kind = 'button') => ({
    id: '72345678901234567', customId, guildId: creator.guildDiscordId, guild: native.guild, channelId: room.channelDiscordId,
    createdTimestamp: Date.now(), applicationId: '92345678901234567',
    user: { id: OWNER }, inGuild: () => true, isChatInputCommand: () => false,
    isButton: () => kind === 'button', isStringSelectMenu: () => kind === 'string', isUserSelectMenu: () => kind === 'user',
    isAnySelectMenu: () => kind !== 'button', isModalSubmit: () => false, isRepliable: () => true,
    message: { id: kind === 'user' || customId.includes(':confirm:') || customId.includes(':undo:') ? '82345678901234567' : record.controlMessageDiscordId,
      flags: { has: (flag: number) => flag === MessageFlags.Ephemeral && (customId.startsWith('setup:') || kind === 'user' || customId.includes(':confirm:') || customId.includes(':undo:')) },
      author: { id: '92345678901234567' }, interactionMetadata: { user: { id: OWNER } }, components: [{ components: [{ customId }] }] },
    memberPermissions: new PermissionsBitField(PermissionFlagsBits.Administrator), values: [OTHER],
    deferReply: vi.fn(async () => {}), deferUpdate: vi.fn(async () => {}),
    followUp: vi.fn(async (_payload: unknown) => ({ id: '82345678901234567' })),
    webhook: { editMessage: vi.fn(async (_id: string, _payload: unknown) => ({ id: '82345678901234567' })) },
    editReply: vi.fn(async (_payload: unknown) => ({ id: '82345678901234567' })), reply: vi.fn(async () => {}),
  });
  const voice = (memberId = OWNER) => {
    const member = { ...native.member, id: memberId, displayName: 'Member', presence: null };
    const old = { id: memberId, guild: native.guild, member, channelId: room.channelDiscordId, channel: null } as unknown as VoiceState;
    emit(Events.VoiceStateUpdate, old, { ...old, channelId: null });
  };
  return { ...native, database, record, configuration, presences, app, client, emit, markReady, interaction, voice, list, disconnect, pending: () => pending };
}
const flush = async () => { await new Promise<void>((resolve) => setImmediate(resolve)); };
afterEach(() => vi.useRealTimers());

describe('default room lifecycle at SQL/REST/client boundaries', () => {
  it('routes call metrics through the application logger rather than a separate default logger', async () => {
    const lines: string[] = [];
    const logger = createLogger({ level: 'info', destination: { write: line => { lines.push(line); } } });
    const f = fixture(false, logger);
    const starting = f.app.start(); await flush(); f.markReady(); await starting;
    try {
      f.emit(Events.InteractionCreate, f.interaction('call:forged-private-sentinel')); await flush();
      const traces = lines.map(line => JSON.parse(line)).filter(log => log.msg === 'Call action completed');
      expect(traces).toHaveLength(1); expect(traces[0]).toMatchObject({ action: 'invalid', result: 'error' });
      expect(lines.join('')).not.toContain('forged-private-sentinel');
    } finally { await f.app.stop('test'); }
  });
  it('drains the application-owned private workspace before destroying Discord or disconnecting SQL', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] }); vi.setSystemTime(0);
    const reconcile = vi.spyOn(CallPrivateWorkspace.prototype, 'reconcile');
    const f = fixture(); const starting = f.app.start(); await flush(); f.markReady(); await starting;
    const workspace = reconcile.mock.contexts.at(-1);
    if (!(workspace instanceof CallPrivateWorkspace)) throw new Error('Runtime workspace was not reconciled');
    const entered = deferred(); const release = deferred(); const deactivateEntered = deferred(); const deactivateRelease = deferred();
    const delivered = { messageId: 'private-workspace', expiresAt: 900_000, edit: async () => ({ id: 'private-workspace' }),
      deactivate: vi.fn(async () => { deactivateEntered.resolve(); await deactivateRelease.promise; }) };
    const showing = workspace.show({ roomId: room.id, guildDiscordId: room.guildDiscordId, memberDiscordId: OWNER, controlVersion: f.record.controlVersion },
      { kind: 'access', payload: { embeds: [], components: [] } }, async () => { entered.resolve(); await release.promise; return delivered; });
    const rejected = expect(showing).rejects.toMatchObject({ code: 'STALE_CONTROLS' }); await entered.promise;
    const stopping = f.app.stop('test'); await flush();
    expect(f.client.destroy).not.toHaveBeenCalled(); expect(f.disconnect).not.toHaveBeenCalled();
    release.resolve(); await deactivateEntered.promise;
    expect(f.client.destroy).not.toHaveBeenCalled(); expect(f.disconnect).not.toHaveBeenCalled();
    deactivateRelease.resolve(); await rejected; await stopping;
    expect(delivered.deactivate).toHaveBeenCalledOnce(); expect(f.disconnect).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
    reconcile.mockRestore();
  });

  it('drains held setup recovery and the acknowledged form before disposing drafts or disconnecting', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] }); vi.setSystemTime(0);
    const f = fixture(false); const held = deferred();
    const starting = f.app.start(); await flush(); f.markReady(); await starting;
    const event = (id: string, kind = 'button') => ({
      ...f.interaction(id), isButton: () => kind === 'button', isAnySelectMenu: () => kind === 'category',
      isChannelSelectMenu: () => kind === 'category', isModalSubmit: () => kind === 'form', isFromMessage: () => true,
      message: { id: '72345678901234567', guildId: creator.guildDiscordId, flags: { has: (flag: number) => flag === MessageFlags.Ephemeral } },
      values: [creator.categoryDiscordId], fields: { getTextInputValue: (field: string) => field === 'name' ? 'Entrada nativa' : '7' },
      showModal: vi.fn(async (_payload: unknown) => {}),
    });
    const start = event('setup:v2:create:start'); f.emit(Events.InteractionCreate, start); await flush();
    const initial = JSON.parse(JSON.stringify(start.editReply.mock.calls[0]![0]));
    let visible: typeof initial;
    const category = event(initial.components[0].components[0].custom_id, 'category');
    category.editReply.mockImplementation(async (payload) => { await held.promise; visible = JSON.parse(JSON.stringify(payload)); return { id: '82345678901234567' }; });
    f.emit(Events.InteractionCreate, category); await flush();
    const form = event(JSON.parse(JSON.stringify(category.showModal.mock.calls[0]![0])).custom_id, 'form');
    form.editReply.mockImplementation(async (payload) => {
      expect(f.disconnect).not.toHaveBeenCalled(); expect(f.client.destroy).not.toHaveBeenCalled();
      visible = JSON.parse(JSON.stringify(payload)); return { id: '82345678901234567' };
    });
    f.emit(Events.InteractionCreate, form); await flush();
    const stopping = f.app.stop('test');
    try {
      await flush(); expect(form.deferUpdate).toHaveBeenCalledOnce();
      expect(f.disconnect).not.toHaveBeenCalled(); expect(f.client.destroy).not.toHaveBeenCalled();
    } finally { held.resolve(); await stopping; }
    expect(visible.components[0].components.map((button: { custom_id: string }) => button.custom_id.split(':')[3])).toEqual(['confirm', 'back', 'cancel']);
    expect(f.guild.channels.create).not.toHaveBeenCalled();
    expect(f.disconnect).toHaveBeenCalledOnce(); expect(f.client.destroy).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('shares one application draft through native wizard events and drains SQL creation before store/timer disposal and disconnect', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] }); vi.setSystemTime(0);
    const f = fixture(false); const entered = deferred(); const held = deferred();
    const entryId = '82345678901234567';
    const saved = { ...structuredClone(f.configuration), id: '223e4567-e89b-42d3-a456-426614174000', creatorChannelDiscordId: entryId, defaultUserLimit: 7 };
    const persist = sqlSpy(f.database.voiceCreator, 'create').mockImplementation(async () => { entered.resolve(); await held.promise; return saved; });
    const entry = { ...f.channel, id: entryId, parentId: creator.categoryDiscordId, name: 'Entrada nativa', userLimit: 0 };
    f.guild.channels.create.mockResolvedValue(entry);
    const fetch = f.guild.channels.fetch.getMockImplementation()!;
    f.guild.channels.fetch.mockImplementation(async (id) => id === entryId ? entry : fetch(id));
    const starting = f.app.start(); await flush(); f.markReady(); await starting;
    const event = (id: string, kind = 'button') => ({
      ...f.interaction(id), isButton: () => kind === 'button', isAnySelectMenu: () => kind === 'category',
      isChannelSelectMenu: () => kind === 'category', isModalSubmit: () => kind === 'form', isFromMessage: () => true,
      message: { id: '72345678901234567', guildId: creator.guildDiscordId, flags: { has: (flag: number) => flag === MessageFlags.Ephemeral } },
      values: [creator.categoryDiscordId], fields: { getTextInputValue: (field: string) => field === 'name' ? 'Entrada nativa' : '7' },
      showModal: vi.fn(async (_payload: unknown) => {}),
    });
    const start = event('setup:v2:create:start'); f.emit(Events.InteractionCreate, start); await flush();
    const startPayload = JSON.parse(JSON.stringify(start.editReply.mock.calls[0]![0]));
    const categoryId: string = startPayload.components[0].components[0].custom_id;
    const draftId = categoryId.split(':')[4]!;
    const category = event(categoryId, 'category'); f.emit(Events.InteractionCreate, category); await flush();
    expect(category.showModal).toHaveBeenCalledOnce();
    const formId: string = JSON.parse(JSON.stringify(category.showModal.mock.calls[0]![0])).custom_id;
    const form = event(formId, 'form'); f.emit(Events.InteractionCreate, form); await flush();
    expect(form.deferUpdate).toHaveBeenCalledOnce(); expect(persist).not.toHaveBeenCalled();
    const review = JSON.parse(JSON.stringify(form.editReply.mock.calls[0]![0]));
    const confirmId: string = review.components[0].components[0].custom_id;
    expect(confirmId).toBe(`setup:v2:create:confirm:${draftId}:2`);
    const confirm = event(confirmId); f.emit(Events.InteractionCreate, confirm); await entered.promise;
    expect(f.guild.channels.create).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ name: 'Entrada nativa', parent: creator.categoryDiscordId, userLimit: 0, type: ChannelType.GuildVoice }));
    expect(persist).toHaveBeenCalledExactlyOnceWith({ data: { guildDiscordId: creator.guildDiscordId, creatorChannelDiscordId: entryId, categoryDiscordId: creator.categoryDiscordId, defaultUserLimit: 7 } });
    const duplicate = event(confirmId); f.emit(Events.InteractionCreate, duplicate); await flush();
    const stopping = f.app.stop('test');
    try { await flush(); expect(f.disconnect).not.toHaveBeenCalled(); expect(persist).toHaveBeenCalledOnce(); }
    finally { held.resolve(); await stopping; }
    expect(f.disconnect).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
    expect(JSON.stringify(confirm.editReply.mock.calls)).toContain('Configuração salva');
    expect(JSON.stringify(duplicate.editReply.mock.calls)).toContain('Configuração salva');
    expect(f.guild.channels.create).toHaveBeenCalledOnce();
  });

  it('default editing changes only the creator model, not active room/entry settings or panel preference', async () => {
    const f = fixture(); const starting = f.app.start(); await flush(); f.markReady(); await starting;
    const before = structuredClone(f.record); const preference = f.configuration.roomCommandsEnabled;
    const input = { ...f.interaction(`setup:v1:default-limit:${creator.id}`), isButton: () => false,
      isAnySelectMenu: () => false, isModalSubmit: () => true, isFromMessage: () => true,
      fields: { getTextInputValue: () => '8' } };
    f.emit(Events.InteractionCreate, input); await flush();
    expect(f.configuration.defaultUserLimit).toBe(8);
    expect(f.configuration.roomCommandsEnabled).toBe(preference);
    expect(f.record).toEqual(before);
    expect(f.channel.setUserLimit).not.toHaveBeenCalled(); expect(f.channel.setName).not.toHaveBeenCalled();
    expect(input.deferUpdate).toHaveBeenCalledOnce();
    await f.app.stop('test');
  });
  it('attaches ready before login, holds queued controls and voice behind reconciliation, then reads current live presence', async () => {
    const f = fixture(); const loaded = deferred(); const release = deferred();
    const original = f.list.getMockImplementation()!;
    f.list.mockImplementationOnce(async (...args) => { loaded.resolve(); await release.promise; return original(...args); });
    const starting = f.app.start(); await flush();
    expect(f.client.on.mock.calls.map(([event]) => event)).toContain(Events.ClientReady);
    expect(f.client.login).toHaveBeenCalledOnce();
    f.markReady(); await loaded.promise;
    const open = f.interaction(`call:v3:access:${room.id}:0`);
    f.emit(Events.InteractionCreate, open as unknown as Interaction);
    f.voice(OTHER); f.states.delete(OWNER);
    await flush(); expect(open.deferUpdate).not.toHaveBeenCalled();
    release.resolve(); await starting; await flush();
    expect(f.record.ownerDiscordId).toBeNull();
    expect(f.presences.map((p) => p.memberDiscordId)).toEqual([OTHER]);
    expect(open.deferUpdate).toHaveBeenCalledOnce();
    expect(open.editReply).not.toHaveBeenCalled();
    expect(JSON.stringify(open.followUp.mock.calls)).toContain('expirou');
    await f.app.stop('test');
  });

  it('stop before ready settles startup and cancels queued work even when login has not resolved', async () => {
    const f = fixture(false); const login = deferred(); f.client.login.mockImplementation(() => login.promise);
    const starting = f.app.start(); await flush();
    const open = f.interaction(`call:v3:access:${room.id}:0`); f.emit(Events.InteractionCreate, open);
    await f.app.stop('test'); await starting;
    expect(f.client.destroy).toHaveBeenCalledOnce(); expect(f.disconnect).toHaveBeenCalledOnce();
    expect(f.list).not.toHaveBeenCalled(); expect(open.deferUpdate).not.toHaveBeenCalled();
    login.resolve(); await flush();
    expect(f.client.guilds.fetch).not.toHaveBeenCalled();
  });

  it('stop during reconciliation cancels barrier-held events and drains startup before disconnect', async () => {
    const f = fixture(); const entered = deferred(); const release = deferred();
    const list = f.list.getMockImplementation()!;
    f.list.mockImplementationOnce(async (...args) => { entered.resolve(); await release.promise; return list(...args); });
    const starting = f.app.start(); await flush(); f.markReady(); await entered.promise;
    const open = f.interaction(`call:v3:access:${room.id}:0`); f.emit(Events.InteractionCreate, open); f.voice();
    const stopping = f.app.stop('test'); await flush();
    expect(f.disconnect).not.toHaveBeenCalled();
    release.resolve(); await Promise.all([starting, stopping]);
    expect(open.deferUpdate).not.toHaveBeenCalled();
    expect(f.record.controlVersion).toBe(0);
    expect(f.client.destroy).toHaveBeenCalledOnce(); expect(f.disconnect).toHaveBeenCalledOnce();
  });

  it('startup reconciliation failure settles the barrier and drains queued events before resources close', async () => {
    const f = fixture(false); const gate = deferred();
    f.list.mockImplementationOnce(async () => { await gate.promise; throw new Error('SQL unavailable'); });
    const starting = f.app.start(); const failure = expect(starting).rejects.toThrow('SQL unavailable');
    await flush(); f.markReady(); await flush();
    const open = f.interaction(`call:v3:access:${room.id}:0`); f.emit(Events.InteractionCreate, open);
    gate.resolve(); await failure;
    expect(open.deferUpdate).not.toHaveBeenCalled(); expect(f.disconnect).toHaveBeenCalledOnce();
  });

  it('does not admit old private menus if startup control-version invalidation fails', async () => {
    const f = fixture();
    vi.mocked(f.database.temporaryRoom.updateMany).mockRejectedValueOnce(new Error('version invalidation failed'));
    const starting = f.app.start(); const failure = expect(starting).rejects.toThrow('version invalidation failed');
    await flush();
    const open = f.interaction(`call:v3:access:${room.id}:0`); f.emit(Events.InteractionCreate, open);
    f.markReady(); await failure;
    expect(open.deferUpdate).not.toHaveBeenCalled();
    expect(f.disconnect).toHaveBeenCalledOnce();
  });

  it('shares serialization between a real owner confirmation and live target departure', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] }); vi.setSystemTime(0);
    const f = fixture(); const starting = f.app.start(); await flush(); f.markReady(); await starting;
    const transfer = f.interaction(`call:v3:transfer-target:${room.id}:1`, 'user'); f.emit(Events.InteractionCreate, transfer); await flush();
    const operationId = f.pending()!.id;
    const entered = deferred(); const release = deferred();
    const fetch = f.guild.members.fetch.getMockImplementation()!;
    f.guild.members.fetch.mockImplementationOnce(async (options) => { entered.resolve(); await release.promise; return fetch(options); });
    const confirm = f.interaction(`call:v3:confirm:${room.id}:${operationId}`); f.emit(Events.InteractionCreate, confirm); await entered.promise;
    f.states.delete(OTHER); f.voice(OTHER); release.resolve(); await flush();
    expect(f.record.ownerDiscordId).toBe(OWNER);
    expect(f.pending()).toBeNull();
    await vi.advanceTimersByTimeAsync(6_000);
    expect(f.record.ownerDiscordId).toBe(OWNER);
    await f.app.stop('test');
  });

  it('drains an interaction holding the shared room lock plus a queued expiry before disconnect', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] }); vi.setSystemTime(0);
    const f = fixture(); const starting = f.app.start(); await flush(); f.markReady(); await starting;
    const transfer = f.interaction(`call:v3:transfer-target:${room.id}:1`, 'user'); f.emit(Events.InteractionCreate, transfer); await flush();
    expect(f.pending()?.expiresAt?.getTime()).toBe(5_000);
    const entered = deferred(); const release = deferred();
    f.channel.permissionOverwrites.set.mockImplementationOnce(async () => { entered.resolve(); await release.promise; });
    const visibility = f.interaction(`call:v3:visibility:${room.id}:1`); f.emit(Events.InteractionCreate, visibility); await entered.promise;
    await vi.advanceTimersByTimeAsync(5_000);
    const stopping = f.app.stop('test'); await flush();
    expect(f.client.destroy).not.toHaveBeenCalled(); expect(f.disconnect).not.toHaveBeenCalled();
    release.resolve(); await stopping;
    expect(f.record.ownerDiscordId).toBe(OTHER);
    const calls = f.guild.channels.fetch.mock.calls.length;
    await vi.advanceTimersByTimeAsync(600_000);
    expect(f.guild.channels.fetch.mock.calls.length).toBe(calls);
  });

  it('injects setup synchronization: saved disable deletes the panel and cancels local transfer/countdown timers', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] }); vi.setSystemTime(0);
    const f = fixture(); const starting = f.app.start(); await flush(); f.markReady(); await starting;
    const transfer = f.interaction(`call:v3:transfer-target:${room.id}:1`, 'user'); f.emit(Events.InteractionCreate, transfer); await flush();
    expect(f.pending()).not.toBeNull();
    const fetch = f.guild.channels.fetch.getMockImplementation()!;
    f.guild.channels.fetch.mockImplementation(async (id) => id === creator.creatorChannelDiscordId ? { ...f.channel, id, type: ChannelType.GuildVoice } : fetch(id));
    const setup = f.interaction(`setup:v1:toggle-commands:${creator.id}`);
    f.emit(Events.InteractionCreate, setup); await flush();
    expect(f.configuration.roomCommandsEnabled).toBe(false);
    expect(f.record.controlMessageDiscordId).toBeNull(); expect(f.message.delete).toHaveBeenCalledOnce();
    expect(JSON.stringify(setup.editReply.mock.calls)).toContain('concluída');
    const edits = transfer.webhook.editMessage.mock.calls.length;
    await vi.advanceTimersByTimeAsync(6_000);
    expect(f.record.ownerDiscordId).toBe(OWNER); expect(transfer.webhook.editMessage.mock.calls.length).toBe(edits);
    expect(transfer.webhook.editMessage.mock.calls.at(-1)?.[1]).toMatchObject({ content: expect.stringContaining('encerrada'), components: [] });
    await f.app.stop('test');
  });
});
