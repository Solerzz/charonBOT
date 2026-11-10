import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CallPrivateWorkspace, type CallWorkspaceDelivery, type CallWorkspaceView } from '../../../../src/modules/calls/call-workspace.js';
import type { CallPanelPayload } from '../../../../src/modules/calls/call-panel.view.js';
import type { RoomActor, RoomState } from '../../../../src/modules/calls/room.types.js';
import { deferred, room } from './call.fixtures.js';

const actor: RoomActor = { roomId: room.id, guildDiscordId: room.guildDiscordId, memberDiscordId: room.ownerDiscordId!, controlVersion: 0 };
const payload = (title: string): CallPanelPayload => ({ embeds: [{ title }], components: [], allowedMentions: { parse: [] } });
const access: CallWorkspaceView = { kind: 'access', payload: payload('access') };
const target: CallWorkspaceView = { kind: 'transfer-target', payload: payload('target') };
const pending = (id: string): CallWorkspaceView => ({ kind: 'transfer-pending', operationId: id, payload: payload(id) });
const state = (): RoomState => ({ room: structuredClone(room), controlsEnabled: true, presences: [], allowedMemberIds: [], transfer: null });
function delivery(messageId = 'private-1', expiresAt = 900_000) {
  return { messageId, expiresAt, edit: vi.fn(async (_payload: CallPanelPayload) => ({ id: messageId })), deactivate: vi.fn(async () => {}) };
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(0); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

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
