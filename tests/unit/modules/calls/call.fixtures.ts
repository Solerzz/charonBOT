import { vi } from 'vitest';

import type { TemporaryRoom, VoiceCreator } from '../../../../src/generated/prisma/client.js';
import type { CallDiscordGateway } from '../../../../src/modules/calls/call.discord.js';
import type { CallPanelPayload } from '../../../../src/modules/calls/call-panel.view.js';
import type { TemporaryRoomRepository } from '../../../../src/modules/calls/call.repository.js';
import type { VoiceTransition } from '../../../../src/modules/calls/call.schemas.js';
import type { VoiceCreatorRepository } from '../../../../src/modules/setup/setup.repository.js';

export const creator: VoiceCreator = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  guildDiscordId: '12345678901234567', creatorChannelDiscordId: '22345678901234567',
  categoryDiscordId: '32345678901234567', roomCommandsEnabled: true,
  deletedAt: null, createdAt: new Date(0), updatedAt: new Date(0),
};
export const room: TemporaryRoom = {
  id: '223e4567-e89b-42d3-a456-426614174000', guildDiscordId: creator.guildDiscordId,
  voiceCreatorId: creator.id, channelDiscordId: '42345678901234567',
  ownerDiscordId: '52345678901234567', controlMessageDiscordId: '62345678901234567',
  name: 'Game', userLimit: 0, visibility: 'PUBLIC', status: 'ACTIVE',
  createdAt: new Date(0), updatedAt: new Date(0), closedAt: null,
};
export const entry: VoiceTransition = {
  guildDiscordId: creator.guildDiscordId, memberDiscordId: room.ownerDiscordId!,
  memberIsBot: false, oldChannelDiscordId: null,
  newChannelDiscordId: creator.creatorChannelDiscordId,
  activityName: 'Game', displayName: 'Member', oldChannelMemberCount: 0,
};
export function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
export function lifecycleFixture() {
  const records = new Map<string, TemporaryRoom>();
  const counts = new Map<string, number>();
  let memberChannel: string | null = creator.creatorChannelDiscordId;
  const creators = {
    listByGuild: vi.fn(), findById: vi.fn(), create: vi.fn(), updateCategory: vi.fn(),
    setRoomCommandsEnabled: vi.fn(), delete: vi.fn(),
    findByChannel: vi.fn(async (id: string) => id === creator.creatorChannelDiscordId ? creator : null),
  } satisfies VoiceCreatorRepository;
  const change = (id: string, data: Partial<TemporaryRoom>) => {
    const current = records.get(id);
    if (!current) throw new Error('missing room');
    const updated = { ...current, ...data };
    records.set(id, updated);
    return updated;
  };
  const rooms = {
    findActiveByChannel: vi.fn(async (id: string) => [...records.values()].find((r) => r.channelDiscordId === id && r.status !== 'CLOSED') ?? null),
    findActiveByOwner: vi.fn(async (guild: string, owner: string) => [...records.values()].find((r) => r.guildDiscordId === guild && r.ownerDiscordId === owner && r.status !== 'CLOSED') ?? null),
    createCreating: vi.fn(async (input) => {
      const created = { ...room, ...input, status: 'CREATING' as const, controlMessageDiscordId: null };
      records.set(created.id, created);
      return created;
    }),
    markActive: vi.fn(async (id: string, message: string | null) => change(id, { status: 'ACTIVE', controlMessageDiscordId: message })),
    clearOwner: vi.fn(async (id: string, expected: string) => {
      return records.get(id)?.ownerDiscordId === expected ? change(id, { ownerDiscordId: null }) : records.get(id)!;
    }),
    beginClosing: vi.fn(async (id: string) => change(id, { status: 'CLOSING' })),
    markClosed: vi.fn(async (id: string) => change(id, { status: 'CLOSED', closedAt: new Date() })),
  } satisfies TemporaryRoomRepository;
  const gateway = {
    createTemporaryChannel: vi.fn(async () => ({ channelDiscordId: room.channelDiscordId })),
    getMemberChannelDiscordId: vi.fn(() => memberChannel),
    getChannelMemberCount: vi.fn((id: string) => counts.get(id) ?? 0),
    moveMember: vi.fn(async (id: string) => { memberChannel = id; counts.set(id, (counts.get(id) ?? 0) + 1); }),
    sendControlPanel: vi.fn(async (_id: string, _payload: CallPanelPayload) => room.controlMessageDiscordId!),
    updateControlPanel: vi.fn(async (_id: string, _message: string, _payload: CallPanelPayload) => {}),
    deleteChannel: vi.fn(async (id: string) => { counts.delete(id); }),
  } satisfies CallDiscordGateway;
  return { records, counts, creators, rooms, gateway, setMemberChannel: (id: string | null) => { memberChannel = id; } };
}
