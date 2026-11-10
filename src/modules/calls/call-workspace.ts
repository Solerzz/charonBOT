import type { CallPanelPayload } from './call-panel.view.js';
import { RoomActionError, type RoomActor, type RoomState } from './room.types.js';

export type CallWorkspaceDelivery = {
  messageId: string;
  // The interaction's createdTimestamp + 900_000, supplied by its delivery closure.
  expiresAt: number;
  edit(payload: CallPanelPayload): Promise<{ id: string }>;
  deactivate(): Promise<void>;
};
export type CallWorkspaceView = { kind: 'access' | 'transfer-target'; payload: CallPanelPayload }
  | { kind: 'transfer-pending'; operationId: string; payload: CallPanelPayload };

type Workspace = {
  actor: RoomActor;
  expiresAt: number;
  delivery?: CallWorkspaceDelivery;
  view?: CallWorkspaceView;
  revision: number;
  attempted: boolean;
  tail: Promise<void>;
};
const keyOf = (actor: RoomActor) => JSON.stringify([actor.guildDiscordId, actor.roomId, actor.memberDiscordId, actor.controlVersion]);
const validDelivery = (delivery: CallWorkspaceDelivery) => Boolean(delivery.messageId?.trim()) && Number.isFinite(delivery.expiresAt);

// Delivery only: callers must validate SQL/live room authority before show/adopt.
// This queue never calls mutation services or acquires a room/member coordinator.
export class CallPrivateWorkspace {
  private readonly entries = new Map<string, Workspace>();
  private readonly inFlight = new Set<Promise<void>>();
  private readonly retiringMessages = new Map<string, Promise<void>>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private stopped = false;
  private stopping: Promise<void> | undefined;

  constructor(private readonly now: () => number = Date.now) {}

  show(actor: RoomActor, view: CallWorkspaceView, create: (payload: CallPanelPayload) => Promise<CallWorkspaceDelivery>): Promise<CallWorkspaceDelivery> {
    this.prune();
    if (this.stopped) return Promise.reject(new RoomActionError('STALE_CONTROLS'));
    const entry = this.entries.get(keyOf(actor)) ?? this.open(actor);
    if (entry.view?.kind !== 'transfer-pending') { entry.view = view; entry.revision++; }
    const selected = entry.view!;
    const revision = entry.revision;
    return this.enqueue(entry, async () => {
      this.assertCurrent(entry);
      if (!entry.delivery) {
        if (entry.attempted) throw new RoomActionError('DISCORD_FAILURE');
        entry.attempted = true;
        let delivered: CallWorkspaceDelivery;
        try { delivered = await create(selected.payload); }
        catch { throw new RoomActionError('DISCORD_FAILURE'); }
        if (!validDelivery(delivered)) throw new RoomActionError('DISCORD_FAILURE');
        if (!this.current(entry)) {
          await this.deactivate(delivered);
          throw new RoomActionError('STALE_CONTROLS');
        }
        // A validated private click may have refreshed the handle during create.
        // Its current deadline takes precedence over this older response's expiry.
        if (entry.delivery) {
          await this.deactivate(delivered);
          this.assertCurrent(entry);
          return entry.delivery;
        }
        if (delivered.expiresAt <= this.now()) {
          this.retire(entry);
          await this.deactivate(delivered);
          throw new RoomActionError('STALE_CONTROLS');
        }
        entry.delivery = delivered;
        entry.expiresAt = delivered.expiresAt;
        this.scheduleExpiry();
        return delivered;
      }
      const delivered = entry.delivery;
      if (entry.revision !== revision) return delivered;
      let result: { id: string };
      try { result = await delivered.edit(selected.payload); }
      catch { throw new RoomActionError('DISCORD_FAILURE'); }
      this.assertCurrent(entry);
      if (entry.delivery !== delivered) throw new RoomActionError('STALE_CONTROLS');
      if (!result?.id || result.id !== delivered.messageId) throw new RoomActionError('DISCORD_FAILURE');
      return delivered;
    });
  }

  editPending(actor: RoomActor, operationId: string, payload: CallPanelPayload, terminal = false): Promise<boolean> {
    this.prune();
    const entry = this.entries.get(keyOf(actor));
    if (!entry || entry.view?.kind !== 'transfer-pending' || entry.view.operationId !== operationId) return Promise.resolve(false);
    if (terminal) { delete entry.view; entry.revision++; }
    else entry.view = { kind: 'transfer-pending', operationId, payload };
    const revision = entry.revision;
    return this.enqueue(entry, async () => {
      if (!this.current(entry) || entry.revision !== revision || !entry.delivery) return false;
      const delivered = entry.delivery;
      try {
        const result = await delivered.edit(payload);
        return this.current(entry) && entry.revision === revision && entry.delivery === delivered
          && Boolean(result?.id) && result.id === delivered.messageId;
      } catch { return false; }
    });
  }

  editFailure(actor: RoomActor, messageId: string, payload: CallPanelPayload & { content: string }, pending: { operationId: string; payload: CallPanelPayload } | null): Promise<boolean> {
    this.prune();
    const entry = this.entries.get(keyOf(actor));
    if (!entry?.delivery || entry.delivery.messageId !== messageId) return Promise.resolve(false);
    if (entry.view?.kind === 'transfer-pending' && entry.view.operationId !== pending?.operationId) return Promise.resolve(false);
    if (pending && entry.view?.kind !== 'transfer-pending') {
      entry.view = { kind: 'transfer-pending', ...pending }; entry.revision++;
    }
    const revision = entry.revision;
    const failure = { ...(pending?.payload ?? entry.view?.payload ?? payload), content: payload.content };
    return this.enqueue(entry, async () => {
      if (!this.current(entry) || entry.revision !== revision || entry.delivery?.messageId !== messageId) return false;
      const delivered = entry.delivery;
      try {
        const result = await delivered.edit(failure);
        return this.current(entry) && entry.revision === revision && entry.delivery === delivered && result?.id === messageId;
      } catch { return false; }
    });
  }

