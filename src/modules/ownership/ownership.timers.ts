import type { Logger } from 'pino';

export class OwnershipTimers {
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly running = new Set<Promise<void>>();
  private readonly deadlines = new Map<string, { deadline: Date }>();
  private stopped = false;

  constructor(private readonly logger: Pick<Logger, 'error'>) {}

  get isStopped(): boolean { return this.stopped; }

  scheduledDeadlines(): ReadonlyMap<string, Date> {
    return new Map([...this.deadlines].map(([key, entry]) => [key, entry.deadline]));
  }

  schedule(key: string, deadline: Date, work: () => Promise<void | 'retain-deadline'>): void {
    if (this.stopped) throw new Error('Ownership timers stopped');
    this.cancel(key);
    const entry = { deadline };
    this.deadlines.set(key, entry);
    const timer = setTimeout(() => {
      // Remove only this generation. Completion of old work never touches a
      // replacement, including when the old work waits for a room lock.
      if (this.timers.get(key) === timer) this.timers.delete(key);
      let retainDeadline = false;
      const running = Promise.resolve().then(work).then((result) => { retainDeadline = result === 'retain-deadline'; }).catch(() => {
        // Discord/API failures can contain interaction payloads. Observe the
        // failure without logging the callback, its key or the raw error.
        this.logger.error({ event: 'ownership_timer_failed' }, 'Ownership timer callback failed');
      }).finally(() => {
        this.running.delete(running);
        if (!retainDeadline && this.deadlines.get(key) === entry) this.deadlines.delete(key);
      });
      this.running.add(running);
    }, Math.max(0, deadline.getTime() - new Date().getTime()));
    this.timers.set(key, timer);
  }

  cancel(key: string): void {
    const timer = this.timers.get(key);
    if (timer !== undefined) clearTimeout(timer);
    this.timers.delete(key);
    this.deadlines.delete(key);
  }

  async stop(): Promise<void> {
    this.stopped = true;
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    this.deadlines.clear();
    await Promise.all(this.running);
  }
}
