import type { Logger } from 'pino';

import type { VoiceCreatorRepository } from '../setup/setup.repository.js';
import { defaultUserLimitSchema } from '../setup/setup.schemas.js';
import { CallDiscordError, CallMoveUnconfirmedError, type CallDiscordGateway } from './call.discord.js';
import type { TemporaryRoomRecord, TemporaryRoomRepository } from './call.repository.js';
import { buildInitialRoomName, voiceTransitionSchema, type VoiceTransition } from './call.schemas.js';
import type { RoomRuntime } from './room.runtime.js';

export class CallService {
  constructor(
    private readonly creators: VoiceCreatorRepository,
    private readonly rooms: TemporaryRoomRepository,
    private readonly runtime: RoomRuntime,
    private readonly logger: Logger,
  ) {}

  async handleVoiceTransition(input: VoiceTransition, gateway: CallDiscordGateway): Promise<void> {
    const transition = voiceTransitionSchema.parse(input);
    if (transition.oldChannelDiscordId === transition.newChannelDiscordId) return;
    if (transition.oldChannelDiscordId !== null) {
      this.runtime.coordinator.recordDeparture(transition.guildDiscordId, transition.oldChannelDiscordId, transition.memberDiscordId, transition.memberIsBot);
    }
    if (transition.newChannelDiscordId !== null) this.runtime.coordinator.recordArrival(transition.guildDiscordId, transition.newChannelDiscordId, transition.memberDiscordId);
    // Lock order is always member -> one room. Never hold two room locks and
    // never await a voice-event handler from a Discord move operation.
    await this.runtime.coordinator.member(transition.guildDiscordId, transition.memberDiscordId, async () => {
      if (transition.oldChannelDiscordId !== null) {
        await this.refreshRoom(transition.oldChannelDiscordId, transition, gateway);
      }
      if (transition.newChannelDiscordId === null) return;
      await this.refreshRoom(transition.newChannelDiscordId, transition, gateway);
      if (transition.memberIsBot) return;
      const creator = await this.creators.findByChannel(transition.newChannelDiscordId);
      if (creator === null || creator.guildDiscordId !== transition.guildDiscordId) return;
      const { id: voiceCreatorId, categoryDiscordId, defaultUserLimit } = creator;
      if (gateway.getMemberChannelDiscordId() !== transition.newChannelDiscordId) return;
      const owned = await this.rooms.findActiveByOwner(transition.guildDiscordId, transition.memberDiscordId);
      if (owned !== null) {
        const reused = await this.withRoomLock(owned.channelDiscordId, transition, async () => {
          // The previous query may have raced a last-member departure.
          const current = await this.rooms.findActiveByChannel(owned.channelDiscordId);
          if (current === null || current.ownerDiscordId !== transition.memberDiscordId) return false;
          if (gateway.getMemberChannelDiscordId() !== transition.newChannelDiscordId) return true;
          if (current.status === 'CLOSING' && gateway.getChannelMemberCount(current.channelDiscordId) === 0) {
            return !await this.closeIfEmpty(current, transition, gateway);
          }
          try {
            await gateway.moveMember(current.channelDiscordId, transition.newChannelDiscordId!);
            await this.activateAndRefresh(current, transition, gateway);
          } catch (error: unknown) {
            this.logFailure('moveToOwnedRoom', transition, current.channelDiscordId, error, current.id);
          }
          return true;
        });
        if (reused) return;
      }
      if (gateway.getMemberChannelDiscordId() !== transition.newChannelDiscordId) return;
      let channelDiscordId: string;
      const name = buildInitialRoomName(transition.activityName, transition.displayName);
      const userLimit = defaultUserLimitSchema.parse(defaultUserLimit);
      try {
        ({ channelDiscordId } = await gateway.createTemporaryChannel({ categoryDiscordId, name, userLimit }));
      } catch (error: unknown) {
        const failedChannelId = error instanceof CallDiscordError ? error.channelDiscordId : undefined;
        this.logFailure('createChannel', transition, failedChannelId ?? transition.newChannelDiscordId, error);
        return;
      }
      await this.withRoomLock(channelDiscordId, transition, async () => {
        let created: TemporaryRoomRecord;
        try {
          created = await this.rooms.createCreating({
            guildDiscordId: transition.guildDiscordId, voiceCreatorId,
            channelDiscordId, ownerDiscordId: transition.memberDiscordId, name, userLimit,
          });
        } catch (error: unknown) {
          this.logFailure('persistCreating', transition, channelDiscordId, error);
          try {
            await gateway.deleteChannel(channelDiscordId);
          } catch (cleanupError: unknown) {
            this.logFailure('deleteUnpersistedChannel', transition, channelDiscordId, cleanupError);
          }
          return;
        }
        if (gateway.getMemberChannelDiscordId() !== transition.newChannelDiscordId) {
          await this.compensateUnmovedRoom(created, transition, gateway);
          return;
        }
        try {
          await gateway.moveMember(channelDiscordId, transition.newChannelDiscordId!);
        } catch (error: unknown) {
          this.logFailure('moveMember', transition, channelDiscordId, error, created.id);
          // The move succeeded at Discord but its cache could not be refreshed.
          // A zero count here is unconfirmed, not evidence of an empty room.
          if (error instanceof CallMoveUnconfirmedError) return;
          await this.compensateUnmovedRoom(created, transition, gateway);
          return;
        }
        // A member may also leave while the move request is in flight.
        if (gateway.getChannelMemberCount(channelDiscordId) === 0) {
          await this.closeIfEmpty(created, transition, gateway);
          return;
        }
        if (gateway.getMemberChannelDiscordId() !== channelDiscordId) {
          created = await this.rooms.clearOwner(created.id, transition.memberDiscordId);
        }
        try {
          await this.activateAndRefresh(created, transition, gateway);
        } catch (error: unknown) {
          // The occupied room is NOT compensated: its durable CREATING row is
          // still queryable and blocks duplicate ownership. A later event can
          // activate it without a panel ID; full restart recovery is out of scope.
          this.logFailure('markActive', transition, channelDiscordId, error, created.id);
        }
      });
    });
  }

