import { KeyedMutex } from '../../shared/keyed-mutex.js';
import { RoomActionError, type RoomState } from './room.types.js';

type OwnershipAttempt = { version: number; nextOwner: string | null };
type Departure = { memberId: string; isBot: boolean; generation: number; leftAt: Date; returnedAt?: Date; attempt: OwnershipAttempt | undefined };

// Process-owned at the composition root. Callers may take one member lock,
// then one room lock; room-only/Locked collaborators must not acquire locks.
export class RoomCoordinator {
  private readonly generations = new Map<string, number>();
  private readonly departures = new Map<string, Departure[]>();
  private readonly ownershipAttempts = new Map<string, OwnershipAttempt>();
  constructor(private readonly mutex: KeyedMutex) {}

  recordDeparture(guildId: string, channelId: string, memberId: string, isBot: boolean): void {
    const key = `${guildId}:${channelId}`;
    const pending = this.departures.get(key) ?? [];
    pending.push({ memberId, isBot, generation: this.generations.get(key) ?? 0, leftAt: new Date(), attempt: this.ownershipAttempts.get(key) });
    this.departures.set(key, pending);
  }

  recordArrival(guildId: string, channelId: string, memberId: string): void {
    for (const departure of this.departures.get(`${guildId}:${channelId}`) ?? []) {
      if (departure.memberId === memberId && !departure.returnedAt) departure.returnedAt = new Date();
    }
  }

  pendingDepartures(guildId: string, channelId: string): readonly Departure[] {
    return [...this.departures.get(`${guildId}:${channelId}`) ?? []];
  }

  acknowledgeDeparture(guildId: string, channelId: string, departure: Departure): void {
    const key = `${guildId}:${channelId}`;
    const pending = this.departures.get(key)?.filter((item) => item !== departure) ?? [];
    if (pending.length) this.departures.set(key, pending); else this.departures.delete(key);
  }

  isCurrentDeparture(guildId: string, channelId: string, departure: Departure, current?: RoomState['room']): boolean {
    const key = `${guildId}:${channelId}`;
    if (departure.generation !== (this.generations.get(key) ?? 0)) return false;
    const attempt = departure.attempt;
    // SQL can commit but lose its acknowledgement. A later durable read still
    // proves that this old receipt was superseded; never replay that CAS.
    return !(current && attempt
      && current.controlVersion > attempt.version && current.ownerDiscordId === attempt.nextOwner);
  }

  // Caller holds this room's coordinator lock; commit contains only the SQL CAS.
  async changeOwnership(guildId: string, channelId: string, version: number, nextOwner: string | null, commit: () => Promise<boolean>): Promise<boolean> {
    const key = `${guildId}:${channelId}`;
    this.ownershipAttempts.set(key, { version, nextOwner });
    try {
      const changed = await commit();
      if (changed) this.generations.set(key, (this.generations.get(key) ?? 0) + 1);
      return changed;
    } finally {
      // Only receipts taken during this attempt retain its uncertain outcome.
      // Later real departures must invalidate the new owner normally.
      this.ownershipAttempts.delete(key);
    }
  }

  assertContinuous(guildId: string, channelId: string, members: string[]): void {
    if (this.pendingDepartures(guildId, channelId).some((departure) =>
      this.isCurrentDeparture(guildId, channelId, departure) && members.includes(departure.memberId))) {
      throw new RoomActionError('STALE_CONTROLS');
    }
  }

  member<T>(guildId: string, memberId: string, work: () => Promise<T>): Promise<T> {
    return this.mutex.runExclusive(`${guildId}:${memberId}`, work);
  }

  room<T>(guildId: string, channelId: string, work: () => Promise<T>): Promise<T> {
    return this.mutex.runExclusive(`room:${guildId}:${channelId}`, work);
  }
}
