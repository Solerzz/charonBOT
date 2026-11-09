import { OverwriteType, PermissionFlagsBits as P, PermissionsBitField } from 'discord.js';
import { describe, expect, it, vi } from 'vitest';

import { OWNER, OTHER } from '../ownership/ownership.fixtures.js';
import { roomSettingsFixture } from './room-settings.fixtures.js';

const GUEST = '72345678901234567';
const accessBits = P.ViewChannel | P.Connect | P.SendMessages;
const granted = (f: ReturnType<typeof roomSettingsFixture>) => f.projected().filter((p) => p.type === OverwriteType.Member && p.allow.has(accessBits, false)).map(({ id }) => id).sort();

describe('RoomAccessService', () => {
  it('projects owner, current participants, room allowlist and bot; callback reads committed privacy', async () => {
    const f = roomSettingsFixture(); f.join(OTHER); f.state().allowedMemberIds = [GUEST];
    await f.controls.setVisibility(f.actor(), 'PRIVATE', f.gateway);
    expect(f.state().room.visibility).toBe('PRIVATE');
    expect(granted(f)).toEqual([OTHER, OWNER, GUEST, f.bot.id].sort());
    const everyone = f.projected().find(({ id }) => id === f.guild.id)!;
    expect(everyone.allow.bitfield & accessBits).toBe(0n); expect(everyone.deny.bitfield & accessBits).toBe(accessBits);
    expect(f.refreshes).toHaveLength(1); expect(f.refreshes[0]?.room.visibility).toBe('PRIVATE');
  });

  it('revokes a non-allowlisted departure with controls disabled, retaining unrelated bits and bot access', async () => {
    const f = roomSettingsFixture(); f.join(OTHER); await f.controls.setVisibility(f.actor(), 'PRIVATE', f.gateway);
    f.channel.permissionOverwrites.cache.get(OTHER)!.allow.add(P.Speak);
    f.channel.permissionOverwrites.cache.get(OTHER)!.deny.add(P.Stream);
    f.state().controlsEnabled = false; f.leave(OTHER); await f.synchronize();
    expect(granted(f)).toEqual([OWNER, f.bot.id].sort());
    expect(f.projected().find(({ id }) => id === OTHER)).toMatchObject({ allow: new PermissionsBitField(P.Speak), deny: new PermissionsBitField(P.Stream) });
    expect(f.state().room.visibility).toBe('PRIVATE'); expect(f.onChangedLocked).toHaveBeenCalledTimes(1);
  });

  it('keeps allowlisted reentry possible; removing a present guest is not an expulsion', async () => {
    const f = roomSettingsFixture(); await f.controls.setAllowed(f.actor(), OTHER, true, f.gateway);
    await f.controls.setVisibility(f.actor(), 'PRIVATE', f.gateway);
    expect(granted(f)).toContain(OTHER);
    f.join(OTHER); await f.synchronize(); f.leave(OTHER); await f.synchronize(); expect(granted(f)).toContain(OTHER);
    f.join(OTHER); await f.controls.setAllowed(f.actor(), OTHER, false, f.gateway);
    expect(f.state().allowedMemberIds).toEqual([]); expect(granted(f)).toContain(OTHER);
    expect(f.member.voice.setChannel).not.toHaveBeenCalled();
    f.leave(OTHER); await f.synchronize(); expect(granted(f)).not.toContain(OTHER);
  });

  it('retains the room list across public/private toggles and owner changes, but another room starts empty', async () => {
    const f = roomSettingsFixture(); await f.controls.setAllowed(f.actor(), GUEST, true, f.gateway);
    await f.controls.setVisibility(f.actor(), 'PRIVATE', f.gateway);
    await f.controls.setVisibility(f.actor(), 'PUBLIC', f.gateway);
    expect(f.state().allowedMemberIds).toEqual([GUEST]);
    expect(f.projected().find(({ id }) => id === f.guild.id)!.allow.has(accessBits, false)).toBe(true);
    await f.store.changeOwner(f.state().room.id, 0, OWNER, OTHER); f.join(OTHER); f.leave(OWNER);
    await f.controls.setVisibility(f.actorFor(OTHER), 'PRIVATE', f.gateway);
    expect(f.state().allowedMemberIds).toEqual([GUEST]); expect(granted(f)).toEqual([OTHER, GUEST, f.bot.id].sort());
    const another = roomSettingsFixture(); await another.controls.setVisibility(another.actor(), 'PRIVATE', another.gateway);
    expect(another.state().allowedMemberIds).toEqual([]); expect(granted(another)).not.toContain(GUEST);
  });

  it('resolves targets within the guild and permits bots on the access list', async () => {
    const f = roomSettingsFixture(); f.guild.members.fetch.mockImplementation(async (options) => {
      const id = (options as { user: string }).user;
      return { ...f.member, id, user: { bot: id === GUEST } };
    });
    await f.controls.setAllowed(f.actor(), GUEST, true, f.gateway);
    expect(f.state().allowedMemberIds).toEqual([GUEST]); expect(f.refreshes).toHaveLength(1);
    const other = roomSettingsFixture(); other.guild.members.fetch.mockImplementation(async (options) => {
      const id = (options as { user: string }).user;
      return { ...other.member, id, guild: { id: id === GUEST ? '82345678901234567' : other.guild.id } };
    });
    await expect(other.controls.setAllowed(other.actor(), GUEST, true, other.gateway)).rejects.toMatchObject({ code: 'UNKNOWN_MEMBER' });
    expect(other.state().allowedMemberIds).toEqual([]); expect(other.projected()).toEqual([]);
  });

  it.each(['unknown', 'mismatched'] as const)('rejects %s selected members without changing the list', async (kind) => {
    const f = roomSettingsFixture(); const resolve = f.gateway.resolveMember.bind(f.gateway);
    vi.spyOn(f.gateway, 'resolveMember').mockImplementation((id) => id === GUEST ? Promise.resolve(kind === 'unknown' ? null : { memberDiscordId: OTHER, isBot: false }) : resolve(id));
    await expect(f.controls.setAllowed(f.actor(), GUEST, true, f.gateway)).rejects.toMatchObject({ code: 'UNKNOWN_MEMBER' });
    expect(f.state().allowedMemberIds).toEqual([]); expect(f.refreshes).toEqual([]);
  });

  it.each(['roles', 'external', 'capacity'] as const)('does not commit private success on %s failure', async (cause) => {
    const f = roomSettingsFixture();
    if (cause === 'roles') f.channel.permissionsFor.mockReturnValue(new PermissionsBitField([P.ViewChannel, P.ManageChannels]));
    if (cause === 'external') f.channel.permissionOverwrites.cache.set(GUEST, { id: GUEST, type: OverwriteType.Role, allow: new PermissionsBitField(P.Connect), deny: new PermissionsBitField() });
    if (cause === 'capacity') f.state().allowedMemberIds = Array.from({ length: 99 }, (_, i) => String(70000000000000000n + BigInt(i)));
    await expect(f.controls.setVisibility(f.actor(), 'PRIVATE', f.gateway)).rejects.toMatchObject({ code: 'PERMISSIONS_UNAVAILABLE' });
    expect(f.state().room.visibility).toBe('PUBLIC'); expect(f.refreshes).toEqual([]);
    expect(f.channel.permissionOverwrites.set).not.toHaveBeenCalled();
  });

  it('acknowledges Administrator bypass while preserving unrelated bits and bot operational permissions', async () => {
    const f = roomSettingsFixture();
    f.channel.permissionOverwrites.cache.set(GUEST, { id: GUEST, type: OverwriteType.Role, allow: new PermissionsBitField(P.Connect | P.Speak), deny: new PermissionsBitField(P.Stream) });
    f.guild.roles.fetch.mockResolvedValue({ permissions: new PermissionsBitField(P.Administrator) });
    await f.controls.setVisibility(f.actor(), 'PRIVATE', f.gateway);
    expect(f.state().room.visibility).toBe('PRIVATE');
    expect(f.projected().find(({ id }) => id === GUEST)).toMatchObject({ allow: new PermissionsBitField(P.Connect | P.Speak), deny: new PermissionsBitField(P.Stream) });
    expect(f.projected().find(({ id }) => id === f.bot.id)!.allow.has([P.ManageRoles, P.ManageChannels, P.ReadMessageHistory, P.Connect])).toBe(true);
  });

  it.each(['visibility', 'allow'] as const)('restores captured overwrites after %s persistence failure without public fallback', async (action) => {
    const f = roomSettingsFixture(); await f.controls.setVisibility(f.actor(), 'PRIVATE', f.gateway);
    const previous = await f.gateway.readAccess(f.channel.id); f.onChangedLocked.mockClear();
    f.store.updateSettings.mockRejectedValueOnce(new Error('private SQL'));
    f.store.setAllowed.mockRejectedValueOnce(new Error('private SQL'));
    const change = action === 'visibility' ? f.controls.setVisibility(f.actor(), 'PUBLIC', f.gateway) : f.controls.setAllowed(f.actor(), GUEST, true, f.gateway);
    await expect(change).rejects.toMatchObject({ code: 'PERSISTENCE_FAILURE' });
    expect(await f.gateway.readAccess(f.channel.id)).toEqual(previous);
    expect(f.state().room.visibility).toBe('PRIVATE'); expect(f.state().allowedMemberIds).toEqual([]);
    expect(f.onChangedLocked).not.toHaveBeenCalled();
  });

  it('does not commit a private list change if Discord fails', async () => {
    const f = roomSettingsFixture(); await f.controls.setVisibility(f.actor(), 'PRIVATE', f.gateway);
    const previous = await f.gateway.readAccess(f.channel.id); f.channel.permissionOverwrites.set.mockRejectedValueOnce(new Error('REST'));
    await expect(f.controls.setAllowed(f.actor(), GUEST, true, f.gateway)).rejects.toMatchObject({ code: 'DISCORD_FAILURE' });
    expect(f.state().allowedMemberIds).toEqual([]); expect(await f.gateway.readAccess(f.channel.id)).toEqual(previous);
  });

  it('does not authorize a caller who leaves during member resolution or overwrite capture', async () => {
    for (const during of ['resolve', 'capture'] as const) {
      const f = roomSettingsFixture();
      if (during === 'resolve') {
        const resolve = f.gateway.resolveMember.bind(f.gateway);
        vi.spyOn(f.gateway, 'resolveMember').mockImplementation(async (id) => {
          if (id !== GUEST) return resolve(id);
          f.leave(OWNER); return { memberDiscordId: GUEST, isBot: false };
        });
      }
      else { const read = f.gateway.readAccess.bind(f.gateway); vi.spyOn(f.gateway, 'readAccess').mockImplementationOnce(async (id) => { const result = await read(id); f.leave(OWNER); return result; }); }
      const change = during === 'resolve' ? f.controls.setAllowed(f.actor(), GUEST, true, f.gateway) : f.controls.setVisibility(f.actor(), 'PRIVATE', f.gateway);
      await expect(change).rejects.toMatchObject({ code: 'NOT_PRESENT' });
      expect(f.state().room.visibility).toBe('PUBLIC'); expect(f.state().allowedMemberIds).toEqual([]); expect(f.projected()).toEqual([]);
    }
  });

  it('uses the live roster after capture, not stale persisted presences', async () => {
    const f = roomSettingsFixture(); f.join(OTHER);
    const read = f.gateway.readAccess.bind(f.gateway);
    vi.spyOn(f.gateway, 'readAccess').mockImplementationOnce(async (id) => { const result = await read(id); f.leave(OTHER); f.join(GUEST); return result; });
    await f.controls.setVisibility(f.actor(), 'PRIVATE', f.gateway);
    expect(granted(f)).toEqual([OWNER, GUEST, f.bot.id].sort());
  });

  it.each(['departure', 'arrival'] as const)('reconciles a participant %s during the awaited private write before committing', async (change) => {
    const f = roomSettingsFixture(); f.join(OTHER);
    const write = f.channel.permissionOverwrites.set.getMockImplementation()!;
    f.channel.permissionOverwrites.set.mockImplementationOnce(async (input) => {
      await write(input);
      if (change === 'departure') f.leave(OTHER); else f.join(GUEST);
    });
    await f.controls.setVisibility(f.actor(), 'PRIVATE', f.gateway);
    expect(granted(f)).toEqual((change === 'departure' ? [OWNER, f.bot.id] : [OWNER, OTHER, GUEST, f.bot.id]).sort());
    expect(f.state().room.visibility).toBe('PRIVATE'); expect(f.refreshes).toHaveLength(1);
  });

  it('fails and restores captured access under sustained private-projection roster churn', async () => {
    const f = roomSettingsFixture();
    const write = f.channel.permissionOverwrites.set.getMockImplementation()!;
    f.channel.permissionOverwrites.set.mockImplementation(async (input) => {
      await write(input);
      if (f.states.has(OTHER)) f.leave(OTHER); else f.join(OTHER);
    });
    await expect(f.controls.setVisibility(f.actor(), 'PRIVATE', f.gateway)).rejects.toMatchObject({ code: 'ROOM_UNAVAILABLE' });
    expect(f.state().room.visibility).toBe('PUBLIC'); expect(f.refreshes).toEqual([]);
    expect(granted(f)).toEqual([f.bot.id]);
    expect(f.channel.permissionOverwrites.set.mock.calls.length).toBeLessThanOrEqual(4);
  });

  it('background projection refreshes a stale supplied state/roster and does not act on foreign snapshots', async () => {
    const f = roomSettingsFixture(); await f.controls.setVisibility(f.actor(), 'PRIVATE', f.gateway);
    const staleState = structuredClone(f.state()); const staleSnapshot = (await f.gateway.snapshot(f.channel.id))!;
    f.state().allowedMemberIds = [GUEST]; f.join(OTHER); f.state().controlsEnabled = false;
    await f.access.synchronizeLocked(staleState, staleSnapshot, f.gateway);
    expect(granted(f)).toEqual([OWNER, OTHER, GUEST, f.bot.id].sort());
    await expect(f.access.synchronizeLocked(f.state(), { ...staleSnapshot, guildDiscordId: 'foreign' }, f.gateway)).rejects.toMatchObject({ code: 'ROOM_UNAVAILABLE' });
  });

  it('background private synchronization corrects a departure during REST even with controls off', async () => {
    const f = roomSettingsFixture(); f.join(OTHER); await f.controls.setVisibility(f.actor(), 'PRIVATE', f.gateway);
    f.state().controlsEnabled = false;
    const write = f.channel.permissionOverwrites.set.getMockImplementation()!;
    f.channel.permissionOverwrites.set.mockImplementationOnce(async (input) => { await write(input); f.leave(OTHER); });
    await f.synchronize();
    expect(granted(f)).toEqual([OWNER, f.bot.id].sort()); expect(f.state().room.visibility).toBe('PRIVATE');
  });

  it('compensates a version CAS loss and never substitutes a public projection when restoration fails', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const f = roomSettingsFixture(); await f.controls.setVisibility(f.actor(), 'PRIVATE', f.gateway);
      f.store.setAllowed.mockResolvedValueOnce(false);
      vi.spyOn(f.gateway, 'restoreAccess').mockRejectedValueOnce(new Error('secret restoration'));
      const publicWrite = vi.spyOn(f.gateway, 'setPublicAccess');
      await expect(f.controls.setAllowed(f.actor(), GUEST, true, f.gateway)).rejects.toMatchObject({ code: 'PERSISTENCE_FAILURE', message: 'PERSISTENCE_FAILURE' });
      expect(f.state().allowedMemberIds).toEqual([]); expect(f.state().room.visibility).toBe('PRIVATE'); expect(publicWrite).not.toHaveBeenCalled();
      expect(logged).toHaveBeenCalledExactlyOnceWith('Room mutation compensation failed', { roomId: f.state().room.id, guildDiscordId: f.guild.id, channelDiscordId: f.channel.id });
    } finally { logged.mockRestore(); }
  });
});
