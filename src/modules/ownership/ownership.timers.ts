import type { Logger } from 'pino';

export class OwnershipTimers {
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly running = new Set<Promise<void>>();
  private stopped = false;

  constructor(private readonly logger: Pick<Logger, 'error'>) {}

  schedule(key: string, deadline: Date, work: () => Promise<void>): void {
    if (this.stopped) throw new Error('Ownership timers stopped');
    this.cancel(key);
    const timer = setTimeout(() => {
      // Remove only this generation. Completion of old work never touches a
      // replacement, including when the old work waits for a room lock.
      if (this.timers.get(key) === timer) this.timers.delete(key);
      const running = Promise.resolve().then(work).catch(() => {
        // Discord/API failures can contain interaction payloads. Observe the
        // failure without logging the callback, its key or the raw error.
        this.logger.error({ event: 'ownership_timer_failed' }, 'Ownership timer callback failed');
      }).finally(() => { this.running.delete(running); });
      this.running.add(running);
    }, Math.max(0, deadline.getTime() - new Date().getTime()));
    this.timers.set(key, timer);
  }

  cancel(key: string): void {
    const timer = this.timers.get(key);
    if (timer !== undefined) clearTimeout(timer);
    this.timers.delete(key);
  }

  async stop(): Promise<void> {
    this.stopped = true;
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    await Promise.all(this.running);
  }
}
