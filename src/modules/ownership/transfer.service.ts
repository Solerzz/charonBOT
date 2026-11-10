import { requireOwnedRoom } from '../calls/room-context.js';
import type { RoomCoordinator } from '../calls/room.coordinator.js';
import type { RoomStateRepository } from '../calls/room-state.repository.js';
import { RoomActionError, type PendingOwnershipTransfer, type RoomActor, type RoomChanged, type RoomDiscordGateway } from '../calls/room.types.js';
import type { OwnershipTimers } from './ownership.timers.js';

type TransferDependencies = { store: RoomStateRepository; coordinator: RoomCoordinator; timers: OwnershipTimers; onChangedLocked: RoomChanged; reconcileDeparturesLocked?: (roomId: string) => Promise<void>; invalidateWorkspace?: (roomId: string) => void; recoverAccessLocked?: RoomChanged };

async function safe<T>(work: () => Promise<T>, code: 'PERSISTENCE_FAILURE' | 'DISCORD_FAILURE' = 'PERSISTENCE_FAILURE'): Promise<T> {
  try { return await work(); } catch (error) {
    throw error instanceof RoomActionError ? error : new RoomActionError(code);
  }
}

export class TransferService {
  private readonly prompts = new Map<string, { id: string; stop: () => void }>();
  constructor(private readonly dependencies: TransferDependencies) {}

  watchPrompt(roomId: string, id: string, stop: () => void): void {
    this.synchronizePrompt(roomId, null);
    this.prompts.set(roomId, { id, stop });
  }

  synchronizePrompt(roomId: string, currentId: string | null): void {
    const prompt = this.prompts.get(roomId);
    if (!prompt || prompt.id === currentId) return;
    this.prompts.delete(roomId);
    prompt.stop();
  }

  finishPrompt(roomId: string, operationId: string): void {
    if (this.prompts.get(roomId)?.id === operationId) this.synchronizePrompt(roomId, null);
  }

  stopPrompts(): void {
    for (const roomId of this.prompts.keys()) this.synchronizePrompt(roomId, null);
  }

  begin(actor: RoomActor, targetId: string, gateway: RoomDiscordGateway): Promise<PendingOwnershipTransfer> {
    return safe(async () => {
      const { store, coordinator } = this.dependencies;
      return coordinator.member(actor.guildDiscordId, actor.memberDiscordId, async () => {
        const initial = await store.read(actor.roomId);
        if (!initial || initial.room.guildDiscordId !== actor.guildDiscordId) throw new RoomActionError('ROOM_UNAVAILABLE');
        return coordinator.room(actor.guildDiscordId, initial.room.channelDiscordId, async () => {
          await this.dependencies.reconcileDeparturesLocked?.(actor.roomId);
          await this.dependencies.recoverAccessLocked?.(actor.roomId, gateway);
          await this.eligible(actor, targetId, gateway);
          const { state } = await this.liveOwned(actor, targetId, initial.room.channelDiscordId, gateway);
          if (state.transfer) throw new RoomActionError('TRANSFER_PENDING');
          coordinator.assertContinuous(actor.guildDiscordId, initial.room.channelDiscordId, [actor.memberDiscordId, targetId]);
          return store.createTransfer({ roomId: actor.roomId, ownerDiscordId: actor.memberDiscordId, targetDiscordId: targetId, controlVersion: actor.controlVersion });
        });
      });
    });
  }

  activate(actor: RoomActor, transferId: string, gateway: RoomDiscordGateway): Promise<PendingOwnershipTransfer | null> {
    return safe(() => this.withTransfer(transferId, 'owner', actor, async (transfer, channelId) => {
      try {
        if (this.dependencies.timers.isStopped) throw new RoomActionError('ROOM_UNAVAILABLE');
        await this.dependencies.recoverAccessLocked?.(transfer.roomId, gateway);
        await this.validate(actor, transfer, channelId, gateway);
        if (transfer.expiresAt !== null) return transfer;
        const expiresAt = new Date(Date.now() + 5_000);
        if (this.dependencies.timers.isStopped) throw new RoomActionError('ROOM_UNAVAILABLE');
        this.dependencies.coordinator.assertContinuous(actor.guildDiscordId, channelId, [transfer.ownerDiscordId, transfer.targetDiscordId]);
        if (!await this.dependencies.store.armTransfer(transfer.id, transfer.controlVersion, expiresAt)) {
          throw new RoomActionError('STALE_CONTROLS');
        }
        const armed = { ...transfer, expiresAt };
        this.dependencies.timers.schedule(`transfer:${transfer.roomId}`, expiresAt, () => this.expire(transfer.id, gateway));
        return armed;
      } catch (error) {
        await this.discardLocked(transfer);
        throw error;
      }
    }));
  }

