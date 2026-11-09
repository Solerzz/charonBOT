import { KeyedMutex } from '../../shared/keyed-mutex.js';

// Process-owned at the composition root. Callers may take one member lock,
// then one room lock; room-only/Locked collaborators must not acquire locks.
export class RoomCoordinator {
  constructor(private readonly mutex: KeyedMutex) {}

  member<T>(guildId: string, memberId: string, work: () => Promise<T>): Promise<T> {
    return this.mutex.runExclusive(`${guildId}:${memberId}`, work);
  }

  room<T>(guildId: string, channelId: string, work: () => Promise<T>): Promise<T> {
    return this.mutex.runExclusive(`room:${guildId}:${channelId}`, work);
  }
}
