import type { PrismaClient, TemporaryRoom } from '../../generated/prisma/client.js';

export type TemporaryRoomRecord = TemporaryRoom;
export type CreateTemporaryRoomInput = Pick<TemporaryRoomRecord,
  'guildDiscordId' | 'voiceCreatorId' | 'channelDiscordId' | 'ownerDiscordId' | 'name'>;

export interface TemporaryRoomRepository {
  findActiveByChannel(channelDiscordId: string): Promise<TemporaryRoomRecord | null>;
  findActiveByOwner(guildDiscordId: string, ownerDiscordId: string): Promise<TemporaryRoomRecord | null>;
  createCreating(input: CreateTemporaryRoomInput): Promise<TemporaryRoomRecord>;
  markActive(id: string, controlMessageDiscordId: string | null): Promise<TemporaryRoomRecord>;
  clearOwner(id: string, expectedOwnerDiscordId: string): Promise<TemporaryRoomRecord>;
  beginClosing(id: string): Promise<TemporaryRoomRecord>;
  markClosed(id: string): Promise<TemporaryRoomRecord>;
}

export class TemporaryRoomTransitionError extends Error {
  constructor() {
    super('Temporary room state transition is not allowed');
    this.name = 'TemporaryRoomTransitionError';
  }
}

// Non-closed rows include failed activation and unfinished cleanup. Hiding them
// would lose the recovery handle and allow another room for the same owner.
const trackedStatuses = ['CREATING', 'ACTIVE', 'CLOSING'] as const;
const invalidateControls = { controlVersion: { increment: 1 }, priorityMemberDiscordId: null, priorityExpiresAt: null };

export class PrismaTemporaryRoomRepository implements TemporaryRoomRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findActiveByChannel(channelDiscordId: string): Promise<TemporaryRoomRecord | null> {
    return this.prisma.temporaryRoom.findFirst({
      where: { channelDiscordId, status: { in: [...trackedStatuses] } },
    });
  }

  findActiveByOwner(guildDiscordId: string, ownerDiscordId: string): Promise<TemporaryRoomRecord | null> {
    return this.prisma.temporaryRoom.findFirst({
      where: { guildDiscordId, ownerDiscordId, status: { in: [...trackedStatuses] } },
    });
  }

  createCreating(input: CreateTemporaryRoomInput): Promise<TemporaryRoomRecord> {
    return this.prisma.temporaryRoom.create({
      data: { ...input, status: 'CREATING', userLimit: 0, visibility: 'PUBLIC', controlMessageDiscordId: null },
    });
  }

  async markActive(id: string, controlMessageDiscordId: string | null): Promise<TemporaryRoomRecord> {
    await this.prisma.temporaryRoom.updateMany({
      where: { id, status: 'CREATING' }, data: { status: 'ACTIVE', controlMessageDiscordId },
    });
    const record = await this.prisma.temporaryRoom.findUniqueOrThrow({ where: { id } });
    if (record.status !== 'ACTIVE') throw new TemporaryRoomTransitionError();
    return record;
  }

  async clearOwner(id: string, expectedOwnerDiscordId: string): Promise<TemporaryRoomRecord> {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.temporaryRoom.updateMany({
        where: { id, ownerDiscordId: expectedOwnerDiscordId, status: { in: [...trackedStatuses] } },
        data: { ownerDiscordId: null, ...invalidateControls },
      });
      if (result.count) await tx.pendingOwnershipTransfer.deleteMany({ where: { roomId: id } });
      return tx.temporaryRoom.findUniqueOrThrow({ where: { id } });
    });
  }

  async beginClosing(id: string): Promise<TemporaryRoomRecord> {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.temporaryRoom.updateMany({
        where: { id, status: { in: ['CREATING', 'ACTIVE'] } }, data: { status: 'CLOSING', ...invalidateControls },
      });
      if (result.count) await tx.pendingOwnershipTransfer.deleteMany({ where: { roomId: id } });
      const record = await tx.temporaryRoom.findUniqueOrThrow({ where: { id } });
      if (record.status !== 'CLOSING' && record.status !== 'CLOSED') throw new TemporaryRoomTransitionError();
      return record;
    });
  }

  async markClosed(id: string): Promise<TemporaryRoomRecord> {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.temporaryRoom.updateMany({
        where: { id, status: 'CLOSING' }, data: { status: 'CLOSED', closedAt: new Date(), ...invalidateControls },
      });
      if (result.count) await tx.pendingOwnershipTransfer.deleteMany({ where: { roomId: id } });
      const record = await tx.temporaryRoom.findUniqueOrThrow({ where: { id } });
      if (record.status !== 'CLOSED') throw new TemporaryRoomTransitionError();
      return record;
    });
  }
}
