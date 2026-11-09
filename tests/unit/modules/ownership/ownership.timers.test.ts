import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OwnershipTimers } from '../../../../src/modules/ownership/ownership.timers.js';
import { RoomCoordinator } from '../../../../src/modules/calls/room.coordinator.js';
import { KeyedMutex } from '../../../../src/shared/keyed-mutex.js';
import { deferred } from '../calls/call.fixtures.js';

describe('OwnershipTimers', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(0)); });
  afterEach(() => { vi.useRealTimers(); });
  it('fires at exactly 5,000ms and replaces the previous timer for one room key', async () => {
    const timers = new OwnershipTimers({ error: vi.fn() }); const observedEffects: string[] = [];
    timers.schedule('transfer:room', new Date(1000), async () => { observedEffects.push('replaced'); });
    timers.schedule('transfer:room', new Date(5000), async () => { observedEffects.push('expired'); });
    await vi.advanceTimersByTimeAsync(4_999);
    expect(observedEffects).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(observedEffects).toEqual(['expired']);
    await vi.advanceTimersByTimeAsync(5000); expect(observedEffects).toEqual(['expired']); await timers.stop();
  });
  it('an old running callback cannot remove a replacement and room-key cancellation needs no transfer row', async () => {
    const timers = new OwnershipTimers({ error: vi.fn() }); const gate = deferred(); const effects: string[] = [];
    timers.schedule('transfer:r', new Date(0), async () => { await gate.promise; effects.push('old-id'); });
    await vi.advanceTimersByTimeAsync(0);
    timers.schedule('transfer:r', new Date(5000), async () => { effects.push('new-id'); });
    gate.resolve(); await vi.advanceTimersByTimeAsync(0);
    timers.cancel('transfer:r'); timers.cancel('transfer:r');
    await vi.advanceTimersByTimeAsync(5000); expect(effects).toEqual(['old-id']); await timers.stop();
  });
  it('drains callbacks waiting on a room lock, clears future callbacks and closes admission', async () => {
    const timers = new OwnershipTimers({ error: vi.fn() }); const coordinator = new RoomCoordinator(new KeyedMutex());
    const gate = deferred(); const started = deferred(); const effects: string[] = [];
    const held = coordinator.room('g', 'c', async () => { started.resolve(); await gate.promise; }); await started.promise;
    timers.schedule('priority:r', new Date(0), () => coordinator.room('g', 'c', async () => { effects.push('running'); }));
    timers.schedule('transfer:r', new Date(5000), async () => { effects.push('future'); });
    await vi.advanceTimersByTimeAsync(0);
    let stopped = false; const stopping = timers.stop().then(() => { stopped = true; });
    await vi.advanceTimersByTimeAsync(5000); expect(stopped).toBe(false); expect(effects).toEqual([]);
    expect(() => timers.schedule('priority:r', new Date(), async () => {})).toThrow();
    gate.resolve(); await held; await stopping; expect(effects).toEqual(['running']); await timers.stop();
  });
  it('observes rejected callback errors without logging sensitive callback payloads', async () => {
    const error = vi.fn(); const timers = new OwnershipTimers({ error });
    timers.schedule('transfer:r', new Date(-1), async () => { throw new Error('sensitive interaction payload'); });
    await vi.advanceTimersByTimeAsync(0); await timers.stop();
    expect(error).toHaveBeenCalledOnce(); expect(JSON.stringify(error.mock.calls)).not.toContain('sensitive interaction payload');
  });
  it('keeps priority and transfer room keys independent and callbacks capture the exact transfer generation', async () => {
    const timers = new OwnershipTimers({ error: vi.fn() }); const effects: string[] = [];
    const scheduleTransfer = (id: string) => timers.schedule('transfer:r', new Date(5000), async () => { effects.push(id); });
    scheduleTransfer('removed-transfer-id'); scheduleTransfer('current-transfer-id');
    timers.schedule('priority:r', new Date(300000), async () => { effects.push('priority-expired'); });
    await vi.advanceTimersByTimeAsync(5000); expect(effects).toEqual(['current-transfer-id']);
    await vi.advanceTimersByTimeAsync(294999); expect(effects).toEqual(['current-transfer-id']);
    await vi.advanceTimersByTimeAsync(1); expect(effects).toEqual(['current-transfer-id', 'priority-expired']);
    await timers.stop();
  });
});
