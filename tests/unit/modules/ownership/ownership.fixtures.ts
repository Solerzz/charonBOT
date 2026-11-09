import { vi } from 'vitest';

import { RoomCoordinator } from '../../../../src/modules/calls/room.coordinator.js';
import type { RoomStateRepository } from '../../../../src/modules/calls/room-state.repository.js';
import { RoomActionError, type RoomActor, type RoomDiscordGateway, type RoomMember, type RoomSnapshot, type RoomState } from '../../../../src/modules/calls/room.types.js';
import { OwnershipService } from '../../../../src/modules/ownership/ownership.service.js';
import { OwnershipTimers } from '../../../../src/modules/ownership/ownership.timers.js';
import { KeyedMutex } from '../../../../src/shared/keyed-mutex.js';
import { room } from '../calls/call.fixtures.js';

export const ROOM_ID = room.id;
export const OLDEST = '10000000000000001';
export const OTHER = '20000000000000001';
export const OWNER = room.ownerDiscordId!;
export const human = (memberDiscordId: string): RoomMember => ({ memberDiscordId, isBot: false });

export function ownershipFixture() {
  const states = new Map<string, RoomState>();
  states.set(ROOM_ID, { room: { ...room, ownerDiscordId: null }, controlsEnabled: true, presences: [], allowedMemberIds: [], transfer: null });
  const state = () => states.get(ROOM_ID)!;
  const live: { snapshot: RoomSnapshot | null } = { snapshot: { guildDiscordId: room.guildDiscordId, channelDiscordId: room.channelDiscordId, name: room.name, userLimit: 0, members: [human(OLDEST), human(OTHER)] } };
  const hooks = { beforeOwnerChange: async () => {}, beforePrioritySave: async () => {}, beforeSnapshot: async () => {} };
  const unused = async (): Promise<never> => { throw new Error('Unused repository boundary'); };
  const store = {
    read: vi.fn(async (id: string) => structuredClone(states.get(id) ?? null)),
    findOwnedRoom: vi.fn(async (guild: string, member: string) => structuredClone([...states.values()].find(({ room: r }) => r.guildDiscordId === guild && r.ownerDiscordId === member && r.status !== 'CLOSED')?.room ?? null)),
    syncPresence: vi.fn(async (id: string, members: RoomMember[], at: Date, reset: boolean) => {
      const current = states.get(id);
      if (!current || current.room.status === 'CLOSED') return;
      current.presences = members.map((member) => ({ id: `${id}:${member.memberDiscordId}`, roomId: id, ...member, joinedAt: !reset ? current.presences.find((p) => p.memberDiscordId === member.memberDiscordId)?.joinedAt ?? at : at }));
    }),
    savePriority: vi.fn(async (id: string, version: number, member: string | null, expiresAt: Date | null) => {
      await hooks.beforePrioritySave();
      const current = states.get(id);
      if (!current || current.room.status !== 'ACTIVE' || current.room.controlVersion !== version || current.room.ownerDiscordId !== null) return false;
      Object.assign(current.room, { priorityMemberDiscordId: member, priorityExpiresAt: expiresAt });
      return true;
    }),
    changeOwner: vi.fn(async (id: string, version: number, expected: string | null, next: string | null) => {
      await hooks.beforeOwnerChange();
      const current = states.get(id);
      if (!current || current.room.status === 'CLOSED' || current.room.controlVersion !== version || current.room.ownerDiscordId !== expected) return false;
      if (next !== null && (current.room.status !== 'ACTIVE' || !current.controlsEnabled)) return false;
      if (next !== null && [...states.values()].some(({ room: r }) => r.id !== id && r.guildDiscordId === current.room.guildDiscordId && r.ownerDiscordId === next && r.status !== 'CLOSED')) throw new RoomActionError('ALREADY_OWNS_ROOM');
      Object.assign(current.room, { ownerDiscordId: next, controlVersion: version + 1, priorityMemberDiscordId: null, priorityExpiresAt: null });
      current.transfer = null;
      return true;
    }),
    readTransfer: unused, listTracked: unused, listForCreator: unused,
    createTransfer: unused, armTransfer: unused, cancelTransfer: unused, discardTransfer: unused,
    invalidateTransfers: unused, cancelPreviousRunTransfers: unused, finishTransfer: unused,
    setAllowed: unused, updateSettings: unused, setPanelId: unused, invalidateControls: unused,
  } satisfies RoomStateRepository;
  const gateway = {
    snapshot: vi.fn(async (_id: string) => { await hooks.beforeSnapshot(); return structuredClone(live.snapshot); }),
    resolveMember: unused, rename: unused, setLimit: unused, readAccess: unused,
    setPrivateAccess: unused, setPublicAccess: unused, restoreAccess: unused,
    sendControlPanel: unused, updateControlPanel: unused, deleteControlPanel: unused,
  } satisfies RoomDiscordGateway;
  const mutex = new KeyedMutex();
  const locks: string[] = [];
  const run = mutex.runExclusive.bind(mutex);
  vi.spyOn(mutex, 'runExclusive').mockImplementation((key, work) => { locks.push(key); return run(key, work); });
  const coordinator = new RoomCoordinator(mutex);
  const timerErrors = vi.fn();
  const timers = new OwnershipTimers({ error: timerErrors });
  const refreshes: RoomState[] = [];
  const onChangedLocked = vi.fn(async (id: string) => { refreshes.push(structuredClone(states.get(id)!)); });
  const service = new OwnershipService({ store, coordinator, timers, onChangedLocked });
  const actor = (memberDiscordId = OTHER): RoomActor => ({ roomId: ROOM_ID, guildDiscordId: room.guildDiscordId, memberDiscordId, controlVersion: state().room.controlVersion });
  const observe = (reset = false) => coordinator.room(room.guildDiscordId, room.channelDiscordId, () => service.observeLocked(ROOM_ID, live.snapshot!, gateway, reset));
  const ownElsewhere = (member: string, status: RoomState['room']['status'] = 'ACTIVE', guild = room.guildDiscordId) => {
    const id = `other-${member}`;
    states.set(id, { ...structuredClone(state()), room: { ...room, id, channelDiscordId: id, guildDiscordId: guild, ownerDiscordId: member, status } });
  };
  return { states, state, live, store, gateway, coordinator, locks, timers, timerErrors, refreshes, hooks, service, actor, observe, ownElsewhere };
}
