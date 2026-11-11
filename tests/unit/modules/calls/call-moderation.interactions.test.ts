import { randomUUID } from 'node:crypto';
import { Client, DefaultRestOptions, MessageFlags, MessageFlagsBitField, PermissionFlagsBits as P, PermissionsBitField, type Guild } from 'discord.js';
import { Response } from 'undici';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PrismaClient } from '../../../../src/generated/prisma/client.js';
import { createLogger } from '../../../../src/core/logger/logger.js';
import { CallInteractions, type CallInteraction } from '../../../../src/modules/calls/call.interactions.js';
import { callComponentSchema, encodeCallComponent, type CallComponent } from '../../../../src/modules/calls/call.schemas.js';
import { createRoomRuntime } from '../../../../src/modules/calls/room.runtime.js';
import { deferred } from './call.fixtures.js';
import { OWNER, OTHER, roomModerationFixture } from './room-moderation.fixtures.js';
import { OLDEST } from '../ownership/ownership.fixtures.js';

const runtimes: ReturnType<typeof createRoomRuntime>[] = [];
afterEach(async () => {
  await Promise.all(runtimes.splice(0).map(runtime => runtime.stop()));
  vi.restoreAllMocks(); vi.useRealTimers();
});

function fixture() {
  const f = roomModerationFixture();
  const client = new Client({ intents: [] }); client.token = 'test-only'; Object.assign(f.guild, { client });
  const metricLines: string[] = [];
  const logger = createLogger({ level: 'info', destination: { write: line => { metricLines.push(line); } } });
  // Real Prisma repository read/stage logic over stateful delegates, not a service mock.
  const record = () => structuredClone({ ...f.state().room, voiceCreator: { roomCommandsEnabled: f.state().controlsEnabled },
    presences: f.state().presences, allowedMembers: f.state().allowedMemberIds.map(memberDiscordId => ({ memberDiscordId })),
    memberBlocks: f.state().memberBlocks, pendingTransfer: f.state().transfer });
  const db = {
    $queryRaw: async () => [],
    temporaryRoom: {
      findUnique: async () => record(),
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        const s = f.state();
        return where.id === s.room.id && where.guildDiscordId === s.room.guildDiscordId && where.ownerDiscordId === s.room.ownerDiscordId
          && where.controlVersion === s.room.controlVersion && s.controlsEnabled && s.room.status === 'ACTIVE' && !s.transfer
          && (!where.NOT || (where.NOT as { ownerDiscordId: string }).ownerDiscordId !== s.room.ownerDiscordId) ? record() : null;
      },
      update: async () => { f.state().room.controlVersion++; f.events.push('sql:epoch'); return record(); },
    },
    roomMemberBlock: {
      findUnique: async ({ where }: { where: { roomId_memberDiscordId: { memberDiscordId: string } } }) =>
        structuredClone(f.state().memberBlocks.find(b => b.memberDiscordId === where.roomId_memberDiscordId.memberDiscordId) ?? null),
      findFirst: async ({ where }: { where: { id: string; roomId: string } }) =>
        structuredClone(f.state().memberBlocks.find(b => b.id === where.id && b.roomId === where.roomId) ?? null),
      create: async ({ data }: { data: { roomId: string; memberDiscordId: string; deniedBefore: bigint } }) => {
        const block = { ...data, id: randomUUID(), createdAt: new Date(), state: 'BLOCKED' as const };
        f.state().memberBlocks.push(block); f.events.push('sql:block'); return structuredClone(block);
      },
      update: async ({ where, data }: { where: { id: string }; data: { state: 'BLOCKED' | 'UNBLOCK_PENDING' } }) => {
        const block = f.state().memberBlocks.find(b => b.id === where.id)!; Object.assign(block, data); return structuredClone(block);
      },
    },
    roomAllowedMember: { deleteMany: async ({ where }: { where: { memberDiscordId: string } }) => {
      f.state().allowedMemberIds = f.state().allowedMemberIds.filter(id => id !== where.memberDiscordId); return { count: 1 };
    } },
    $transaction: async <T>(work: (tx: unknown) => Promise<T>) => work(db),
  };
  const runtime = createRoomRuntime(db as unknown as PrismaClient, logger); runtimes.push(runtime);
  for (const method of ['readTransfer', 'findOwnedRoom', 'syncPresence', 'savePriority', 'changeOwner', 'createTransfer', 'armTransfer',
    'cancelTransfer', 'discardTransfer', 'invalidateTransfers', 'finishTransfer', 'settleAccess', 'updateSettings', 'setAllowed', 'completeRoomUnblock'] as const) {
    vi.spyOn(runtime.store, method).mockImplementation(f.store[method] as never);
  }
  vi.spyOn(runtime.store, 'setPanelId').mockResolvedValue(true);
  const http = vi.spyOn(DefaultRestOptions, 'makeRequest').mockImplementation(async url => {
    f.events.push('http:disconnect'); f.leave(String(url).split('/').at(-1)!);
    return new Response('{}', { headers: { 'content-type': 'application/json' } });
  });
  const handler = new CallInteractions({ ...runtime, logger }, runtime.gatewayFor);
  let visible: Record<string, unknown> = {};
  const render = (payload: unknown) => { visible = JSON.parse(JSON.stringify(payload)); return { id: '82345678901234567' }; };
  const interaction = (action: CallComponent['action'], options: { private?: boolean; kind?: string; selectionId?: string; page?: number; member?: string } = {}) => {
    const component = { version: 'v3', action, roomId: f.state().room.id,
      ...(action === 'mod-confirm' || action === 'mod-cancel' ? { selectionId: options.selectionId! }
        : { controlVersion: f.state().room.controlVersion, ...(action === 'mod-page' ? { page: options.page ?? 0 } : {}) }) } as CallComponent;
    const customId = encodeCallComponent(component); const member = options.member ?? OWNER;
    const kind = options.kind ?? (action === 'mod-target' || action === 'allow-add' || action === 'transfer-target' ? 'user' : action === 'mod-unblock' ? 'string' : 'button');
    return {
      customId, guild: f.guild, guildId: f.guild.id, channelId: f.channel.id, user: { id: member }, applicationId: '92345678901234567', createdTimestamp: Date.now(),
      message: { id: options.private === false || action === 'moderation' || action === 'access' || action === 'transfer' ? f.state().room.controlMessageDiscordId! : '82345678901234567',
        flags: new MessageFlagsBitField(options.private === false || ['moderation', 'access', 'transfer'].includes(action) ? 0 : MessageFlags.Ephemeral),
        author: { id: '92345678901234567' }, interactionMetadata: { user: { id: member } }, components: [{ components: [{ customId }] }] },
      values: [] as string[], inGuild: () => true, isButton: () => kind === 'button', isUserSelectMenu: () => kind === 'user', isStringSelectMenu: () => kind === 'string', isModalSubmit: () => false,
      deferUpdate: vi.fn(async () => {}), deferReply: vi.fn(async () => {}), reply: vi.fn(async (_payload: unknown) => {}),
      followUp: vi.fn(async (payload: unknown) => render(payload)), editReply: vi.fn(async (payload: unknown) => render(payload)), deleteReply: vi.fn(async () => {}),
      webhook: { editMessage: vi.fn(async (_id: string, payload: unknown) => render(payload)) },
    };
  };
  const execute = (i: ReturnType<typeof interaction>) => handler.execute(i as unknown as CallInteraction);
  const select = async (member = OTHER) => {
    const i = interaction('mod-target'); i.values = [member]; await execute(i);
    const serialized = JSON.stringify(visible); const customId = serialized.match(/call:v3:mod-confirm:[^"\\]+/)?.[0];
    expect(customId, serialized).toBeDefined(); const component = callComponentSchema.parse(customId!);
    if (!('selectionId' in component)) throw new Error('Missing selection');
    return component.selectionId;
  };
  return { ...f, runtime, handler, http, interaction, execute, select, visible: () => visible, metricLines, db };
}

describe('owner moderation handler composed with runtime and stateful SQL/REST boundaries', () => {
  it('acks public open, reuses one private area, and selects/cancels/pages without business effects', async () => {
    const f = fixture(); const open = f.interaction('moderation'); await f.execute(open);
    expect(open.deferUpdate).toHaveBeenCalledOnce(); expect(open.followUp).toHaveBeenCalledOnce();
    expect(f.visible()).toMatchObject({ embeds: [expect.objectContaining({ title: 'Moderação' })] });
    const again = f.interaction('moderation'); await f.execute(again); expect(again.followUp).not.toHaveBeenCalled();
    const selectionId = await f.select(); await f.execute(f.interaction('mod-cancel', { selectionId }));
    await f.execute(f.interaction('mod-page', { page: 0 }));
    expect(f.state().memberBlocks).toEqual([]); expect(f.state().room.controlVersion).toBe(0); expect(f.http).not.toHaveBeenCalled();
    expect(f.events).not.toContain('project'); expect(f.events).not.toContain('sql:block');
  });

  it('commits SQL before deny, disconnects once, reconciles absence and rebinds the result to the same message', async () => {
    const f = fixture(); f.state().allowedMemberIds = [OTHER];
    await f.execute(f.interaction('moderation')); const selectionId = await f.select();
    const confirm = f.interaction('mod-confirm', { selectionId }); await f.execute(confirm);
    expect(f.state()).toMatchObject({ allowedMemberIds: [], room: { controlVersion: 1 }, memberBlocks: [expect.objectContaining({ memberDiscordId: OTHER })] });
    expect(f.events.indexOf('sql:epoch')).toBeLessThan(f.events.indexOf('project'));
    expect(f.events.indexOf('project')).toBeLessThan(f.events.indexOf('http:disconnect'));
    expect(f.http).toHaveBeenCalledOnce(); expect(f.states.has(OTHER)).toBe(false);
    expect(f.state().presences.map(p => p.memberDiscordId)).toEqual([OWNER]);
    expect(f.overwrite()?.deny.has(P.Connect | P.SendMessages)).toBe(true); expect(f.overwrite()?.allow.has(P.Connect)).toBe(false);
    expect(f.visible()).toMatchObject({ embeds: [expect.objectContaining({ title: 'Membro bloqueado' })] });
    expect(confirm.followUp).not.toHaveBeenCalled(); expect(confirm.webhook.editMessage).toHaveBeenLastCalledWith('82345678901234567', expect.anything());
    const replay = f.interaction('mod-confirm', { selectionId }); await f.execute(replay); expect(f.http).toHaveBeenCalledOnce();
    expect(f.state().memberBlocks).toHaveLength(1);
    for (const secret of [f.state().room.id, OWNER, OTHER, selectionId, 'test-only']) expect(f.metricLines.join('')).not.toContain(secret);
    expect(f.metricLines.map(line => JSON.parse(line).action)).toEqual(['moderation', 'mod-target', 'mod-confirm', 'mod-confirm']);
  });

  it.each(['author', 'recipient', 'component', 'public', 'absent', 'nonowner', 'epoch'] as const)('rejects %s before intent admission', async fault => {
    const f = fixture(); await f.execute(f.interaction('moderation')); const selectionId = await f.select();
    const i = f.interaction('mod-confirm', { selectionId, private: fault !== 'public', member: fault === 'nonowner' ? OTHER : OWNER });
    if (fault === 'author') i.message.author.id = OTHER;
    if (fault === 'recipient') i.message.interactionMetadata.user.id = OTHER;
    if (fault === 'component') i.message.components = [];
    if (fault === 'absent') f.leave(OWNER);
    if (fault === 'epoch') f.state().room.controlVersion++;
    await f.execute(i); expect(f.events).not.toContain('sql:block'); expect(f.http).not.toHaveBeenCalled();
  });

  it.each(['selection', 'page', 'cancel', 'flow'] as const)('rejects an old nonce after a new %s without overwriting the current view', async change => {
    const f = fixture(); await f.execute(f.interaction('moderation')); const old = await f.select();
    if (change === 'selection') await f.select(OLDEST);
    if (change === 'page') await f.execute(f.interaction('mod-page', { page: 0 }));
    if (change === 'cancel') await f.execute(f.interaction('mod-cancel', { selectionId: old }));
    if (change === 'flow') await f.execute(f.interaction('access'));
    const before = f.visible(); const stale = f.interaction('mod-confirm', { selectionId: old });
    // A private error fallback is a separate ephemeral response, not this area's renderer.
    stale.followUp.mockImplementation(async () => ({ id: '73345678901234567' }));
    await f.execute(stale); expect(f.visible()).toEqual(before); expect(f.http).not.toHaveBeenCalled(); expect(f.state().memberBlocks).toEqual([]);
  });

  it('consumes the exact nonce once even for simultaneous confirmations', async () => {
    const f = fixture(); await f.execute(f.interaction('moderation')); const selectionId = await f.select();
    await Promise.all([f.execute(f.interaction('mod-confirm', { selectionId })), f.execute(f.interaction('mod-confirm', { selectionId }))]);
    expect(f.state().room.controlVersion).toBe(1); expect(f.state().memberBlocks).toHaveLength(1); expect(f.http).toHaveBeenCalledOnce();
  });

  it('shows saved partial state without false native confirmation or replay after an uncertain disconnect', async () => {
    const f = fixture(); await f.execute(f.interaction('moderation')); const selectionId = await f.select();
    f.http.mockRejectedValueOnce(new Error('private-secret-token')); const i = f.interaction('mod-confirm', { selectionId }); await f.execute(i);
    expect(f.state().memberBlocks).toHaveLength(1); expect(f.runtime.access.isUncertain(f.state().room.id)).toBe(true);
    expect(f.http).toHaveBeenCalledOnce(); expect(f.states.has(OTHER)).toBe(true);
    expect(JSON.stringify(f.visible())).toContain('salva'); expect(JSON.stringify(f.visible())).not.toContain('Membro bloqueado');
    expect(i.followUp).not.toHaveBeenCalled(); expect(JSON.stringify(f.visible())).not.toContain('private-secret');
  });

  it('unblocks by the room block ID after the member left the guild, without restoring authorization', async () => {
    const f = fixture(); const block = f.seedBlock(); f.leave(OTHER);
    f.guild.members.fetch.mockImplementation(async options => {
      const id = (options as { user: string }).user; if (id === OTHER) throw Object.assign(new Error('gone'), { code: 10007 });
      return { ...f.member, id, user: { bot: false } };
    });
    await f.execute(f.interaction('moderation')); const i = f.interaction('mod-unblock'); i.values = [block.id]; await f.execute(i);
    const match = JSON.stringify(f.visible()).match(/call:v3:mod-confirm:[^"\\]+/)?.[0]; expect(match).toBeDefined();
    const component = callComponentSchema.parse(match!); if (!('selectionId' in component)) throw new Error('Missing selection');
    await f.execute(f.interaction('mod-confirm', { selectionId: component.selectionId }));
    expect(f.state().memberBlocks).toEqual([]); expect(f.state().allowedMemberIds).toEqual([]); expect(f.http).not.toHaveBeenCalled();
    expect(f.visible()).toMatchObject({ embeds: [expect.objectContaining({ title: 'Membro desbloqueado' })] });
  });

  it('rejects the original confirmation after real owner A → B → A transfers', async () => {
    const f = fixture(); await f.execute(f.interaction('moderation')); const selectionId = await f.select();
    let pending = await f.runtime.transfers.begin(f.actor(), OTHER, f.runtime.gatewayFor(f.guild as unknown as Guild));
    await f.runtime.transfers.confirm(f.actor(), pending.id, f.runtime.gatewayFor(f.guild as unknown as Guild));
    pending = await f.runtime.transfers.begin(f.actorFor(OTHER), OWNER, f.runtime.gatewayFor(f.guild as unknown as Guild));
    await f.runtime.transfers.confirm(f.actorFor(OTHER), pending.id, f.runtime.gatewayFor(f.guild as unknown as Guild));
    expect(f.state().room).toMatchObject({ ownerDiscordId: OWNER, controlVersion: 2 });
    await f.execute(f.interaction('mod-confirm', { selectionId })); expect(f.state().memberBlocks).toEqual([]); expect(f.http).not.toHaveBeenCalled();
  });

  it('expires a selection at the native deadline rather than renewing it from the confirmation click', async () => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = fixture(); await f.execute(f.interaction('moderation')); const selectionId = await f.select();
    await vi.advanceTimersByTimeAsync(900_000);
    await f.execute(f.interaction('mod-confirm', { selectionId })); expect(f.state().memberBlocks).toEqual([]); expect(f.http).not.toHaveBeenCalled();
  });

  it('preserves pending transfer priority over a confirmation and public moderation open', async () => {
    const f = fixture(); await f.execute(f.interaction('moderation')); const selectionId = await f.select();
    const pending = await f.runtime.transfers.begin(f.actor(), OTHER, f.runtime.gatewayFor(f.guild as unknown as Guild));
    await f.execute(f.interaction('mod-confirm', { selectionId }));
    await f.execute(f.interaction('moderation'));
    expect(JSON.stringify(f.visible())).toContain(pending.id); expect(JSON.stringify(f.visible())).not.toContain('Bloquear membro');
    expect(f.state().memberBlocks).toEqual([]); expect(f.http).not.toHaveBeenCalled();
  });

  it('rebinds a confirmed idempotent block in the same epoch without disconnecting an absent member', async () => {
    const f = fixture(); f.seedBlock(); f.leave(OTHER);
    await f.execute(f.interaction('moderation')); const selectionId = await f.select();
    const i = f.interaction('mod-confirm', { selectionId }); await f.execute(i);
    expect(f.state().room.controlVersion).toBe(0); expect(f.state().memberBlocks).toHaveLength(1); expect(f.http).not.toHaveBeenCalled();
    expect(f.visible()).toMatchObject({ embeds: [expect.objectContaining({ title: 'Membro bloqueado' })] }); expect(i.followUp).not.toHaveBeenCalled();
  });

  it('keeps blocked members out of allow and transfer and explains the corrective unblock', async () => {
    const f = fixture(); f.seedBlock(); f.leave(OTHER);
    for (const action of ['allow-add', 'transfer-target'] as const) {
      const i = f.interaction(action); i.values = [OTHER]; await f.execute(i);
      expect(JSON.stringify(f.visible())).toContain('Desbloqueie');
    }
    expect(f.state().allowedMemberIds).toEqual([]); expect(f.state().transfer).toBeNull(); expect(f.http).not.toHaveBeenCalled();
  });

  it.each(['protected', 'permission'] as const)('explains %s privately without admitting SQL intent', async fault => {
    const f = fixture(); await f.execute(f.interaction('moderation')); const selectionId = await f.select(fault === 'protected' ? OWNER : OTHER);
    if (fault === 'permission') {
      f.channel.permissionsFor.mockReturnValue(new PermissionsBitField(Object.values(P).filter(bit => bit !== P.Administrator && bit !== P.MoveMembers)));
    }
    const i = f.interaction('mod-confirm', { selectionId }); await f.execute(i);
    expect(JSON.stringify(f.visible())).toContain(fault === 'protected' ? 'administradores' : 'Mover Membros');
    expect(f.state().memberBlocks).toEqual([]); expect(f.http).not.toHaveBeenCalled(); expect(i.followUp).not.toHaveBeenCalled();
  });

  it('drains service retirement before the same-area result, with no duplicate message or late deactivation', async () => {
    const f = fixture(); const open = f.interaction('moderation'); await f.execute(open); const selectionId = await f.select();
    const entered = deferred(); const release = deferred(); const resultDelivered = deferred(); const disconnected = deferred();
    const http = f.http.getMockImplementation()!;
    f.http.mockImplementationOnce(async (...args) => { const result = await http(...args); disconnected.resolve(); return result; });
    const i = f.interaction('mod-confirm', { selectionId });
    i.webhook.editMessage.mockImplementation(async (_id, payload) => {
      if (JSON.stringify(payload).includes('Área encerrada')) { entered.resolve(); await release.promise; }
      if (JSON.stringify(payload).includes('Membro bloqueado')) resultDelivered.resolve();
      return { id: '82345678901234567' };
    });
    const running = f.execute(i); await entered.promise;
    try {
      await disconnected.promise;
      expect(f.state().memberBlocks).toHaveLength(1); expect(f.http).toHaveBeenCalledOnce();
      // The handler's result waits for retirement, but must not retain the coordinator.
      await f.runtime.coordinator.room(f.guild.id, f.channel.id, async () => { expect(f.state().room.controlVersion).toBe(1); });
      release.resolve(); await running; await resultDelivered.promise;
      expect(i.webhook.editMessage.mock.calls.map(call => JSON.stringify(call[1]))).toEqual([
        expect.stringContaining('Área encerrada'), expect.stringContaining('Membro bloqueado'),
      ]);
      expect(open.followUp).toHaveBeenCalledOnce(); expect(i.followUp).not.toHaveBeenCalled();
    } finally { release.resolve(); await running; }
  });

  it.each(['owner', 'disabled', 'closed'] as const)('does not revive a result after %s invalidation while deactivation drains', async change => {
    const f = fixture(); await f.execute(f.interaction('moderation')); const selectionId = await f.select();
    const entered = deferred(); const release = deferred(); const replacing = deferred();
    const replace = f.runtime.workspaces.replaceAfterMutation.bind(f.runtime.workspaces);
    const outcomes: boolean[] = [];
    vi.spyOn(f.runtime.workspaces, 'replaceAfterMutation').mockImplementation(async (...args) => {
      const result = replace(...args); replacing.resolve(); const value = await result; outcomes.push(value); return value;
    });
    const i = f.interaction('mod-confirm', { selectionId });
    i.webhook.editMessage.mockImplementation(async (_id, payload) => {
      if (JSON.stringify(payload).includes('Área encerrada')) { entered.resolve(); await release.promise; }
      return { id: '82345678901234567' };
    });
    const running = f.execute(i); await entered.promise; await replacing.promise;
    try {
      await f.runtime.coordinator.room(f.guild.id, f.channel.id, async () => {
        if (change === 'owner') { f.state().room.ownerDiscordId = OLDEST; f.state().room.controlVersion++; }
        if (change === 'disabled') { f.state().controlsEnabled = false; f.state().room.controlVersion++; }
        if (change === 'closed') f.state().room.status = 'CLOSED';
        await f.runtime.workspaces.reconcile(f.state().room.id, await f.runtime.store.read(f.state().room.id));
      });
      release.resolve(); await running;
      expect(outcomes).toEqual([false]); expect(JSON.stringify(i.webhook.editMessage.mock.calls)).not.toContain('Membro bloqueado');
      expect(i.followUp).not.toHaveBeenCalled(); expect(f.http).toHaveBeenCalledOnce();
    } finally { release.resolve(); await running; }
  });

  it.each(['success', 'failure'] as const)('never lets late %s delivery replace a newer workspace flow', async outcome => {
    const f = fixture(); await f.execute(f.interaction('moderation')); const selectionId = await f.select();
    const entered = deferred(); const release = deferred();
    const method = f.runtime.moderation.block.bind(f.runtime.moderation);
    vi.spyOn(f.runtime.moderation, 'block').mockImplementationOnce(async (...args) => {
      const result = await method(...args); entered.resolve(); await release.promise;
      if (outcome === 'failure') throw new Error('private-secret'); return result;
    });
    const i = f.interaction('mod-confirm', { selectionId }); const running = f.execute(i); await entered.promise;
    try {
      const next = f.interaction('access'); await f.execute(next); const before = f.visible();
      release.resolve(); await running;
      expect(f.visible()).toEqual(before); expect(i.followUp).not.toHaveBeenCalled(); expect(f.http).toHaveBeenCalledOnce();
    } finally { release.resolve(); await running; }
  });

  it('revalidates the confirmed owner/epoch before rebinding a successful result', async () => {
    const f = fixture(); await f.execute(f.interaction('moderation')); const selectionId = await f.select();
    const method = f.runtime.moderation.block.bind(f.runtime.moderation);
    vi.spyOn(f.runtime.moderation, 'block').mockImplementationOnce(async (...args) => {
      const result = await method(...args); f.state().room.ownerDiscordId = OLDEST; f.state().room.controlVersion++; return result;
    });
    const i = f.interaction('mod-confirm', { selectionId }); await f.execute(i);
    expect(JSON.stringify(i.webhook.editMessage.mock.calls)).not.toContain('Membro bloqueado'); expect(i.followUp).not.toHaveBeenCalled();
    expect(f.state().memberBlocks).toHaveLength(1); expect(f.http).toHaveBeenCalledOnce();
  });

  it('does not replay the service or create a follow-up when result delivery is uncertain', async () => {
    const f = fixture(); await f.execute(f.interaction('moderation')); const selectionId = await f.select();
    const i = f.interaction('mod-confirm', { selectionId });
    i.webhook.editMessage.mockImplementation(async (_id, payload) => {
      if (JSON.stringify(payload).includes('Membro bloqueado')) throw new Error('private-token delivery failure');
      return { id: '82345678901234567' };
    });
    await f.execute(i);
    expect(f.state().memberBlocks).toHaveLength(1); expect(f.state().room.controlVersion).toBe(1); expect(f.http).toHaveBeenCalledOnce();
    expect(i.followUp).not.toHaveBeenCalled(); expect(i.editReply).not.toHaveBeenCalled();
  });

  it.each(['message', 'guild', 'channel', 'private', 'nonowner', 'absent'] as const)('rejects a public moderation %s forgery without exposing records', async fault => {
    const f = fixture(); f.seedBlock();
    const i = f.interaction('moderation', { member: fault === 'nonowner' ? OTHER : OWNER });
    if (fault === 'message') i.message.id = OTHER;
    if (fault === 'guild') i.guildId = OTHER;
    if (fault === 'channel') i.channelId = OTHER;
    if (fault === 'private') i.message.flags = new MessageFlagsBitField(MessageFlags.Ephemeral);
    if (fault === 'absent') f.leave(OWNER);
    await f.execute(i);
    expect(JSON.stringify(i.followUp.mock.calls)).not.toContain('Desbloquear membro');
    expect(i.webhook.editMessage).not.toHaveBeenCalled(); expect(f.http).not.toHaveBeenCalled(); expect(f.events).not.toContain('project');
  });

  it('opens the block selector and paginates room block IDs privately without changing intent', async () => {
    const f = fixture();
    for (let n = 0; n < 26; n++) f.seedBlock(String(30000000000000000n + BigInt(n)));
    await f.execute(f.interaction('moderation'));
    await f.execute(f.interaction('mod-block')); expect(JSON.stringify(f.visible())).toContain('mod-target');
    await f.execute(f.interaction('mod-list')); expect(JSON.stringify(f.visible())).toContain('Página 1/2');
    await f.execute(f.interaction('mod-page', { page: 1 })); expect(JSON.stringify(f.visible())).toContain('Página 2/2');
    expect(f.state().memberBlocks).toHaveLength(26); expect(f.state().room.controlVersion).toBe(0); expect(f.http).not.toHaveBeenCalled();
    expect(f.events).not.toContain('project');
  });

  it('never retires a newer generation using a delayed pre-lock reconciliation snapshot', async () => {
    const f = fixture(); await f.execute(f.interaction('moderation'));
    const entered = deferred(); const release = deferred(); const read = f.runtime.store.read.bind(f.runtime.store); let reads = 0;
    vi.spyOn(f.runtime.store, 'read').mockImplementation(async id => {
      const snapshot = await read(id);
      if (++reads === 3) { entered.resolve(); await release.promise; }
      return snapshot;
    });
    const stale = f.interaction('mod-page'); const running = f.execute(stale); await entered.promise;
    f.state().room.controlVersion++;
    const newerDelivery = { messageId: '73345678901234567', expiresAt: Date.now() + 900_000,
      edit: vi.fn(async () => ({ id: '73345678901234567' })), deactivate: vi.fn(async () => {}) };
    let publishing: Promise<unknown> | undefined;
    const newer = f.runtime.coordinator.room(f.guild.id, f.channel.id, async () => {
      void f.runtime.workspaces.reconcile(f.state().room.id, await read(f.state().room.id));
      publishing = f.runtime.workspaces.show(f.actor(), { kind: 'moderation', payload: { embeds: [], components: [] } }, async () => newerDelivery);
    });
    try {
      // Let an unblocked coordinator run; no timer or wall-clock delay is involved.
      await new Promise<void>(resolve => setImmediate(resolve)); release.resolve();
      await Promise.all([running, newer]); await publishing;
      expect(newerDelivery.deactivate).not.toHaveBeenCalled();
    } finally { release.resolve(); await Promise.all([running, newer]); }
  });

  it.each(['result', 'error'] as const)('does not adopt a later A → B → A epoch for an old moderation %s', async outcome => {
    const f = fixture(); f.join(OLDEST); await f.execute(f.interaction('moderation')); const selectionId = await f.select();
    const method = f.runtime.moderation.block.bind(f.runtime.moderation); const gateway = f.runtime.gatewayFor(f.guild as unknown as Guild);
    vi.spyOn(f.runtime.moderation, 'block').mockImplementationOnce(async (...args) => {
      const result = await method(...args);
      let pending = await f.runtime.transfers.begin(f.actor(), OLDEST, gateway);
      await f.runtime.transfers.confirm(f.actor(), pending.id, gateway);
      pending = await f.runtime.transfers.begin(f.actorFor(OLDEST), OWNER, gateway);
      await f.runtime.transfers.confirm(f.actorFor(OLDEST), pending.id, gateway);
      if (outcome === 'error') throw new Error('old failed result'); return result;
    });
    const i = f.interaction('mod-confirm', { selectionId }); await f.execute(i);
    expect(f.state().room).toMatchObject({ ownerDiscordId: OWNER, controlVersion: 3 });
    expect(i.webhook.editMessage).toHaveBeenCalledOnce();
    expect(JSON.stringify(i.webhook.editMessage.mock.calls)).toContain('Área encerrada');
    expect(i.followUp).not.toHaveBeenCalled(); expect(f.http).toHaveBeenCalledOnce();
  });
});
