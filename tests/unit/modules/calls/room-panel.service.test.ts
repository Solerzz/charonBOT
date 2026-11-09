import { PermissionsBitField, type Guild } from 'discord.js';
import { describe, expect, it, vi } from 'vitest';

import { createLogger } from '../../../../src/core/logger/logger.js';
import { RoomPanelService } from '../../../../src/modules/calls/room-panel.service.js';
import { DiscordRoomGateway } from '../../../../src/modules/calls/room.discord.js';
import type { CallPanelPayload } from '../../../../src/modules/calls/call-panel.view.js';
import { ownershipFixture, ROOM_ID } from '../ownership/ownership.fixtures.js';
import { discordFixture } from './call.discord.fixtures.js';

function fixture() {
  const f = ownershipFixture();
  const d = discordFixture();
  d.states.clear(); d.states.set(d.member.id, { channelId: f.state().room.channelDiscordId });
  const messages = new Map<string, CallPanelPayload>();
  const initialId = f.state().room.controlMessageDiscordId!;
  messages.set(initialId, { embeds: [], components: [] });
  let sequence = 70000000000000000n;
  const hooks = { beforeSend: async () => {}, beforeDelete: async () => {}, beforePersist: async () => {} };
  d.channel.send.mockImplementation(async (...args: unknown[]) => {
    await hooks.beforeSend();
    const id = String(sequence++);
    messages.set(id, args[0] as CallPanelPayload);
    return { ...d.message, id };
  });
  d.channel.messages.fetch.mockImplementation(async (...args: unknown[]) => {
    const id = args[0] as string;
    if (!messages.has(id)) throw { code: 10008 };
    d.message.edit.mockImplementation(async (...values: unknown[]) => { messages.set(id, values[0] as CallPanelPayload); });
    d.message.delete.mockImplementation(async () => { await hooks.beforeDelete(); messages.delete(id); });
    return { ...d.message, id };
  });
  const store = {
    ...f.store,
    listForCreator: async (id: string) => [...f.states.values()].filter((s) => s.room.voiceCreatorId === id && s.room.status !== 'CLOSED').map((s) => structuredClone(s.room)),
    setPanelId: async (id: string, version: number, expected: string | null, next: string | null) => {
      await hooks.beforePersist();
      const s = f.states.get(id);
      if (!s || s.room.status === 'CLOSED' || s.room.controlVersion !== version || s.room.controlMessageDiscordId !== expected
        || (next !== null && (s.room.status !== 'ACTIVE' || !s.controlsEnabled))) return false;
      s.room.controlMessageDiscordId = next;
      return true;
    },
  };
  const logs: string[] = [];
  const logger = createLogger({ level: 'warn', destination: { write: (line: string) => { logs.push(line); } } });
  const service = new RoomPanelService({ store, coordinator: f.coordinator, logger });
  const gateway = new DiscordRoomGateway(d.guild as unknown as Guild);
  const sync = () => f.coordinator.room(f.state().room.guildDiscordId, f.state().room.channelDiscordId, () => service.synchronizeLocked(ROOM_ID, gateway));
  const bulk = () => service.synchronizeCreator(f.state().room.voiceCreatorId, async () => d.guild as unknown as Guild);
  return { ...f, d, store, messages, initialId, hooks, logs, service, gateway, sync, bulk };
}

