import { randomUUID } from 'node:crypto';

import { type Guild } from 'discord.js';
import { vi } from 'vitest';

import { RoomModerationService } from '../../../../src/modules/calls/room-moderation.service.js';
import { DiscordRoomGateway } from '../../../../src/modules/calls/room.discord.js';
import type { RoomActor, RoomBlockWrite, RoomMemberBlock, RoomState } from '../../../../src/modules/calls/room.types.js';
import { OWNER, OTHER } from '../ownership/ownership.fixtures.js';
import { roomSettingsFixture } from './room-settings.fixtures.js';

// Real coordinator, access service and native projection; only SQL and HTTP are
// replaced with stateful boundaries. Tests can lose a reply AFTER its effect.
export function roomModerationFixture() {
  const f = roomSettingsFixture();
  const events: string[] = [];
  const admitted = (actor: RoomActor): RoomState | undefined => {
    const state = f.roomStates.get(actor.roomId);
    return state?.room.status === 'ACTIVE' && state.controlsEnabled && !state.transfer
      && state.room.guildDiscordId === actor.guildDiscordId && state.room.ownerDiscordId === actor.memberDiscordId
      && state.room.controlVersion === actor.controlVersion ? state : undefined;
  };
  const store = Object.assign(f.store, {
    stageRoomBlock: vi.fn(async (actor: RoomActor, memberId: string, deniedBefore: bigint): Promise<RoomBlockWrite | null> => {
      const state = admitted(actor);
      if (!state || state.room.ownerDiscordId === memberId) return null;
      let block = state.memberBlocks.find(b => b.memberDiscordId === memberId);
      if (block?.state === 'BLOCKED') return structuredClone({ block, controlVersion: actor.controlVersion, changed: false });
      if (block) block.state = 'BLOCKED';
      else { block = { id: randomUUID(), roomId: actor.roomId, memberDiscordId: memberId, deniedBefore, state: 'BLOCKED', createdAt: new Date() }; state.memberBlocks.push(block); }
      state.allowedMemberIds = state.allowedMemberIds.filter(id => id !== memberId);
      state.room.controlVersion++; events.push('stage:block');
      return structuredClone({ block, controlVersion: state.room.controlVersion, changed: true });
    }),
    stageRoomUnblock: vi.fn(async (actor: RoomActor, blockId: string): Promise<RoomBlockWrite | null> => {
      const state = admitted(actor); const block = state?.memberBlocks.find(b => b.id === blockId);
      if (!state || !block) return null;
      if (block.state === 'UNBLOCK_PENDING') return structuredClone({ block, controlVersion: actor.controlVersion, changed: false });
      block.state = 'UNBLOCK_PENDING'; state.room.controlVersion++; events.push('stage:unblock');
      return structuredClone({ block, controlVersion: state.room.controlVersion, changed: true });
    }),
    completeRoomUnblock: vi.fn(async (id: string, version: number, blockId: string) => {
      const state = f.roomStates.get(id);
      if (!state || state.room.controlVersion !== version || !state.memberBlocks.some(b => b.id === blockId && b.state === 'UNBLOCK_PENDING')) return false;
      state.memberBlocks = state.memberBlocks.filter(b => b.id !== blockId); events.push('complete'); return true;
    }),
  });
  const set = f.channel.permissionOverwrites.set.getMockImplementation()!;
  f.channel.permissionOverwrites.set.mockImplementation(async input => {
    events.push('project');
    // A premature projection before the durable stage leaves observable SQL
    // allowlist/record evidence for the ordering tests.
    await set(input);
  });
  const http = vi.fn(async (targetId: string) => { events.push('disconnect'); f.leave(targetId); });
  const gateway = new DiscordRoomGateway(f.guild as unknown as Guild, {
    stop: async () => {},
    disconnectOnce: async (_guild, target, canDisconnect) => {
      if (!await canDisconnect()) return 'not-in-room';
      await http(target); return 'disconnected';
    },
  });
  const read = store.read.getMockImplementation()!;
  store.read.mockImplementation(async id => { events.push('read'); return read(id); });
  const invalidateWorkspace = vi.fn((_id: string) => { events.push('invalidate'); });
  const publishLocked = vi.fn(async (_id: string) => { events.push('publish'); });
  const afterRemovalLocked = vi.fn(async (id: string) => {
    events.push('afterRemoval');
    const snapshot = (await gateway.snapshot(f.state().room.channelDiscordId))!;
    await store.syncPresence(id, snapshot.members, new Date(), false);
  });
  const service = new RoomModerationService({ store, coordinator: f.coordinator, access: f.access, invalidateWorkspace, publishLocked, afterRemovalLocked });
  f.join(OTHER);
  const seedBlock = (memberDiscordId = OTHER, state: RoomMemberBlock['state'] = 'BLOCKED') => {
    const block: RoomMemberBlock = { id: randomUUID(), roomId: f.state().room.id, memberDiscordId, state, deniedBefore: 0n, createdAt: new Date() };
    f.state().memberBlocks.push(block); return block;
  };
  const overwrite = (id = OTHER) => f.projected().find(entry => entry.id === id);
  const reconcile = () => f.coordinator.room(f.state().room.guildDiscordId, f.channel.id, () => service.reconcileLocked(f.state().room.id, gateway));
  return { ...f, store, gateway, service, events, http, invalidateWorkspace, publishLocked, afterRemovalLocked, seedBlock, overwrite, reconcile };
}

export { OWNER, OTHER };
