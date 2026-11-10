import type { OverwriteData } from 'discord.js';
import { vi } from 'vitest';

import type { TemporaryRoom, VoiceCreator } from '../../../../src/generated/prisma/client.js';
import type { CallDiscordGateway } from '../../../../src/modules/calls/call.discord.js';
import type { CallPanelPayload } from '../../../../src/modules/calls/call-panel.view.js';
import type { CreateTemporaryRoomInput, TemporaryRoomRepository } from '../../../../src/modules/calls/call.repository.js';
import type { VoiceTransition } from '../../../../src/modules/calls/call.schemas.js';
import type { VoiceCreatorRepository } from '../../../../src/modules/setup/setup.repository.js';

export const creator: VoiceCreator = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  guildDiscordId: '12345678901234567', creatorChannelDiscordId: '22345678901234567',
  categoryDiscordId: '32345678901234567', roomCommandsEnabled: true, defaultUserLimit: 0,
  deletedAt: null, createdAt: new Date(0), updatedAt: new Date(0),
};
export const room: TemporaryRoom = {
  id: '223e4567-e89b-42d3-a456-426614174000', guildDiscordId: creator.guildDiscordId,
  voiceCreatorId: creator.id, channelDiscordId: '42345678901234567',
  ownerDiscordId: '52345678901234567', controlMessageDiscordId: '62345678901234567',
  name: 'Game', userLimit: 0, visibility: 'PUBLIC', status: 'ACTIVE',
  createdAt: new Date(0), updatedAt: new Date(0), closedAt: null,
  controlVersion: 0, priorityMemberDiscordId: null, priorityExpiresAt: null,
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
  const configuration = { ...creator };
  const records = new Map<string, TemporaryRoom>();
  const counts = new Map<string, number>();
  let memberChannel: string | null = creator.creatorChannelDiscordId;
  const creators = {
    listByGuild: vi.fn(), findById: vi.fn(), create: vi.fn(), updateCategory: vi.fn(),
    setRoomCommandsEnabled: vi.fn(), delete: vi.fn(),
    findStoredByChannel: vi.fn(), setDefaultUserLimit: vi.fn(),
    findByChannel: vi.fn(async (id: string) => id === creator.creatorChannelDiscordId ? configuration : null),
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
    createCreating: vi.fn(async (input: CreateTemporaryRoomInput) => {
      const created = { ...room, ...input, userLimit: input.userLimit, status: 'CREATING' as const, controlMessageDiscordId: null };
      records.set(created.id, created);
      return created;
    }),
    markActive: vi.fn(async (id: string, message: string | null) => change(id, { status: 'ACTIVE', controlMessageDiscordId: message })),
    clearOwner: vi.fn(async (id: string, expected: string) => {
      const current = records.get(id)!;
      return current.ownerDiscordId === expected && current.status !== 'CLOSED'
        ? change(id, { ownerDiscordId: null, controlVersion: current.controlVersion + 1, priorityMemberDiscordId: null, priorityExpiresAt: null }) : current;
    }),
    beginClosing: vi.fn(async (id: string) => {
      const current = records.get(id)!;
      return current.status === 'CREATING' || current.status === 'ACTIVE'
        ? change(id, { status: 'CLOSING', controlVersion: current.controlVersion + 1, priorityMemberDiscordId: null, priorityExpiresAt: null }) : current;
    }),
    markClosed: vi.fn(async (id: string) => {
      const current = records.get(id)!;
      return current.status === 'CLOSING'
        ? change(id, { status: 'CLOSED', closedAt: new Date(), controlVersion: current.controlVersion + 1, priorityMemberDiscordId: null, priorityExpiresAt: null }) : current;
    }),
  } satisfies TemporaryRoomRepository;
  const gateway = {
    snapshot: vi.fn(async (id: string) => {
      const current = [...records.values()].find((r) => r.channelDiscordId === id) ?? room;
      const members = Array.from({ length: counts.get(id) ?? 0 }, (_, index) => ({ memberDiscordId: index === 0 && memberChannel === id ? entry.memberDiscordId : String(70000000000000000n + BigInt(index)), isBot: false }));
      return { guildDiscordId: current.guildDiscordId, channelDiscordId: id, name: current.name, userLimit: current.userLimit, members };
    }),
    resolveMember: vi.fn(async (id: string) => ({ memberDiscordId: id, isBot: false })),
    rename: vi.fn(async (_id: string, _name: string) => {}),
    restoreName: vi.fn(async (_id: string, _previousName: string) => {}),
    setLimit: vi.fn(async (_id: string, _limit: number) => {}),
    readAccess: vi.fn(async (_id: string) => []),
    setPrivateAccess: vi.fn(async (_id: string, _allowed: string[]) => {}),
    setPublicAccess: vi.fn(async (_id: string) => {}),
    restoreAccess: vi.fn(async (_id: string, _previous: OverwriteData[]) => {}),
    deleteControlPanel: vi.fn(async (_id: string, _message: string) => {}),
    createTemporaryChannel: vi.fn(async () => ({ channelDiscordId: room.channelDiscordId })),
    getMemberChannelDiscordId: vi.fn(() => memberChannel),
    getChannelMemberCount: vi.fn((id: string) => counts.get(id) ?? 0),
    moveMember: vi.fn(async (id: string) => { memberChannel = id; counts.set(id, (counts.get(id) ?? 0) + 1); }),
    sendControlPanel: vi.fn(async (_id: string, _payload: CallPanelPayload) => room.controlMessageDiscordId!),
    updateControlPanel: vi.fn(async (_id: string, _message: string, _payload: CallPanelPayload) => {}),
    deleteChannel: vi.fn(async (id: string) => { counts.delete(id); }),
  } satisfies CallDiscordGateway;
  return { records, counts, creators, rooms, gateway, configuration,
    setControlsEnabled: (enabled: boolean) => { configuration.roomCommandsEnabled = enabled; },
    setMemberChannel: (id: string | null) => { memberChannel = id; } };
}
