import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { Logger } from 'pino';

import type { CallComponent } from './call.schemas.js';

export type CallActionStage = 'ack' | 'queue' | 'state' | 'discord' | 'persist' | 'panel';
export type CallTraceAction = CallComponent['action'] | 'invalid';
type Trace = { active: boolean; failed: boolean; stages: Record<CallActionStage, { count: number; durationMs: number }> };
const traces = new AsyncLocalStorage<Trace>();
const actions = new Set<CallTraceAction>(['lock', 'claim', 'rename', 'rename-save', 'limit', 'limit-save', 'visibility', 'access', 'allow-add', 'allow-remove', 'transfer', 'transfer-target', 'confirm', 'undo', 'moderation', 'mod-home', 'mod-block', 'mod-list', 'mod-target', 'mod-unblock', 'mod-page', 'mod-confirm', 'mod-cancel', 'invalid']);

export async function runCallActionTrace<T>(logger: Logger, action: CallTraceAction, work: () => Promise<T>): Promise<T> {
  const trace: Trace = { active: true, failed: false, stages: {
    ack: { count: 0, durationMs: 0 }, queue: { count: 0, durationMs: 0 }, state: { count: 0, durationMs: 0 },
    discord: { count: 0, durationMs: 0 }, persist: { count: 0, durationMs: 0 }, panel: { count: 0, durationMs: 0 },
  } };
  const traceId = randomUUID();
  const started = performance.now();
  return traces.run(trace, async () => {
    try { return await work(); }
    catch (error) { trace.failed = true; throw error; }
    finally {
      trace.active = false;
      logger.info({ traceId, action: actions.has(action) ? action : 'invalid', result: trace.failed ? 'error' : 'success', durationMs: performance.now() - started, stages: trace.stages }, 'Call action completed');
    }
  });
}

// The interaction handler deliberately catches failures to deliver private errors.
export function markCallActionFailed(): void {
  const trace = traces.getStore();
  if (trace?.active) trace.failed = true;
}

export async function measureCallStage<T>(stage: CallActionStage, work: () => Promise<T>): Promise<T> {
  if (!traces.getStore()?.active) return work();
  const started = performance.now();
  try { return await work(); }
  finally { recordCallStage(stage, performance.now() - started); }
}

// Counts are instrumented operations, NOT HTTP requests. Nested/parallel stages
// may overlap; their durations must never be added to infer end-to-end latency.
export function recordCallStage(stage: CallActionStage, durationMs: number): void {
  const trace = traces.getStore();
  if (!trace?.active) return;
  trace.stages[stage].count++;
  trace.stages[stage].durationMs += durationMs;
}
