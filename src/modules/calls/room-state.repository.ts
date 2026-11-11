import { Prisma, type PendingOwnershipTransfer, type PrismaClient } from '../../generated/prisma/client.js';
import type { TemporaryRoomRecord } from './call.repository.js';
import { RoomActionError, type RoomActor, type RoomBlockWrite, type RoomMember, type RoomSettingsPatch, type RoomState } from './room.types.js';
import { measureCallStage } from './call-action.metrics.js';

type TransferInput = Pick<PendingOwnershipTransfer, 'roomId' | 'ownerDiscordId' | 'targetDiscordId' | 'controlVersion'>;
type ConfiguredRoom = Prisma.TemporaryRoomGetPayload<{ include: { voiceCreator: true } }>;

export interface RoomStateRepository {
  read(roomId: string): Promise<RoomState | null>;
  // Fence the attempted version before confirming an indeterminate access
  // writer: it has either completed, or can no longer mutate this generation.
  // This DB-only barrier must finish before any Discord reconciliation.
  settleAccess(roomId: string, attemptedVersion: number): Promise<RoomState | null>;
  readTransfer(id: string): Promise<PendingOwnershipTransfer | null>;
  findOwnedRoom(guildId: string, memberId: string): Promise<TemporaryRoomRecord | null>;
  listTracked(): Promise<TemporaryRoomRecord[]>;
  listForCreator(creatorId: string): Promise<TemporaryRoomRecord[]>;
  syncPresence(roomId: string, members: RoomMember[], at: Date, resetJoinedAt: boolean): Promise<void>;
  savePriority(roomId: string, version: number, memberId: string | null, expiresAt: Date | null): Promise<boolean>;
  changeOwner(roomId: string, version: number, expectedOwner: string | null, nextOwner: string | null): Promise<boolean>;
  createTransfer(input: TransferInput): Promise<PendingOwnershipTransfer>;
  armTransfer(id: string, controlVersion: number, expiresAt: Date): Promise<boolean>;
  cancelTransfer(id: string, ownerDiscordId: string, at: Date): Promise<boolean>;
  discardTransfer(id: string): Promise<void>;
  invalidateTransfers(roomId: string): Promise<void>;
  cancelPreviousRunTransfers(): Promise<void>;
  finishTransfer(id: string, controlVersion: number, at: Date, cause: 'confirm' | 'timeout'): Promise<boolean>;
  setAllowed(roomId: string, version: number, memberDiscordId: string, allowed: boolean): Promise<boolean>;
  stageRoomBlock(actor: RoomActor, memberId: string, deniedBefore: bigint): Promise<RoomBlockWrite | null>;
  stageRoomUnblock(actor: RoomActor, blockId: string): Promise<RoomBlockWrite | null>;
  completeRoomUnblock(roomId: string, expectedVersion: number, blockId: string): Promise<boolean>;
  purgeClosedRoomBlocks(): Promise<number>;
  updateSettings(roomId: string, version: number, patch: RoomSettingsPatch): Promise<boolean>;
  setPanelId(roomId: string, version: number, expectedId: string | null, nextId: string | null): Promise<boolean>;
  invalidateControls(roomId: string, expectedVersion: number): Promise<boolean>;
}

const trackedStatuses = ['CREATING', 'ACTIVE', 'CLOSING'] as const;
const ownerChange = (nextOwner: string | null) => ({
  ownerDiscordId: nextOwner, controlVersion: { increment: 1 }, priorityMemberDiscordId: null, priorityExpiresAt: null,
});
const activeWhere = (id: string, controlVersion: number) => ({
  id, controlVersion, status: 'ACTIVE' as const, voiceCreator: { roomCommandsEnabled: true },
});
const available = (room: ConfiguredRoom | null, version: number): room is ConfiguredRoom =>
  room !== null && room.status === 'ACTIVE' && room.controlVersion === version && room.voiceCreator.roomCommandsEnabled;
