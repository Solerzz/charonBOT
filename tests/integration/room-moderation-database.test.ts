import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { Client } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import { createPrismaClient, disconnectDatabase } from '../../src/core/database/prisma.js';
import { PrismaRoomStateRepository } from '../../src/modules/calls/room-state.repository.js';
import { PrismaTemporaryRoomRepository } from '../../src/modules/calls/call.repository.js';
import { RoomAccessService } from '../../src/modules/calls/room-access.service.js';
import { RoomModerationService } from '../../src/modules/calls/room-moderation.service.js';
import { deferred } from '../unit/modules/calls/call.fixtures.js';
import { OWNER, OTHER, roomModerationFixture } from '../unit/modules/calls/room-moderation.fixtures.js';
import { assertDisposableDatabaseEnvironment } from './database-test-utils.js';

const integrationTest = process.env.RUN_DATABASE_TESTS === 'true' ? it : it.skip;

async function fixture() {
  assertDisposableDatabaseEnvironment();
  const client = createPrismaClient({ url: process.env.DATABASE_URL!, directUrl: process.env.DIRECT_URL! });
  const store = new PrismaRoomStateRepository(client);
  const creatorId = randomUUID(); const guildDiscordId = randomUUID();
  const roomId = randomUUID(); const otherId = randomUUID();
  await client.voiceCreator.create({ data: { id: creatorId, guildDiscordId, creatorChannelDiscordId: randomUUID(), categoryDiscordId: randomUUID() } });
  for (const id of [roomId, otherId]) await client.temporaryRoom.create({ data: { id, guildDiscordId, voiceCreatorId: creatorId, channelDiscordId: randomUUID(), name: 'Kept', status: 'ACTIVE', ownerDiscordId: id === roomId ? 'owner' : 'other-owner', priorityMemberDiscordId: 'priority', priorityExpiresAt: new Date(300000) } });
  const actor = { roomId, guildDiscordId, memberDiscordId: 'owner', controlVersion: 0 };
  return { client, store, actor, roomId, otherId, creatorId, async cleanup() {
    try { await client.temporaryRoom.deleteMany({ where: { id: { in: [roomId, otherId] } } }); await client.voiceCreator.delete({ where: { id: creatorId } }); }
    finally { await disconnectDatabase(client); }
  } };
}

