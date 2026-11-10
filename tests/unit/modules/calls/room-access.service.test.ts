import { OverwriteType, PermissionFlagsBits as P, PermissionsBitField } from 'discord.js';
import { describe, expect, it, vi } from 'vitest';

import { OWNER, OTHER } from '../ownership/ownership.fixtures.js';
import { roomSettingsFixture } from './room-settings.fixtures.js';
import { deferred } from './call.fixtures.js';

const GUEST = '72345678901234567';
const accessBits = P.ViewChannel | P.Connect | P.SendMessages;
const granted = (f: ReturnType<typeof roomSettingsFixture>) => f.projected().filter((p) => p.type === OverwriteType.Member && p.allow.has(accessBits, false)).map(({ id }) => id).sort();

describe('RoomAccessService', () => {
  it('retires confirmed CLOSED and absent SQL rows across room churn without retaining quarantine IDs', async () => {
    const f = roomSettingsFixture(); const snapshot = (await f.gateway.snapshot(f.channel.id))!;
    for (let index = 0; index < 24; index++) {
      const state = structuredClone(f.state()); state.room.id = `retired-${index}`;
      state.room.status = 'CLOSED';
      if (index % 2 === 0) f.roomStates.set(state.room.id, state);
      f.access.markUncertain(state.room.id);
      await f.access.synchronizeLocked(state, snapshot, f.gateway);
      expect(f.access.isUncertain(state.room.id)).toBe(false);
    }
    expect(f.channel.permissionOverwrites.set).not.toHaveBeenCalled();
  });

  it.each(['ACTIVE', 'CREATING', 'CLOSING'] as const)('retains recoverable %s quarantine when projection is not confirmed', async status => {
    const f = roomSettingsFixture(); f.state().room.status = status;
    f.channel.permissionOverwrites.set.mockRejectedValueOnce(new Error('unavailable projection'));
    if (status === 'ACTIVE') await expect(f.synchronize()).rejects.toMatchObject({ code: 'DISCORD_FAILURE' });
    else await f.synchronize();
    expect(f.access.isUncertain(f.state().room.id)).toBe(true);
  });

  it('does not compensate an indeterminate writer until settlement fences its late completion', async () => {
    const f = roomSettingsFixture(); const update = f.store.updateSettings.getMockImplementation()!;
    const releaseWriter = deferred(); const barrierEntered = deferred(); const releaseBarrier = deferred();
    let writer: Promise<boolean> | undefined;
    f.store.updateSettings.mockImplementationOnce(async (...args) => {
      writer = releaseWriter.promise.then(() => update(...args));
      throw new Error('transport failed before writer completed');
    });
    // The persistence boundary certifies settlement; a plain read can still
    // return the old state and must never substitute for this barrier.
    Object.assign(f.store, { settleAccess: vi.fn(async () => {
      barrierEntered.resolve(); await releaseBarrier.promise;
      f.state().room.controlVersion++; return f.store.read(f.state().room.id);
    }) });
    const restore = vi.spyOn(f.gateway, 'restoreAccess');
    const changing = f.controls.toggleLock(f.actor(), f.gateway); const outcome = changing.catch((error: unknown) => error);
    const observed = await Promise.race([barrierEntered.promise.then(() => 'barrier'), outcome.then(() => 'finished')]);
    expect(observed).toBe('barrier');
    expect(await f.store.read(f.state().room.id)).toMatchObject({ room: { isLocked: false } });
    expect(f.access.isUncertain(f.state().room.id)).toBe(true); expect(restore).not.toHaveBeenCalled();
    releaseBarrier.resolve(); expect(await outcome).toMatchObject({ code: 'PERSISTENCE_FAILURE' });
    releaseWriter.resolve(); expect(await writer).toBe(false);
    expect(f.state().room.isLocked).toBe(false);
    expect(f.projected().find((p) => p.id === f.guild.id)!.allow.has(P.Connect, false)).toBe(true);
  });

  it('cannot clear uncertainty through ordinary reads after the settlement barrier fails', async () => {
    const f = roomSettingsFixture(); f.store.updateSettings.mockRejectedValueOnce(new Error('indeterminate writer'));
    Object.assign(f.store, { settleAccess: vi.fn(async () => { throw new Error('settlement unavailable'); }) });
    await expect(f.controls.toggleLock(f.actor(), f.gateway)).rejects.toMatchObject({ code: 'PERSISTENCE_FAILURE' });
    const writes = f.channel.permissionOverwrites.set.mock.calls.length;
    await expect(f.controls.rename(f.actor(), 'Blocked', f.gateway)).rejects.toMatchObject({ code: 'PERSISTENCE_FAILURE' });
    expect(f.channel.setName).not.toHaveBeenCalled(); expect(f.channel.permissionOverwrites.set.mock.calls).toHaveLength(writes);
    expect(f.access.isUncertain(f.state().room.id)).toBe(true);
  });

  it('does not admit rename when a guest departs during the final SQL reconciliation read', async () => {
    const f = roomSettingsFixture(); f.state().room.isLocked = true; f.join(OTHER); await f.synchronize();
    f.access.markUncertain(f.state().room.id);
    const entered = deferred(); const release = deferred();
    const write = f.channel.permissionOverwrites.set.getMockImplementation()!;
    const snapshot = f.gateway.snapshot.bind(f.gateway); const read = f.store.read.getMockImplementation()!;
    f.channel.permissionOverwrites.set.mockImplementationOnce(async (input) => {
      await write(input);
      vi.spyOn(f.gateway, 'snapshot').mockImplementationOnce(async (id) => {
        const live = await snapshot(id);
        f.store.read.mockImplementationOnce(async (roomId) => { const state = await read(roomId); entered.resolve(); await release.promise; return state; });
        return live;
      });
    });
    const changing = f.controls.rename(f.actor(), 'Next', f.gateway);
    const result = changing.catch((error: unknown) => error);
    await entered.promise; f.leave(OTHER); f.coordinator.recordDeparture(f.guild.id, f.channel.id, OTHER, false); release.resolve();
    expect(await result).toMatchObject({ code: 'STALE_CONTROLS' });
    expect(f.channel.setName).not.toHaveBeenCalled(); expect(f.access.isUncertain(f.state().room.id)).toBe(true);
    expect(f.coordinator.pendingDepartures(f.guild.id, f.channel.id)).toHaveLength(1);
    await f.controls.rename(f.actor(), 'Next', f.gateway);
    expect(granted(f)).not.toContain(OTHER); expect(f.access.isUncertain(f.state().room.id)).toBe(false);
  });

  it('keeps compensation uncertain when departure is recorded during its final SQL read', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const f = roomSettingsFixture(); f.state().room.isLocked = true; f.join(OTHER); await f.synchronize();
      const entered = deferred(); const release = deferred();
      const restore = f.gateway.restoreAccess.bind(f.gateway); const snapshot = f.gateway.snapshot.bind(f.gateway);
      const read = f.store.read.getMockImplementation()!;
      vi.spyOn(f.gateway, 'restoreAccess').mockImplementationOnce(async (id, previous) => {
        await restore(id, previous);
        vi.spyOn(f.gateway, 'snapshot').mockImplementationOnce(async (channelId) => {
          const live = await snapshot(channelId);
          f.store.read.mockImplementationOnce(async (roomId) => { const state = await read(roomId); entered.resolve(); await release.promise; return state; });
          return live;
        });
      });
      f.store.updateSettings.mockResolvedValueOnce(false);
      const changing = f.controls.toggleVisibility(f.actor(), f.gateway); const result = changing.catch((error: unknown) => error);
      await entered.promise; f.leave(OTHER); f.coordinator.recordDeparture(f.guild.id, f.channel.id, OTHER, false); release.resolve();
      expect(await result).toMatchObject({ code: 'PERSISTENCE_FAILURE' });
      expect(f.access.isUncertain(f.state().room.id)).toBe(true);
      await f.synchronize(); expect(granted(f)).not.toContain(OTHER);
      expect(logged).toHaveBeenCalledExactlyOnceWith('Room mutation compensation failed', { roomId: f.state().room.id, guildDiscordId: f.guild.id, channelDiscordId: f.channel.id });
    } finally { logged.mockRestore(); }
  });

  it.each([
    { isLocked: false, visibility: 'PUBLIC' }, { isLocked: true, visibility: 'PUBLIC' },
    { isLocked: false, visibility: 'PRIVATE' }, { isLocked: true, visibility: 'PRIVATE' },
  ] as const)('projects the full access matrix $visibility / locked=$isLocked', async ({ isLocked, visibility }) => {
    const f = roomSettingsFixture(); f.join(OTHER); f.state().allowedMemberIds = [GUEST];
    await f.access.applySettingsLocked(f.actor(), (await f.store.read(f.state().room.id))!, { isLocked, visibility }, f.gateway);
    const everyone = f.projected().find(({ id }) => id === f.guild.id)!;
    expect(everyone.allow.has(P.ViewChannel, false)).toBe(visibility === 'PUBLIC');
    expect(everyone.allow.has(P.Connect, false)).toBe(visibility === 'PUBLIC' && !isLocked);
    expect(everyone.allow.has(P.SendMessages, false)).toBe(visibility === 'PUBLIC');
    for (const id of [OWNER, OTHER, GUEST, f.bot.id]) {
      expect(f.projected().find((p) => p.id === id)!.allow.has([P.ViewChannel, P.Connect, P.SendMessages], false)).toBe(true);
    }
    expect(f.member.voice.setChannel).not.toHaveBeenCalled();
    expect(f.state().room).toMatchObject({ isLocked, visibility });
  });

  it.each([
    { isLocked: true, visibility: 'PUBLIC' }, { isLocked: false, visibility: 'PRIVATE' }, { isLocked: true, visibility: 'PRIVATE' },
  ] as const)('revokes departed presence but keeps present removed allowlist members in $visibility / $isLocked', async (policy) => {
    const f = roomSettingsFixture(); Object.assign(f.state().room, policy); f.join(OTHER); f.state().allowedMemberIds = [OTHER];
    await f.synchronize(); await f.controls.setAllowed(f.actor(), OTHER, false, f.gateway);
    expect(granted(f)).toContain(OTHER); expect(f.member.voice.setChannel).not.toHaveBeenCalled();
    f.state().controlsEnabled = false; f.leave(OTHER); await f.synchronize();
    expect(granted(f)).not.toContain(OTHER);
    // A denied reentry has no live voice state, so another resync must not regrant.
    await f.synchronize(); expect(granted(f)).not.toContain(OTHER);
    expect(f.state().room).toMatchObject(policy);
  });

  it('fences a lost SQL reply without acknowledging the superseded attempt or restoring stale access', async () => {
    const f = roomSettingsFixture(); const update = f.store.updateSettings.getMockImplementation()!;
    const restore = vi.spyOn(f.gateway, 'restoreAccess');
    f.store.updateSettings.mockImplementationOnce(async (...args) => { await update(...args); throw new Error('lost SQL reply'); });
    await expect(f.controls.toggleLock(f.actor(), f.gateway)).rejects.toMatchObject({ code: 'PERSISTENCE_FAILURE' });
    expect(f.state().room).toMatchObject({ isLocked: true, visibility: 'PUBLIC', controlVersion: 1 });
    expect(f.projected().find((p) => p.id === f.guild.id)!.deny.has(P.Connect, false)).toBe(true);
    expect(restore).not.toHaveBeenCalled(); expect(f.access.isUncertain(f.state().room.id)).toBe(false);
  });

  it.each([true, false])('confirms lost allowlist SQL acknowledgements for allowed=%s without undoing the committed list', async (allowed) => {
    const f = roomSettingsFixture(); f.state().room.isLocked = true; f.state().allowedMemberIds = allowed ? [] : [GUEST]; await f.synchronize();
    const commit = f.store.setAllowed.getMockImplementation()!; const restore = vi.spyOn(f.gateway, 'restoreAccess');
    f.store.setAllowed.mockImplementationOnce(async (...args) => { await commit(...args); throw new Error('lost SQL reply'); });
    await expect(f.controls.setAllowed(f.actor(), GUEST, allowed, f.gateway)).rejects.toMatchObject({ code: 'PERSISTENCE_FAILURE' });
    expect(f.state().allowedMemberIds).toEqual(allowed ? [GUEST] : []);
    expect(granted(f).includes(GUEST)).toBe(allowed); expect(restore).not.toHaveBeenCalled();
  });

  it('does not acknowledge or restore a successful SQL write superseded by a new owner', async () => {
    const f = roomSettingsFixture(); await f.controls.setVisibility(f.actor(), 'PRIVATE', f.gateway);
    const update = f.store.updateSettings.getMockImplementation()!; const restore = vi.spyOn(f.gateway, 'restoreAccess');
    const entered = deferred(); const release = deferred();
    f.store.updateSettings.mockImplementationOnce(async (...args) => { const result = await update(...args); entered.resolve(); await release.promise; return result; });
    const changing = f.controls.toggleLock(f.actor(), f.gateway); const rejected = expect(changing).rejects.toMatchObject({ code: 'PERSISTENCE_FAILURE' });
    await entered.promise; await f.store.changeOwner(f.state().room.id, 0, OWNER, OTHER); f.leave(OWNER); f.join(OTHER);
    release.resolve(); await rejected;
    expect(f.state().room.isLocked).toBe(true); expect(f.access.isUncertain(f.state().room.id)).toBe(true); expect(restore).not.toHaveBeenCalled();
    await f.synchronize(); expect(granted(f)).toEqual([OTHER, f.bot.id].sort());
  });

  it('rejects a lost SQL acknowledgement and reconciles current authority instead of restoring the old owner', async () => {
    const f = roomSettingsFixture(); await f.controls.setVisibility(f.actor(), 'PRIVATE', f.gateway);
    const update = f.store.updateSettings.getMockImplementation()!;
    f.store.updateSettings.mockImplementationOnce(async (...args) => {
      await update(...args);
      const write = f.channel.permissionOverwrites.set.getMockImplementation()!;
      f.channel.permissionOverwrites.set.mockImplementationOnce(async (input) => {
        await write(input); await f.store.changeOwner(f.state().room.id, f.state().room.controlVersion, OWNER, OTHER); f.leave(OWNER); f.join(OTHER);
      });
      throw new Error('lost SQL acknowledgement');
    });
    await expect(f.controls.toggleLock(f.actor(), f.gateway)).rejects.toMatchObject({ code: 'PERSISTENCE_FAILURE' });
    expect(f.access.isUncertain(f.state().room.id)).toBe(false); expect(f.refreshes).toHaveLength(2);
    expect(f.state().room.ownerDiscordId).toBe(OTHER); expect(granted(f)).not.toContain(OWNER);
    await f.synchronize(); expect(granted(f)).toEqual([OTHER, f.bot.id].sort());
  });

  it('detects an authority change during the final REST read after a successful commit', async () => {
    const f = roomSettingsFixture(); await f.controls.setVisibility(f.actor(), 'PRIVATE', f.gateway);
    const update = f.store.updateSettings.getMockImplementation()!; const snapshot = f.gateway.snapshot.bind(f.gateway);
    f.store.updateSettings.mockImplementationOnce(async (...args) => {
      const result = await update(...args);
      vi.spyOn(f.gateway, 'snapshot').mockImplementationOnce(async (id) => {
        const live = await snapshot(id); await f.store.changeOwner(f.state().room.id, 0, OWNER, OTHER); f.leave(OWNER); f.join(OTHER); return live;
      });
      return result;
    });
    await expect(f.controls.toggleLock(f.actor(), f.gateway)).rejects.toMatchObject({ code: 'PERSISTENCE_FAILURE' });
    expect(f.access.isUncertain(f.state().room.id)).toBe(true); expect(f.refreshes).toHaveLength(1);
  });

  it.each(['participant', 'previous-owner'] as const)('never restores a stale saved grant for a departed %s after a confirmed CAS failure', async (kind) => {
    const f = roomSettingsFixture(); f.join(OTHER); await f.controls.setVisibility(f.actor(), 'PRIVATE', f.gateway);
    let departed = OTHER;
    if (kind === 'previous-owner') {
      await f.store.changeOwner(f.state().room.id, 0, OWNER, OTHER); departed = OWNER;
    }
    f.channel.permissionOverwrites.cache.get(departed)!.allow.add(P.Speak);
    f.leave(departed); f.store.updateSettings.mockResolvedValueOnce(false);
    const actor = kind === 'previous-owner' ? f.actorFor(OTHER) : f.actor();
    await expect(f.controls.toggleLock(actor, f.gateway)).rejects.toMatchObject({ code: 'STALE_CONTROLS' });
    expect(granted(f)).not.toContain(departed);
    expect(f.projected().find((p) => p.id === departed)!.allow.bitfield).toBe(P.Speak);
    expect(f.access.isUncertain(f.state().room.id)).toBe(false);
  });

  it('retains uncertainty if a participant leaves during the compensating REST write', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const f = roomSettingsFixture(); f.join(OTHER); await f.controls.setVisibility(f.actor(), 'PRIVATE', f.gateway);
      const restore = f.gateway.restoreAccess.bind(f.gateway);
      vi.spyOn(f.gateway, 'restoreAccess').mockImplementationOnce(async (id, previous) => { await restore(id, previous); f.leave(OTHER); });
      f.store.updateSettings.mockResolvedValueOnce(false);
      await expect(f.controls.toggleLock(f.actor(), f.gateway)).rejects.toMatchObject({ code: 'PERSISTENCE_FAILURE' });
      expect(f.access.isUncertain(f.state().room.id)).toBe(true);
      await f.controls.toggleLock(f.actor(), f.gateway);
      expect(granted(f)).not.toContain(OTHER); expect(f.access.isUncertain(f.state().room.id)).toBe(false);
      expect(logged).toHaveBeenCalledExactlyOnceWith('Room mutation compensation failed', { roomId: f.state().room.id, guildDiscordId: f.guild.id, channelDiscordId: f.channel.id });
    } finally { logged.mockRestore(); }
  });

  it.each(['write', 'read-back'] as const)('never restores owner A grants after authority becomes B during %s', async (boundary) => {
    const f = roomSettingsFixture(); await f.controls.setVisibility(f.actor(), 'PRIVATE', f.gateway);
    const entered = deferred(); const release = deferred(); const restore = vi.spyOn(f.gateway, 'restoreAccess');
    if (boundary === 'write') {
      f.store.updateSettings.mockImplementationOnce(async () => { entered.resolve(); await release.promise; throw new Error('lost SQL reply'); });
    } else {
      f.store.updateSettings.mockImplementationOnce(async () => {
        f.store.read.mockImplementationOnce(async (id) => { entered.resolve(); await release.promise; return structuredClone(f.roomStates.get(id) ?? null); });
        throw new Error('lost SQL reply');
      });
    }
    const changing = f.controls.toggleLock(f.actor(), f.gateway);
    const rejected = expect(changing).rejects.toMatchObject({ code: 'PERSISTENCE_FAILURE' });
    await entered.promise; await f.store.changeOwner(f.state().room.id, f.state().room.controlVersion, OWNER, OTHER); f.leave(OWNER); f.join(OTHER);
    release.resolve(); await rejected;
    expect(restore).not.toHaveBeenCalled(); expect(f.access.isUncertain(f.state().room.id)).toBe(false);
    expect(f.state().room.ownerDiscordId).toBe(OTHER); expect(granted(f)).not.toContain(OWNER);
    await f.controls.toggleLock(f.actorFor(OTHER), f.gateway);
    expect(granted(f)).not.toContain(OWNER); expect(granted(f)).toContain(OTHER);
    expect(f.access.isUncertain(f.state().room.id)).toBe(false);
  });

  it.each(['read', 'restore'] as const)('blocks every new mutation until reconciliation confirms after uncertain %s', async (boundary) => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const f = roomSettingsFixture(); await f.controls.setVisibility(f.actor(), 'PRIVATE', f.gateway);
      if (boundary === 'read') f.store.updateSettings.mockImplementationOnce(async () => {
        f.store.read.mockRejectedValueOnce(new Error('read-back unavailable')); throw new Error('SQL unavailable');
      });
      else f.store.updateSettings.mockResolvedValueOnce(false);
      if (boundary === 'restore') vi.spyOn(f.gateway, 'restoreAccess').mockRejectedValueOnce(new Error('restore unavailable'));
      await expect(f.controls.toggleLock(f.actor(), f.gateway)).rejects.toMatchObject({ code: 'PERSISTENCE_FAILURE' });
      expect(f.access.isUncertain(f.state().room.id)).toBe(true);
      f.channel.permissionOverwrites.set.mockRejectedValueOnce(new Error('reconciliation unavailable'));
      await expect(f.controls.rename(f.actor(), 'Blocked', f.gateway)).rejects.toMatchObject({ code: 'DISCORD_FAILURE' });
      expect(f.channel.setName).not.toHaveBeenCalled(); expect(f.access.isUncertain(f.state().room.id)).toBe(true);
      await f.controls.rename(f.actor(), 'Confirmed', f.gateway);
      expect(f.state().room.name).toBe('Confirmed'); expect(f.access.isUncertain(f.state().room.id)).toBe(false);
      if (boundary === 'restore') expect(logged).toHaveBeenCalledExactlyOnceWith('Room mutation compensation failed', { roomId: f.state().room.id, guildDiscordId: f.guild.id, channelDiscordId: f.channel.id });
      else expect(logged).not.toHaveBeenCalled();
    } finally { logged.mockRestore(); }
  });

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

  it.each(['visibility', 'allow'] as const)('reprojects persisted privacy after %s SQL uncertainty and publishes only the fenced state', async (action) => {
    const f = roomSettingsFixture(); await f.controls.setVisibility(f.actor(), 'PRIVATE', f.gateway);
    const previous = await f.gateway.readAccess(f.channel.id); f.onChangedLocked.mockClear();
    f.store.updateSettings.mockRejectedValueOnce(new Error('private SQL'));
    f.store.setAllowed.mockRejectedValueOnce(new Error('private SQL'));
    const change = action === 'visibility' ? f.controls.setVisibility(f.actor(), 'PUBLIC', f.gateway) : f.controls.setAllowed(f.actor(), GUEST, true, f.gateway);
    await expect(change).rejects.toMatchObject({ code: 'PERSISTENCE_FAILURE' });
    expect(await f.gateway.readAccess(f.channel.id)).toEqual(previous);
    expect(f.state().room.visibility).toBe('PRIVATE'); expect(f.state().allowedMemberIds).toEqual([]);
    expect(f.onChangedLocked).toHaveBeenCalledOnce();
    expect(f.refreshes.at(-1)?.room).toMatchObject({ controlVersion: 1, visibility: 'PRIVATE' });
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
      const projection = vi.spyOn(f.gateway, 'setRoomAccess');
      await expect(f.controls.setAllowed(f.actor(), GUEST, true, f.gateway)).rejects.toMatchObject({ code: 'PERSISTENCE_FAILURE', message: 'PERSISTENCE_FAILURE' });
      expect(f.state().allowedMemberIds).toEqual([]); expect(f.state().room.visibility).toBe('PRIVATE');
      expect(projection.mock.calls.every(([, policy]) => policy.visibility === 'PRIVATE')).toBe(true);
      expect(logged).toHaveBeenCalledExactlyOnceWith('Room mutation compensation failed', { roomId: f.state().room.id, guildDiscordId: f.guild.id, channelDiscordId: f.channel.id });
    } finally { logged.mockRestore(); }
  });
});
