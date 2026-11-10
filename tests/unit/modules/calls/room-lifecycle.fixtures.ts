import type { Logger } from 'pino';
import { vi } from 'vitest';
import { createPrismaClient } from '../../../../src/core/database/prisma.js';
import type { RoomPresence } from '../../../../src/modules/calls/room.types.js';
import { createRoomRuntime } from '../../../../src/modules/calls/room.runtime.js';
import type { lifecycleFixture } from './call.fixtures.js';

const cleanups: (() => Promise<void>)[] = [];
export async function stopRoomFixtures() { await Promise.all(cleanups.splice(0).map((close) => close())); }

export function attachRoomRuntime(f: ReturnType<typeof lifecycleFixture>, logger: Logger) {
  const database = createPrismaClient({ url: 'postgresql://test:test@127.0.0.1:1/test', directUrl: 'postgresql://test:test@127.0.0.1:1/test' });
  const runtime = createRoomRuntime(database, logger);
  const presence = new Map<string, RoomPresence[]>();
  vi.spyOn(runtime.store, 'read').mockImplementation(async (id) => {
    const record = f.records.get(id);
    return record ? { room: structuredClone(record), controlsEnabled: f.configuration.roomCommandsEnabled, presences: structuredClone(presence.get(id) ?? []), allowedMemberIds: [], transfer: null } : null;
  });
  vi.spyOn(runtime.store, 'syncPresence').mockImplementation(async (id, members, at, reset) => {
    presence.set(id, members.map((member) => ({ ...member, id: `${id}:${member.memberDiscordId}`, roomId: id,
      joinedAt: !reset ? presence.get(id)?.find((p) => p.memberDiscordId === member.memberDiscordId)?.joinedAt ?? at : at })));
  });
  vi.spyOn(runtime.store, 'findOwnedRoom').mockImplementation(f.rooms.findActiveByOwner);
  vi.spyOn(runtime.store, 'updateSettings').mockImplementation(async (id, version, patch) => {
    const record = f.records.get(id);
    if (!record || record.status !== 'ACTIVE' || record.controlVersion !== version || !f.configuration.roomCommandsEnabled) return false;
    Object.assign(record, patch); return true;
  });
  vi.spyOn(runtime.store, 'savePriority').mockImplementation(async (id, version, member, deadline) => {
    const record = f.records.get(id);
    if (!record || record.controlVersion !== version || record.ownerDiscordId !== null) return false;
    record.priorityMemberDiscordId = member; record.priorityExpiresAt = deadline; return true;
  });
  vi.spyOn(runtime.store, 'changeOwner').mockImplementation(async (id, version, expected, next) => {
    const record = f.records.get(id);
    if (!record || record.controlVersion !== version || record.ownerDiscordId !== expected || next !== null || expected === null) return false;
    await f.rooms.clearOwner(id, expected); return true;
  });
  vi.spyOn(runtime.store, 'setPanelId').mockImplementation(async (id, version, previous, next) => {
    const record = f.records.get(id);
    if (!record || record.controlVersion !== version || record.controlMessageDiscordId !== previous) return false;
    record.controlMessageDiscordId = next; return true;
  });
  cleanups.push(async () => { await runtime.stop(); await database.$disconnect(); });
  return runtime;
}