  adopt(actor: RoomActor, delivery: CallWorkspaceDelivery): void {
    this.prune();
    if (this.stopped || !validDelivery(delivery) || delivery.expiresAt <= this.now()) return;
    const entry = this.entries.get(keyOf(actor)) ?? this.open(actor);
    if (entry.delivery && entry.delivery.messageId !== delivery.messageId) return;
    const retiring = this.retiringMessages.get(delivery.messageId);
    if (retiring) entry.tail = Promise.all([entry.tail, retiring]).then(() => undefined);
    entry.delivery = delivery;
    entry.attempted = true;
    entry.expiresAt = delivery.expiresAt;
    this.scheduleExpiry();
  }

  reconcile(roomId: string, state: RoomState | null): Promise<void> {
    this.prune();
    const cleanup: Promise<void>[] = [];
    for (const entry of this.entries.values()) {
      if (entry.actor.roomId !== roomId) continue;
      if (!state || state.room.id !== roomId || state.room.status !== 'ACTIVE' || !state.controlsEnabled
        || state.room.guildDiscordId !== entry.actor.guildDiscordId || state.room.ownerDiscordId !== entry.actor.memberDiscordId
        || state.room.controlVersion !== entry.actor.controlVersion) {
        cleanup.push(this.retire(entry));
      } else if (entry.view?.kind === 'transfer-pending' && (state.transfer?.id !== entry.view.operationId
        || state.transfer.controlVersion !== entry.actor.controlVersion || state.transfer.ownerDiscordId !== entry.actor.memberDiscordId)) {
        // Cancel the operation, not the reusable message. Late callbacks are fenced
        // synchronously, before waiting for any older edit/deactivation.
        delete entry.view; const revision = ++entry.revision;
        cleanup.push(this.enqueue(entry, async () => {
          if (this.current(entry) && entry.revision === revision && entry.delivery) {
            try { await entry.delivery.deactivate(); } catch { /* Delivery failure cannot restore an operation. */ }
          }
        }));
      }
    }
    this.scheduleExpiry();
    return Promise.all(cleanup).then(() => undefined);
  }

  stop(): Promise<void> {
    if (this.stopping) return this.stopping;
    this.stopped = true;
    for (const entry of this.entries.values()) this.retire(entry);
    this.scheduleExpiry();
    this.stopping = Promise.all([...this.inFlight]).then(() => undefined);
    return this.stopping;
  }

  private open(actor: RoomActor): Workspace {
    // A lost create acknowledgement has no usable token/deadline. Reserve its
    // slot conservatively for one full lifetime; never retry on a timer.
    const entry: Workspace = { actor: { ...actor }, expiresAt: this.now() + 900_000, revision: 0, attempted: false, tail: Promise.resolve() };
    this.entries.set(keyOf(actor), entry);
    this.scheduleExpiry();
    return entry;
  }

  private current(entry: Workspace): boolean {
    return !this.stopped && this.entries.get(keyOf(entry.actor)) === entry && entry.expiresAt > this.now();
  }

  private assertCurrent(entry: Workspace): void {
    if (!this.current(entry)) throw new RoomActionError('STALE_CONTROLS');
  }

  private enqueue<T>(entry: Workspace, work: () => Promise<T>): Promise<T> {
    const task = entry.tail.then(work);
    const settled = task.then(() => undefined, () => undefined);
    entry.tail = settled;
    this.inFlight.add(settled);
    void settled.then(() => this.inFlight.delete(settled));
    return task;
  }

  private retire(entry: Workspace): Promise<void> {
    this.entries.delete(keyOf(entry.actor));
    this.scheduleExpiry();
    delete entry.view; entry.revision++;
    const delivery = entry.delivery;
    delete entry.delivery;
    const cleanup = this.enqueue(entry, async () => { if (delivery) await this.deactivate(delivery); });
    if (delivery) {
      // An expired/invalidated message can be proven again by a private click.
      // Its new edits must follow already-sent old edits, even across room keys.
      this.retiringMessages.set(delivery.messageId, cleanup);
      void cleanup.then(() => {
        if (this.retiringMessages.get(delivery.messageId) === cleanup) this.retiringMessages.delete(delivery.messageId);
      });
    }
    return cleanup;
  }

  private async deactivate(delivery: CallWorkspaceDelivery): Promise<void> {
    // Never deactivate a message already reclaimed by a validated private click.
    if ([...this.entries.values()].some((entry) => entry.delivery?.messageId === delivery.messageId)) return;
    try { await delivery.deactivate(); } catch { /* No tokens or raw REST errors leave these closures. */ }
  }

  private prune(): void {
    for (const entry of this.entries.values()) if (entry.expiresAt <= this.now()) this.retire(entry);
    this.scheduleExpiry();
  }

  private scheduleExpiry(): void {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
    if (this.stopped || !this.entries.size) return;
    const next = Math.min(...[...this.entries.values()].map((entry) => entry.expiresAt));
    this.timer = setTimeout(() => { this.timer = undefined; this.prune(); }, Math.max(0, next - this.now()));
    this.timer.unref?.();
  }
}
