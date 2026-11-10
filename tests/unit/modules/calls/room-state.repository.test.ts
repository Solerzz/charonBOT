import { describe, expect, it, vi } from 'vitest';

import { Prisma, type PrismaClient } from '../../../../src/generated/prisma/client.js';
import { PrismaRoomStateRepository } from '../../../../src/modules/calls/room-state.repository.js';
import { RoomActionError } from '../../../../src/modules/calls/room.types.js';
import { creator, room } from './call.fixtures.js';
import { createLogger } from '../../../../src/core/logger/logger.js';
import { runCallActionTrace } from '../../../../src/modules/calls/call-action.metrics.js';

const pending = {
  id: '323e4567-e89b-42d3-a456-426614174000', roomId: room.id,
  ownerDiscordId: room.ownerDiscordId!, targetDiscordId: 'target', controlVersion: 0, expiresAt: null,
};

function fixture() {
  const temporaryRoom = {
    findUnique: vi.fn().mockResolvedValue({ ...room, controlVersion: 0, priorityMemberDiscordId: 'first', priorityExpiresAt: new Date(500), voiceCreator: creator }),
    findFirst: vi.fn(), findMany: vi.fn(), updateMany: vi.fn().mockResolvedValue({ count: 1 }),
  };
  const pendingOwnershipTransfer = {
    findUnique: vi.fn().mockResolvedValue(pending), create: vi.fn().mockResolvedValue(pending),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }), deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
  };
  const roomPresence = { findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn(), upsert: vi.fn() };
  const roomAllowedMember = { findMany: vi.fn().mockResolvedValue([]), upsert: vi.fn(), deleteMany: vi.fn() };
  const roomMemberBlock = { findUnique: vi.fn().mockResolvedValue(null) };
  const tx = { temporaryRoom, pendingOwnershipTransfer, roomPresence, roomAllowedMember, roomMemberBlock, $queryRaw: vi.fn().mockResolvedValue([{ id: room.id }]) };
  const prisma = { ...tx, $transaction: vi.fn(async (fn) => fn(tx)) };
  return { ...tx, prisma, store: new PrismaRoomStateRepository(prisma as unknown as PrismaClient) };
}

