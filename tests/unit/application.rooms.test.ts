import { ChannelType, Events, MessageFlags, PermissionFlagsBits, PermissionsBitField, type Guild, type Interaction, type VoiceState } from 'discord.js';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { createApplication, type DiscordClientPort } from '../../src/application.js';
import { createPrismaClient } from '../../src/core/database/prisma.js';
import { createLogger } from '../../src/core/logger/logger.js';
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

function fixture(tracked = true) {
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
  sqlSpy(database.temporaryRoom, 'findUnique').mockImplementation(async () => ({ ...structuredClone(record), voiceCreator: structuredClone(configuration), presences: structuredClone(presences), allowedMembers: [], pendingTransfer: structuredClone(pending) }));
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
  const app = createApplication(config, { database, discord: client as unknown as DiscordClientPort, logger: createLogger({ level: 'silent' }) });
  const emit = (event: string, ...args: unknown[]) => listeners.get(event)?.(...args as never[]);
  const markReady = () => { ready = true; emit(Events.ClientReady); };
  const interaction = (customId: string, kind = 'button') => ({
    id: '72345678901234567', customId, guildId: creator.guildDiscordId, guild: native.guild, channelId: room.channelDiscordId,
    user: { id: OWNER }, inGuild: () => true, isChatInputCommand: () => false,
    isButton: () => kind === 'button', isStringSelectMenu: () => kind === 'string', isUserSelectMenu: () => kind === 'user',
    isAnySelectMenu: () => kind !== 'button', isModalSubmit: () => false, isRepliable: () => true,
    message: { flags: { has: (flag: number) => flag === MessageFlags.Ephemeral } },
    memberPermissions: new PermissionsBitField(PermissionFlagsBits.Administrator), values: [OTHER],
    deferReply: vi.fn(async () => {}), deferUpdate: vi.fn(async () => {}),
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
  it('attaches ready before login, holds queued controls and voice behind reconciliation, then reads current live presence', async () => {
    const f = fixture(); const loaded = deferred(); const release = deferred();
    const original = f.list.getMockImplementation()!;
    f.list.mockImplementationOnce(async (...args) => { loaded.resolve(); await release.promise; return original(...args); });
    const starting = f.app.start(); await flush();
    expect(f.client.on.mock.calls.map(([event]) => event)).toContain(Events.ClientReady);
    expect(f.client.login).toHaveBeenCalledOnce();
    f.markReady(); await loaded.promise;
    const open = f.interaction(`call:v2:open:${room.id}:0`);
    f.emit(Events.InteractionCreate, open as unknown as Interaction);
    f.voice(OTHER); f.states.delete(OWNER);
    await flush(); expect(open.deferReply).not.toHaveBeenCalled();
    release.resolve(); await starting; await flush();
    expect(f.record.ownerDiscordId).toBeNull();
    expect(f.presences.map((p) => p.memberDiscordId)).toEqual([OTHER]);
    expect(open.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
    expect(JSON.stringify(open.editReply.mock.calls)).not.toContain('Escolher ação');
    await f.app.stop('test');
  });

  it('stop before ready settles startup and cancels queued work even when login has not resolved', async () => {
    const f = fixture(false); const login = deferred(); f.client.login.mockImplementation(() => login.promise);
    const starting = f.app.start(); await flush();
    const open = f.interaction(`call:v2:open:${room.id}:0`); f.emit(Events.InteractionCreate, open);
    await f.app.stop('test'); await starting;
    expect(f.client.destroy).toHaveBeenCalledOnce(); expect(f.disconnect).toHaveBeenCalledOnce();
    expect(f.list).not.toHaveBeenCalled(); expect(open.deferReply).not.toHaveBeenCalled();
    login.resolve(); await flush();
    expect(f.client.guilds.fetch).not.toHaveBeenCalled();
  });

  it('stop during reconciliation cancels barrier-held events and drains startup before disconnect', async () => {
    const f = fixture(); const entered = deferred(); const release = deferred();
    const list = f.list.getMockImplementation()!;
    f.list.mockImplementationOnce(async (...args) => { entered.resolve(); await release.promise; return list(...args); });
    const starting = f.app.start(); await flush(); f.markReady(); await entered.promise;
    const open = f.interaction(`call:v2:open:${room.id}:0`); f.emit(Events.InteractionCreate, open); f.voice();
    const stopping = f.app.stop('test'); await flush();
    expect(f.disconnect).not.toHaveBeenCalled();
    release.resolve(); await Promise.all([starting, stopping]);
    expect(open.deferReply).not.toHaveBeenCalled();
    expect(f.record.controlVersion).toBe(0);
    expect(f.client.destroy).toHaveBeenCalledOnce(); expect(f.disconnect).toHaveBeenCalledOnce();
  });

  it('startup reconciliation failure settles the barrier and drains queued events before resources close', async () => {
    const f = fixture(false); const gate = deferred();
    f.list.mockImplementationOnce(async () => { await gate.promise; throw new Error('SQL unavailable'); });
    const starting = f.app.start(); const failure = expect(starting).rejects.toThrow('SQL unavailable');
    await flush(); f.markReady(); await flush();
    const open = f.interaction(`call:v2:open:${room.id}:0`); f.emit(Events.InteractionCreate, open);
    gate.resolve(); await failure;
    expect(open.deferReply).not.toHaveBeenCalled(); expect(f.disconnect).toHaveBeenCalledOnce();
  });

  it('does not admit old private menus if startup control-version invalidation fails', async () => {
    const f = fixture();
    vi.mocked(f.database.temporaryRoom.updateMany).mockRejectedValueOnce(new Error('version invalidation failed'));
    const starting = f.app.start(); const failure = expect(starting).rejects.toThrow('version invalidation failed');
    await flush();
    const open = f.interaction(`call:v2:open:${room.id}:0`); f.emit(Events.InteractionCreate, open);
    f.markReady(); await failure;
    expect(open.deferReply).not.toHaveBeenCalled();
    expect(f.disconnect).toHaveBeenCalledOnce();
  });

  it('shares serialization between a real owner confirmation and live target departure', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] }); vi.setSystemTime(0);
    const f = fixture(); const starting = f.app.start(); await flush(); f.markReady(); await starting;
    const transfer = f.interaction(`call:v2:transfer-target:${room.id}:1`, 'user'); f.emit(Events.InteractionCreate, transfer); await flush();
    const operationId = f.pending()!.id;
    const entered = deferred(); const release = deferred();
    const fetch = f.guild.members.fetch.getMockImplementation()!;
    f.guild.members.fetch.mockImplementationOnce(async (options) => { entered.resolve(); await release.promise; return fetch(options); });
    const confirm = f.interaction(`call:v2:confirm:${room.id}:${operationId}`); f.emit(Events.InteractionCreate, confirm); await entered.promise;
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
    const transfer = f.interaction(`call:v2:transfer-target:${room.id}:1`, 'user'); f.emit(Events.InteractionCreate, transfer); await flush();
    expect(f.pending()?.expiresAt?.getTime()).toBe(5_000);
    const entered = deferred(); const release = deferred();
    f.channel.permissionOverwrites.set.mockImplementationOnce(async () => { entered.resolve(); await release.promise; });
    const visibility = f.interaction(`call:v2:visibility:${room.id}:1`); f.emit(Events.InteractionCreate, visibility); await entered.promise;
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
    const transfer = f.interaction(`call:v2:transfer-target:${room.id}:1`, 'user'); f.emit(Events.InteractionCreate, transfer); await flush();
    expect(f.pending()).not.toBeNull();
    const fetch = f.guild.channels.fetch.getMockImplementation()!;
    f.guild.channels.fetch.mockImplementation(async (id) => id === creator.creatorChannelDiscordId ? { ...f.channel, id, type: ChannelType.GuildVoice } : fetch(id));
    const setup = f.interaction(`setup:v1:toggle-commands:${creator.id}`);
    f.emit(Events.InteractionCreate, setup); await flush();
    expect(f.configuration.roomCommandsEnabled).toBe(false);
    expect(f.record.controlMessageDiscordId).toBeNull(); expect(f.message.delete).toHaveBeenCalledOnce();
    expect(JSON.stringify(setup.editReply.mock.calls)).toContain('concluída');
    const edits = transfer.editReply.mock.calls.length;
    await vi.advanceTimersByTimeAsync(6_000);
    expect(f.record.ownerDiscordId).toBe(OWNER); expect(transfer.editReply.mock.calls.length).toBe(edits + 1);
    expect(transfer.editReply.mock.calls.at(-1)?.[0]).toMatchObject({ content: expect.stringContaining('encerrada'), components: [] });
    await f.app.stop('test');
  });
});
