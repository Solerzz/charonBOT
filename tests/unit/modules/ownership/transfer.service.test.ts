import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TransferService } from '../../../../src/modules/ownership/transfer.service.js';
import { deferred } from '../calls/call.fixtures.js';
import { human, OLDEST as TARGET, OTHER, OWNER, ownershipFixture } from './ownership.fixtures.js';

function fixture() {
  const f = ownershipFixture();
  f.state().room.ownerDiscordId = OWNER;
  f.state().allowedMemberIds = [OTHER];
  f.live.snapshot!.members.push(human(OWNER));
  const service = new TransferService(f);
  return { ...f, service, owner: f.actor(OWNER) };
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(0); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe('room ownership transfer', () => {
  it('prepares without a timer, activates for five usable seconds, and transfers once without recipient acceptance', async () => {
    const f = fixture();
    const pending = await f.service.begin(f.owner, TARGET, f.gateway);
    expect(pending.expiresAt).toBeNull();
    await vi.advanceTimersByTimeAsync(10000);
    expect(f.state().room.ownerDiscordId).toBe(OWNER);
    expect(vi.getTimerCount()).toBe(0);
    const activated = await f.service.activate(f.owner, pending.id, f.gateway);
    expect(activated!.expiresAt).toEqual(new Date(15000));
    await vi.advanceTimersByTimeAsync(4999);
    expect(f.state().room.ownerDiscordId).toBe(OWNER);
    expect((await f.service.activate(f.owner, pending.id, f.gateway))!.expiresAt).toEqual(new Date(15000));
    await vi.advanceTimersByTimeAsync(1);
    expect(f.state()).toMatchObject({ room: { ownerDiscordId: TARGET, controlVersion: 1 }, transfer: null, allowedMemberIds: [OTHER] });
    expect(f.refreshes).toHaveLength(1);
    expect(f.refreshes[0]!.transfer).toBeNull();
    await f.service.expire(pending.id, f.gateway);
    expect(f.refreshes).toHaveLength(1);
  });

  it('confirms a prepared prompt immediately and makes later activation and repeated actions no-ops', async () => {
    const f = fixture();
    const pending = await f.service.begin(f.owner, TARGET, f.gateway);
    await f.service.confirm(f.owner, pending.id, f.gateway);
    expect(await f.service.activate(f.owner, pending.id, f.gateway)).toBeNull();
    await f.service.confirm(f.owner, pending.id, f.gateway);
    await f.service.undo(f.owner, pending.id, f.gateway);
    expect(f.state().room).toMatchObject({ ownerDiscordId: TARGET, controlVersion: 1 });
    expect(f.refreshes).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('undo cancels only before the armed deadline and permits a fresh operation', async () => {
    const f = fixture();
    const pending = await f.service.begin(f.owner, TARGET, f.gateway);
    await expect(f.service.begin(f.owner, OTHER, f.gateway)).rejects.toMatchObject({ code: 'TRANSFER_PENDING' });
    await f.service.activate(f.owner, pending.id, f.gateway);
    await vi.advanceTimersByTimeAsync(4999);
    await f.service.undo(f.owner, pending.id, f.gateway);
    const next = await f.service.begin(f.owner, OTHER, f.gateway);
    await f.service.abortUnpublished(pending.id, f.gateway);
    await f.service.expire(pending.id, f.gateway);
    expect(f.state().transfer?.id).toBe(next.id);
    await f.service.abortUnpublished(next.id, f.gateway);
    await vi.advanceTimersByTimeAsync(10000);
    expect(f.state()).toMatchObject({ room: { ownerDiscordId: OWNER, controlVersion: 0 }, transfer: null });
    expect(f.refreshes).toHaveLength(0);
  });

  it.each([5000, 5001])('undo and confirm at %i cannot erase an elapsed valid operation', async (at) => {
    const f = fixture();
    const pending = await f.service.begin(f.owner, TARGET, f.gateway);
    await f.service.activate(f.owner, pending.id, f.gateway);
    vi.setSystemTime(at);
    await expect(f.service.undo(f.owner, pending.id, f.gateway)).rejects.toMatchObject({ code: 'TRANSFER_EXPIRED' });
    await expect(f.service.confirm(f.owner, pending.id, f.gateway)).rejects.toMatchObject({ code: 'TRANSFER_EXPIRED' });
    expect(f.state().transfer?.id).toBe(pending.id);
    await f.service.expire(pending.id, f.gateway);
    expect(f.state().room.ownerDiscordId).toBe(TARGET);
  });

  it.each(['absent', 'bot', 'foreign', 'self', 'owns-room'] as const)('rejects an invalid selected target: %s', async (kind) => {
    const f = fixture();
    let target = TARGET;
    if (kind === 'absent') f.live.snapshot!.members = [human(OWNER)];
    if (kind === 'bot') f.live.snapshot!.members.find((m) => m.memberDiscordId === TARGET)!.isBot = true;
    if (kind === 'foreign') f.gateway.resolveMember.mockResolvedValue(null);
    if (kind === 'self') target = OWNER;
    if (kind === 'owns-room') f.ownElsewhere(TARGET, 'CLOSING');
    await expect(f.service.begin(f.owner, target, f.gateway)).rejects.toMatchObject({ code: kind === 'owns-room' ? 'ALREADY_OWNS_ROOM' : 'UNKNOWN_MEMBER' });
    expect(f.state().transfer).toBeNull();
  });

  it.each(['owner-left', 'target-left', 'foreign', 'bot', 'owns-room', 'disabled', 'closing', 'closed', 'version'] as const)('cancels rather than auto-transfers when %s', async (kind) => {
    const f = fixture();
    const pending = await f.service.begin(f.owner, TARGET, f.gateway);
    await f.service.activate(f.owner, pending.id, f.gateway);
    if (kind === 'owner-left' || kind === 'target-left') f.live.snapshot!.members = f.live.snapshot!.members.filter((m) => m.memberDiscordId !== (kind === 'owner-left' ? OWNER : TARGET));
    if (kind === 'bot') f.live.snapshot!.members.find((m) => m.memberDiscordId === TARGET)!.isBot = true;
    if (kind === 'foreign') f.gateway.resolveMember.mockResolvedValue(null);
    if (kind === 'owns-room') f.ownElsewhere(TARGET, 'CREATING');
    if (kind === 'disabled') f.state().controlsEnabled = false;
    if (kind === 'closing') f.state().room.status = 'CLOSING';
    if (kind === 'closed') f.state().room.status = 'CLOSED';
    if (kind === 'version') f.state().room.controlVersion += 2; // owner away/back
    await vi.advanceTimersByTimeAsync(5000);
    expect(f.state().room.ownerDiscordId).toBe(OWNER);
    expect(f.state().transfer).toBeNull();
    expect(f.refreshes).toHaveLength(0);
    expect(f.timerErrors).not.toHaveBeenCalled();
  });

  it('checks live presence after deferred eligibility work before the ownership CAS', async () => {
    const f = fixture();
    const pending = await f.service.begin(f.owner, TARGET, f.gateway);
    const entered = deferred(); const release = deferred();
    f.store.findOwnedRoom.mockImplementationOnce(async () => { entered.resolve(); await release.promise; return null; });
    const confirm = f.service.confirm(f.owner, pending.id, f.gateway);
    const rejected = expect(confirm).rejects.toMatchObject({ code: 'NOT_PRESENT' });
    await entered.promise;
    f.live.snapshot!.members = [human(TARGET)];
    release.resolve();
    await rejected;
    expect(f.state()).toMatchObject({ room: { ownerDiscordId: OWNER }, transfer: null });
    expect(f.store.finishTransfer).not.toHaveBeenCalled();
  });

  it('uses initiator then room for prepare/activate/undo, recipient then room for finish, without lock reentry', async () => {
    const f = fixture();
    const pending = await f.service.begin(f.owner, TARGET, f.gateway);
    await f.service.activate(f.owner, pending.id, f.gateway);
    await f.service.confirm(f.owner, pending.id, f.gateway);
    const guild = f.owner.guildDiscordId;
    const roomKey = `room:${guild}:${f.state().room.channelDiscordId}`;
    expect(f.locks).toEqual([`${guild}:${OWNER}`, roomKey, `${guild}:${OWNER}`, roomKey, `${guild}:${TARGET}`, roomKey]);
  });

  it.each(['activate', 'confirm'] as const)('%s invalidation discards only the prepared operation with a safe error', async (action) => {
    const f = fixture();
    const pending = await f.service.begin(f.owner, TARGET, f.gateway);
    f.state().controlsEnabled = false;
    await expect(f.service[action](f.owner, pending.id, f.gateway)).rejects.toMatchObject({ code: 'CONTROLS_DISABLED' });
    expect(f.state()).toMatchObject({ room: { ownerDiscordId: OWNER }, transfer: null });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('unauthorized buttons cannot activate, undo or discard the owner operation', async () => {
    const f = fixture();
    const pending = await f.service.begin(f.owner, TARGET, f.gateway);
    for (const action of ['activate', 'confirm', 'undo'] as const) {
      await expect(f.service[action](f.actor(OTHER), pending.id, f.gateway)).rejects.toMatchObject({ code: 'NOT_OWNER' });
    }
    expect(f.state().transfer?.id).toBe(pending.id);
  });

  it('racing confirmation and activation commits exactly once without leaving an armed operation', async () => {
    const f = fixture();
    const pending = await f.service.begin(f.owner, TARGET, f.gateway);
    const gate = deferred(); const entered = deferred();
    f.store.findOwnedRoom.mockImplementationOnce(async () => { entered.resolve(); await gate.promise; return null; });
    const confirming = f.service.confirm(f.owner, pending.id, f.gateway);
    await entered.promise;
    const activating = f.service.activate(f.owner, pending.id, f.gateway);
    gate.resolve();
    await Promise.all([confirming, activating]);
    expect(f.state()).toMatchObject({ room: { ownerDiscordId: TARGET, controlVersion: 1 }, transfer: null });
    expect(f.refreshes).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('an old queued timeout and unpublished-abort cannot cancel a new armed timer', async () => {
    const f = fixture();
    const first = await f.service.begin(f.owner, TARGET, f.gateway);
    await f.service.activate(f.owner, first.id, f.gateway);
    const entered = deferred(); const gate = deferred();
    f.store.readTransfer.mockImplementationOnce(async () => { entered.resolve(); await gate.promise; return first; });
    const late = f.service.expire(first.id, f.gateway);
    await entered.promise;
    await f.service.undo(f.owner, first.id, f.gateway);
    const second = await f.service.begin(f.owner, OTHER, f.gateway);
    await f.service.activate(f.owner, second.id, f.gateway);
    gate.resolve();
    await late;
    await f.service.abortUnpublished(first.id, f.gateway);
    await vi.advanceTimersByTimeAsync(5000);
    expect(f.state().room.ownerDiscordId).toBe(OTHER);
    expect(f.refreshes).toHaveLength(1);
  });

  it('room-wide cancellation uses the held room lock and stops completion', async () => {
    const f = fixture();
    const pending = await f.service.begin(f.owner, TARGET, f.gateway);
    await f.service.activate(f.owner, pending.id, f.gateway);
    f.locks.length = 0;
    await f.coordinator.room(f.owner.guildDiscordId, f.state().room.channelDiscordId, () => f.service.cancelForRoomLocked(f.owner.roomId));
    expect(f.locks).toEqual([`room:${f.owner.guildDiscordId}:${f.state().room.channelDiscordId}`]);
    await vi.advanceTimersByTimeAsync(5000);
    expect(f.state()).toMatchObject({ room: { ownerDiscordId: OWNER }, transfer: null });
  });

  it('observes unexpected timer I/O failures safely after exact cleanup', async () => {
    const f = fixture();
    const pending = await f.service.begin(f.owner, TARGET, f.gateway);
    await f.service.activate(f.owner, pending.id, f.gateway);
    f.gateway.resolveMember.mockRejectedValueOnce(new Error('private REST payload'));
    await vi.advanceTimersByTimeAsync(5000);
    expect(f.state()).toMatchObject({ room: { ownerDiscordId: OWNER }, transfer: null });
    expect(f.timerErrors).toHaveBeenCalledExactlyOnceWith({ event: 'ownership_timer_failed' }, 'Ownership timer callback failed');
  });

  it('a postcommit synchronization failure cannot undo committed possession', async () => {
    const f = fixture();
    const pending = await f.service.begin(f.owner, TARGET, f.gateway);
    f.onChangedLocked.mockRejectedValueOnce(new Error('private REST payload'));
    await expect(f.service.confirm(f.owner, pending.id, f.gateway)).rejects.toMatchObject({ code: 'DISCORD_FAILURE', message: 'DISCORD_FAILURE' });
    expect(f.state()).toMatchObject({ room: { ownerDiscordId: TARGET, controlVersion: 1 }, transfer: null });
    await f.service.confirm(f.owner, pending.id, f.gateway);
    expect(f.state().room.controlVersion).toBe(1);
  });

  it('arming failure leaves neither an invisible pending row nor a timer', async () => {
    const f = fixture();
    const pending = await f.service.begin(f.owner, TARGET, f.gateway);
    f.store.armTransfer.mockRejectedValueOnce(new Error('private SQL payload'));
    await expect(f.service.activate(f.owner, pending.id, f.gateway)).rejects.toMatchObject({ code: 'PERSISTENCE_FAILURE', message: 'PERSISTENCE_FAILURE' });
    expect(f.state().transfer).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('undo invalidation cleans an unusable prompt without clearing possession', async () => {
    const f = fixture();
    const pending = await f.service.begin(f.owner, TARGET, f.gateway);
    await f.service.activate(f.owner, pending.id, f.gateway);
    f.state().controlsEnabled = false;
    await expect(f.service.undo(f.owner, pending.id, f.gateway)).rejects.toMatchObject({ code: 'CONTROLS_DISABLED' });
    expect(f.state().transfer).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('target departure during eligibility I/O blocks even an explicit prepared confirmation', async () => {
    const f = fixture();
    const pending = await f.service.begin(f.owner, TARGET, f.gateway);
    const entered = deferred(); const release = deferred();
    f.store.findOwnedRoom.mockImplementationOnce(async () => { entered.resolve(); await release.promise; return null; });
    const confirm = f.service.confirm(f.owner, pending.id, f.gateway);
    const rejected = expect(confirm).rejects.toMatchObject({ code: 'UNKNOWN_MEMBER' });
    await entered.promise;
    f.live.snapshot!.members = [human(OWNER)];
    release.resolve();
    await rejected;
    expect(f.state()).toMatchObject({ room: { ownerDiscordId: OWNER }, transfer: null });
    expect(f.store.finishTransfer).not.toHaveBeenCalled();
  });

  it.each(['confirm', 'undo'] as const)('racing confirm/undo has one result when %s holds the room first', async (first) => {
    const f = fixture();
    const pending = await f.service.begin(f.owner, TARGET, f.gateway);
    const entered = deferred(); const release = deferred();
    f.hooks.beforeSnapshot = async () => { entered.resolve(); await release.promise; };
    const winner = f.service[first](f.owner, pending.id, f.gateway);
    await entered.promise;
    const loser = f.service[first === 'confirm' ? 'undo' : 'confirm'](f.owner, pending.id, f.gateway);
    release.resolve();
    await Promise.all([winner, loser]);
    expect(f.state()).toMatchObject({ room: { ownerDiscordId: first === 'confirm' ? TARGET : OWNER, controlVersion: first === 'confirm' ? 1 : 0 }, transfer: null });
    expect(f.refreshes).toHaveLength(first === 'confirm' ? 1 : 0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('closed history and ownership in a different guild do not block an eligible target', async () => {
    const f = fixture();
    f.ownElsewhere(TARGET, 'CLOSED');
    await f.service.abortUnpublished((await f.service.begin(f.owner, TARGET, f.gateway)).id, f.gateway);
    f.ownElsewhere(TARGET, 'ACTIVE', 'another-guild');
    const pending = await f.service.begin(f.owner, TARGET, f.gateway);
    await f.service.confirm(f.owner, pending.id, f.gateway);
    expect(f.state().room.ownerDiscordId).toBe(TARGET);
  });

  it.each(['not-owner', 'absent', 'stale', 'disabled', 'foreign-room'] as const)('rejects an invalid initiating context: %s', async (kind) => {
    const f = fixture();
    const actor = { ...f.owner };
    if (kind === 'not-owner') actor.memberDiscordId = OTHER;
    if (kind === 'absent') f.live.snapshot!.members = [human(TARGET)];
    if (kind === 'stale') actor.controlVersion++;
    if (kind === 'disabled') f.state().controlsEnabled = false;
    if (kind === 'foreign-room') f.live.snapshot!.guildDiscordId = 'other-guild';
    const codes = { 'not-owner': 'NOT_OWNER', absent: 'NOT_PRESENT', stale: 'STALE_CONTROLS', disabled: 'CONTROLS_DISABLED', 'foreign-room': 'ROOM_UNAVAILABLE' };
    await expect(f.service.begin(actor, TARGET, f.gateway)).rejects.toMatchObject({ code: codes[kind] });
    expect(f.state().transfer).toBeNull();
  });

  it.each(['initial-transfer-read', 'room-read', 'locked-transfer-read', 'failed-cleanup'] as const)('recovers an expiry %s failure by exact-ID cancellation, not a reported transfer', async (boundary) => {
    const f = fixture();
    const pending = await f.service.begin(f.owner, TARGET, f.gateway);
    await f.service.activate(f.owner, pending.id, f.gateway);
    if (boundary === 'initial-transfer-read') f.store.readTransfer.mockRejectedValueOnce(new Error('private read payload'));
    if (boundary === 'room-read') f.store.read.mockRejectedValueOnce(new Error('private read payload'));
    if (boundary === 'locked-transfer-read') {
      f.store.readTransfer.mockResolvedValueOnce(pending).mockRejectedValueOnce(new Error('private locked read payload'));
    }
    if (boundary === 'failed-cleanup') {
      f.live.snapshot!.members = [human(OWNER)];
      f.store.discardTransfer.mockRejectedValueOnce(new Error('private cleanup payload'));
    }
    await vi.advanceTimersByTimeAsync(5000);
    expect(f.state()).toMatchObject({ room: { ownerDiscordId: OWNER, controlVersion: 0 }, transfer: { id: pending.id, expiresAt: new Date(5000) } });
    expect(f.timerErrors).toHaveBeenCalledExactlyOnceWith({ event: 'ownership_timer_failed' }, 'Ownership timer callback failed');
    await vi.advanceTimersByTimeAsync(999);
    expect(f.state().transfer?.id).toBe(pending.id);
    f.locks.length = 0;
    await vi.advanceTimersByTimeAsync(1);
    expect(f.state()).toMatchObject({ room: { ownerDiscordId: OWNER, controlVersion: 0 }, transfer: null });
    expect(f.refreshes).toHaveLength(0);
    expect(f.locks).toEqual([`${f.owner.guildDiscordId}:${TARGET}`, `room:${f.owner.guildDiscordId}:${f.state().room.channelDiscordId}`]);
    expect(f.store.discardTransfer).toHaveBeenLastCalledWith(pending.id);
    expect(vi.getTimerCount()).toBe(0);
    f.live.snapshot!.members.push(human(OTHER));
    expect((await f.service.begin(f.owner, OTHER, f.gateway)).expiresAt).toBeNull();
  });

  it('spaces recovery attempts during an outage and retries failed exact cleanup after persistence recovers', async () => {
    const f = fixture();
    const pending = await f.service.begin(f.owner, TARGET, f.gateway);
    await f.service.activate(f.owner, pending.id, f.gateway);
    f.store.readTransfer.mockRejectedValueOnce(new Error('initial outage')).mockRejectedValueOnce(new Error('continued outage'));
    await vi.advanceTimersByTimeAsync(5000);
    expect(f.timerErrors).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(999);
    expect(f.timerErrors).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(f.timerErrors).toHaveBeenCalledTimes(2);
    f.store.discardTransfer.mockRejectedValueOnce(new Error('cleanup outage'));
    await vi.advanceTimersByTimeAsync(1000);
    expect(f.state().transfer?.id).toBe(pending.id);
    expect(f.timerErrors).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(1000);
    expect(f.state()).toMatchObject({ room: { ownerDiscordId: OWNER, controlVersion: 0 }, transfer: null });
    expect(f.refreshes).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(JSON.stringify(f.timerErrors.mock.calls)).not.toContain('outage');
  });

  it('a failed old expiry cannot replace or cancel a newer room timer while scheduling recovery', async () => {
    const f = fixture();
    const first = await f.service.begin(f.owner, TARGET, f.gateway);
    await f.service.activate(f.owner, first.id, f.gateway);
    const entered = deferred(); const release = deferred();
    f.store.readTransfer.mockImplementationOnce(async () => { entered.resolve(); await release.promise; throw new Error('late initial read failure'); });
    await vi.advanceTimersByTimeAsync(5000);
    await entered.promise;
    await f.service.abortUnpublished(first.id, f.gateway);
    const second = await f.service.begin(f.owner, OTHER, f.gateway);
    await f.service.activate(f.owner, second.id, f.gateway);
    release.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(2);
    await vi.advanceTimersByTimeAsync(1000);
    expect(f.state().transfer).toMatchObject({ id: second.id, expiresAt: new Date(10000) });
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(4000);
    expect(f.state()).toMatchObject({ room: { ownerDiscordId: OTHER, controlVersion: 1 }, transfer: null });
    expect(f.refreshes).toHaveLength(1);
    expect(f.store.discardTransfer.mock.calls).toEqual([[first.id]]);
  });

  it.each(['expiry', 'recovery'] as const)('shutdown drains a failing in-flight %s without admitting another recovery timer', async (phase) => {
    const f = fixture();
    const pending = await f.service.begin(f.owner, TARGET, f.gateway);
    await f.service.activate(f.owner, pending.id, f.gateway);
    if (phase === 'recovery') {
      f.store.readTransfer.mockRejectedValueOnce(new Error('initial outage'));
      await vi.advanceTimersByTimeAsync(5000);
      expect(vi.getTimerCount()).toBe(1);
    }
    const entered = deferred(); const release = deferred();
    f.store.readTransfer.mockImplementationOnce(async () => { entered.resolve(); await release.promise; throw new Error('shutdown outage'); });
    await vi.advanceTimersByTimeAsync(phase === 'expiry' ? 5000 : 1000);
    await entered.promise;
    let stopped = false;
    const stopping = f.timers.stop().then(() => { stopped = true; });
    await vi.advanceTimersByTimeAsync(1000);
    expect(stopped).toBe(false);
    release.resolve();
    await stopping;
    await vi.advanceTimersByTimeAsync(10000);
    expect(vi.getTimerCount()).toBe(0);
    expect(f.state()).toMatchObject({ room: { ownerDiscordId: OWNER }, transfer: { id: pending.id } });
    expect(f.refreshes).toHaveLength(0);
    expect(f.timerErrors).toHaveBeenCalledTimes(phase === 'expiry' ? 1 : 2);
  });

  it('shutdown cancels queued recovery rather than running it after admission closes', async () => {
    const f = fixture();
    const pending = await f.service.begin(f.owner, TARGET, f.gateway);
    await f.service.activate(f.owner, pending.id, f.gateway);
    f.store.readTransfer.mockRejectedValueOnce(new Error('outage'));
    await vi.advanceTimersByTimeAsync(5000);
    expect(vi.getTimerCount()).toBe(1);
    await f.timers.stop();
    await vi.advanceTimersByTimeAsync(10000);
    expect(f.state().transfer?.id).toBe(pending.id);
    expect(f.store.discardTransfer).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('uncertain completion plus failed cleanup never repeats or falsely reports a committed transfer', async () => {
    const f = fixture();
    const pending = await f.service.begin(f.owner, TARGET, f.gateway);
    await f.service.activate(f.owner, pending.id, f.gateway);
    const finish = f.store.finishTransfer.getMockImplementation()!;
    f.store.finishTransfer.mockImplementationOnce(async (...args) => { await finish(...args); throw new Error('lost commit acknowledgement'); });
    f.store.discardTransfer.mockRejectedValueOnce(new Error('cleanup unavailable'));
    await vi.advanceTimersByTimeAsync(5000);
    expect(f.state()).toMatchObject({ room: { ownerDiscordId: TARGET, controlVersion: 1 }, transfer: null });
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(f.store.finishTransfer).toHaveBeenCalledTimes(1);
    expect(f.refreshes).toHaveLength(0);
    expect(f.timerErrors).toHaveBeenCalledExactlyOnceWith({ event: 'ownership_timer_failed' }, 'Ownership timer callback failed');
    expect(vi.getTimerCount()).toBe(0);
  });
});
