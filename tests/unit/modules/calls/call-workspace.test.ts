import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CallPrivateWorkspace, type CallWorkspaceDelivery, type CallWorkspaceView } from '../../../../src/modules/calls/call-workspace.js';
import type { CallPanelPayload } from '../../../../src/modules/calls/call-panel.view.js';
import type { RoomActor, RoomState } from '../../../../src/modules/calls/room.types.js';
import type { ModerationSelection } from '../../../../src/modules/calls/call-moderation.view.js';
import { deferred, room } from './call.fixtures.js';

const actor: RoomActor = { roomId: room.id, guildDiscordId: room.guildDiscordId, memberDiscordId: room.ownerDiscordId!, controlVersion: 0 };
const payload = (title: string): CallPanelPayload => ({ embeds: [{ title }], components: [], allowedMentions: { parse: [] } });
const access: CallWorkspaceView = { kind: 'access', payload: payload('access') };
const target: CallWorkspaceView = { kind: 'transfer-target', payload: payload('target') };
const pending = (id: string): CallWorkspaceView => ({ kind: 'transfer-pending', operationId: id, payload: payload(id) });
const state = (): RoomState => ({ room: structuredClone(room), controlsEnabled: true, presences: [], allowedMemberIds: [], memberBlocks: [], transfer: null });
function delivery(messageId = 'private-1', expiresAt = 900_000) {
  return { messageId, expiresAt, edit: vi.fn(async (_payload: CallPanelPayload) => ({ id: messageId })), deactivate: vi.fn(async () => {}) };
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(0); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

const selectionA: ModerationSelection = { id: '123e4567-e89b-42d3-a456-426614174000', kind: 'block', memberId: '72345678901234567' };
const selectionB: ModerationSelection = { id: '323e4567-e89b-42d3-a456-426614174000', kind: 'unblock', blockId: '423e4567-e89b-42d3-a456-426614174000' };
const confirmation = (selection: ModerationSelection = selectionA): CallWorkspaceView => ({ kind: 'moderation-confirm', selection, payload: payload(selection.id) });
const moderation: CallWorkspaceView = { kind: 'moderation', payload: payload('moderation') };
const read = (workspace: CallPrivateWorkspace, messageId = 'private-1', id = selectionA.id) => workspace.readModerationSelection(actor.roomId, actor.guildDiscordId, actor.memberDiscordId, messageId, id);

describe('moderation selection delivery binding (not authorization)', () => {
  it('requires current UUID, exact message, guild, room, member and active lifetime; consumes once synchronously', async () => {
    const workspace = new CallPrivateWorkspace(); const first = delivery();
    await workspace.show(actor, confirmation(), async () => first);
    expect(read(workspace)).toEqual({ actor, selection: selectionA });
    expect(read(workspace, 'wrong')).toBeNull(); expect(read(workspace, first.messageId, selectionB.id)).toBeNull();
    for (const [roomId, guildId, memberId] of [['wrong', actor.guildDiscordId, actor.memberDiscordId], [actor.roomId, 'wrong', actor.memberDiscordId], [actor.roomId, actor.guildDiscordId, 'wrong']]) {
      expect(workspace.readModerationSelection(roomId!, guildId!, memberId!, first.messageId, selectionA.id)).toBeNull();
    }
    expect(workspace.consumeModerationSelection({ ...actor, controlVersion: 1 }, first.messageId, selectionA.id)).toBeNull();
    expect(workspace.consumeModerationSelection(actor, first.messageId, selectionA.id)).toEqual(selectionA);
    expect(workspace.consumeModerationSelection(actor, first.messageId, selectionA.id)).toBeNull(); expect(read(workspace)).toBeNull();
    await workspace.stop();
  });

  it.each([moderation, access, target, pending('transfer'), confirmation(selectionB)])('invalidates replaced confirmation before any queued edit ($kind)', async next => {
    const workspace = new CallPrivateWorkspace(); const first = delivery();
    await workspace.show(actor, confirmation(), async () => first);
    const showing = workspace.show(actor, next, async () => first);
    expect(read(workspace)).toBeNull(); await showing;
    await workspace.stop();
  });

  it('keeps pending transfer priority over moderation and fences late private errors', async () => {
    const workspace = new CallPrivateWorkspace(); const first = delivery();
    await workspace.show(actor, confirmation(), async () => first);
    await workspace.show(actor, pending('new-transfer'), async () => first);
    await workspace.show(actor, confirmation(selectionB), async () => first);
    expect(read(workspace, first.messageId, selectionB.id)).toBeNull();
    expect(await workspace.editFailure(actor, first.messageId, { ...payload('old-error'), content: 'error' }, null)).toBe(false);
    expect(first.edit).toHaveBeenLastCalledWith(payload('new-transfer'));
    await workspace.stop();
  });

  it('cancel/page and reopening the same target with a new UUID never revive the old confirmation', async () => {
    const workspace = new CallPrivateWorkspace(); const first = delivery(); const create = vi.fn(async () => first);
    await workspace.show(actor, confirmation(), create);
    await workspace.show(actor, moderation, create);
    expect(read(workspace)).toBeNull();
    const reopened = { ...selectionA, id: selectionB.id };
    await workspace.show(actor, confirmation(reopened), create);
    expect(read(workspace)).toBeNull();
    expect(read(workspace, first.messageId, selectionB.id)?.selection).toEqual(reopened);
    await workspace.show(actor, { kind: 'moderation', payload: payload('page-1') }, create);
    expect(read(workspace, first.messageId, selectionB.id)).toBeNull(); expect(create).toHaveBeenCalledOnce();
    await workspace.stop();
  });

  it('does not expose pending create and expires exactly at the native handle deadline without public-click refresh', async () => {
    const workspace = new CallPrivateWorkspace(); const first = delivery(); const entered = deferred(); const release = deferred();
    const showing = workspace.show(actor, confirmation(), async () => { entered.resolve(); await release.promise; return first; });
    await entered.promise; expect(read(workspace)).toBeNull(); release.resolve(); await showing;
    await vi.advanceTimersByTimeAsync(899_999); await workspace.show(actor, confirmation(), async () => first);
    expect(read(workspace)).not.toBeNull(); await vi.advanceTimersByTimeAsync(1);
    expect(read(workspace)).toBeNull(); expect(workspace.consumeModerationSelection(actor, first.messageId, selectionA.id)).toBeNull();
    await workspace.stop();
  });

  it('returns defensive snapshots and cannot restore a selection after owner A to B to A', async () => {
    const workspace = new CallPrivateWorkspace(); const first = delivery(); const input = { ...selectionA };
    await workspace.show(actor, confirmation(input), async () => first);
    input.id = selectionB.id;
    const selected = read(workspace)!; selected.actor.controlVersion = 99; selected.selection.id = selectionB.id;
    expect(read(workspace)).toEqual({ actor, selection: selectionA });
    const next = state(); next.room.ownerDiscordId = 'B'; next.room.controlVersion = 1;
    await workspace.reconcile(actor.roomId, next);
    next.room.ownerDiscordId = actor.memberDiscordId; next.room.controlVersion = 2;
    await workspace.reconcile(actor.roomId, next);
    await workspace.show({ ...actor, controlVersion: 2 }, moderation, async () => delivery('private-2'));
    expect(read(workspace)).toBeNull(); await workspace.stop();
  });
});

describe('moderation mutation generation replacement', () => {
  const after = { ...actor, controlVersion: 1 };
  it('reuses a consumed selection for a confirmed idempotent result in the same epoch, without replaying it', async () => {
    const workspace = new CallPrivateWorkspace(); const first = delivery();
    await workspace.show(actor, confirmation(), async () => first);
    expect(workspace.consumeModerationSelection(actor, first.messageId, selectionA.id)).toEqual(selectionA);
    expect(await workspace.replaceAfterMutation(actor, actor, first, moderation)).toBe(true);
    expect(first.edit).toHaveBeenCalledExactlyOnceWith(moderation.payload);
    expect(await workspace.replaceAfterMutation(actor, actor, first, moderation)).toBe(false);
    expect(first.deactivate).toHaveBeenCalledOnce();
    await workspace.show(actor, access, async () => delivery('unexpected'));
    expect(first.edit).toHaveBeenLastCalledWith(access.payload); await workspace.stop();
  });

  it('keeps expiry scheduled while rebind waits for suspended retirement', async () => {
    const workspace = new CallPrivateWorkspace(); const first = delivery();
    await workspace.show(actor, confirmation(), async () => first);
    const entered = deferred(); const release = deferred();
    first.deactivate.mockImplementationOnce(async () => { entered.resolve(); await release.promise; });
    const replacing = workspace.replaceAfterMutation(actor, after, first, moderation); await entered.promise;
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(900_000);
    release.resolve(); expect(await replacing).toBe(false);
    expect(first.edit).not.toHaveBeenCalled(); await workspace.stop();
  });

  it('expires retained retirement lineage on the existing single timer, even without another click', async () => {
    const workspace = new CallPrivateWorkspace(); const first = delivery();
    await workspace.show(actor, confirmation(), async () => first);
    await workspace.reconcile(actor.roomId, null);
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(900_000);
    expect(vi.getTimerCount()).toBe(0);
    expect(await workspace.replaceAfterMutation(actor, after, { ...first, expiresAt: 1_800_000 }, moderation)).toBe(false);
    expect(first.edit).not.toHaveBeenCalled(); await workspace.stop();
  });

  it('rebinds after reconciliation on the same message and retains its native expiry', async () => {
    const workspace = new CallPrivateWorkspace(); const first = delivery();
    await workspace.show(actor, confirmation(), async () => first);
    workspace.consumeModerationSelection(actor, first.messageId, selectionA.id);
    const next = state(); next.room.controlVersion = 1;
    await workspace.reconcile(actor.roomId, next);
    await vi.advanceTimersByTimeAsync(800_000);
    expect(await workspace.replaceAfterMutation(actor, after, { ...first, expiresAt: 1_700_000 }, moderation)).toBe(true);
    expect(first.edit).toHaveBeenLastCalledWith(moderation.payload);
    expect(read(workspace)).toBeNull();
    await vi.advanceTimersByTimeAsync(100_000);
    expect(await workspace.replaceAfterMutation(after, { ...after, controlVersion: 2 }, first, moderation)).toBe(false);
    await workspace.stop();
  });

  it('drains old edits and retirement before writing the result', async () => {
    const workspace = new CallPrivateWorkspace(); const first = delivery(); const events: string[] = [];
    await workspace.show(actor, confirmation(), async () => first);
    const entered = deferred(); const release = deferred();
    first.edit.mockImplementationOnce(async () => { entered.resolve(); await release.promise; events.push('old-edit'); return { id: first.messageId }; });
    first.deactivate.mockImplementationOnce(async () => { events.push('retire'); });
    const editing = workspace.show(actor, moderation, async () => first); const rejected = expect(editing).rejects.toMatchObject({ code: 'STALE_CONTROLS' }); await entered.promise;
    const reconciling = workspace.reconcile(actor.roomId, null);
    first.edit.mockImplementationOnce(async () => { events.push('result'); return { id: first.messageId }; });
    const replacing = workspace.replaceAfterMutation(actor, after, first, moderation);
    await Promise.resolve(); expect(events).toEqual([]);
    release.resolve(); await rejected; await reconciling; expect(await replacing).toBe(true);
    expect(events).toEqual(['old-edit', 'retire', 'result']); await workspace.stop();
  });

  it.each(['owner', 'guild', 'room', 'version', 'message', 'unknown'] as const)('rejects unsafe %s rebind without another delivery', async change => {
    const workspace = new CallPrivateWorkspace(); const first = delivery();
    if (change !== 'unknown') await workspace.show(actor, confirmation(), async () => first);
    const changed = { ...after };
    if (change === 'owner') changed.memberDiscordId = 'another';
    if (change === 'guild') changed.guildDiscordId = 'another';
    if (change === 'room') changed.roomId = 'another';
    if (change === 'version') changed.controlVersion = 0;
    expect(await workspace.replaceAfterMutation(actor, changed, change === 'message' ? delivery('wrong') : first, moderation)).toBe(false);
    expect(first.edit).not.toHaveBeenCalled(); await workspace.stop();
  });

  it('never overwrites a newer session opened while retirement is suspended', async () => {
    const workspace = new CallPrivateWorkspace(); const first = delivery();
    await workspace.show(actor, confirmation(), async () => first);
    const entered = deferred(); const release = deferred();
    first.deactivate.mockImplementationOnce(async () => { entered.resolve(); await release.promise; });
    const replacing = workspace.replaceAfterMutation(actor, after, first, moderation); await entered.promise;
    const second = delivery('new-private'); await workspace.show(after, pending('new-transfer'), async () => second);
    release.resolve(); expect(await replacing).toBe(false);
    expect(first.edit).not.toHaveBeenCalled(); expect(second.edit).not.toHaveBeenCalled(); expect(second.deactivate).not.toHaveBeenCalled();
    expect(await workspace.editPending(after, 'new-transfer', payload('current'))).toBe(true); await workspace.stop();
  });

  it('does not resurrect an older generation even after a newer session has itself retired', async () => {
    const workspace = new CallPrivateWorkspace(); const first = delivery();
    await workspace.show(actor, confirmation(), async () => first);
    await workspace.reconcile(actor.roomId, null);
    const second = delivery('new-private'); await workspace.show(after, moderation, async () => second);
    await workspace.reconcile(actor.roomId, null);
    expect(await workspace.replaceAfterMutation(actor, { ...after, controlVersion: 2 }, first, moderation)).toBe(false);
    expect(first.edit).not.toHaveBeenCalled(); await workspace.stop();
  });

  it('refuses replacement during stop and never replaces an active transfer', async () => {
    const workspace = new CallPrivateWorkspace(); const first = delivery();
    await workspace.show(actor, pending('transfer'), async () => first);
    expect(await workspace.replaceAfterMutation(actor, after, first, moderation)).toBe(false);
    expect(first.deactivate).not.toHaveBeenCalled(); await workspace.stop();
    expect(await workspace.replaceAfterMutation(actor, after, first, moderation)).toBe(false);
    expect(first.edit).not.toHaveBeenCalled();
  });

  it('fences concurrent replacements and retirement after a suspended result edit', async () => {
    const workspace = new CallPrivateWorkspace(); const first = delivery();
    await workspace.show(actor, confirmation(), async () => first);
    const entered = deferred(); const release = deferred();
    first.edit.mockImplementationOnce(async () => { entered.resolve(); await release.promise; return { id: first.messageId }; });
    const replacing = workspace.replaceAfterMutation(actor, after, first, moderation); await entered.promise;
    expect(await workspace.replaceAfterMutation(actor, after, first, moderation)).toBe(false);
    const reconciling = workspace.reconcile(actor.roomId, null);
    const second = delivery('private-new'); await workspace.show({ ...after, controlVersion: 2 }, moderation, async () => second);
    release.resolve(); expect(await replacing).toBe(false); await reconciling;
    expect(second.deactivate).not.toHaveBeenCalled(); await workspace.stop();
  });

  it('returns false on uncertain result edit without creating a follow-up', async () => {
    const workspace = new CallPrivateWorkspace(); const first = delivery();
    await workspace.show(actor, confirmation(), async () => first);
    first.edit.mockRejectedValueOnce(new Error('private-token-sentinel'));
    expect(await workspace.replaceAfterMutation(actor, after, first, moderation)).toBe(false);
    expect(read(workspace)).toBeNull(); await workspace.stop();
  });
});

describe('CallPrivateWorkspace delivery lifecycle (not room authorization)', () => {
  it('reuses selections until the original delivery expires, not the last public click', async () => {
    const workspaces = new CallPrivateWorkspace(); const first = delivery();
    const create = vi.fn(async () => first);
    await workspaces.show(actor, access, create);
    await vi.advanceTimersByTimeAsync(899_000);
    await workspaces.show(actor, target, create);
    expect(create).toHaveBeenCalledTimes(1); expect(first.edit).toHaveBeenCalledWith(target.payload);
    await vi.advanceTimersByTimeAsync(1_000);
    const next = delivery('private-2', 1_800_000); create.mockResolvedValueOnce(next);
    await workspaces.show(actor, access, create);
    expect(create).toHaveBeenCalledTimes(2);
    expect(await workspaces.editPending(actor, 'old-operation', payload('old'))).toBe(false);
    await workspaces.stop(); expect(vi.getTimerCount()).toBe(0);
  });

  it('serializes concurrent opens into one create and one edit', async () => {
    const workspaces = new CallPrivateWorkspace(); const first = delivery(); const entered = deferred(); const release = deferred();
    const create = vi.fn(async () => { entered.resolve(); await release.promise; return first; });
    const one = workspaces.show(actor, access, create); await entered.promise;
    const two = workspaces.show(actor, target, create);
    expect(first.edit).not.toHaveBeenCalled(); release.resolve();
    expect(await one).toBe(first); expect(await two).toBe(first);
    expect(create).toHaveBeenCalledOnce(); expect(first.edit).toHaveBeenCalledExactlyOnceWith(target.payload);
    await workspaces.stop();
  });

  it('preserves the current pending transfer when another selection is requested', async () => {
    const workspaces = new CallPrivateWorkspace(); const first = delivery(); const create = vi.fn(async () => first);
    await workspaces.show(actor, pending('operation-1'), create);
    await workspaces.show(actor, target, create);
    expect(first.edit).toHaveBeenCalledExactlyOnceWith(payload('operation-1'));
    expect(await workspaces.editPending(actor, 'operation-2', payload('wrong'))).toBe(false);
    expect(await workspaces.editPending(actor, 'operation-1', payload('countdown'))).toBe(true);
    await workspaces.stop();
  });

  it('delivers a private failure through the current operation without replacing its controls', async () => {
    const workspaces = new CallPrivateWorkspace(); const first = delivery();
    const controls = { ...payload('pending'), components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId('confirm').setLabel('Confirmar').setStyle(ButtonStyle.Secondary))] };
    await workspaces.show(actor, { kind: 'transfer-pending', operationId: 'current', payload: controls }, async () => first);
    expect(await workspaces.editFailure(actor, first.messageId, { ...payload('error'), content: 'Invalid selection' }, { operationId: 'current', payload: controls })).toBe(true);
    expect(first.edit).toHaveBeenCalledExactlyOnceWith({ ...controls, content: 'Invalid selection' });
    expect(await workspaces.editPending(actor, 'current', controls)).toBe(true);
    await workspaces.stop();
  });

  it('keeps the current selection view when an older input reports a private failure', async () => {
    const workspaces = new CallPrivateWorkspace(); const first = delivery();
    await workspaces.show(actor, access, async () => first);
    await workspaces.show(actor, target, async () => first);
    expect(await workspaces.editFailure(actor, first.messageId, { ...payload('old-error'), content: 'Invalid selection' }, null)).toBe(true);
    expect(first.edit).toHaveBeenLastCalledWith({ ...target.payload, content: 'Invalid selection' });
    await workspaces.stop();
  });

  it('does not create or edit a failure for a different source, operation or expired generation', async () => {
    const workspaces = new CallPrivateWorkspace(); const first = delivery();
    const failure = { ...payload('error'), content: 'Invalid selection' };
    expect(await workspaces.editFailure(actor, first.messageId, failure, null)).toBe(false);
    await workspaces.show(actor, pending('current'), async () => first);
    expect(await workspaces.editFailure(actor, 'another-message', failure, { operationId: 'current', payload: payload('current') })).toBe(false);
    expect(await workspaces.editFailure(actor, first.messageId, failure, { operationId: 'old', payload: payload('old') })).toBe(false);
    expect(await workspaces.editFailure(actor, first.messageId, failure, null)).toBe(false);
    expect(first.edit).not.toHaveBeenCalled();
    await workspaces.reconcile(actor.roomId, null);
    expect(await workspaces.editFailure(actor, first.messageId, failure, { operationId: 'current', payload: payload('current') })).toBe(false);
    expect(first.edit).not.toHaveBeenCalled(); await workspaces.stop();
  });

  it('fences a queued private failure when a newer view is prepared before its delivery', async () => {
    const workspaces = new CallPrivateWorkspace(); const first = delivery();
    await workspaces.show(actor, access, async () => first);
    const entered = deferred(); const release = deferred();
    first.edit.mockImplementationOnce(async () => { entered.resolve(); await release.promise; return { id: first.messageId }; });
    const running = workspaces.show(actor, target, async () => first); await entered.promise;
    const failed = workspaces.editFailure(actor, first.messageId, { ...payload('old-error'), content: 'Invalid selection' }, null);
    const next = workspaces.show(actor, pending('new'), async () => first);
    release.resolve(); await running; expect(await failed).toBe(false); await next;
    expect(first.edit.mock.calls.map(([p]) => p)).toEqual([target.payload, payload('new')]);
    await workspaces.stop();
  });

  it('drops a queued failure for a completed operation before a replacement pending transfer', async () => {
    const workspaces = new CallPrivateWorkspace(); const first = delivery();
    await workspaces.show(actor, pending('old'), async () => first);
    const entered = deferred(); const release = deferred();
    first.edit.mockImplementationOnce(async () => { entered.resolve(); await release.promise; return { id: first.messageId }; });
    const running = workspaces.editPending(actor, 'old', payload('running')); await entered.promise;
    const failed = workspaces.editFailure(actor, first.messageId, { ...payload('error'), content: 'Invalid selection' }, { operationId: 'old', payload: payload('old') });
    const terminal = workspaces.editPending(actor, 'old', payload('terminal'), true);
    const next = workspaces.show(actor, pending('new'), async () => first);
    release.resolve(); await running; expect(await failed).toBe(false); await terminal; await next;
    expect(first.edit.mock.calls.map(([p]) => p)).toEqual([payload('running'), payload('new')]);
    await workspaces.stop();
  });

  it('drops queued callbacks from an old operation before a new pending operation', async () => {
    const workspaces = new CallPrivateWorkspace(); const first = delivery();
    await workspaces.show(actor, pending('old'), async () => first);
    const entered = deferred(); const release = deferred();
    first.edit.mockImplementationOnce(async () => { entered.resolve(); await release.promise; return { id: first.messageId }; });
    const running = workspaces.editPending(actor, 'old', payload('running')); await entered.promise;
    const queued = workspaces.editPending(actor, 'old', payload('obsolete'));
    const terminal = workspaces.editPending(actor, 'old', payload('terminal'), true);
    const replacement = workspaces.show(actor, pending('new'), async () => delivery('unexpected'));
    release.resolve();
    expect(await running).toBe(false); expect(await queued).toBe(false); expect(await terminal).toBe(false);
    await replacement;
    expect(first.edit.mock.calls.map(([p]) => p)).toEqual([payload('running'), payload('new')]);
    expect(await workspaces.editPending(actor, 'old', payload('late'), true)).toBe(false);
    expect(await workspaces.editPending(actor, 'new', payload('current'))).toBe(true);
    await workspaces.stop();
  });

  it('allows selections to reuse a terminally edited delivery', async () => {
    const workspaces = new CallPrivateWorkspace(); const first = delivery(); const create = vi.fn(async () => first);
    await workspaces.show(actor, pending('old'), create);
    expect(await workspaces.editPending(actor, 'old', payload('done'), true)).toBe(true);
    await workspaces.show(actor, access, create);
    expect(create).toHaveBeenCalledOnce(); expect(first.edit).toHaveBeenLastCalledWith(access.payload);
    await workspaces.stop();
  });

  it('expires an in-flight edit without letting its completion touch the next workspace', async () => {
    const workspaces = new CallPrivateWorkspace(); const first = delivery();
    await workspaces.show(actor, pending('old'), async () => first);
    const entered = deferred(); const release = deferred();
    first.edit.mockImplementationOnce(async () => { entered.resolve(); await release.promise; return { id: first.messageId }; });
    const editing = workspaces.editPending(actor, 'old', payload('late')); await entered.promise;
    await vi.advanceTimersByTimeAsync(900_000);
    const next = delivery('private-2', 1_800_000); await workspaces.show(actor, pending('new'), async () => next);
    release.resolve(); expect(await editing).toBe(false);
    expect(await workspaces.editPending(actor, 'new', payload('current'))).toBe(true);
    expect(next.deactivate).not.toHaveBeenCalled(); await workspaces.stop();
    expect(first.deactivate).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });

  it('uses the delivery timestamp deadline even when create finishes late', async () => {
    const workspaces = new CallPrivateWorkspace(); const first = delivery('private-1', 100);
    const entered = deferred(); const release = deferred();
    const showing = workspaces.show(actor, access, async () => { entered.resolve(); await release.promise; return first; });
    const rejected = expect(showing).rejects.toMatchObject({ code: 'STALE_CONTROLS' });
    await entered.promise; await vi.advanceTimersByTimeAsync(101); release.resolve(); await rejected;
    expect(first.deactivate).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0); await workspaces.stop();
  });

  it.each(['owner', 'version', 'guild', 'disabled', 'closed', 'closing', 'missing'] as const)('invalidates handles on %s even if deactivation fails', async (change) => {
    const workspaces = new CallPrivateWorkspace(); const first = delivery();
    await workspaces.show(actor, pending('old'), async () => first);
    const next = state();
    if (change === 'owner') next.room.ownerDiscordId = 'another';
    if (change === 'version') next.room.controlVersion++;
    if (change === 'guild') next.room.guildDiscordId = 'another';
    if (change === 'disabled') next.controlsEnabled = false;
    if (change === 'closed') next.room.status = 'CLOSED';
    if (change === 'closing') next.room.status = 'CLOSING';
    first.deactivate.mockRejectedValueOnce(new Error('private-token-sentinel'));
    await workspaces.reconcile(actor.roomId, change === 'missing' ? null : next);
    expect(await workspaces.editPending(actor, 'old', payload('late'))).toBe(false);
    expect(first.deactivate).toHaveBeenCalledOnce(); await workspaces.stop();
  });

  it('does not revive A handles after A to B to A with another version', async () => {
    const workspaces = new CallPrivateWorkspace(); const first = delivery();
    await workspaces.show(actor, pending('old'), async () => first);
    const next = state(); next.room.ownerDiscordId = 'B'; next.room.controlVersion = 1;
    await workspaces.reconcile(actor.roomId, next);
    next.room.ownerDiscordId = actor.memberDiscordId; next.room.controlVersion = 2;
    await workspaces.reconcile(actor.roomId, next);
    const lastActor = { ...actor, controlVersion: 2 }; const last = delivery('private-2');
    await workspaces.show(lastActor, pending('new'), async () => last);
    expect(await workspaces.editPending(actor, 'old', payload('obsolete'))).toBe(false);
    expect(await workspaces.editPending(lastActor, 'new', payload('current'))).toBe(true);
    await workspaces.stop();
  });

  it('clears cancelled pending state without losing the reusable message', async () => {
    const workspaces = new CallPrivateWorkspace(); const first = delivery(); const create = vi.fn(async () => first);
    await workspaces.show(actor, pending('cancelled'), create);
    await workspaces.reconcile(actor.roomId, state());
    expect(await workspaces.editPending(actor, 'cancelled', payload('late'))).toBe(false);
    await workspaces.show(actor, target, create);
    expect(create).toHaveBeenCalledOnce(); expect(first.edit).toHaveBeenLastCalledWith(target.payload);
    await workspaces.stop();
  });

  it('invalidates before waiting for deactivation and leaves the replacement untouched', async () => {
    const workspaces = new CallPrivateWorkspace(); const first = delivery();
    await workspaces.show(actor, pending('old'), async () => first);
    const entered = deferred(); const release = deferred();
    first.deactivate.mockImplementationOnce(async () => { entered.resolve(); await release.promise; });
    const reconciling = workspaces.reconcile(actor.roomId, null); await entered.promise;
    expect(await workspaces.editPending(actor, 'old', payload('late'))).toBe(false);
    const next = delivery('private-2'); await workspaces.show(actor, pending('new'), async () => next);
    release.resolve(); await reconciling;
    expect(await workspaces.editPending(actor, 'new', payload('current'))).toBe(true);
    expect(next.deactivate).not.toHaveBeenCalled(); await workspaces.stop();
  });

  it('does not retry uncertain create, but permits adopting a proven message after validation', async () => {
    const workspaces = new CallPrivateWorkspace(); const create = vi.fn(async (): Promise<CallWorkspaceDelivery> => { throw new Error('private-token-sentinel'); });
    await expect(workspaces.show(actor, access, create)).rejects.toMatchObject({ code: 'DISCORD_FAILURE' });
    await expect(workspaces.show(actor, target, create)).rejects.toMatchObject({ code: 'DISCORD_FAILURE' });
    expect(create).toHaveBeenCalledOnce();
    const proven = delivery(); workspaces.adopt(actor, proven);
    await workspaces.show(actor, target, create);
    expect(proven.edit).toHaveBeenCalledExactlyOnceWith(target.payload); expect(create).toHaveBeenCalledOnce();
    await workspaces.stop();
  });

  it('expires an uncertain create reservation without a retry timer', async () => {
    const workspaces = new CallPrivateWorkspace(); const first = delivery('private-2', 1_800_000);
    const create = vi.fn(async () => first).mockRejectedValueOnce(new Error('lost acknowledgement'));
    await expect(workspaces.show(actor, access, create)).rejects.toMatchObject({ code: 'DISCORD_FAILURE' });
    await vi.advanceTimersByTimeAsync(900_000);
    expect(create).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
    await workspaces.show(actor, target, create); expect(create).toHaveBeenCalledTimes(2); await workspaces.stop();
  });

  it('rejects missing publication IDs and never automatically creates a replacement', async () => {
    const workspaces = new CallPrivateWorkspace(); const first = delivery(''); const create = vi.fn(async () => first);
    await expect(workspaces.show(actor, access, create)).rejects.toMatchObject({ code: 'DISCORD_FAILURE' });
    await expect(workspaces.show(actor, target, create)).rejects.toMatchObject({ code: 'DISCORD_FAILURE' });
    expect(create).toHaveBeenCalledOnce(); expect(first.edit).not.toHaveBeenCalled(); await workspaces.stop();
  });

  it('requires a confirmed ID on edits and retains the message on uncertain failures', async () => {
    const workspaces = new CallPrivateWorkspace(); const first = delivery(); const create = vi.fn(async () => first);
    await workspaces.show(actor, pending('pending'), create);
    first.edit.mockResolvedValueOnce({ id: '' });
    expect(await workspaces.editPending(actor, 'pending', payload('not-published'))).toBe(false);
    first.edit.mockRejectedValueOnce(new Error('private-token-sentinel'));
    await expect(workspaces.show(actor, target, create)).rejects.toMatchObject({ code: 'DISCORD_FAILURE' });
    expect(create).toHaveBeenCalledOnce(); await workspaces.stop();
  });

  it('preserves an adopted handle when the original create response arrives expired', async () => {
    const workspaces = new CallPrivateWorkspace(); const original = delivery('same-message', 100);
    const refreshed = delivery('same-message', 1_000); const entered = deferred(); const release = deferred();
    const create = vi.fn(async () => { entered.resolve(); await release.promise; return original; });
    const showing = workspaces.show(actor, pending('current'), create);
    const outcome = showing.then((delivered) => delivered, (error: unknown) => error);
    await entered.promise; await vi.advanceTimersByTimeAsync(90);
    workspaces.adopt(actor, refreshed);
    const editing = workspaces.editPending(actor, 'current', payload('countdown'));
    await vi.advanceTimersByTimeAsync(11);
    expect(refreshed.edit).not.toHaveBeenCalled();
    release.resolve();
    expect(await outcome).toBe(refreshed); expect(await editing).toBe(true);
    expect(refreshed.edit).toHaveBeenCalledExactlyOnceWith(payload('countdown'));
    expect(await workspaces.editPending(actor, 'current', payload('done'), true)).toBe(true);
    expect(await workspaces.show(actor, target, create)).toBe(refreshed);
    expect(refreshed.edit).toHaveBeenLastCalledWith(target.payload);
    expect(create).toHaveBeenCalledOnce(); expect(original.edit).not.toHaveBeenCalled();
    expect(original.deactivate).not.toHaveBeenCalled(); expect(refreshed.deactivate).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(898);
    expect(refreshed.deactivate).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(refreshed.deactivate).toHaveBeenCalledOnce(); expect(original.deactivate).not.toHaveBeenCalled();
    await workspaces.stop(); expect(vi.getTimerCount()).toBe(0);
  });

  it('only adopt extends a known delivery, and old edits cannot replace the refreshed handle', async () => {
    const workspaces = new CallPrivateWorkspace(); const first = delivery();
    await workspaces.show(actor, pending('pending'), async () => first);
    const entered = deferred(); const release = deferred();
    first.edit.mockImplementationOnce(async () => { entered.resolve(); await release.promise; return { id: first.messageId }; });
    const editing = workspaces.editPending(actor, 'pending', payload('old-handle')); await entered.promise;
    await vi.advanceTimersByTimeAsync(800_000);
    const refreshed = delivery(first.messageId, 1_700_000); workspaces.adopt(actor, refreshed);
    release.resolve(); expect(await editing).toBe(false);
    await vi.advanceTimersByTimeAsync(100_001);
    expect(await workspaces.editPending(actor, 'pending', payload('new-handle'))).toBe(true);
    expect(refreshed.edit).toHaveBeenCalledExactlyOnceWith(payload('new-handle'));
    expect(first.deactivate).not.toHaveBeenCalled(); await workspaces.stop();
  });

  it('uses one next-expiry timer and cleans idle handles without another click', async () => {
    const workspaces = new CallPrivateWorkspace(); const first = delivery(); const second = delivery('private-2', 1_000_000);
    await workspaces.show(actor, access, async () => first);
    await workspaces.show({ ...actor, roomId: 'other-room' }, access, async () => second);
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(900_000); expect(first.deactivate).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(100_000); expect(second.deactivate).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
    await workspaces.stop();
  });

  it.each(['expiry', 'generation'] as const)('orders adoption of the same proven message after an old edit from %s', async (cause) => {
    const workspaces = new CallPrivateWorkspace(); const first = delivery();
    await workspaces.show(actor, pending('old'), async () => first);
    const entered = deferred(); const release = deferred();
    first.edit.mockImplementationOnce(async () => { entered.resolve(); await release.promise; return { id: first.messageId }; });
    const old = workspaces.editPending(actor, 'old', payload('old')); await entered.promise;
    let reconciling: Promise<void> | undefined;
    if (cause === 'expiry') await vi.advanceTimersByTimeAsync(900_000);
    else reconciling = workspaces.reconcile(actor.roomId, null);
    const currentActor = { ...actor, controlVersion: cause === 'generation' ? 1 : 0 };
    const refreshed = delivery(first.messageId, Date.now() + 900_000);
    workspaces.adopt(currentActor, refreshed);
    const showing = workspaces.show(currentActor, pending('new'), async () => delivery('unexpected'));
    await Promise.resolve(); await Promise.resolve();
    expect(refreshed.edit).not.toHaveBeenCalled();
    release.resolve(); expect(await old).toBe(false); await reconciling; await showing;
    expect(refreshed.edit).toHaveBeenCalledExactlyOnceWith(payload('new'));
    expect(first.deactivate).not.toHaveBeenCalled(); await workspaces.stop();
  });

  it('drains edits and fences queued operations on stop', async () => {
    const workspaces = new CallPrivateWorkspace(); const first = delivery();
    await workspaces.show(actor, pending('pending'), async () => first);
    const entered = deferred(); const release = deferred();
    first.edit.mockImplementationOnce(async () => { entered.resolve(); await release.promise; return { id: first.messageId }; });
    const editing = workspaces.editPending(actor, 'pending', payload('running')); await entered.promise;
    const queued = workspaces.editPending(actor, 'pending', payload('queued'));
    let drained = false; const stopping = workspaces.stop().then(() => { drained = true; });
    await Promise.resolve(); expect(drained).toBe(false);
    release.resolve(); expect(await editing).toBe(false); expect(await queued).toBe(false); await stopping;
    expect(first.edit).toHaveBeenCalledTimes(1); expect(first.deactivate).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });

  it('drains a create during stop, deactivates its late delivery and closes admission', async () => {
    const workspaces = new CallPrivateWorkspace(); const first = delivery(); const entered = deferred(); const release = deferred();
    const showing = workspaces.show(actor, access, async () => { entered.resolve(); await release.promise; return first; });
    const rejected = expect(showing).rejects.toMatchObject({ code: 'STALE_CONTROLS' }); await entered.promise;
    let drained = false; const stopping = workspaces.stop().then(() => { drained = true; });
    await Promise.resolve(); expect(drained).toBe(false);
    release.resolve(); await rejected; await stopping;
    expect(first.deactivate).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
    const create = vi.fn(async () => delivery('unexpected'));
    await expect(workspaces.show(actor, access, create)).rejects.toMatchObject({ code: 'STALE_CONTROLS' });
    workspaces.adopt(actor, first); expect(create).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  });
});