describe('RoomPanelService', () => {
  it('leaves a newly active off room without any message or settings changes', async () => {
    const f = fixture(); f.messages.clear(); f.state().room.controlMessageDiscordId = null;
    f.state().controlsEnabled = false; f.state().room.visibility = 'PRIVATE';
    f.hooks.beforeSend = async () => { throw new Error('Off rooms must not send'); };
    const before = structuredClone(f.state());
    await f.sync(); expect(f.messages.size).toBe(0); expect(f.state()).toEqual(before);
  });
  it('removes the whole panel when off and never creates one for an off room without a panel', async () => {
    const f = fixture(); f.state().controlsEnabled = false;
    await f.sync(); await f.sync();
    expect(f.messages.size).toBe(0);
    expect(f.state().room.controlMessageDiscordId).toBeNull();
    expect(f.state().room.visibility).toBe('PUBLIC');
  });

  it('restores one current private-room panel and reuses its ID on retry without changing access or tracking', async () => {
    const f = fixture(); f.state().controlsEnabled = false; await f.sync();
    Object.assign(f.state().room, { visibility: 'PRIVATE', userLimit: 4, name: 'Renamed', controlVersion: 8, priorityMemberDiscordId: f.d.member.id, priorityExpiresAt: new Date(300000) });
    f.state().allowedMemberIds = ['allowed'];
    f.state().controlsEnabled = true;
    const before = structuredClone(f.state());
    await f.sync(); const id = f.state().room.controlMessageDiscordId!; await f.sync();
    expect(f.messages.size).toBe(1); expect(f.state().room.controlMessageDiscordId).toBe(id);
    const panel = JSON.parse(JSON.stringify(f.messages.get(id)));
    expect(panel.embeds[0].fields).toEqual(expect.arrayContaining([
      { name: 'Participantes', value: '1 / 4' }, { name: 'Visibilidade', value: 'Privada' },
      { name: 'Sala disponível', value: 'Qualquer participante elegível presente pode assumir a sala.' },
    ]));
    expect(panel.components[0].components[0].custom_id).toContain(':8');
    expect(f.state()).toEqual({ ...before, room: { ...before.room, controlMessageDiscordId: id } });
    expect(f.d.channel.permissionOverwrites.set).not.toHaveBeenCalled();
  });

  it('replaces a genuinely missing message exactly once', async () => {
    const f = fixture(); f.messages.clear(); await f.sync(); await f.sync();
    expect(f.messages.size).toBe(1); expect(f.state().room.controlMessageDiscordId).not.toBe(f.initialId);
  });

  it.each(['permissions', 'network'] as const)('never recreates a tracked panel after %s uncertainty', async (cause) => {
    const f = fixture();
    if (cause === 'permissions') f.d.channel.permissionsFor.mockReturnValue(new PermissionsBitField());
    else f.d.channel.messages.fetch.mockRejectedValueOnce(new Error('private-response-secret'));
    expect(await f.bulk()).toEqual({ synced: 0, failed: 1 });
    expect([...f.messages.keys()]).toEqual([f.initialId]);
    expect(f.logs.join('')).not.toContain('private-response-secret');
  });

  it('clears an already missing message when off, but retains the ID on a failed deletion', async () => {
    const f = fixture(); f.state().controlsEnabled = false;
    f.hooks.beforeDelete = async () => { throw new Error('private-response-secret'); };
    expect(await f.bulk()).toEqual({ synced: 0, failed: 1 });
    expect(f.state().room.controlMessageDiscordId).toBe(f.initialId); expect(f.messages.size).toBe(1);
    f.messages.clear(); await f.sync(); expect(f.state().room.controlMessageDiscordId).toBeNull();
  });

  it('retains the two-attempt initial send bound', async () => {
    const f = fixture(); f.messages.clear(); f.state().room.controlMessageDiscordId = null;
    let attempts = 0;
    f.hooks.beforeSend = async () => { if (++attempts === 1) throw new Error('transient'); };
    await f.sync(); expect(attempts).toBe(2); expect(f.messages.size).toBe(1);
    f.messages.clear(); f.state().room.controlMessageDiscordId = null; attempts = 0;
    f.hooks.beforeSend = async () => { attempts++; throw new Error('persistent'); };
    expect(await f.bulk()).toEqual({ synced: 0, failed: 1 }); expect(attempts).toBe(2); expect(f.messages.size).toBe(0);
  });

  it.each(['cas', 'database', 'cleanup'] as const)('compensates only a newly sent duplicate after %s failure and reports partial', async (failure) => {
    const f = fixture(); f.messages.clear(); f.state().room.controlMessageDiscordId = null;
    const winner = '80000000000000000';
    f.hooks.beforePersist = async () => {
      f.state().room.controlVersion++;
      f.state().room.controlMessageDiscordId = winner;
      f.messages.set(winner, { embeds: [], components: [] });
      if (failure === 'database') throw new Error('private-response-secret');
    };
    if (failure === 'cleanup') f.hooks.beforeDelete = async () => { throw new Error('private-response-secret'); };
    expect(await f.bulk()).toEqual({ synced: 0, failed: 1 });
    expect(f.messages.has(winner)).toBe(true); expect(f.state().room.controlMessageDiscordId).toBe(winner);
    expect(f.messages.size).toBe(failure === 'cleanup' ? 2 : 1);
    expect(f.logs.join('')).toContain(ROOM_ID);
    expect(f.logs.join('')).not.toContain('private-response-secret');
    if (failure === 'cleanup') expect(f.logs.join('')).toContain('70000000000000000');
  });

  it('reports persistence failure after deletion instead of counting success', async () => {
    const f = fixture(); f.state().controlsEnabled = false;
    f.hooks.beforePersist = async () => { throw new Error('private-response-secret'); };
    expect(await f.bulk()).toEqual({ synced: 0, failed: 1 });
    expect(f.messages.size).toBe(0); expect(f.state().room.controlMessageDiscordId).toBe(f.initialId);
    f.hooks.beforePersist = async () => {}; await f.sync(); expect(f.state().room.controlMessageDiscordId).toBeNull();
  });

  it('does not delete a tracked installation when its database acknowledgement is lost', async () => {
    const f = fixture(); f.messages.clear(); f.state().room.controlMessageDiscordId = null;
    f.hooks.beforePersist = async () => {
      f.state().room.controlMessageDiscordId = '70000000000000000';
      throw new Error('private-response-secret');
    };
    expect(await f.bulk()).toEqual({ synced: 0, failed: 1 });
    expect([...f.messages.keys()]).toEqual(['70000000000000000']);
    expect(f.state().room.controlMessageDiscordId).toBe('70000000000000000');
  });

  it('does not report stale tracked-message edits as current synchronization', async () => {
    const f = fixture();
    f.d.channel.messages.fetch.mockImplementation(async () => {
      f.state().controlsEnabled = false; f.state().room.controlVersion++;
      return f.d.message;
    });
    expect(await f.bulk()).toEqual({ synced: 0, failed: 1 });
    expect(f.state().controlsEnabled).toBe(false);
  });

  it('reports unknown bulk counts safely if room enumeration fails', async () => {
    const f = fixture();
    vi.spyOn(f.store, 'listForCreator').mockRejectedValue(new Error('private-response-secret'));
    await expect(f.bulk()).rejects.toMatchObject({ code: 'PERSISTENCE_FAILURE' });
    expect(f.logs.join('')).toContain(f.state().room.voiceCreatorId);
    expect(f.logs.join('')).not.toContain('private-response-secret');
  });

  it.each(['null', 'throw', 'foreign'] as const)('does not infer room deletion from a %s guild resolver', async (cause) => {
    const f = fixture();
    const result = await f.service.synchronizeCreator(f.state().room.voiceCreatorId, async () => {
      if (cause === 'throw') throw new Error('private-response-secret');
      return cause === 'null' ? null : { ...f.d.guild, id: '90000000000000000' } as unknown as Guild;
    });
    expect(result).toEqual({ synced: 0, failed: 1 }); expect(f.state().room.status).toBe('ACTIVE'); expect(f.messages.size).toBe(1);
  });

  it('continues room-by-room with one room lock and no member locks after an individual failure', async () => {
    const f = fixture(); const secondId = '323e4567-e89b-42d3-a456-426614174000';
    f.states.set(secondId, { ...structuredClone(f.state()), room: { ...f.state().room, id: secondId, channelDiscordId: '82345678901234567' } });
    f.d.guild.channels.fetch.mockImplementation(async (id: string) => {
      if (id === f.state().room.channelDiscordId) throw { code: 50013 };
      return { ...f.d.channel, id };
    });
    let held = 0; let max = 0;
    const original = f.coordinator.room.bind(f.coordinator);
    vi.spyOn(f.coordinator, 'room').mockImplementation((guild, channel, work) => original(guild, channel, async () => {
      held++; max = Math.max(max, held); try { return await work(); } finally { held--; }
    }));
    expect(await f.bulk()).toEqual({ synced: 1, failed: 1 }); expect(max).toBe(1);
    expect(f.locks.every((key) => key.startsWith('room:'))).toBe(true);
  });
});
