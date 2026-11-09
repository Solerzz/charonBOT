import { describe, expect, it } from 'vitest';

import { RoomCoordinator } from '../../../../src/modules/calls/room.coordinator.js';
import { KeyedMutex } from '../../../../src/shared/keyed-mutex.js';
import { deferred } from './call.fixtures.js';

describe('RoomCoordinator', () => {
  it('shares the existing member key and serializes room keys across wrappers', async () => {
    const mutex = new KeyedMutex(); const coordinator = new RoomCoordinator(mutex); const other = new RoomCoordinator(mutex);
    const gate = deferred(); const started = deferred(); const effects: string[] = [];
    const first = mutex.runExclusive('guild:member', async () => { started.resolve(); await gate.promise; effects.push('legacy'); });
    await started.promise;
    const second = coordinator.member('guild', 'member', async () => { effects.push('member'); return 42; });
    await coordinator.member('other-guild', 'member', async () => { effects.push('independent'); });
    expect(effects).toEqual(['independent']);
    gate.resolve(); expect(await second).toBe(42); await first;
    const roomGate = deferred(); const roomStarted = deferred();
    const held = coordinator.room('guild', 'channel', async () => { roomStarted.resolve(); await roomGate.promise; effects.push('room'); });
    await roomStarted.promise;
    const queued = other.room('guild', 'channel', async () => { effects.push('queued'); });
    await coordinator.room('guild', 'other-channel', async () => { effects.push('other-room'); });
    expect(effects).toEqual(['independent', 'legacy', 'member', 'other-room']);
    roomGate.resolve(); await Promise.all([held, queued]); expect(effects.slice(-2)).toEqual(['room', 'queued']);
  });
  it('room-only synchronization completes before a waiting member-to-room caller without reentry', async () => {
    const coordinator = new RoomCoordinator(new KeyedMutex()); const gate = deferred(); const started = deferred(); const effects: string[] = [];
    const sync = coordinator.room('g', 'c', async () => { started.resolve(); await gate.promise; effects.push('syncLocked'); });
    await started.promise;
    const action = coordinator.member('g', 'm', () => coordinator.room('g', 'c', async () => { effects.push('actionLocked'); }));
    gate.resolve(); await Promise.all([sync, action]); expect(effects).toEqual(['syncLocked', 'actionLocked']);
    await expect(coordinator.room('g', 'c', async () => { throw new Error('failed'); })).rejects.toThrow('failed');
    await expect(coordinator.room('g', 'c', async () => 'released')).resolves.toBe('released');
  });
});