const uniqueError = (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

export class PrismaRoomStateRepository implements RoomStateRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async read(roomId: string): Promise<RoomState | null> {
    const record = await measureCallStage('state', () => this.prisma.temporaryRoom.findUnique({
      where: { id: roomId },
      include: { voiceCreator: true, presences: { orderBy: [{ joinedAt: 'asc' }, { memberDiscordId: 'asc' }] }, allowedMembers: true, memberBlocks: { orderBy: [{ memberDiscordId: 'asc' }, { id: 'asc' }] }, pendingTransfer: true },
    }));
    if (!record) return null;
    const { voiceCreator, presences, allowedMembers, memberBlocks, pendingTransfer, ...room } = record;
    return { room, controlsEnabled: voiceCreator.roomCommandsEnabled, presences, allowedMemberIds: allowedMembers.map(({ memberDiscordId }) => memberDiscordId), memberBlocks, transfer: pendingTransfer };
  }

  async settleAccess(roomId: string, attemptedVersion: number): Promise<RoomState | null> {
    // invalidateControls updates/locks this row and commits before read/REST.
    // An admitted setAllowed holds the same row lock until commit. Settings
    // UPDATEs recheck their version predicate after a conflicting row update.
    // Thus an earlier writer either precedes this barrier, or its old-version
    // CAS is fenced even if it has not acquired a connection/row lock yet.
    await this.invalidateControls(roomId, attemptedVersion);
    return this.read(roomId);
  }

  readTransfer(id: string): Promise<PendingOwnershipTransfer | null> {
    return measureCallStage('state', () => this.prisma.pendingOwnershipTransfer.findUnique({ where: { id } }));
  }

  findOwnedRoom(guildId: string, memberId: string): Promise<TemporaryRoomRecord | null> {
    return measureCallStage('state', () => this.prisma.temporaryRoom.findFirst({ where: { guildDiscordId: guildId, ownerDiscordId: memberId, status: { in: [...trackedStatuses] } } }));
  }

  listTracked(): Promise<TemporaryRoomRecord[]> {
    return measureCallStage('state', () => this.prisma.temporaryRoom.findMany({ where: { status: { in: [...trackedStatuses] } } }));
  }

  listForCreator(creatorId: string): Promise<TemporaryRoomRecord[]> {
    return measureCallStage('state', () => this.prisma.temporaryRoom.findMany({ where: { voiceCreatorId: creatorId, status: { in: [...trackedStatuses] } } }));
  }

  async syncPresence(roomId: string, members: RoomMember[], at: Date, resetJoinedAt: boolean): Promise<void> {
    await measureCallStage('persist', () => this.prisma.$transaction(async (tx) => {
      const room = await this.lockRoom(tx, roomId);
      if (!room || room.status === 'CLOSED') return;
      await tx.roomPresence.deleteMany({ where: { roomId, memberDiscordId: { notIn: members.map(({ memberDiscordId }) => memberDiscordId) } } });
      for (const member of members) {
        await tx.roomPresence.upsert({
          where: { roomId_memberDiscordId: { roomId, memberDiscordId: member.memberDiscordId } },
          create: { roomId, ...member, joinedAt: at },
          update: { isBot: member.isBot, ...(resetJoinedAt ? { joinedAt: at } : {}) },
        });
      }
    }));
  }

  async savePriority(roomId: string, version: number, memberId: string | null, expiresAt: Date | null): Promise<boolean> {
    const result = await measureCallStage('persist', () => this.prisma.temporaryRoom.updateMany({
      where: { id: roomId, controlVersion: version, status: 'ACTIVE', ownerDiscordId: null,
        ...(memberId === null ? {} : { memberBlocks: { none: { memberDiscordId: memberId } } }) },
      data: { priorityMemberDiscordId: memberId, priorityExpiresAt: expiresAt },
    }));
    return result.count === 1;
  }

  async changeOwner(roomId: string, version: number, expectedOwner: string | null, nextOwner: string | null): Promise<boolean> {
    try {
      return await measureCallStage('persist', () => this.prisma.$transaction(async (tx) => {
        if (nextOwner !== null) await this.lockRoom(tx, roomId);
        const result = await tx.temporaryRoom.updateMany({
          where: nextOwner === null
            ? { id: roomId, controlVersion: version, ownerDiscordId: expectedOwner, status: { in: [...trackedStatuses] } }
            : { ...activeWhere(roomId, version), ownerDiscordId: expectedOwner, memberBlocks: { none: { memberDiscordId: nextOwner } } },
          data: ownerChange(nextOwner),
        });
        if (!result.count) return false;
        await tx.pendingOwnershipTransfer.deleteMany({ where: { roomId } });
        return true;
      }));
    } catch (error) {
      if (uniqueError(error)) throw new RoomActionError('ALREADY_OWNS_ROOM');
      throw error;
    }
  }

  async createTransfer(input: TransferInput): Promise<PendingOwnershipTransfer> {
    try {
      return await measureCallStage('persist', () => this.prisma.$transaction(async (tx) => {
        const room = await this.lockRoom(tx, input.roomId);
        if (!room || room.status !== 'ACTIVE') throw new RoomActionError('ROOM_UNAVAILABLE');
        if (!room.voiceCreator.roomCommandsEnabled) throw new RoomActionError('CONTROLS_DISABLED');
        if (room.controlVersion !== input.controlVersion) throw new RoomActionError('STALE_CONTROLS');
        if (room.ownerDiscordId !== input.ownerDiscordId) throw new RoomActionError('NOT_OWNER');
        if (await tx.roomMemberBlock.findUnique({ where: { roomId_memberDiscordId: { roomId: input.roomId, memberDiscordId: input.targetDiscordId } } })) throw new RoomActionError('ROOM_UNAVAILABLE');
        return tx.pendingOwnershipTransfer.create({ data: input });
      }));
    } catch (error) {
      if (uniqueError(error)) throw new RoomActionError('TRANSFER_PENDING');
      throw error;
    }
  }

  armTransfer(id: string, controlVersion: number, expiresAt: Date): Promise<boolean> {
    return this.withTransfer(id, async (tx, transfer, room) => {
      if (!this.currentTransfer(transfer, room, controlVersion) || transfer.expiresAt !== null) return false;
      const result = await tx.pendingOwnershipTransfer.updateMany({ where: { id, controlVersion, expiresAt: null }, data: { expiresAt } });
      return result.count === 1;
    });
  }

  cancelTransfer(id: string, ownerDiscordId: string, at: Date): Promise<boolean> {
    return this.withTransfer(id, async (tx, transfer, room) => {
      if (!this.currentTransfer(transfer, room, transfer.controlVersion) || transfer.ownerDiscordId !== ownerDiscordId
        || (transfer.expiresAt !== null && transfer.expiresAt <= at)) return false;
      const result = await tx.pendingOwnershipTransfer.deleteMany({ where: { id } });
      return result.count === 1;
    });
  }

  async discardTransfer(id: string): Promise<void> {
    await this.withTransfer(id, async (tx) => {
      await tx.pendingOwnershipTransfer.deleteMany({ where: { id } });
      return true;
    });
  }

  async invalidateTransfers(roomId: string): Promise<void> {
    await measureCallStage('persist', () => this.prisma.$transaction(async (tx) => {
      await this.lockRoom(tx, roomId);
      await tx.pendingOwnershipTransfer.deleteMany({ where: { roomId } });
    }));
  }

  async cancelPreviousRunTransfers(): Promise<void> {
    // Startup-only, before controls or timers are admitted.
    await measureCallStage('persist', () => this.prisma.pendingOwnershipTransfer.deleteMany({}));
  }

  async finishTransfer(id: string, controlVersion: number, at: Date, cause: 'confirm' | 'timeout'): Promise<boolean> {
    try {
      return await this.withTransfer(id, async (tx, transfer, room) => {
        if (!this.currentTransfer(transfer, room, controlVersion)) return false;
        if (cause === 'timeout'
          ? transfer.expiresAt === null || transfer.expiresAt > at
          : transfer.expiresAt !== null && transfer.expiresAt <= at) return false;
        const result = await tx.temporaryRoom.updateMany({
          where: { ...activeWhere(transfer.roomId, controlVersion), ownerDiscordId: transfer.ownerDiscordId, memberBlocks: { none: { memberDiscordId: transfer.targetDiscordId } } },
          data: ownerChange(transfer.targetDiscordId),
        });
        if (!result.count) return false;
        await tx.pendingOwnershipTransfer.deleteMany({ where: { roomId: transfer.roomId } });
        return true;
      });
    } catch (error) {
      if (uniqueError(error)) throw new RoomActionError('ALREADY_OWNS_ROOM');
      throw error;
    }
  }

  async setAllowed(roomId: string, version: number, memberDiscordId: string, allowed: boolean): Promise<boolean> {
    return measureCallStage('persist', () => this.prisma.$transaction(async (tx) => {
      if (!available(await this.lockRoom(tx, roomId), version)) return false;
      if (allowed && await tx.roomMemberBlock.findUnique({ where: { roomId_memberDiscordId: { roomId, memberDiscordId } } })) return false;
      if (allowed) await tx.roomAllowedMember.upsert({
        where: { roomId_memberDiscordId: { roomId, memberDiscordId } }, create: { roomId, memberDiscordId }, update: {},
      });
      else await tx.roomAllowedMember.deleteMany({ where: { roomId, memberDiscordId } });
      return true;
    }));
  }

  stageRoomBlock(actor: RoomActor, memberId: string, deniedBefore: bigint): Promise<RoomBlockWrite | null> {
    return measureCallStage('persist', () => this.prisma.$transaction(async (tx) => {
      if (!await this.lockBlockActor(tx, actor, memberId)) return null;
      const existing = await tx.roomMemberBlock.findUnique({ where: { roomId_memberDiscordId: { roomId: actor.roomId, memberDiscordId: memberId } } });
      if (existing?.state === 'BLOCKED') return { block: existing, controlVersion: actor.controlVersion, changed: false };
      const block = existing
        ? await tx.roomMemberBlock.update({ where: { id: existing.id }, data: { state: 'BLOCKED' } })
        : await tx.roomMemberBlock.create({ data: { roomId: actor.roomId, memberDiscordId: memberId, deniedBefore } });
      await tx.roomAllowedMember.deleteMany({ where: { roomId: actor.roomId, memberDiscordId: memberId } });
      await tx.temporaryRoom.update({ where: { id: actor.roomId }, data: { controlVersion: { increment: 1 } } });
      return { block, controlVersion: actor.controlVersion + 1, changed: true };
    }));
  }

  stageRoomUnblock(actor: RoomActor, blockId: string): Promise<RoomBlockWrite | null> {
    return measureCallStage('persist', () => this.prisma.$transaction(async (tx) => {
      if (!await this.lockBlockActor(tx, actor)) return null;
      const existing = await tx.roomMemberBlock.findFirst({ where: { id: blockId, roomId: actor.roomId } });
      if (!existing) return null;
      if (existing.state === 'UNBLOCK_PENDING') return { block: existing, controlVersion: actor.controlVersion, changed: false };
      const block = await tx.roomMemberBlock.update({ where: { id: blockId }, data: { state: 'UNBLOCK_PENDING' } });
      await tx.temporaryRoom.update({ where: { id: actor.roomId }, data: { controlVersion: { increment: 1 } } });
      return { block, controlVersion: actor.controlVersion + 1, changed: true };
    }));
  }

  completeRoomUnblock(roomId: string, expectedVersion: number, blockId: string): Promise<boolean> {
    return measureCallStage('persist', () => this.prisma.$transaction(async (tx) => {
      const room = await this.lockRoom(tx, roomId);
      if (!room || room.controlVersion !== expectedVersion) return false;
      const result = await tx.roomMemberBlock.deleteMany({ where: { id: blockId, roomId, state: 'UNBLOCK_PENDING' } });
      return result.count === 1;
    }));
  }

  async purgeClosedRoomBlocks(): Promise<number> {
    const result = await measureCallStage('persist', () => this.prisma.roomMemberBlock.deleteMany({ where: { room: { status: 'CLOSED' } } }));
    return result.count;
  }

  async updateSettings(roomId: string, version: number, patch: RoomSettingsPatch): Promise<boolean> {
    const result = await measureCallStage('persist', () => this.prisma.temporaryRoom.updateMany({ where: activeWhere(roomId, version), data: patch }));
    return result.count === 1;
  }

  async setPanelId(roomId: string, version: number, expectedId: string | null, nextId: string | null): Promise<boolean> {
    const result = await measureCallStage('persist', () => this.prisma.temporaryRoom.updateMany({
      where: {
        ...(nextId === null ? { id: roomId, controlVersion: version, status: { in: [...trackedStatuses] } } : activeWhere(roomId, version)),
        controlMessageDiscordId: expectedId,
      },
      data: { controlMessageDiscordId: nextId },
    }));
    return result.count === 1;
  }

  invalidateControls(roomId: string, expectedVersion: number): Promise<boolean> {
    return measureCallStage('persist', () => this.prisma.$transaction(async (tx) => {
      const result = await tx.temporaryRoom.updateMany({
        where: { id: roomId, controlVersion: expectedVersion, status: { in: [...trackedStatuses] } },
        data: { controlVersion: { increment: 1 } },
      });
      if (!result.count) return false;
      await tx.pendingOwnershipTransfer.deleteMany({ where: { roomId } });
      return true;
    }));
  }

  private async lockRoom(tx: Prisma.TransactionClient, roomId: string): Promise<ConfiguredRoom | null> {
    // Serialize pending-transfer/presence writes with ownership and lifecycle CAS.
    await tx.$queryRaw`SELECT id FROM "TemporaryRoom" WHERE id = ${roomId}::uuid FOR UPDATE`;
    return tx.temporaryRoom.findUnique({ where: { id: roomId }, include: { voiceCreator: true } });
  }

  private async lockBlockActor(tx: Prisma.TransactionClient, actor: RoomActor, memberId?: string): Promise<boolean> {
    await this.lockRoom(tx, actor.roomId);
    // Keep actor/guild/owner and target-owner guards in SQL, after the shared
    // room lock. Completion deliberately does not require controls enabled.
    return await tx.temporaryRoom.findFirst({ where: {
      ...activeWhere(actor.roomId, actor.controlVersion), guildDiscordId: actor.guildDiscordId,
      ownerDiscordId: actor.memberDiscordId, pendingTransfer: null,
      ...(memberId === undefined ? {} : { NOT: { ownerDiscordId: memberId } }),
    } }) !== null;
  }

  private currentTransfer(transfer: PendingOwnershipTransfer, room: ConfiguredRoom | null, version: number): boolean {
    return available(room, version) && transfer.controlVersion === version && room.ownerDiscordId === transfer.ownerDiscordId;
  }

  private withTransfer(id: string, action: (tx: Prisma.TransactionClient, transfer: PendingOwnershipTransfer, room: ConfiguredRoom | null) => Promise<boolean>): Promise<boolean> {
    return measureCallStage('persist', () => this.prisma.$transaction(async (tx) => {
      const initial = await tx.pendingOwnershipTransfer.findUnique({ where: { id } });
      if (!initial) return false;
      const room = await this.lockRoom(tx, initial.roomId);
      // Re-read after taking the room lock: an earlier owner/undo may have removed it.
      const transfer = await tx.pendingOwnershipTransfer.findUnique({ where: { id } });
      return transfer ? action(tx, transfer, room) : false;
    }));
  }
}