describe('durable room moderation', () => {
  integrationTest('service recovers lost SQL stage and finalize replies without replaying removal', async () => {
    const f = await fixture(); const native = roomModerationFixture();
    try {
      await f.client.temporaryRoom.update({ where: { id: f.roomId }, data: {
        guildDiscordId: native.guild.id, channelDiscordId: native.channel.id, ownerDiscordId: OWNER,
      } });
      const actor = { ...f.actor, guildDiscordId: native.guild.id, memberDiscordId: OWNER };
      const access = new RoomAccessService(f.store, native.coordinator);
      const service = new RoomModerationService({ store: f.store, coordinator: native.coordinator, access,
        invalidateWorkspace: native.invalidateWorkspace, publishLocked: native.publishLocked,
        afterRemovalLocked: async () => {
          const snapshot = (await native.gateway.snapshot(native.channel.id))!;
          await f.store.syncPresence(f.roomId, snapshot.members, new Date(), false);
        },
      });
      await f.store.setAllowed(f.roomId, 0, OTHER, true);
      const stage = f.store.stageRoomBlock.bind(f.store);
      vi.spyOn(f.store, 'stageRoomBlock').mockImplementationOnce(async (...args) => { await stage(...args); throw new Error('lost stage reply'); });
      await service.block(actor, OTHER, native.gateway).catch(error => { expect(error).toMatchObject({ code: 'MODERATION_INCOMPLETE' }); });
      const blocked = (await f.store.read(f.roomId))!;
      expect(blocked).toMatchObject({ allowedMemberIds: [], memberBlocks: [expect.objectContaining({ memberDiscordId: OTHER, state: 'BLOCKED' })] });
      expect(native.http).toHaveBeenCalledTimes(1); expect(native.states.has(OTHER)).toBe(false);
      const unblock = f.store.stageRoomUnblock.bind(f.store);
      vi.spyOn(f.store, 'stageRoomUnblock').mockImplementationOnce(async (...args) => { await unblock(...args); throw new Error('lost unblock stage reply'); });
      const complete = f.store.completeRoomUnblock.bind(f.store);
      vi.spyOn(f.store, 'completeRoomUnblock').mockImplementationOnce(async (...args) => { await complete(...args); throw new Error('lost finalize reply'); });
      await expect(service.unblock({ ...actor, controlVersion: blocked.room.controlVersion }, blocked.memberBlocks[0]!.id, native.gateway)).rejects.toMatchObject({ code: 'MODERATION_INCOMPLETE' });
      expect(access.isUncertain(f.roomId)).toBe(true);
      expect(await f.store.read(f.roomId)).toMatchObject({ memberBlocks: [], allowedMemberIds: [] });
      await native.coordinator.room(native.guild.id, native.channel.id, () => service.reconcileLocked(f.roomId, native.gateway));
      expect(access.isUncertain(f.roomId)).toBe(false); expect(native.http).toHaveBeenCalledTimes(1);
      expect((await f.store.read(f.roomId))!.room.controlVersion).toBeGreaterThan(blocked.room.controlVersion);
    } finally { await f.cleanup(); }
  });

  integrationTest('service performs no REST until an admitted late stage writer is fenced', async () => {
    const f = await fixture(); const native = roomModerationFixture(); const observer = new Client({ connectionString: process.env.DIRECT_URL });
    const locked = deferred<number>(); const admitted = deferred<number>(); const release = deferred();
    let writer: Promise<unknown> | undefined; let action: Promise<unknown> | undefined;
    try {
      await observer.connect();
      await f.client.temporaryRoom.update({ where: { id: f.roomId }, data: { guildDiscordId: native.guild.id, channelDiscordId: native.channel.id, ownerDiscordId: OWNER } });
      const actor = { ...f.actor, guildDiscordId: native.guild.id, memberDiscordId: OWNER };
      const access = new RoomAccessService(f.store, native.coordinator);
      const service = new RoomModerationService({ store: f.store, coordinator: native.coordinator, access,
        invalidateWorkspace: native.invalidateWorkspace, publishLocked: native.publishLocked, afterRemovalLocked: async () => {},
      });
      const transaction = f.client.$transaction.bind(f.client);
      vi.spyOn(f.client, '$transaction')
        .mockImplementationOnce((async (work: (tx: typeof f.client) => Promise<unknown>) => transaction(async tx => {
          const result = await work(tx as unknown as typeof f.client);
          locked.resolve((await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`)[0]!.pid);
          await release.promise; return result;
        })) as never)
        .mockImplementationOnce((async (work: (tx: typeof f.client) => Promise<unknown>) => transaction(async tx => {
          admitted.resolve((await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`)[0]!.pid);
          return work(tx as unknown as typeof f.client);
        })) as never);
      const stage = f.store.stageRoomBlock.bind(f.store);
      vi.spyOn(f.store, 'stageRoomBlock').mockImplementationOnce(async (...args) => {
        writer = stage(...args); await locked.promise; throw new Error('transport failed while SQL still owns the row');
      });
      action = service.block(actor, OTHER, native.gateway);
      // Attach rejection handling immediately while inspecting the blocked SQL.
      const observed = action.then(result => ({ result }), error => ({ error }));
      const writerPid = await locked.promise;
      let timer: ReturnType<typeof setTimeout> | undefined; let fencePid: number;
      try {
        fencePid = await Promise.race([admitted.promise, new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => reject(new Error('Fence was not admitted within 2000ms')), 2_000);
        })]);
      } finally { clearTimeout(timer); }
      const deadline = performance.now() + 2_000;
      let waiting = false;
      do {
        const row = (await observer.query<{ waiting: boolean }>(`SELECT wait_event_type='Lock' AND $2=ANY(pg_blocking_pids(pid)) AS waiting FROM pg_stat_activity WHERE pid=$1`, [fencePid, writerPid])).rows[0];
        waiting = row?.waiting === true;
      } while (!waiting && performance.now() < deadline);
      expect(waiting).toBe(true);
      expect((await f.store.read(f.roomId))!.memberBlocks).toEqual([]);
      expect(native.channel.permissionOverwrites.set).not.toHaveBeenCalled(); expect(native.http).not.toHaveBeenCalled();
      release.resolve(); await writer;
      expect(await observed).toMatchObject({ result: { kind: 'blocked', removedFromRoom: true } });
      expect(native.http).toHaveBeenCalledTimes(1);
      expect(await f.store.read(f.roomId)).toMatchObject({ memberBlocks: [expect.objectContaining({ memberDiscordId: OTHER, state: 'BLOCKED' })], room: { controlVersion: 1 } });
    } finally { release.resolve(); await writer?.catch(() => {}); await action?.catch(() => {}); await observer.end(); await f.cleanup(); }
  }, 30_000);

  integrationTest('persists intent and removes allowlist atomically', async () => {
    const f = await fixture();
    try {
      await f.store.setAllowed(f.roomId, 0, 'guest', true);
      await f.store.setAllowed(f.otherId, 0, 'guest', true);
      const write = (await f.store.stageRoomBlock(f.actor, 'guest', 16n))!;
      expect(write).toMatchObject({ controlVersion: 1, changed: true, block: { memberDiscordId: 'guest', state: 'BLOCKED', deniedBefore: 16n } });
      expect(write.block.id).toEqual(expect.any(String)); expect(write.block.createdAt).toBeInstanceOf(Date);
      expect(await f.store.read(f.roomId)).toMatchObject({ allowedMemberIds: [], memberBlocks: [write.block], room: { ownerDiscordId: 'owner', priorityMemberDiscordId: 'priority', priorityExpiresAt: new Date(300000) } });
      expect(await f.store.setAllowed(f.roomId, 1, 'guest', true)).toBe(false);
      expect(await f.store.read(f.otherId)).toMatchObject({ memberBlocks: [], allowedMemberIds: ['guest'], room: { controlVersion: 0 } });
      expect(await f.store.stageRoomBlock({ ...f.actor, controlVersion: 1 }, 'guest', 32n)).toEqual({ ...write, changed: false });
      expect(await f.store.stageRoomBlock(f.actor, 'guest', 0n)).toBeNull();
      await expect(f.client.roomMemberBlock.create({ data: { roomId: f.roomId, memberDiscordId: 'guest' } })).rejects.toMatchObject({ code: 'P2002' });
      await f.store.stageRoomBlock({ ...f.actor, controlVersion: 1 }, 'aaa', 0n);
      expect((await f.store.read(f.roomId))!.memberBlocks.map(b => b.memberDiscordId)).toEqual(['aaa', 'guest']);
    } finally { await f.cleanup(); }
  });

  integrationTest('does not finalize a superseded unblock', async () => {
    const f = await fixture();
    try {
      const first = (await f.store.stageRoomBlock(f.actor, 'guest', 16n))!;
      const pending = (await f.store.stageRoomUnblock({ ...f.actor, controlVersion: 1 }, first.block.id))!;
      expect(pending).toMatchObject({ controlVersion: 2, changed: true, block: { id: first.block.id, state: 'UNBLOCK_PENDING', deniedBefore: 16n } });
      expect((await f.store.read(f.roomId))!.memberBlocks).toEqual([pending.block]);
      expect(await f.store.setAllowed(f.roomId, 2, 'guest', true)).toBe(false);
      expect(await f.store.stageRoomUnblock({ ...f.actor, controlVersion: 2 }, first.block.id)).toEqual({ ...pending, changed: false });
      expect(await f.store.stageRoomBlock({ ...f.actor, controlVersion: 2 }, 'guest', 99n)).toMatchObject({ controlVersion: 3, block: { id: first.block.id, state: 'BLOCKED', deniedBefore: 16n } });
      expect(await f.store.completeRoomUnblock(f.roomId, 2, first.block.id)).toBe(false);
      expect(await f.store.completeRoomUnblock(f.otherId, 3, first.block.id)).toBe(false);
      await f.store.stageRoomUnblock({ ...f.actor, controlVersion: 3 }, first.block.id);
      await f.client.voiceCreator.update({ where: { id: f.creatorId }, data: { roomCommandsEnabled: false } });
      expect(await f.store.completeRoomUnblock(f.roomId, 4, first.block.id)).toBe(true);
      expect(await f.store.completeRoomUnblock(f.roomId, 4, first.block.id)).toBe(false);
      expect(await f.store.read(f.roomId)).toMatchObject({ memberBlocks: [], allowedMemberIds: [], room: { controlVersion: 4 } });
      expect(await f.store.stageRoomUnblock({ ...f.actor, controlVersion: 4 }, first.block.id)).toBeNull();
    } finally { await f.cleanup(); }
  });

  integrationTest('arbitrates concurrent identical intent writes with one epoch winner', async () => {
    const f = await fixture();
    try {
      const writes = await Promise.all([f.store.stageRoomBlock(f.actor, 'guest', 16n), f.store.stageRoomBlock(f.actor, 'guest', 32n)]);
      expect(writes.filter(Boolean)).toHaveLength(1); expect(writes.filter(w => w === null)).toHaveLength(1);
      expect(await f.client.roomMemberBlock.count({ where: { roomId: f.roomId } })).toBe(1);
      expect((await f.store.read(f.roomId))!.room.controlVersion).toBe(1);
      const winner = writes.find(w => w !== null)!;
      const pending = (await f.store.stageRoomUnblock({ ...f.actor, controlVersion: 1 }, winner.block.id))!;
      expect(await f.store.completeRoomUnblock(f.roomId, 2, winner.block.id)).toBe(true);
      const replacement = (await f.store.stageRoomBlock({ ...f.actor, controlVersion: 2 }, 'guest', 64n))!;
      expect(replacement.block.id).not.toBe(winner.block.id);
      expect(replacement.block.deniedBefore).toBe(64n);
      await f.store.stageRoomUnblock({ ...f.actor, controlVersion: 3 }, replacement.block.id);
      expect(await f.store.completeRoomUnblock(f.roomId, 4, pending.block.id)).toBe(false);
      expect((await f.store.read(f.roomId))!.memberBlocks).toEqual([expect.objectContaining({ id: replacement.block.id, state: 'UNBLOCK_PENDING' })]);
    } finally { await f.cleanup(); }
  });

  integrationTest('refuses unblock admission without current authority but permits corrective owner unblock', async () => {
    const f = await fixture();
    try {
      const block = (await f.store.stageRoomBlock(f.actor, 'guest', 16n))!.block;
      const actor = { ...f.actor, controlVersion: 1 };
      for (const patch of [{ guildDiscordId: 'wrong' }, { memberDiscordId: 'wrong' }, { controlVersion: 0 }, { roomId: f.otherId, memberDiscordId: 'other-owner', controlVersion: 0 }]) {
        expect(await f.store.stageRoomUnblock({ ...actor, ...patch }, block.id)).toBeNull();
      }
      for (const status of ['CREATING', 'CLOSING', 'CLOSED'] as const) {
        await f.client.temporaryRoom.update({ where: { id: f.roomId }, data: { status } });
        expect(await f.store.stageRoomUnblock(actor, block.id)).toBeNull();
      }
      await f.client.temporaryRoom.update({ where: { id: f.roomId }, data: { status: 'ACTIVE' } });
      await f.client.voiceCreator.update({ where: { id: f.creatorId }, data: { roomCommandsEnabled: false } });
      expect(await f.store.stageRoomUnblock(actor, block.id)).toBeNull();
      await f.client.voiceCreator.update({ where: { id: f.creatorId }, data: { roomCommandsEnabled: true } });
      const transfer = await f.store.createTransfer({ roomId: f.roomId, controlVersion: 1, ownerDiscordId: 'owner', targetDiscordId: 'next' });
      expect(await f.store.stageRoomUnblock(actor, block.id)).toBeNull();
      expect(await f.store.read(f.roomId)).toMatchObject({ memberBlocks: [block], room: { controlVersion: 1 } });
      await f.store.discardTransfer(transfer.id);
      // A legacy/inconsistent owner block must still be removable, not stranded
      // by the protection that prevents creating owner blocks in the first place.
      await f.client.roomMemberBlock.update({ where: { id: block.id }, data: { memberDiscordId: 'owner' } });
      expect(await f.store.stageRoomUnblock(actor, block.id)).toMatchObject({ controlVersion: 2, block: { memberDiscordId: 'owner', state: 'UNBLOCK_PENDING' } });
    } finally { await f.cleanup(); }
  });

  integrationTest('rejects wrong guild, owner, target owner, version, inactive room, disabled setup and pending transfer without writes', async () => {
    const f = await fixture();
    try {
      for (const actor of [{ ...f.actor, guildDiscordId: 'wrong' }, { ...f.actor, memberDiscordId: 'wrong' }, { ...f.actor, controlVersion: 1 }]) {
        expect(await f.store.stageRoomBlock(actor, 'guest', 0n)).toBeNull();
        expect(await f.store.stageRoomUnblock(actor, randomUUID())).toBeNull();
      }
      expect(await f.store.stageRoomBlock(f.actor, 'owner', 0n)).toBeNull();
      for (const status of ['CREATING', 'CLOSING', 'CLOSED'] as const) {
        await f.client.temporaryRoom.update({ where: { id: f.roomId }, data: { status } });
        expect(await f.store.stageRoomBlock(f.actor, 'guest', 0n)).toBeNull();
      }
      await f.client.temporaryRoom.update({ where: { id: f.roomId }, data: { status: 'ACTIVE' } });
      await f.client.voiceCreator.update({ where: { id: f.creatorId }, data: { roomCommandsEnabled: false } });
      expect(await f.store.stageRoomBlock(f.actor, 'guest', 0n)).toBeNull();
      await f.client.voiceCreator.update({ where: { id: f.creatorId }, data: { roomCommandsEnabled: true } });
      await f.store.createTransfer({ roomId: f.roomId, ownerDiscordId: 'owner', targetDiscordId: 'next', controlVersion: 0 });
      expect(await f.store.stageRoomBlock(f.actor, 'guest', 0n)).toBeNull();
      expect(await f.store.read(f.roomId)).toMatchObject({ memberBlocks: [], room: { controlVersion: 0 } });
    } finally { await f.cleanup(); }
  });

  integrationTest('rolls back intent, allowlist and version when allowlist removal fails', async () => {
    const f = await fixture();
    try {
      await f.store.setAllowed(f.roomId, 0, 'guest', true);
      const transaction = f.client.$transaction.bind(f.client);
      vi.spyOn(f.client, '$transaction').mockImplementationOnce((async (work: (tx: typeof f.client) => Promise<unknown>) => transaction(async tx => {
        const remove = tx.roomAllowedMember.deleteMany.bind(tx.roomAllowedMember);
        vi.spyOn(tx.roomAllowedMember, 'deleteMany').mockImplementationOnce(((args: Parameters<typeof remove>[0]) => remove(args).then(() => { throw new Error('failed removal'); })) as typeof remove);
        return work(tx as unknown as typeof f.client);
      })) as never);
      await expect(f.store.stageRoomBlock(f.actor, 'guest', 0n)).rejects.toThrow('failed removal');
      expect(await f.store.read(f.roomId)).toMatchObject({ memberBlocks: [], allowedMemberIds: ['guest'], room: { controlVersion: 0 } });
    } finally { await f.cleanup(); }
  });

  integrationTest('blocks acquisition and transfer for either intent state but permits owner departure', async () => {
    const f = await fixture();
    try {
      const block = (await f.store.stageRoomBlock(f.actor, 'guest', 0n))!;
      for (const version of [1, 2]) {
        if (version === 2) await f.store.stageRoomUnblock({ ...f.actor, controlVersion: 1 }, block.block.id);
        expect(await f.store.changeOwner(f.roomId, version, 'owner', 'guest')).toBe(false);
        await expect(f.store.createTransfer({ roomId: f.roomId, ownerDiscordId: 'owner', targetDiscordId: 'guest', controlVersion: version })).rejects.toThrow();
        const transfer = await f.store.createTransfer({ roomId: f.roomId, ownerDiscordId: 'owner', targetDiscordId: 'next', controlVersion: version });
        await f.client.pendingOwnershipTransfer.update({ where: { id: transfer.id }, data: { targetDiscordId: 'guest' } });
        expect(await f.store.finishTransfer(transfer.id, version, new Date(), 'confirm')).toBe(false);
        await f.store.discardTransfer(transfer.id);
      }
      expect(await f.store.changeOwner(f.roomId, 2, 'owner', null)).toBe(true);
      expect(await f.store.changeOwner(f.roomId, 3, null, 'guest')).toBe(false);
      expect(await f.store.changeOwner(f.roomId, 3, null, 'next')).toBe(true);
      expect((await f.store.read(f.roomId))!.memberBlocks).toHaveLength(1);
    } finally { await f.cleanup(); }
  });

  integrationTest('keeps closing intentions, purges only closed rooms, closes atomically and cascades deletes', async () => {
    const f = await fixture(); const lifecycle = new PrismaTemporaryRoomRepository(f.client);
    try {
      await f.store.stageRoomBlock(f.actor, 'guest', 0n);
      await lifecycle.beginClosing(f.roomId);
      expect(await f.store.purgeClosedRoomBlocks()).toBe(0);
      expect((await f.store.read(f.roomId))!.memberBlocks).toHaveLength(1);
      await lifecycle.markClosed(f.roomId);
      expect((await f.store.read(f.roomId))!.memberBlocks).toEqual([]);
      await f.client.roomMemberBlock.create({ data: { roomId: f.roomId, memberDiscordId: 'old' } });
      expect(await f.store.purgeClosedRoomBlocks()).toBe(1);
      await f.store.stageRoomBlock({ ...f.actor, roomId: f.otherId, memberDiscordId: 'other-owner' }, 'guest', 0n);
      await f.client.temporaryRoom.delete({ where: { id: f.otherId } });
      expect(await f.client.roomMemberBlock.count({ where: { roomId: f.otherId } })).toBe(0);
    } finally { await f.cleanup(); }
  });

  integrationTest('rolls back closure if terminal block cleanup fails', async () => {
    const f = await fixture(); const lifecycle = new PrismaTemporaryRoomRepository(f.client);
    try {
      await f.store.stageRoomBlock(f.actor, 'guest', 0n); await lifecycle.beginClosing(f.roomId);
      const transaction = f.client.$transaction.bind(f.client);
      vi.spyOn(f.client, '$transaction').mockImplementationOnce((async (work: (tx: typeof f.client) => Promise<unknown>) => transaction(async tx => {
        const remove = tx.roomMemberBlock.deleteMany.bind(tx.roomMemberBlock);
        vi.spyOn(tx.roomMemberBlock, 'deleteMany').mockImplementationOnce(((args: Parameters<typeof remove>[0]) => remove(args).then(() => { throw new Error('failed cleanup'); })) as typeof remove);
        return work(tx as unknown as typeof f.client);
      })) as never);
      await expect(lifecycle.markClosed(f.roomId)).rejects.toThrow('failed cleanup');
      expect(await f.store.read(f.roomId)).toMatchObject({ room: { status: 'CLOSING', controlVersion: 2, closedAt: null }, memberBlocks: [expect.objectContaining({ memberDiscordId: 'guest' })] });
    } finally { await f.cleanup(); }
  });

  integrationTest('fence waits for a late intent writer', async () => {
    const f = await fixture(); const observer = new Client({ connectionString: process.env.DIRECT_URL });
    const locked = deferred(); const release = deferred();
    let writer: Promise<unknown> | undefined; let fence: Promise<unknown> | undefined;
    try {
      await observer.connect();
      const transaction = f.client.$transaction.bind(f.client);
      vi.spyOn(f.client, '$transaction').mockImplementationOnce((async (work: (tx: typeof f.client) => Promise<unknown>) => transaction(async tx => {
        const result = await work(tx as unknown as typeof f.client); locked.resolve(); await release.promise; return result;
      })) as never);
      writer = f.store.stageRoomBlock(f.actor, 'guest', 0n); await locked.promise;
      expect(await f.store.read(f.roomId)).toMatchObject({ memberBlocks: [], room: { controlVersion: 0 } });
      fence = f.store.settleAccess(f.roomId, 0);
      let waiting = false;
      for (let attempt = 0; attempt < 100 && !waiting; attempt++) waiting = (await observer.query<{ waiting: boolean }>(`SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND wait_event_type='Lock' AND query LIKE '%TemporaryRoom%') AS waiting`)).rows[0]!.waiting;
      expect(waiting).toBe(true); release.resolve(); await writer;
      expect(await fence).toMatchObject({ memberBlocks: [expect.objectContaining({ memberDiscordId: 'guest' })], room: { controlVersion: 1 } });
      expect(await f.store.stageRoomBlock(f.actor, 'late', 0n)).toBeNull();
      await f.client.$transaction(async tx => {
        await tx.$executeRaw`SET LOCAL lock_timeout = '500ms'`;
        expect(await tx.temporaryRoom.updateMany({ where: { id: f.roomId }, data: { userLimit: 7 } })).toEqual({ count: 1 });
      });
    } finally { release.resolve(); await writer?.catch(() => {}); await fence?.catch(() => {}); await observer.end(); await f.cleanup(); }
  }, 30_000);

  integrationTest('confirms lost stage and completion replies by readback and fence', async () => {
    const f = await fixture();
    try {
      const transaction = f.client.$transaction.bind(f.client);
      const loseReply = () => vi.spyOn(f.client, '$transaction').mockImplementationOnce((async (work: never) => { await transaction(work); throw new Error('lost acknowledgement'); }) as never);
      loseReply(); await expect(f.store.stageRoomBlock(f.actor, 'guest', 0n)).rejects.toThrow('lost acknowledgement');
      const block = (await f.store.settleAccess(f.roomId, 0))!.memberBlocks[0]!;
      await f.store.stageRoomUnblock({ ...f.actor, controlVersion: 1 }, block.id);
      loseReply(); await expect(f.store.completeRoomUnblock(f.roomId, 2, block.id)).rejects.toThrow('lost acknowledgement');
      expect(await f.store.settleAccess(f.roomId, 2)).toMatchObject({ memberBlocks: [], room: { controlVersion: 3 } });
    } finally { await f.cleanup(); }
  });

  integrationTest.each(['block', 'unblock', 'complete'] as const)('fences a queued old-version %s through the shared room row lock', async operation => {
    const f = await fixture(); const observer = new Client({ connectionString: process.env.DIRECT_URL });
    const locked = deferred<number>(); const admitted = deferred<number>(); const release = deferred();
    let fence: Promise<unknown> | undefined; let writer: Promise<unknown> | undefined;
    try {
      await observer.connect();
      const block = (await f.store.stageRoomBlock(f.actor, 'guest', 16n))!.block;
      await f.store.stageRoomUnblock({ ...f.actor, controlVersion: 1 }, block.id);
      const transaction = f.client.$transaction.bind(f.client);
      const transactions = vi.spyOn(f.client, '$transaction').mockImplementationOnce((async (work: (tx: typeof f.client) => Promise<unknown>) => transaction(async tx => {
        const result = await work(tx as unknown as typeof f.client);
        locked.resolve((await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`)[0]!.pid);
        await release.promise; return result;
      })) as never);
      fence = f.store.settleAccess(f.roomId, 2); const fencePid = await locked.promise;
      transactions.mockImplementationOnce((async (work: (tx: typeof f.client) => Promise<unknown>) => transaction(async tx => {
        admitted.resolve((await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`)[0]!.pid);
        return work(tx as unknown as typeof f.client);
      })) as never);
      // A started JS promise is not an admitted DB transaction: pool admission
      // can outlast 100 observer queries. Wait for its actual backend first.
      // Bound admission + lock observation to 2s, leaving headroom inside the
      // interactive fence transaction; no sleep or fixed query-count budget.
      const deadline = performance.now() + 2_000;
      writer = operation === 'block' ? f.store.stageRoomBlock({ ...f.actor, controlVersion: 2 }, 'guest', 99n)
        : operation === 'unblock' ? f.store.stageRoomUnblock({ ...f.actor, controlVersion: 2 }, block.id)
          : f.store.completeRoomUnblock(f.roomId, 2, block.id);
      let timer: ReturnType<typeof setTimeout> | undefined; let writerPid: number;
      try {
        writerPid = await Promise.race([admitted.promise,
          writer.then((): never => { throw new Error('Writer completed without transaction admission'); }),
          new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error('Writer transaction was not admitted within 2000ms')), Math.max(1, deadline - performance.now())); }),
        ]);
      } finally { clearTimeout(timer); }
      type LockObservation = { state: string; wait_event_type: string | null; blockers: number[]; room_lock: boolean };
      let row: LockObservation | undefined;
      do {
        row = (await observer.query<LockObservation>(`SELECT state, wait_event_type, pg_blocking_pids(pid) AS blockers,
          query LIKE '%TemporaryRoom%' AND query ILIKE '%FOR UPDATE%' AS room_lock
          FROM pg_stat_activity WHERE datname=current_database() AND pid=$1`, [writerPid])).rows[0];
        if (row?.wait_event_type === 'Lock' && row.room_lock && row.blockers.includes(fencePid)) break;
      } while (performance.now() < deadline);
      expect(row).toMatchObject({ state: 'active', wait_event_type: 'Lock', room_lock: true });
      expect(row!.blockers).toContain(fencePid);
      release.resolve(); await fence;
      expect(await writer).toBe(operation === 'complete' ? false : null);
      expect(await f.store.read(f.roomId)).toMatchObject({ memberBlocks: [expect.objectContaining({ id: block.id, state: 'UNBLOCK_PENDING', deniedBefore: 16n })], room: { controlVersion: 3 } });
    } finally { release.resolve(); await fence?.catch(() => {}); await writer?.catch(() => {}); await observer.end(); await f.cleanup(); }
  }, 30_000);

  integrationTest('fence waits for an admitted completion and completion releases the lock before REST', async () => {
    const f = await fixture(); const observer = new Client({ connectionString: process.env.DIRECT_URL });
    const locked = deferred(); const release = deferred();
    let writer: Promise<boolean> | undefined; let fence: Promise<unknown> | undefined;
    try {
      await observer.connect();
      const block = (await f.store.stageRoomBlock(f.actor, 'guest', 0n))!.block;
      await f.store.stageRoomUnblock({ ...f.actor, controlVersion: 1 }, block.id);
      const transaction = f.client.$transaction.bind(f.client);
      vi.spyOn(f.client, '$transaction').mockImplementationOnce((async (work: (tx: typeof f.client) => Promise<unknown>) => transaction(async tx => {
        const result = await work(tx as unknown as typeof f.client); locked.resolve(); await release.promise; return result;
      })) as never);
      writer = f.store.completeRoomUnblock(f.roomId, 2, block.id); await locked.promise;
      expect((await f.store.read(f.roomId))!.memberBlocks).toHaveLength(1);
      fence = f.store.settleAccess(f.roomId, 2);
      let waiting = false;
      for (let attempt = 0; attempt < 100 && !waiting; attempt++) waiting = (await observer.query<{ waiting: boolean }>(`SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND wait_event_type='Lock' AND query LIKE '%TemporaryRoom%') AS waiting`)).rows[0]!.waiting;
      expect(waiting).toBe(true); release.resolve(); expect(await writer).toBe(true);
      expect(await fence).toMatchObject({ memberBlocks: [], room: { controlVersion: 3 } });
      await f.client.$transaction(async tx => {
        await tx.$executeRaw`SET LOCAL lock_timeout = '500ms'`;
        expect(await tx.temporaryRoom.updateMany({ where: { id: f.roomId }, data: { userLimit: 7 } })).toEqual({ count: 1 });
      });
    } finally { release.resolve(); await writer?.catch(() => {}); await fence?.catch(() => {}); await observer.end(); await f.cleanup(); }
  }, 30_000);

  integrationTest('additive migration preserves prior data with an empty backend-only block table', async () => {
    assertDisposableDatabaseEnvironment();
    const migration = await readFile(new URL('../../prisma/migrations/20261110030000_room_member_blocks/migration.sql', import.meta.url), 'utf8');
    const client = new Client({ connectionString: process.env.DIRECT_URL }); const schema = `moderation_${randomUUID().replaceAll('-', '')}`;
    try {
      await client.connect(); await client.query(`CREATE SCHEMA "${schema}"`); await client.query(`SET search_path TO "${schema}"`);
      await client.query(`CREATE TABLE "TemporaryRoom" (id UUID PRIMARY KEY, name TEXT NOT NULL, "controlVersion" INTEGER NOT NULL); ALTER TABLE "TemporaryRoom" ENABLE ROW LEVEL SECURITY;`);
      const id = randomUUID(); await client.query(`INSERT INTO "TemporaryRoom" VALUES ($1, 'Kept', 7)`, [id]);
      const before = (await client.query('SELECT * FROM "TemporaryRoom"')).rows;
      await client.query(migration);
      expect((await client.query('SELECT * FROM "TemporaryRoom"')).rows).toEqual(before);
      expect((await client.query('SELECT * FROM "RoomMemberBlock"')).rows).toEqual([]);
      expect((await client.query(`SELECT relrowsecurity FROM pg_class WHERE oid='"RoomMemberBlock"'::regclass`)).rows[0]!.relrowsecurity).toBe(true);
      expect((await client.query('SELECT * FROM pg_policies WHERE schemaname=$1', [schema])).rows).toEqual([]);
      const inserted = (await client.query(`INSERT INTO "RoomMemberBlock" (id,"roomId","memberDiscordId") VALUES ($1,$2,'guest') RETURNING *`, [randomUUID(), id])).rows[0]!;
      expect(inserted).toMatchObject({ state: 'BLOCKED', deniedBefore: '0', createdAt: expect.any(Date) });
    } finally { try { await client.query('RESET search_path'); await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); } finally { await client.end(); } }
  });
});