  async abortUnpublished(transferId: string, _gateway: RoomDiscordGateway): Promise<void> {
    await safe(() => this.withTransfer(transferId, 'owner', undefined, (transfer) => this.discardLocked(transfer)));
  }

  async confirm(actor: RoomActor, transferId: string, gateway: RoomDiscordGateway): Promise<void> {
    await safe(() => this.withTransfer(transferId, 'target', actor, (transfer, channelId) => this.finishLocked(transfer, actor, channelId, gateway, 'confirm')));
  }

  async undo(actor: RoomActor, transferId: string, gateway: RoomDiscordGateway): Promise<void> {
    await safe(() => this.withTransfer(transferId, 'owner', actor, async (transfer, channelId) => {
      const { store, timers } = this.dependencies;
      try {
        const { state } = await requireOwnedRoom(store, actor, this.safeGateway(gateway));
        if (state.room.channelDiscordId !== channelId || state.transfer?.id !== transfer.id) throw new RoomActionError('STALE_CONTROLS');
        if (!await store.cancelTransfer(transfer.id, actor.memberDiscordId, new Date())) throw new RoomActionError('TRANSFER_EXPIRED');
      } catch (error) {
        if (!(error instanceof RoomActionError && error.code === 'TRANSFER_EXPIRED')) await this.discardLocked(transfer);
        throw error;
      }
      timers.cancel(`transfer:${transfer.roomId}`);
      this.finishPrompt(transfer.roomId, transfer.id);
    }));
  }

  async expire(transferId: string, gateway: RoomDiscordGateway): Promise<void> {
    await safe(async () => {
      try {
        await this.withTransfer(transferId, 'target', undefined, async (transfer, channelId, guildId) => {
          if (transfer.expiresAt === null || transfer.expiresAt > new Date()) return;
          const actor: RoomActor = { roomId: transfer.roomId, guildDiscordId: guildId, memberDiscordId: transfer.ownerDiscordId, controlVersion: transfer.controlVersion };
          await this.finishLocked(transfer, actor, channelId, gateway, 'timeout');
        });
      } catch (error) {
        this.scheduleExpiryRecovery(transferId);
        throw error;
      }
    });
  }

  private scheduleExpiryRecovery(transferId: string): void {
    if (this.dependencies.timers.isStopped) return;
    // An uncertain expiry is cancelled, never replayed as a reported transfer.
    // A per-operation key cannot replace a newer room timer. stop() closes admission.
    this.dependencies.timers.schedule(`transfer-recovery:${transferId}`, new Date(Date.now() + 1_000), () => this.recoverExpiry(transferId));
  }

  private async recoverExpiry(transferId: string): Promise<void> {
    await safe(async () => {
      try {
        await this.withTransfer(transferId, 'target', undefined, (transfer) => this.discardLocked(transfer));
      } catch (error) {
        this.scheduleExpiryRecovery(transferId);
        throw error;
      }
    });
  }

  async cancelForRoomLocked(roomId: string): Promise<void> {
    await safe(async () => {
      await this.dependencies.store.invalidateTransfers(roomId);
      this.dependencies.timers.cancel(`transfer:${roomId}`);
      this.synchronizePrompt(roomId, null);
    });
  }