describe('PrismaRoomStateRepository', () => {
  it('refuses intent admission when the SQL actor/guild/owner/version guard finds no room', async () => {
    const f = fixture(); f.temporaryRoom.findFirst.mockResolvedValue(null);
    const actor = { roomId: room.id, guildDiscordId: room.guildDiscordId, memberDiscordId: room.ownerDiscordId!, controlVersion: 0 };
    expect(await f.store.stageRoomBlock(actor, 'guest', 0n)).toBeNull();
    expect(await f.store.stageRoomUnblock(actor, pending.id)).toBeNull();
    expect(f.temporaryRoom.findFirst).toHaveBeenNthCalledWith(1, { where: {
      id: room.id, guildDiscordId: room.guildDiscordId, ownerDiscordId: actor.memberDiscordId,
      controlVersion: 0, status: 'ACTIVE', voiceCreator: { roomCommandsEnabled: true },
      pendingTransfer: null, NOT: { ownerDiscordId: 'guest' },
    } });
    expect(f.temporaryRoom.updateMany).not.toHaveBeenCalled();
  });
  it('measures repository reads and persistence operations without logging SQL or IDs', async () => {
    const f = fixture(); const lines: string[] = [];
    const logger = createLogger({ level: 'info', destination: { write: line => { lines.push(line); } } });
    await runCallActionTrace(logger, 'rename-save', async () => {
      await f.store.readTransfer(pending.id);
      await f.store.findOwnedRoom('guild', 'owner');
      await f.store.updateSettings(room.id, 0, { name: 'private-name' });
      f.temporaryRoom.updateMany.mockRejectedValueOnce(new Error('private-sql'));
      await expect(f.store.setPanelId(room.id, 0, null, 'message')).rejects.toThrow('private-sql');
    });
    expect(JSON.parse(lines[0]!)).toMatchObject({ stages: { state: { count: 2 }, persist: { count: 2 } } });
    expect(lines.join('')).not.toContain('private-'); expect(lines.join('')).not.toContain(room.id);
  });
  it('reads state with logically deleted creator configuration and related members', async () => {
    const f = fixture();
    const memberBlocks = [{ id: pending.id, roomId: room.id, memberDiscordId: 'blocked', state: 'UNBLOCK_PENDING', deniedBefore: 16n, createdAt: new Date() }];
    f.temporaryRoom.findUnique.mockResolvedValue({ ...room, voiceCreator: { ...creator, deletedAt: new Date() }, presences: [], allowedMembers: [{ memberDiscordId: 'guest' }], memberBlocks, pendingTransfer: pending });
    await expect(f.store.read(room.id)).resolves.toMatchObject({ controlsEnabled: true, allowedMemberIds: ['guest'], memberBlocks, transfer: pending });
    f.temporaryRoom.findUnique.mockResolvedValue(null);
    await expect(f.store.read(room.id)).resolves.toBeNull();
  });

  it('queries only tracked ownership and lists, never closed history', async () => {
    const f = fixture();
    await f.store.findOwnedRoom('guild', 'owner');
    await f.store.listTracked();
    await f.store.listForCreator('creator');
    expect(f.temporaryRoom.findFirst).toHaveBeenCalledWith({ where: { guildDiscordId: 'guild', ownerDiscordId: 'owner', status: { in: ['CREATING', 'ACTIVE', 'CLOSING'] } } });
    expect(f.temporaryRoom.findMany).toHaveBeenCalledWith({ where: { status: { in: ['CREATING', 'ACTIVE', 'CLOSING'] } } });
    expect(f.temporaryRoom.findMany).toHaveBeenCalledWith({ where: { voiceCreatorId: 'creator', status: { in: ['CREATING', 'ACTIVE', 'CLOSING'] } } });
  });

  it('changes owner with a version/owner CAS and invalidates priority and transfers atomically', async () => {
    const f = fixture();
    await expect(f.store.changeOwner(room.id, 0, room.ownerDiscordId, 'target')).resolves.toBe(true);
    expect(f.temporaryRoom.updateMany).toHaveBeenCalledWith({
      where: { id: room.id, controlVersion: 0, ownerDiscordId: room.ownerDiscordId, status: 'ACTIVE', voiceCreator: { roomCommandsEnabled: true }, memberBlocks: { none: { memberDiscordId: 'target' } } },
      data: { ownerDiscordId: 'target', controlVersion: { increment: 1 }, priorityMemberDiscordId: null, priorityExpiresAt: null },
    });
    expect(f.pendingOwnershipTransfer.deleteMany).toHaveBeenCalledWith({ where: { roomId: room.id } });
    expect(f.prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('retains a replacement owner and its pending transfer on failed CAS', async () => {
    const f = fixture();
    f.temporaryRoom.updateMany.mockResolvedValue({ count: 0 });
    await expect(f.store.changeOwner(room.id, 0, 'old-owner', 'target')).resolves.toBe(false);
    expect(f.pendingOwnershipTransfer.deleteMany).not.toHaveBeenCalled();
  });

  it('clears ownership with disabled controls on non-closed rows', async () => {
    const f = fixture();
    await expect(f.store.changeOwner(room.id, 0, room.ownerDiscordId, null)).resolves.toBe(true);
    expect(f.temporaryRoom.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: room.id, controlVersion: 0, ownerDiscordId: room.ownerDiscordId, status: { in: ['CREATING', 'ACTIVE', 'CLOSING'] } } }));
  });

  it('translates owner uniqueness without exposing database details', async () => {
    const f = fixture();
    const sentinel = 'private-database-detail-sentinel';
    f.temporaryRoom.updateMany.mockRejectedValue(new Prisma.PrismaClientKnownRequestError(sentinel, { code: 'P2002', clientVersion: '7' }));
    const translated = await f.store.changeOwner(room.id, 0, room.ownerDiscordId, 'target').catch((error: unknown) => error);
    expect(translated).toBeInstanceOf(RoomActionError);
    expect(translated).toMatchObject({ code: 'ALREADY_OWNS_ROOM', message: 'ALREADY_OWNS_ROOM' });
    expect((translated as Error).message).not.toContain(sentinel);
  });

  it('prepares only for the current enabled owner/version and rejects a duplicate pending row', async () => {
    const f = fixture();
    await expect(f.store.createTransfer({ roomId: room.id, ownerDiscordId: room.ownerDiscordId!, targetDiscordId: 'target', controlVersion: 0 })).resolves.toEqual(pending);
    f.pendingOwnershipTransfer.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: '7' }));
    await expect(f.store.createTransfer({ roomId: room.id, ownerDiscordId: room.ownerDiscordId!, targetDiscordId: 'target', controlVersion: 0 })).rejects.toMatchObject({ code: 'TRANSFER_PENDING' });
    f.temporaryRoom.findUnique.mockResolvedValue({ ...room, controlVersion: 2, voiceCreator: creator });
    await expect(f.store.createTransfer({ roomId: room.id, ownerDiscordId: room.ownerDiscordId!, targetDiscordId: 'target', controlVersion: 0 })).rejects.toMatchObject({ code: 'STALE_CONTROLS' });
  });

  it('arms a prepared transfer once after validating its current owner/version/configuration', async () => {
    const f = fixture();
    await expect(f.store.armTransfer(pending.id, 0, new Date(5000))).resolves.toBe(true);
    expect(f.pendingOwnershipTransfer.updateMany).toHaveBeenCalledWith({ where: { id: pending.id, controlVersion: 0, expiresAt: null }, data: { expiresAt: new Date(5000) } });
    f.pendingOwnershipTransfer.findUnique.mockResolvedValue({ ...pending, expiresAt: new Date(5000) });
    await expect(f.store.armTransfer(pending.id, 0, new Date(6000))).resolves.toBe(false);
  });

  it.each(['confirm', 'timeout'] as const)('finishes eligible %s atomically', async (cause) => {
    const f = fixture();
    if (cause === 'timeout') f.pendingOwnershipTransfer.findUnique.mockResolvedValue({ ...pending, expiresAt: new Date(5000) });
    await expect(f.store.finishTransfer(pending.id, 0, new Date(5000), cause)).resolves.toBe(true);
    expect(f.temporaryRoom.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { ownerDiscordId: 'target', controlVersion: { increment: 1 }, priorityMemberDiscordId: null, priorityExpiresAt: null } }));
    expect(f.pendingOwnershipTransfer.deleteMany).toHaveBeenCalledWith({ where: { roomId: room.id } });
  });

  it('does not time out prepared/unelapsed transfers or confirm an elapsed deadline', async () => {
    const f = fixture();
    await expect(f.store.finishTransfer(pending.id, 0, new Date(5000), 'timeout')).resolves.toBe(false);
    f.pendingOwnershipTransfer.findUnique.mockResolvedValue({ ...pending, expiresAt: new Date(5000) });
    await expect(f.store.finishTransfer(pending.id, 0, new Date(4999), 'timeout')).resolves.toBe(false);
    await expect(f.store.finishTransfer(pending.id, 0, new Date(5000), 'confirm')).resolves.toBe(false);
    expect(f.temporaryRoom.updateMany).not.toHaveBeenCalled();
  });

  it('undo deletes only the current owner prepared or unexpired transfer', async () => {
    const f = fixture();
    await expect(f.store.cancelTransfer(pending.id, room.ownerDiscordId!, new Date(0))).resolves.toBe(true);
    await expect(f.store.cancelTransfer(pending.id, 'other', new Date(0))).resolves.toBe(false);
    f.pendingOwnershipTransfer.findUnique.mockResolvedValue({ ...pending, expiresAt: new Date(5000) });
    await expect(f.store.cancelTransfer(pending.id, room.ownerDiscordId!, new Date(5000))).resolves.toBe(false);
  });

  it('rejects transfer writes after owner, version, status or configuration changes', async () => {
    for (const patch of [{ ownerDiscordId: 'other' }, { controlVersion: 1 }, { status: 'CLOSED' }, { voiceCreator: { ...creator, roomCommandsEnabled: false } }]) {
      const f = fixture();
      f.temporaryRoom.findUnique.mockResolvedValue({ ...room, controlVersion: 0, voiceCreator: creator, ...patch });
      await expect(f.store.armTransfer(pending.id, 0, new Date(5000))).resolves.toBe(false);
      await expect(f.store.finishTransfer(pending.id, 0, new Date(0), 'confirm')).resolves.toBe(false);
      expect(f.pendingOwnershipTransfer.updateMany).not.toHaveBeenCalled();
    }
  });

  it('discards only an exact transfer and invalidates a room or previous-run transfers', async () => {
    const f = fixture();
    await f.store.readTransfer(pending.id);
    await f.store.discardTransfer(pending.id);
    await f.store.invalidateTransfers(room.id);
    await f.store.cancelPreviousRunTransfers();
    expect(f.pendingOwnershipTransfer.findUnique).toHaveBeenCalledWith({ where: { id: pending.id } });
    expect(f.pendingOwnershipTransfer.deleteMany.mock.calls).toEqual([[{ where: { id: pending.id } }], [{ where: { roomId: room.id } }], [{}]]);
  });

  it('restart invalidation increments only the expected version, preserves owner/priority and deletes pending atomically', async () => {
    const f = fixture();
    await expect(f.store.invalidateControls(room.id, 0)).resolves.toBe(true);
    expect(f.temporaryRoom.updateMany).toHaveBeenCalledWith({ where: { id: room.id, controlVersion: 0, status: { in: ['CREATING', 'ACTIVE', 'CLOSING'] } }, data: { controlVersion: { increment: 1 } } });
    expect(f.pendingOwnershipTransfer.deleteMany).toHaveBeenCalledWith({ where: { roomId: room.id } });
    f.pendingOwnershipTransfer.deleteMany.mockClear();
    f.temporaryRoom.updateMany.mockResolvedValue({ count: 0 });
    await expect(f.store.invalidateControls(room.id, 0)).resolves.toBe(false);
    expect(f.pendingOwnershipTransfer.deleteMany).not.toHaveBeenCalled();
  });

  it('saves priority/settings/panel using conditional version/status/configuration filters', async () => {
    const f = fixture();
    await expect(f.store.savePriority(room.id, 0, 'next', new Date(300000))).resolves.toBe(true);
    expect(f.temporaryRoom.updateMany).toHaveBeenCalledWith({ where: { id: room.id, controlVersion: 0, status: 'ACTIVE', ownerDiscordId: null }, data: { priorityMemberDiscordId: 'next', priorityExpiresAt: new Date(300000) } });
    await expect(f.store.updateSettings(room.id, 0, { name: 'New' })).resolves.toBe(true);
    expect(f.temporaryRoom.updateMany).toHaveBeenCalledWith({ where: { id: room.id, controlVersion: 0, status: 'ACTIVE', voiceCreator: { roomCommandsEnabled: true } }, data: { name: 'New' } });
    await expect(f.store.updateSettings(room.id, 0, { isLocked: true })).resolves.toBe(true);
    expect(f.temporaryRoom.updateMany).toHaveBeenCalledWith({ where: { id: room.id, controlVersion: 0, status: 'ACTIVE', voiceCreator: { roomCommandsEnabled: true } }, data: { isLocked: true } });
    await expect(f.store.setPanelId(room.id, 0, null, 'message')).resolves.toBe(true);
    expect(f.temporaryRoom.updateMany).toHaveBeenCalledWith({ where: { id: room.id, controlVersion: 0, status: 'ACTIVE', voiceCreator: { roomCommandsEnabled: true }, controlMessageDiscordId: null }, data: { controlMessageDiscordId: 'message' } });
  });

  it('checks enabled active version before changing the room allowlist', async () => {
    const f = fixture();
    await expect(f.store.setAllowed(room.id, 0, 'guest', true)).resolves.toBe(true);
    expect(f.roomAllowedMember.upsert).toHaveBeenCalledWith({ where: { roomId_memberDiscordId: { roomId: room.id, memberDiscordId: 'guest' } }, create: { roomId: room.id, memberDiscordId: 'guest' }, update: {} });
    await expect(f.store.setAllowed(room.id, 0, 'guest', false)).resolves.toBe(true);
    expect(f.roomAllowedMember.deleteMany).toHaveBeenCalledWith({ where: { roomId: room.id, memberDiscordId: 'guest' } });
    f.temporaryRoom.findUnique.mockResolvedValue({ ...room, controlVersion: 1, voiceCreator: creator });
    await expect(f.store.setAllowed(room.id, 0, 'guest', true)).resolves.toBe(false);
  });

  it('syncs presence without resetting continuous joins except on restart', async () => {
    const f = fixture();
    await f.store.syncPresence(room.id, [{ memberDiscordId: 'human', isBot: false }], new Date(1000), false);
    expect(f.roomPresence.deleteMany).toHaveBeenCalledWith({ where: { roomId: room.id, memberDiscordId: { notIn: ['human'] } } });
    expect(f.roomPresence.upsert).toHaveBeenLastCalledWith({ where: { roomId_memberDiscordId: { roomId: room.id, memberDiscordId: 'human' } }, create: { roomId: room.id, memberDiscordId: 'human', isBot: false, joinedAt: new Date(1000) }, update: { isBot: false } });
    await f.store.syncPresence(room.id, [{ memberDiscordId: 'human', isBot: false }], new Date(2000), true);
    expect(f.roomPresence.upsert).toHaveBeenLastCalledWith(expect.objectContaining({ update: { isBot: false, joinedAt: new Date(2000) } }));
  });
});
