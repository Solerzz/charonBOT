import { afterEach, describe, expect, it, vi } from 'vitest';

import { createLogger } from '../../../../src/core/logger/logger.js';
import { markCallActionFailed, measureCallStage, recordCallStage, runCallActionTrace, type CallTraceAction } from '../../../../src/modules/calls/call-action.metrics.js';
import { RoomCoordinator } from '../../../../src/modules/calls/room.coordinator.js';
import { KeyedMutex } from '../../../../src/shared/keyed-mutex.js';
import { deferred } from './call.fixtures.js';

function fixture() {
  const lines: string[] = [];
  const logger = createLogger({ level: 'info', destination: { write: line => { lines.push(line); } } });
  return { logger, lines, logs: () => lines.map(line => JSON.parse(line)) };
}
afterEach(() => { vi.restoreAllMocks(); });

describe('call action metrics', () => {
  it.each(['moderation', 'mod-home', 'mod-block', 'mod-list', 'mod-target', 'mod-unblock', 'mod-page', 'mod-confirm', 'mod-cancel'] as const)('allowlists %s without including private context', async action => {
    const f = fixture();
    await runCallActionTrace(f.logger, action, async () => {});
    expect(f.logs()[0]).toMatchObject({ action, result: 'success' });
    expect(Object.keys(f.logs()[0]).sort()).toEqual(['action', 'durationMs', 'hostname', 'level', 'msg', 'pid', 'result', 'stages', 'time', 'traceId']);
  });
  it('does not log an untrusted action even when a caller bypasses TypeScript', async () => {
    const f = fixture();
    await runCallActionTrace(f.logger, 'call:private-forged-token' as CallTraceAction, async () => {});
    expect(f.logs()[0].action).toBe('invalid'); expect(f.lines.join('')).not.toContain('private-forged-token');
  });
  it('isolates interleaved traces and emits exactly one fixed-schema log per action', async () => {
    const f = fixture(); const entered = deferred(); const release = deferred();
    const first = runCallActionTrace(f.logger, 'lock', async () => {
      recordCallStage('ack', 3); entered.resolve(); await release.promise;
      recordCallStage('persist', 7); return 42;
    });
    await entered.promise;
    await runCallActionTrace(f.logger, 'visibility', async () => { recordCallStage('discord', 11); });
    release.resolve(); await expect(first).resolves.toBe(42);
    expect(f.logs()).toHaveLength(2);
    const [hide, lock] = f.logs();
    expect(hide).toMatchObject({ action: 'visibility', result: 'success', stages: { discord: { count: 1, durationMs: 11 }, ack: { count: 0 } } });
    expect(lock).toMatchObject({ action: 'lock', result: 'success', stages: { ack: { count: 1, durationMs: 3 }, persist: { count: 1, durationMs: 7 }, discord: { count: 0 } } });
    expect(lock.traceId).toMatch(/^[0-9a-f-]{36}$/); expect(lock.traceId).not.toBe(hide.traceId);
  });

  it('logs errors once without serializing upstream details and preserves the rejection', async () => {
    const f = fixture();
    const error = new Error('room-secret member-52345678901234567 token-secret https://private.invalid/payload');
    await expect(runCallActionTrace(f.logger, 'invalid', () => measureCallStage('state', async () => { throw error; }))).rejects.toBe(error);
    expect(f.logs()).toHaveLength(1);
    expect(f.logs()[0]).toMatchObject({ action: 'invalid', result: 'error', stages: { state: { count: 1 } } });
    for (const secret of ['room-secret', '52345678901234567', 'token-secret', 'private.invalid', 'payload']) expect(f.lines.join('')).not.toContain(secret);
  });

  it('marks a handled failure explicitly without throwing or retaining the exception', async () => {
    const f = fixture();
    await runCallActionTrace(f.logger, 'lock', async () => { markCallActionFailed(); });
    expect(f.logs()).toHaveLength(1); expect(f.logs()[0].result).toBe('error');
  });

  it('measures monotonic durations and leaves overlapping stages non-additive', async () => {
    const f = fixture(); let now = 0; vi.spyOn(performance, 'now').mockImplementation(() => now);
    await runCallActionTrace(f.logger, 'rename-save', () => measureCallStage('panel', async () => {
      now = 2;
      await measureCallStage('discord', async () => { now = 7; });
      now = 10;
    }));
    expect(f.logs()[0]).toMatchObject({ durationMs: 10, stages: { panel: { count: 1, durationMs: 10 }, discord: { count: 1, durationMs: 5 } } });
    // Panel includes gateway time: these operation durations are NOT a partition.
    expect(f.logs()[0].stages.panel.durationMs + f.logs()[0].stages.discord.durationMs).toBeGreaterThan(f.logs()[0].durationMs);
  });

  it('measures queue wait only until entering each lock, not the mutation', async () => {
    const f = fixture(); let now = 0; vi.spyOn(performance, 'now').mockImplementation(() => now);
    const coordinator = new RoomCoordinator(new KeyedMutex());
    const entered = deferred(); const release = deferred();
    const holder = coordinator.room('guild', 'channel', async () => { entered.resolve(); await release.promise; });
    await entered.promise;
    const action = runCallActionTrace(f.logger, 'limit-save', () => coordinator.room('guild', 'channel', async () => { now += 50; }));
    now = 7; release.resolve(); await Promise.all([holder, action]);
    expect(f.logs()[0]).toMatchObject({ durationMs: 57, stages: { queue: { count: 1, durationMs: 7 } } });
  });

  it('does not append detached timer work to a completed action', async () => {
    const f = fixture(); const release = deferred(); let detached!: Promise<void>;
    await runCallActionTrace(f.logger, 'transfer-target', async () => {
      detached = (async () => { await release.promise; recordCallStage('discord', 99); })();
    });
    release.resolve(); await detached;
    expect(f.logs()).toHaveLength(1); expect(f.logs()[0].stages.discord.count).toBe(0);
  });

  it('is transparent outside an action and rejects no user work', async () => {
    const error = new Error('sentinel');
    recordCallStage('ack', 1); markCallActionFailed();
    await expect(measureCallStage('state', async () => 42)).resolves.toBe(42);
    await expect(measureCallStage('persist', async () => { throw error; })).rejects.toBe(error);
  });
});