  private async finishLocked(transfer: PendingOwnershipTransfer, actor: RoomActor, channelId: string, gateway: RoomDiscordGateway, cause: 'confirm' | 'timeout'): Promise<void> {
    const { store, timers, onChangedLocked } = this.dependencies;
    try {
      await this.dependencies.recoverAccessLocked?.(transfer.roomId, gateway);
      await this.validate(actor, transfer, channelId, gateway);
      if (cause === 'confirm' && transfer.expiresAt !== null && transfer.expiresAt <= new Date()) throw new RoomActionError('TRANSFER_EXPIRED');
      this.dependencies.coordinator.assertContinuous(actor.guildDiscordId, channelId, [transfer.ownerDiscordId, transfer.targetDiscordId]);
      this.dependencies.invalidateWorkspace?.(transfer.roomId);
      if (!await this.dependencies.coordinator.changeOwnership(actor.guildDiscordId, channelId, transfer.controlVersion, transfer.targetDiscordId,
        () => store.finishTransfer(transfer.id, transfer.controlVersion, new Date(), cause))) {
        // Confirmation may cross the deadline during SQL I/O; leave its timeout intact.
        if (cause === 'confirm' && transfer.expiresAt !== null && transfer.expiresAt <= new Date()) throw new RoomActionError('TRANSFER_EXPIRED');
        throw new RoomActionError('STALE_CONTROLS');
      }
    } catch (error) {
      if (error instanceof RoomActionError && error.code === 'TRANSFER_EXPIRED') throw error;
      await this.discardLocked(transfer);
      if (cause === 'timeout' && error instanceof RoomActionError && error.code !== 'DISCORD_FAILURE' && error.code !== 'PERSISTENCE_FAILURE') return;
      throw error;
    }
    timers.cancel(`transfer:${transfer.roomId}`);
    this.finishPrompt(transfer.roomId, transfer.id);
    await safe(() => onChangedLocked(transfer.roomId, gateway), 'DISCORD_FAILURE');
  }

  private async eligible(actor: RoomActor, targetId: string, gateway: RoomDiscordGateway): Promise<void> {
    if (targetId === actor.memberDiscordId) throw new RoomActionError('UNKNOWN_MEMBER');
    const member = await safe(() => gateway.resolveMember(targetId), 'DISCORD_FAILURE');
    if (!member || member.memberDiscordId !== targetId || member.isBot) throw new RoomActionError('UNKNOWN_MEMBER');
    if (await this.dependencies.store.findOwnedRoom(actor.guildDiscordId, targetId)) throw new RoomActionError('ALREADY_OWNS_ROOM');
  }

  private async liveOwned(actor: RoomActor, targetId: string, channelId: string, gateway: RoomDiscordGateway) {
    const context = await requireOwnedRoom(this.dependencies.store, actor, this.safeGateway(gateway));
    if (context.state.room.channelDiscordId !== channelId) throw new RoomActionError('ROOM_UNAVAILABLE');
    if (!context.snapshot.members.some((member) => member.memberDiscordId === targetId && !member.isBot)) throw new RoomActionError('UNKNOWN_MEMBER');
    return context;
  }

  private async validate(actor: RoomActor, transfer: PendingOwnershipTransfer, channelId: string, gateway: RoomDiscordGateway): Promise<void> {
    // Eligibility I/O must precede the final live presence/owner/version check. Only the SQL CAS follows.
    await this.eligible(actor, transfer.targetDiscordId, gateway);
    const { state } = await this.liveOwned(actor, transfer.targetDiscordId, channelId, gateway);
    if (state.transfer?.id !== transfer.id) throw new RoomActionError('STALE_CONTROLS');
  }

  private safeGateway(gateway: RoomDiscordGateway): RoomDiscordGateway {
    return { ...gateway, snapshot: (id) => safe(() => gateway.snapshot(id), 'DISCORD_FAILURE') };
  }

  private async discardLocked(transfer: PendingOwnershipTransfer): Promise<void> {
    await this.dependencies.store.discardTransfer(transfer.id);
    this.dependencies.timers.cancel(`transfer:${transfer.roomId}`);
    this.finishPrompt(transfer.roomId, transfer.id);
  }

  private async withTransfer<T>(
    id: string, member: 'owner' | 'target', actor: RoomActor | undefined,
    work: (transfer: PendingOwnershipTransfer, channelId: string, guildId: string) => Promise<T>,
  ): Promise<T | null> {
    const { store, coordinator } = this.dependencies;
    const initial = await store.readTransfer(id);
    if (!initial) return null;
    const state = await store.read(initial.roomId);
    if (!state) return null;
    if (actor) {
      if (actor.roomId !== initial.roomId || actor.guildDiscordId !== state.room.guildDiscordId || actor.memberDiscordId !== initial.ownerDiscordId) throw new RoomActionError('NOT_OWNER');
      if (actor.controlVersion !== initial.controlVersion) throw new RoomActionError('STALE_CONTROLS');
    }
    return coordinator.member(state.room.guildDiscordId, member === 'owner' ? initial.ownerDiscordId : initial.targetDiscordId, () =>
      coordinator.room(state.room.guildDiscordId, state.room.channelDiscordId, async () => {
        await this.dependencies.reconcileDeparturesLocked?.(initial.roomId);
        const current = await store.readTransfer(id);
        if (!current) return null;
        return work(current, state.room.channelDiscordId, state.room.guildDiscordId);
      }));
  }
}
