import { describe, expect, it, vi } from 'vitest';

import { currentOwnedRoom } from '../../../../src/modules/calls/room-mutation.js';
import { OWNER, OTHER } from '../ownership/ownership.fixtures.js';
import { deferred } from './call.fixtures.js';
import { roomSettingsFixture } from './room-settings.fixtures.js';

describe('RoomControlsService', () => {
  it.each(['PUBLIC', 'PRIVATE'] as const)('keeps visibility %s when toggling the lock and the lock when toggling visibility', async (visibility) => {
    const f = roomSettingsFixture(); f.state().room.visibility = visibility;
    await f.controls.toggleLock(f.actor(), f.gateway);
    expect(f.state().room).toMatchObject({ isLocked: true, visibility });
    await f.controls.toggleVisibility(f.actor(), f.gateway);
    expect(f.state().room).toMatchObject({ isLocked: true, visibility: visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC' });
    await f.controls.toggleLock(f.actor(), f.gateway);
    expect(f.state().room.isLocked).toBe(false);
  });

  it.each(['lock', 'visibility'] as const)('serializes two concurrent toggles with %s without lost updates', async (second) => {
    const f = roomSettingsFixture(); const entered = deferred(); const release = deferred();
    const write = f.channel.permissionOverwrites.set.getMockImplementation()!;
    f.channel.permissionOverwrites.set.mockImplementationOnce(async (input) => { await write(input); entered.resolve(); await release.promise; });
    const first = f.controls.toggleLock(f.actor(), f.gateway); await entered.promise;
    const next = second === 'lock' ? f.controls.toggleLock(f.actor(), f.gateway) : f.controls.toggleVisibility(f.actor(), f.gateway);
    release.resolve(); await Promise.all([first, next]);
    expect(f.state().room).toMatchObject(second === 'lock' ? { isLocked: false, visibility: 'PUBLIC' } : { isLocked: true, visibility: 'PRIVATE' });
    expect(f.refreshes).toHaveLength(2);
  });

  it.each([false, true])('rejects lock-only drift from %s without an ownership version change', async (isLocked) => {
    const f = roomSettingsFixture();
    f.state().room.isLocked = isLocked;
    const expected = structuredClone((await currentOwnedRoom(f.store, f.actor(), f.gateway)).state);
    f.state().room.isLocked = !isLocked;
    await expect(currentOwnedRoom(f.store, f.actor(), f.gateway, expected)).rejects.toMatchObject({ code: 'STALE_CONTROLS' });
    expect(f.state().room).toMatchObject({ visibility: 'PUBLIC', controlVersion: expected.room.controlVersion, isLocked: !isLocked });
  });

  it('trims and commits eleven complex graphemes; callback observes committed state under the room lock', async () => {
    const f = roomSettingsFixture(); const name = '👨‍👩‍👧‍👦'.repeat(11);
    const entered = deferred(); const release = deferred();
    f.onChangedLocked.mockImplementationOnce(async (id) => {
      f.refreshes.push((await f.store.read(id))!); entered.resolve(); await release.promise;
    });
    const change = f.controls.rename(f.actor(), `  ${name}  `, f.gateway);
    await entered.promise;
    let competing = false;
    const contender = f.coordinator.room(f.state().room.guildDiscordId, f.channel.id, async () => { competing = true; });
    await Promise.resolve(); expect(competing).toBe(false);
    expect(f.refreshes[0]?.room.name).toBe(name); expect(f.channel.name).toBe(name);
    expect(f.locks.slice(0, 2)).toEqual([`${f.guild.id}:${OWNER}`, `room:${f.guild.id}:${f.channel.id}`]);
    release.resolve(); await change; await contender;
    expect(f.onChangedLocked).toHaveBeenCalledTimes(1);
  });

  it.each(['', '   ', '👨‍👩‍👧‍👦'.repeat(12)])('rejects blank or twelve-grapheme name %j before any mutation', async (name) => {
    const f = roomSettingsFixture(); await expect(f.controls.rename(f.actor(), name, f.gateway)).rejects.toThrow();
    expect(f.state().room.name).toBe('Game'); expect(f.channel.name).toBe('Game');
    expect(f.channel.setName).not.toHaveBeenCalled(); expect(f.onChangedLocked).not.toHaveBeenCalled();
  });

  it.each([0, 1, 99])('commits limit %s without removing any of three occupants', async (limit) => {
    const f = roomSettingsFixture(); f.join(OTHER); f.join('72345678901234567');
    await f.controls.setLimit(f.actor(), limit, f.gateway);
    expect(f.state().room.userLimit).toBe(limit); expect(f.channel.userLimit).toBe(limit);
    expect(f.states.size).toBe(3); expect(f.member.voice.setChannel).not.toHaveBeenCalled();
    expect(f.refreshes).toHaveLength(1); expect(f.refreshes[0]?.room.userLimit).toBe(limit);
  });

  it.each([-1, 100, 1.5, '' as unknown as number, Number.NaN])('rejects invalid limit %j without changing settings', async (limit) => {
    const f = roomSettingsFixture(); await expect(f.controls.setLimit(f.actor(), limit, f.gateway)).rejects.toThrow();
    expect(f.state().room.userLimit).toBe(0); expect(f.channel.setUserLimit).not.toHaveBeenCalled();
  });

  it.each(['guild', 'owner', 'absent', 'bot', 'version', 'disabled', 'closed'] as const)('rejects unauthorized %s for every setting', async (cause) => {
    for (const action of ['rename', 'limit', 'visibility', 'allow', 'toggleLock', 'toggleVisibility'] as const) {
      const f = roomSettingsFixture(); const actor = f.actor();
      const errors = { guild: 'ROOM_UNAVAILABLE', owner: 'NOT_OWNER', absent: 'NOT_PRESENT', bot: 'NOT_PRESENT', version: 'STALE_CONTROLS', disabled: 'CONTROLS_DISABLED', closed: 'ROOM_UNAVAILABLE' };
      if (cause === 'guild') actor.guildDiscordId = '82345678901234567';
      if (cause === 'owner') f.state().room.ownerDiscordId = OTHER;
      if (cause === 'absent') f.leave(OWNER);
      if (cause === 'bot') f.member.user.bot = true;
      if (cause === 'version') actor.controlVersion--;
      if (cause === 'disabled') f.state().controlsEnabled = false;
      if (cause === 'closed') f.state().room.status = 'CLOSED';
      const operation = action === 'rename' ? f.controls.rename(actor, 'New', f.gateway)
        : action === 'limit' ? f.controls.setLimit(actor, 1, f.gateway)
          : action === 'visibility' ? f.controls.setVisibility(actor, 'PRIVATE', f.gateway)
            : action === 'toggleLock' ? f.controls.toggleLock(actor, f.gateway)
            : action === 'toggleVisibility' ? f.controls.toggleVisibility(actor, f.gateway)
            : f.controls.setAllowed(actor, OTHER, true, f.gateway);
      await expect(operation).rejects.toMatchObject({ code: errors[cause] });
      expect(f.channel.name).toBe('Game'); expect(f.channel.userLimit).toBe(0); expect(f.projected()).toEqual([]);
      expect(f.state().allowedMemberIds).toEqual([]); expect(f.state().room.visibility).toBe('PUBLIC');
      expect(f.onChangedLocked).not.toHaveBeenCalled();
    }
  });

  it.each(['rename', 'limit'] as const)('restores actual previous %s, not the database value, on failed CAS', async (action) => {
    const f = roomSettingsFixture(); f.channel.name = 'External'; f.channel.userLimit = 7;
    f.store.updateSettings.mockResolvedValueOnce(false);
    const change = action === 'rename' ? f.controls.rename(f.actor(), 'New', f.gateway) : f.controls.setLimit(f.actor(), 1, f.gateway);
    await expect(change).rejects.toMatchObject({ code: 'STALE_CONTROLS' });
    expect(f.channel.name).toBe('External'); expect(f.channel.userLimit).toBe(7);
    expect(f.state().room).toMatchObject({ name: 'Game', userLimit: 0 }); expect(f.refreshes).toEqual([]);
  });

  it.each([
    { previous: 'External name longer than eleven graphemes', failure: 'cas' },
    { previous: '  External  ', failure: 'cas' },
    { previous: 'External name longer than eleven graphemes', failure: 'persistence' },
    { previous: '  External  ', failure: 'persistence' },
  ] as const)('restores the exact external name $previous after $failure failure', async ({ previous, failure }) => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const f = roomSettingsFixture(); f.channel.name = previous;
      if (failure === 'cas') f.store.updateSettings.mockResolvedValueOnce(false);
      else f.store.updateSettings.mockRejectedValueOnce(new Error('private persistence payload'));
      const error: unknown = await f.controls.rename(f.actor(), 'New', f.gateway).catch((reason: unknown) => reason);
      expect(f.channel.name).toBe(previous);
      expect((await f.gateway.snapshot(f.channel.id))?.name).toBe(previous);
      expect(f.state().room.name).toBe('Game'); expect(f.refreshes).toEqual([]);
      const code = failure === 'cas' ? 'STALE_CONTROLS' : 'PERSISTENCE_FAILURE';
      expect(error).toMatchObject({ code, message: code });
      expect(logged).not.toHaveBeenCalled();
    } finally { logged.mockRestore(); }
  });

  it('does not persist a rejected Discord name edit', async () => {
    const f = roomSettingsFixture(); f.channel.setName.mockRejectedValueOnce(new Error('private Discord payload'));
    await expect(f.controls.rename(f.actor(), 'New', f.gateway)).rejects.toMatchObject({ code: 'DISCORD_FAILURE', message: 'DISCORD_FAILURE' });
    expect(f.state().room.name).toBe('Game'); expect(f.store.updateSettings).not.toHaveBeenCalled();
  });

  it('rechecks live ownership after awaited Discord mutation and compensates a departed owner', async () => {
    const f = roomSettingsFixture(); f.channel.setName.mockImplementationOnce(async (name) => { f.channel.name = name; f.leave(OWNER); });
    await expect(f.controls.rename(f.actor(), 'New', f.gateway)).rejects.toMatchObject({ code: 'NOT_PRESENT' });
    expect(f.channel.name).toBe('Game'); expect(f.state().room.name).toBe('Game'); expect(f.refreshes).toEqual([]);
  });

  it('rejects configuration/version drift during Discord I/O and restores the previous limit', async () => {
    for (const kind of ['disabled', 'version'] as const) {
      const f = roomSettingsFixture(); f.channel.setUserLimit.mockImplementationOnce(async (limit) => {
        f.channel.userLimit = limit;
        if (kind === 'disabled') f.state().controlsEnabled = false; else f.state().room.controlVersion++;
      });
      await expect(f.controls.setLimit(f.actor(), 3, f.gateway)).rejects.toMatchObject({ code: kind === 'disabled' ? 'CONTROLS_DISABLED' : 'STALE_CONTROLS' });
      expect(f.channel.userLimit).toBe(0); expect(f.state().room.userLimit).toBe(0); expect(f.refreshes).toEqual([]);
    }
  });

  it('translates persistence failures and restores previous Discord settings', async () => {
    const f = roomSettingsFixture(); f.store.updateSettings.mockRejectedValueOnce(new Error('postgresql://secret'));
    await expect(f.controls.rename(f.actor(), 'New', f.gateway)).rejects.toMatchObject({ code: 'PERSISTENCE_FAILURE', message: 'PERSISTENCE_FAILURE' });
    expect(f.channel.name).toBe('Game'); expect(f.state().room.name).toBe('Game'); expect(f.refreshes).toEqual([]);
  });

  it('reports fixed failure and safe recovery IDs when compensation also fails', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const f = roomSettingsFixture(); f.store.updateSettings.mockRejectedValueOnce(new Error('secret SQL'));
      f.channel.setName.mockImplementationOnce(async (name) => { f.channel.name = name; }).mockRejectedValueOnce(new Error('secret REST'));
      await expect(f.controls.rename(f.actor(), 'New', f.gateway)).rejects.toMatchObject({ code: 'PERSISTENCE_FAILURE', message: 'PERSISTENCE_FAILURE' });
      expect(logged).toHaveBeenCalledExactlyOnceWith('Room mutation compensation failed', { roomId: f.state().room.id, guildDiscordId: f.guild.id, channelDiscordId: f.channel.id });
      expect(f.state().room.name).toBe('Game'); expect(f.refreshes).toEqual([]);
    } finally { logged.mockRestore(); }
  });

  it('does not undo a committed setting or call the callback twice when refresh fails', async () => {
    const f = roomSettingsFixture(); f.onChangedLocked.mockRejectedValueOnce(new Error('private refresh payload'));
    await expect(f.controls.rename(f.actor(), 'Committed', f.gateway)).rejects.toMatchObject({ code: 'DISCORD_FAILURE', message: 'DISCORD_FAILURE' });
    expect(f.state().room.name).toBe('Committed'); expect(f.channel.name).toBe('Committed');
    expect(f.channel.setName).toHaveBeenCalledTimes(1); expect(f.onChangedLocked).toHaveBeenCalledTimes(1);
  });
});