  private async refreshRoom(channelDiscordId: string, input: VoiceTransition, gateway: CallDiscordGateway): Promise<void> {
    await this.withRoomLock(channelDiscordId, input, async () => {
      let room = await this.rooms.findActiveByChannel(channelDiscordId);
      if (room === null || room.guildDiscordId !== input.guildDiscordId) {
        for (const departure of this.runtime.coordinator.pendingDepartures(input.guildDiscordId, channelDiscordId)) {
          this.runtime.coordinator.acknowledgeDeparture(input.guildDiscordId, channelDiscordId, departure);
        }
        return;
      }
      await this.runtime.reconcileDeparturesLocked(room.id);
      room = await this.rooms.findActiveByChannel(channelDiscordId);
      if (room === null) return;
      if (gateway.getChannelMemberCount(channelDiscordId) === 0) {
        await this.closeIfEmpty(room, input, gateway);
        return;
      }
      await this.activateAndRefresh(room, input, gateway);
    });
  }

  private async activateAndRefresh(room: TemporaryRoomRecord, input: VoiceTransition, gateway: CallDiscordGateway): Promise<void> {
    if (room.status === 'CREATING') room = await this.rooms.markActive(room.id, room.controlMessageDiscordId);
    try {
      await this.runtime.observeLocked(room.id, gateway);
    } catch (error: unknown) {
      this.logFailure('observeRoom', input, room.channelDiscordId, error, room.id);
    }
  }

  private async compensateUnmovedRoom(room: TemporaryRoomRecord, input: VoiceTransition, gateway: CallDiscordGateway): Promise<void> {
    if (gateway.getChannelMemberCount(room.channelDiscordId) === 0) {
      await this.closeIfEmpty(room, input, gateway);
    } else {
      // A cancelled/failed move is not proof that nobody moved or joined.
      if (gateway.getMemberChannelDiscordId() !== room.channelDiscordId) {
        room = await this.rooms.clearOwner(room.id, input.memberDiscordId);
      }
      await this.activateAndRefresh(room, input, gateway);
    }
  }

  private async closeIfEmpty(room: TemporaryRoomRecord, input: VoiceTransition, gateway: CallDiscordGateway): Promise<boolean> {
    if (gateway.getChannelMemberCount(room.channelDiscordId) !== 0) return false;
    await this.runtime.workspaces.reconcile(room.id, null);
    const closing = await this.rooms.beginClosing(room.id);
    this.runtime.timers.cancel(`transfer:${room.id}`);
    this.runtime.timers.cancel(`countdown:${room.id}`);
    this.runtime.timers.cancel(`priority:${room.id}`);
    this.runtime.transfers.synchronizePrompt(room.id, null);
    if (closing.status === 'CLOSED') {
      this.runtime.access.retireConfirmedLocked(room.id, closing.status);
      this.runtime.coordinator.retireRoom(room.guildDiscordId, room.channelDiscordId);
      return true;
    }
    // beginClosing awaits I/O: a stale zero must not evict newly arrived members.
    if (gateway.getChannelMemberCount(room.channelDiscordId) === 0) {
      try {
        await gateway.deleteChannel(room.channelDiscordId);
        const closed = await this.rooms.markClosed(room.id);
        this.runtime.access.retireConfirmedLocked(room.id, closed.status);
        this.runtime.coordinator.retireRoom(room.guildDiscordId, room.channelDiscordId);
        return true;
      } catch (error: unknown) {
        this.logFailure('closeRoom', input, room.channelDiscordId, error, room.id);
      }
    }
    // Cleanup was aborted or failed. Reconcile the retained row while its room
    // lock is still held, even if it is empty now and only gets occupied later.
    if (closing.ownerDiscordId === input.memberDiscordId && gateway.getMemberChannelDiscordId() !== room.channelDiscordId) {
      const retained = await this.rooms.clearOwner(room.id, input.memberDiscordId);
      if (gateway.getChannelMemberCount(room.channelDiscordId) !== 0) {
        await this.activateAndRefresh(retained, input, gateway);
      }
    }
    return false;
  }

  private withRoomLock<T>(channelDiscordId: string, input: VoiceTransition, operation: () => Promise<T>): Promise<T> {
    return this.runtime.coordinator.room(input.guildDiscordId, channelDiscordId, operation);
  }

  private logFailure(operation: string, input: VoiceTransition, channelDiscordId: string, error: unknown, roomId?: string): void {
    this.logger.warn({ operation, guildDiscordId: input.guildDiscordId, memberDiscordId: input.memberDiscordId,
      channelDiscordId, roomId, errorName: error instanceof Error ? error.name : 'UnknownError' }, 'Temporary room operation failed');
  }
}
