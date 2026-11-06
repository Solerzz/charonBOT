import { describe, expect, it, vi } from 'vitest';

import type { PrismaClient } from '../../../../src/generated/prisma/client.js';
import { PrismaTemporaryRoomRepository, TemporaryRoomTransitionError } from '../../../../src/modules/calls/call.repository.js';
import { room } from './call.fixtures.js';

function fixture() {
  const temporaryRoom = { findFirst: vi.fn(), create: vi.fn(), updateMany: vi.fn(), findUniqueOrThrow: vi.fn() };
  return { temporaryRoom, repository: new PrismaTemporaryRoomRepository({ temporaryRoom } as unknown as PrismaClient) };
}

describe('PrismaTemporaryRoomRepository', () => {
  it('queries tracked channels and owners including recoverable creating/closing rows, never closed rows', async () => {
    const { temporaryRoom: db, repository } = fixture();
    db.findFirst.mockResolvedValue(room);
    await expect(repository.findActiveByChannel(room.channelDiscordId)).resolves.toEqual(room);
    await expect(repository.findActiveByOwner(room.guildDiscordId, room.ownerDiscordId!)).resolves.toEqual(room);
    expect(db.findFirst).toHaveBeenNthCalledWith(1, { where: { channelDiscordId: room.channelDiscordId, status: { in: ['CREATING', 'ACTIVE', 'CLOSING'] } } });
    expect(db.findFirst).toHaveBeenNthCalledWith(2, { where: { guildDiscordId: room.guildDiscordId, ownerDiscordId: room.ownerDiscordId, status: { in: ['CREATING', 'ACTIVE', 'CLOSING'] } } });
  });

  it('persists public unlimited creating rooms with a nullable owner and panel', async () => {
    const { temporaryRoom: db, repository } = fixture();
    const input = { guildDiscordId: room.guildDiscordId, voiceCreatorId: room.voiceCreatorId, channelDiscordId: room.channelDiscordId, ownerDiscordId: null, name: 'Game' };
    db.create.mockResolvedValue({ ...room, ...input, status: 'CREATING', controlMessageDiscordId: null });
    await expect(repository.createCreating(input)).resolves.toMatchObject({ status: 'CREATING', ownerDiscordId: null });
    expect(db.create).toHaveBeenCalledExactlyOnceWith({ data: { ...input, status: 'CREATING', userLimit: 0, visibility: 'PUBLIC', controlMessageDiscordId: null } });
  });

  it.each([
    ['markActive', 'ACTIVE', { status: 'CREATING' }, { status: 'ACTIVE', controlMessageDiscordId: null }],
    ['beginClosing', 'CLOSING', { status: { in: ['CREATING', 'ACTIVE'] } }, { status: 'CLOSING' }],
    ['markClosed', 'CLOSED', { status: 'CLOSING' }, { status: 'CLOSED', closedAt: expect.any(Date) }],
  ] as const)('conditionally transitions %s and returns already transitioned records', async (method, status, where, data) => {
    const { temporaryRoom: db, repository } = fixture();
    db.updateMany.mockResolvedValue({ count: 1 });
    db.findUniqueOrThrow.mockResolvedValue({ ...room, status });
    const operation = () => method === 'markActive' ? repository.markActive(room.id, null) : repository[method](room.id);
    await expect(operation()).resolves.toMatchObject({ status });
    expect(db.updateMany).toHaveBeenCalledWith({ where: { id: room.id, ...where }, data });
    db.updateMany.mockResolvedValue({ count: 0 });
    await expect(operation()).resolves.toMatchObject({ status });
  });

  it('never revives a closed room or closes an active row without beginning closure', async () => {
    const { temporaryRoom: db, repository } = fixture();
    db.updateMany.mockResolvedValue({ count: 0 });
    db.findUniqueOrThrow.mockResolvedValue({ ...room, status: 'CLOSED' });
    await expect(repository.markActive(room.id, null)).rejects.toBeInstanceOf(TemporaryRoomTransitionError);
    await expect(repository.beginClosing(room.id)).resolves.toMatchObject({ status: 'CLOSED' });
    db.findUniqueOrThrow.mockResolvedValue(room);
    await expect(repository.markClosed(room.id)).rejects.toBeInstanceOf(TemporaryRoomTransitionError);
  });

  it('clears only the expected owner on an open room, retaining a replacement owner', async () => {
    const { temporaryRoom: db, repository } = fixture();
    db.updateMany.mockResolvedValue({ count: 0 });
    db.findUniqueOrThrow.mockResolvedValue({ ...room, ownerDiscordId: '72345678901234567' });
    await expect(repository.clearOwner(room.id, room.ownerDiscordId!)).resolves.toMatchObject({ ownerDiscordId: '72345678901234567' });
    expect(db.updateMany).toHaveBeenCalledExactlyOnceWith({ where: { id: room.id, ownerDiscordId: room.ownerDiscordId, status: { in: ['CREATING', 'ACTIVE', 'CLOSING'] } }, data: { ownerDiscordId: null } });
  });

  it('can clear an owner from an occupied CLOSING room but never from CLOSED history', async () => {
    const { temporaryRoom: db, repository } = fixture();
    db.updateMany.mockResolvedValue({ count: 1 });
    db.findUniqueOrThrow.mockResolvedValue({ ...room, status: 'CLOSING', ownerDiscordId: null });
    await expect(repository.clearOwner(room.id, room.ownerDiscordId!)).resolves.toMatchObject({ status: 'CLOSING', ownerDiscordId: null });
    expect(db.updateMany).toHaveBeenCalledWith({
      where: { id: room.id, ownerDiscordId: room.ownerDiscordId, status: { in: ['CREATING', 'ACTIVE', 'CLOSING'] } },
      data: { ownerDiscordId: null },
    });
  });
});
