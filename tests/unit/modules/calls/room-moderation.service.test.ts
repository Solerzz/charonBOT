import { OverwriteType, PermissionFlagsBits as P, PermissionsBitField } from 'discord.js';
import { describe, expect, it, vi } from 'vitest';

import { deferred } from './call.fixtures.js';
import { OWNER, OTHER, roomModerationFixture } from './room-moderation.fixtures.js';

describe('durable owner moderation', () => {
  it('reports the removal already confirmed during pre-stage duplicate recovery', async () => {
    const f = roomModerationFixture(); const block = structuredClone(f.seedBlock());
    await expect(f.service.block(f.actor(), OTHER, f.gateway)).resolves.toMatchObject({ kind: 'blocked', removedFromRoom: true, actor: { controlVersion: 0 } });
    expect(f.state().memberBlocks).toEqual([block]); expect(f.http).toHaveBeenCalledOnce();
  });

  it('does not disconnect the same blocked member twice across recovery and new intent', async () => {
    const f = roomModerationFixture(); f.seedBlock(); const check = f.gateway.assertModerationPermissions.bind(f.gateway);
    let returned = false;
    vi.spyOn(f.gateway, 'assertModerationPermissions').mockImplementation(async (...args) => {
      await check(...args);
      if (!returned && f.events.includes('disconnect')) { returned = true; f.join(OTHER); }
    });
    await expect(f.service.block(f.actor(), '32345678901234567', f.gateway)).rejects.toMatchObject({ code: 'MODERATION_INCOMPLETE' });
    expect(returned).toBe(true); expect(f.http).toHaveBeenCalledOnce();
    expect(f.access.isUncertain(f.state().room.id)).toBe(true);
  });

  it('does not confirm an absent target promoted during the durable stage', async () => {
    const f = roomModerationFixture(); f.leave(OTHER);
    const stage = f.store.stageRoomBlock.getMockImplementation()!;
    f.store.stageRoomBlock.mockImplementationOnce(async (...args) => {
      const write = await stage(...args); f.member.permissions.add(P.Administrator); return write;
    });
    await expect(f.service.block(f.actor(), OTHER, f.gateway)).rejects.toMatchObject({ code: 'MODERATION_INCOMPLETE' });
    expect(f.state().memberBlocks).toMatchObject([{ memberDiscordId: OTHER, state: 'BLOCKED' }]);
    expect(f.state().room.controlVersion).toBe(1); expect(f.access.isUncertain(f.state().room.id)).toBe(true);
    expect(f.http).not.toHaveBeenCalled(); expect(f.channel.permissionOverwrites.set).not.toHaveBeenCalled();
    await expect(f.service.unblock(f.actor(), f.state().memberBlocks[0]!.id, f.gateway)).resolves.toMatchObject({ kind: 'unblocked' });
  });

  it('keeps an absent protected existing guild member quarantined during recovery', async () => {
    const f = roomModerationFixture(); const block = f.seedBlock(); f.leave(OTHER);
    f.member.permissions.add(P.Administrator); f.access.markUncertain(f.state().room.id);
    await expect(f.reconcile()).rejects.toMatchObject({ code: 'MODERATION_INCOMPLETE' });
    expect(f.state().memberBlocks).toEqual([block]); expect(f.access.isUncertain(f.state().room.id)).toBe(true);
    expect(f.channel.permissionOverwrites.set).not.toHaveBeenCalled(); expect(f.http).not.toHaveBeenCalled();
  });

  it('recovers a confirmed guild departure and still permits corrective unblock', async () => {
    const f = roomModerationFixture(); const block = f.seedBlock(); f.leave(OTHER);
    const fetch = f.guild.members.fetch.getMockImplementation()!;
    f.guild.members.fetch.mockImplementation(async options => {
      if ((options as { user: string }).user === OTHER) throw Object.assign(new Error('gone'), { code: 10007 });
      return fetch(options);
    });
    f.access.markUncertain(f.state().room.id); await f.reconcile();
    expect(f.access.isUncertain(f.state().room.id)).toBe(false); expect(f.http).not.toHaveBeenCalled();
    await expect(f.service.unblock(f.actor(), block.id, f.gateway)).resolves.toMatchObject({ kind: 'unblocked' });
    expect(f.state().memberBlocks).toEqual([]);
  });

  it('recovers impossible existing moderation before admitting another block', async () => {
    const f = roomModerationFixture(); const block = f.seedBlock(); const next = '32345678901234567';
    const fetch = f.guild.members.fetch.getMockImplementation()!;
    f.guild.members.fetch.mockImplementation(async options => {
      const member = await fetch(options);
      return { ...member, permissions: new PermissionsBitField(member.id === OTHER ? P.Administrator : 0n) };
    });
    f.access.markUncertain(f.state().room.id);
    await expect(f.service.block(f.actor(), next, f.gateway)).rejects.toMatchObject({ code: 'MODERATION_INCOMPLETE' });
    expect(f.store.stageRoomBlock).not.toHaveBeenCalled(); expect(f.state().room.controlVersion).toBe(0);
    expect(f.state().memberBlocks).toEqual([block]); expect(f.http).not.toHaveBeenCalled();
    expect(f.access.isUncertain(f.state().room.id)).toBe(true);
  });

  it('does not retry an uncertain recovery removal or stage another intention', async () => {
    const f = roomModerationFixture(); const block = f.seedBlock(); f.access.markUncertain(f.state().room.id);
    f.http.mockRejectedValueOnce(new Error('uncertain recovery'));
    await expect(f.service.block(f.actor(), '32345678901234567', f.gateway)).rejects.toMatchObject({ code: 'MODERATION_INCOMPLETE' });
    expect(f.http).toHaveBeenCalledOnce(); expect(f.store.stageRoomBlock).not.toHaveBeenCalled();
    expect(f.state().memberBlocks).toEqual([block]); expect(f.state().room.controlVersion).toBe(0);
  });

  it('revalidates the actor after composed moderation recovery before staging', async () => {
    const f = roomModerationFixture(); f.seedBlock(); f.access.markUncertain(f.state().room.id);
    f.afterRemovalLocked.mockImplementationOnce(async () => { f.state().room.ownerDiscordId = '32345678901234567'; f.state().room.controlVersion++; });
    await expect(f.service.block(f.actor(), '32345678901234567', f.gateway)).rejects.toThrow();
    expect(f.store.stageRoomBlock).not.toHaveBeenCalled(); expect(f.http).toHaveBeenCalledOnce();
    expect(f.state().memberBlocks).toHaveLength(1);
  });

  it('saves block and deletes allowlist before native deny and disconnect', async () => {
    const f = roomModerationFixture(); f.state().allowedMemberIds = [OTHER];
    f.channel.permissionOverwrites.cache.set(OTHER, { id: OTHER, type: OverwriteType.Member, allow: new PermissionsBitField(), deny: new PermissionsBitField(P.SendTTSMessages) });
    const project = f.channel.permissionOverwrites.set.getMockImplementation()!;
    f.channel.permissionOverwrites.set.mockImplementation(async input => {
      expect(f.state().memberBlocks).toMatchObject([{ memberDiscordId: OTHER, deniedBefore: P.SendTTSMessages }]);
      expect(f.state().allowedMemberIds).toEqual([]); await project(input);
    });
    f.http.mockImplementationOnce(async () => {
      expect(f.overwrite()!.deny.has([P.Connect, P.SendMessages, P.SendTTSMessages, P.SendVoiceMessages, P.SendPolls])).toBe(true);
      expect(f.overwrite()!.allow.has(P.ViewChannel)).toBe(true); f.events.push('disconnect'); f.leave(OTHER);
    });
    await expect(f.service.block(f.actor(), OTHER, f.gateway)).resolves.toEqual({ actor: { ...f.actor(), controlVersion: 1 }, kind: 'blocked', memberDiscordId: OTHER, removedFromRoom: true });
    expect(f.events.indexOf('stage:block')).toBeLessThan(f.events.indexOf('project'));
    expect(f.events.indexOf('project')).toBeLessThan(f.events.indexOf('disconnect'));
    expect(f.events[f.events.indexOf('disconnect') - 1]).toBe('read');
    expect(f.events.indexOf('afterRemoval')).toBeLessThan(f.events.indexOf('publish'));
    expect(f.state().presences.map(p => p.memberDiscordId)).toEqual([OWNER]);
    expect(f.access.isUncertain(f.state().room.id)).toBe(false);
    expect(f.locks).toEqual([`${f.guild.id}:${OWNER}`, `room:${f.guild.id}:${f.channel.id}`]);
  });

  it('leaves another call alone', async () => {
    const f = roomModerationFixture(); f.states.set(OTHER, { channelId: '72345678901234567' });
    await expect(f.service.block(f.actor(), OTHER, f.gateway)).resolves.toMatchObject({ kind: 'blocked', removedFromRoom: false });
    expect(f.states.get(OTHER)?.channelId).toBe('72345678901234567'); expect(f.http).not.toHaveBeenCalled();
    expect(f.state().memberBlocks).toHaveLength(1);
  });

  it('reports persisted partial failure without a second disconnect', async () => {
    const f = roomModerationFixture();
    f.http.mockImplementationOnce(async () => { f.leave(OTHER); throw new Error('private HTTP payload'); });
    await expect(f.service.block(f.actor(), OTHER, f.gateway)).rejects.toMatchObject({ code: 'MODERATION_INCOMPLETE', message: 'MODERATION_INCOMPLETE' });
    expect(f.http).toHaveBeenCalledTimes(1); expect(f.state().memberBlocks).toHaveLength(1);
    expect(f.publishLocked).toHaveBeenCalledTimes(1); expect(f.access.isUncertain(f.state().room.id)).toBe(true);
    await f.reconcile(); expect(f.http).toHaveBeenCalledTimes(1); expect(f.access.isUncertain(f.state().room.id)).toBe(false);
  });

  it('can unblock a now-protected target while quarantined', async () => {
    const f = roomModerationFixture(); const block = f.seedBlock();
    await f.synchronize(); f.member.permissions = new PermissionsBitField(P.Administrator);
    f.access.markUncertain(f.state().room.id);
    await expect(f.service.unblock(f.actor(), block.id, f.gateway)).resolves.toMatchObject({ kind: 'unblocked', memberDiscordId: OTHER, removedFromRoom: false });
    expect(f.state().memberBlocks).toEqual([]); expect(f.state().allowedMemberIds).toEqual([]);
    expect(f.overwrite()?.deny.has(P.Connect) ?? false).toBe(false); expect(f.http).not.toHaveBeenCalled();
  });

  it('finishes confirmed intent after ownership changes', async () => {
    const f = roomModerationFixture(); const stage = f.store.stageRoomBlock.getMockImplementation()!;
    f.store.stageRoomBlock.mockImplementationOnce(async (...args) => {
      const write = await stage(...args); f.state().room.ownerDiscordId = '32345678901234567'; f.state().room.controlVersion++; return write;
    });
    await expect(f.service.block(f.actor(), OTHER, f.gateway)).rejects.toMatchObject({ code: 'MODERATION_INCOMPLETE' });
    expect(f.state().memberBlocks).toHaveLength(1); expect(f.states.has(OTHER)).toBe(false);
    expect(f.http).toHaveBeenCalledTimes(1); expect(f.publishLocked).toHaveBeenCalledTimes(1);
  });

  it('waits for SQL settlement rather than trusting a read of absence', async () => {
    const f = roomModerationFixture(); const fence = deferred(); const entered = deferred();
    const stage = f.store.stageRoomBlock.getMockImplementation()!; const actor = f.actor();
    f.store.stageRoomBlock.mockRejectedValueOnce(new Error('lost while still running'));
    f.store.settleAccess.mockImplementationOnce(async () => { entered.resolve(); await fence.promise; await stage(actor, OTHER, 0n); return f.store.read(actor.roomId); });
    const action = f.service.block(actor, OTHER, f.gateway); const observed = action.catch(error => error);
    await entered.promise;
    expect((await f.store.read(actor.roomId))!.memberBlocks).toEqual([]);
    expect(f.http).not.toHaveBeenCalled(); expect(f.channel.permissionOverwrites.set).not.toHaveBeenCalled();
    fence.resolve(); await observed;
    expect(f.state().memberBlocks).toHaveLength(1); expect(f.states.has(OTHER)).toBe(false);
  });

  it('rechecks a newly protected outside-room target before staging', async () => {
    const f = roomModerationFixture(); f.leave(OTHER);
    const read = f.gateway.readAccess.bind(f.gateway);
    vi.spyOn(f.gateway, 'readAccess').mockImplementationOnce(async id => { const previous = await read(id); f.member.permissions = new PermissionsBitField(P.Administrator); return previous; });
    await expect(f.service.block(f.actor(), OTHER, f.gateway)).rejects.toMatchObject({ code: 'PROTECTED_MEMBER' });
    expect(f.state().memberBlocks).toEqual([]); expect(f.store.stageRoomBlock).not.toHaveBeenCalled();
  });

  it('does not acknowledge a stage without its durable record', async () => {
    const f = roomModerationFixture(); const stage = f.store.stageRoomBlock.getMockImplementation()!;
    f.store.stageRoomBlock.mockImplementationOnce(async (...args) => { const write = await stage(...args); f.state().memberBlocks = []; return write; });
    await expect(f.service.block(f.actor(), OTHER, f.gateway)).rejects.toMatchObject({ code: 'MODERATION_INCOMPLETE' });
    expect(f.http).not.toHaveBeenCalled();
  });

  it('does not report removed after the member returns during publication', async () => {
    const f = roomModerationFixture(); f.publishLocked.mockImplementationOnce(async () => { f.join(OTHER); });
    await expect(f.service.block(f.actor(), OTHER, f.gateway)).rejects.toMatchObject({ code: 'MODERATION_INCOMPLETE' });
    expect(f.http).toHaveBeenCalledTimes(1); expect(f.publishLocked).toHaveBeenCalledTimes(1);
    expect(f.access.isUncertain(f.state().room.id)).toBe(true);
  });

  it.each(['self', 'administrator', 'guild-owner', 'bot'] as const)('rejects %s before intent', async protection => {
    const f = roomModerationFixture();
    if (protection === 'administrator') f.member.permissions = new PermissionsBitField(P.Administrator);
    if (protection === 'guild-owner') f.guild.ownerId = OTHER;
    if (protection === 'bot') {
      const fetch = f.guild.members.fetch.getMockImplementation()!;
      f.guild.members.fetch.mockImplementation(async options => {
        const member = await fetch(options); return { ...member, user: { bot: member.id === OTHER } };
      });
    }
    await expect(f.service.block(f.actor(), protection === 'self' ? OWNER : OTHER, f.gateway)).rejects.toMatchObject({ code: 'PROTECTED_MEMBER' });
    expect(f.state().memberBlocks).toEqual([]); expect(f.http).not.toHaveBeenCalled();
    expect(f.channel.permissionOverwrites.set).not.toHaveBeenCalled();
  });

  it.each(['wrong-owner', 'not-present', 'stale', 'disabled', 'transfer'] as const)('rejects %s admission without writes', async cause => {
    const f = roomModerationFixture(); const actor = f.actor();
    const codes = { 'wrong-owner': 'NOT_OWNER', 'not-present': 'NOT_PRESENT', stale: 'STALE_CONTROLS', disabled: 'CONTROLS_DISABLED', transfer: 'TRANSFER_PENDING' };
    if (cause === 'wrong-owner') f.state().room.ownerDiscordId = OTHER;
    if (cause === 'not-present') f.leave(OWNER);
    if (cause === 'stale') f.state().room.controlVersion++;
    if (cause === 'disabled') f.state().controlsEnabled = false;
    if (cause === 'transfer') await f.store.createTransfer({ roomId: actor.roomId, ownerDiscordId: OWNER, targetDiscordId: OTHER, controlVersion: actor.controlVersion });
    await expect(f.service.block(actor, OTHER, f.gateway)).rejects.toMatchObject({ code: codes[cause] });
    expect(f.store.stageRoomBlock).not.toHaveBeenCalled(); expect(f.http).not.toHaveBeenCalled();
  });

  it('lists in quarantine without settling or granting mutation authority', async () => {
    const f = roomModerationFixture(); const block = f.seedBlock(); const actor = f.actor();
    f.access.markUnsettled(actor.roomId, actor.controlVersion);
    await expect(f.service.list(actor, f.gateway)).resolves.toEqual([block]);
    expect(f.store.settleAccess).not.toHaveBeenCalled(); expect(f.channel.permissionOverwrites.set).not.toHaveBeenCalled();
    await expect(f.service.unblock(actor, block.id, f.gateway)).rejects.toMatchObject({ code: 'STALE_CONTROLS' });
    expect(f.state().memberBlocks).toEqual([block]); expect(f.store.stageRoomUnblock).not.toHaveBeenCalled();
    expect(f.publishLocked).toHaveBeenCalledTimes(1);
  });

  it('does not disconnect or project when an uncertain SQL fence fails', async () => {
    const f = roomModerationFixture();
    f.store.stageRoomBlock.mockRejectedValueOnce(new Error('lost SQL'));
    f.store.settleAccess.mockRejectedValueOnce(new Error('barrier unavailable'));
    await expect(f.service.block(f.actor(), OTHER, f.gateway)).rejects.toMatchObject({ code: 'MODERATION_INCOMPLETE' });
    expect(f.http).not.toHaveBeenCalled(); expect(f.channel.permissionOverwrites.set).not.toHaveBeenCalled();
    expect(f.access.isUncertain(f.state().room.id)).toBe(true); expect(f.publishLocked).toHaveBeenCalledTimes(1);
    await f.reconcile(); expect(f.state().room.controlVersion).toBe(1); expect(f.store.settleAccess).toHaveBeenCalledTimes(2);
  });

  it('fences a rejected stage even when readback shows no record', async () => {
    const f = roomModerationFixture(); f.store.stageRoomBlock.mockRejectedValueOnce(new Error('lost SQL'));
    await expect(f.service.block(f.actor(), OTHER, f.gateway)).rejects.toMatchObject({ code: 'MODERATION_INCOMPLETE' });
    expect(f.store.settleAccess).toHaveBeenCalledWith(f.state().room.id, 0);
    expect(f.state().room.controlVersion).toBe(1); expect(f.state().memberBlocks).toEqual([]);
    expect(f.http).not.toHaveBeenCalled(); expect(f.channel.permissionOverwrites.set).not.toHaveBeenCalled();
  });

  it('retains intent after an uncertain projection without replaying it', async () => {
    const f = roomModerationFixture(); const project = f.channel.permissionOverwrites.set.getMockImplementation()!;
    f.channel.permissionOverwrites.set.mockImplementationOnce(async input => { await project(input); throw new Error('lost REST'); });
    await expect(f.service.block(f.actor(), OTHER, f.gateway)).rejects.toMatchObject({ code: 'MODERATION_INCOMPLETE' });
    expect(f.channel.permissionOverwrites.set).toHaveBeenCalledTimes(1); expect(f.http).not.toHaveBeenCalled();
    expect(f.state().memberBlocks).toHaveLength(1); expect(f.publishLocked).toHaveBeenCalledTimes(1);
    await f.reconcile(); expect(f.http).toHaveBeenCalledTimes(1);
  });

  it('only retries an uncertain disconnect on a later fresh observation', async () => {
    const f = roomModerationFixture(); f.http.mockRejectedValueOnce(new Error('unknown disconnect result'));
    await expect(f.service.block(f.actor(), OTHER, f.gateway)).rejects.toMatchObject({ code: 'MODERATION_INCOMPLETE' });
    expect(f.http).toHaveBeenCalledTimes(1); expect(f.states.has(OTHER)).toBe(true);
    f.guild.ownerId = OTHER;
    await expect(f.reconcile()).rejects.toMatchObject({ code: 'MODERATION_INCOMPLETE' });
    expect(f.http).toHaveBeenCalledTimes(1);
    f.guild.ownerId = '82345678901234567';
    await f.reconcile(); expect(f.http).toHaveBeenCalledTimes(2); expect(f.states.has(OTHER)).toBe(false);
  });

  it('does not repeat a successful removal when absence cannot be confirmed', async () => {
    const f = roomModerationFixture(); f.http.mockResolvedValueOnce(undefined);
    await expect(f.service.block(f.actor(), OTHER, f.gateway)).rejects.toMatchObject({ code: 'MODERATION_INCOMPLETE' });
    expect(f.http).toHaveBeenCalledTimes(1); expect(f.state().memberBlocks).toHaveLength(1);
    expect(f.afterRemovalLocked).not.toHaveBeenCalled();
  });

  it('does not retry publication or disconnect after publication fails', async () => {
    const f = roomModerationFixture(); f.publishLocked.mockRejectedValueOnce(new Error('private panel response'));
    await expect(f.service.block(f.actor(), OTHER, f.gateway)).rejects.toMatchObject({ code: 'MODERATION_INCOMPLETE' });
    expect(f.http).toHaveBeenCalledTimes(1); expect(f.publishLocked).toHaveBeenCalledTimes(1);
    expect(f.access.isUncertain(f.state().room.id)).toBe(true);
  });

  it('keeps a newly blocked record when conditional unblock completion loses a race', async () => {
    const f = roomModerationFixture(); const block = f.seedBlock();
    f.store.completeRoomUnblock.mockImplementationOnce(async () => {
      f.state().room.controlVersion++; block.state = 'BLOCKED'; return false;
    });
    await expect(f.service.unblock(f.actor(), block.id, f.gateway)).rejects.toMatchObject({ code: 'MODERATION_INCOMPLETE' });
    expect(f.state().memberBlocks).toEqual([expect.objectContaining({ id: block.id, state: 'BLOCKED' })]);
    expect(f.store.completeRoomUnblock).toHaveBeenCalledTimes(1); expect(f.http).not.toHaveBeenCalled();
  });

  it('settles a lost finalize reply without replaying completion', async () => {
    const f = roomModerationFixture(); const block = f.seedBlock(); const complete = f.store.completeRoomUnblock.getMockImplementation()!;
    f.store.completeRoomUnblock.mockImplementationOnce(async (...args) => { await complete(...args); throw new Error('lost SQL completion'); });
    await expect(f.service.unblock(f.actor(), block.id, f.gateway)).rejects.toMatchObject({ code: 'MODERATION_INCOMPLETE' });
    expect(f.state().memberBlocks).toEqual([]); expect(f.state().room.controlVersion).toBe(2);
    expect(f.store.completeRoomUnblock).toHaveBeenCalledTimes(1); expect(f.http).not.toHaveBeenCalled();
    await f.reconcile(); expect(f.store.completeRoomUnblock).toHaveBeenCalledTimes(1);
    expect(f.publishLocked).toHaveBeenCalledTimes(1); expect(f.access.isUncertain(f.state().room.id)).toBe(false);
  });

  it('unblocks a departed member without restoring their old authorization', async () => {
    const f = roomModerationFixture(); f.state().allowedMemberIds = [OTHER];
    await f.service.block(f.actor(), OTHER, f.gateway); const block = f.state().memberBlocks[0]!;
    f.guild.members.fetch.mockImplementation(async options => {
      if ((options as { user: string }).user === OTHER) throw Object.assign(new Error('unknown member'), { code: 10007 });
      return { ...f.member, id: (options as { user: string }).user };
    });
    await expect(f.service.unblock(f.actor(), block.id, f.gateway)).resolves.toMatchObject({ kind: 'unblocked', removedFromRoom: false });
    expect(f.state().allowedMemberIds).toEqual([]); expect(f.state().memberBlocks).toEqual([]);
    expect(f.overwrite()).toBeUndefined(); expect(f.http).toHaveBeenCalledTimes(1);
  });

  it('rejects an old actor when ownership changes during the final native permission check', async () => {
    const f = roomModerationFixture(); const check = f.gateway.assertModerationPermissions.bind(f.gateway);
    let count = 0;
    vi.spyOn(f.gateway, 'assertModerationPermissions').mockImplementation(async (...args) => {
      await check(...args); if (++count === 3) { f.state().room.ownerDiscordId = OTHER; f.state().room.controlVersion++; }
    });
    await expect(f.service.block(f.actor(), OTHER, f.gateway)).rejects.toMatchObject({ code: 'MODERATION_INCOMPLETE' });
    expect(f.http).not.toHaveBeenCalled(); expect(f.state().memberBlocks).toHaveLength(1);
  });

  it('does not acquire locks or publish during locked recovery', async () => {
    const f = roomModerationFixture(); f.seedBlock(); f.leave(OTHER);
    await f.service.reconcileLocked(f.state().room.id, f.gateway);
    expect(f.locks).toEqual([]); expect(f.publishLocked).not.toHaveBeenCalled(); expect(f.afterRemovalLocked).not.toHaveBeenCalled();
  });

  it('keeps UUID, saved denies and creation time on duplicate block without bumping the epoch', async () => {
    const f = roomModerationFixture(); const block = f.seedBlock(); block.deniedBefore = P.SendTTSMessages;
    const saved = structuredClone(block); f.leave(OTHER);
    await expect(f.service.block(f.actor(), OTHER, f.gateway)).resolves.toMatchObject({ actor: { controlVersion: 0 }, removedFromRoom: false });
    expect(f.state().memberBlocks).toEqual([saved]); expect(f.invalidateWorkspace).not.toHaveBeenCalled();
    await f.service.unblock(f.actor(), block.id, f.gateway);
    expect(f.overwrite()!.deny.bitfield).toBe(P.SendTTSMessages);
    expect(f.overwrite()!.allow.has(P.ViewChannel)).toBe(false);
    expect(f.state().allowedMemberIds).toEqual([]);
  });

  it('allows corrective removal of an inconsistent current-owner block', async () => {
    const f = roomModerationFixture(); const block = f.seedBlock(OWNER); f.leave(OTHER);
    f.access.markUncertain(f.state().room.id);
    await expect(f.service.unblock(f.actor(), block.id, f.gateway)).resolves.toMatchObject({ memberDiscordId: OWNER, kind: 'unblocked', removedFromRoom: false });
    expect(f.state().memberBlocks).toEqual([]); expect(f.http).not.toHaveBeenCalled();
    expect(f.overwrite(OWNER)!.allow.has([P.ViewChannel, P.Connect, P.SendMessages])).toBe(true);
  });

  it('recovers a lost unblock stage reply with confirmed SQL state', async () => {
    const f = roomModerationFixture(); const block = f.seedBlock(); const stage = f.store.stageRoomUnblock.getMockImplementation()!;
    f.store.stageRoomUnblock.mockImplementationOnce(async (...args) => { await stage(...args); throw new Error('lost unblock reply'); });
    await expect(f.service.unblock(f.actor(), block.id, f.gateway)).resolves.toMatchObject({ actor: { controlVersion: 1 }, memberDiscordId: OTHER, kind: 'unblocked' });
    expect(f.state().memberBlocks).toEqual([]); expect(f.store.stageRoomUnblock).toHaveBeenCalledTimes(1);
    expect(f.store.settleAccess).toHaveBeenCalledWith(f.state().room.id, 0); expect(f.http).not.toHaveBeenCalled();
  });

  it('cannot use corrective unblock to skip a failing SQL fence', async () => {
    const f = roomModerationFixture(); const block = f.seedBlock();
    f.member.permissions = new PermissionsBitField(P.Administrator);
    f.access.markUnsettled(f.state().room.id, 0); f.store.settleAccess.mockRejectedValueOnce(new Error('SQL unavailable'));
    await expect(f.service.unblock(f.actor(), block.id, f.gateway)).rejects.toMatchObject({ code: 'PERSISTENCE_FAILURE' });
    expect(f.state().memberBlocks).toEqual([block]); expect(f.store.stageRoomUnblock).not.toHaveBeenCalled();
    expect(f.channel.permissionOverwrites.set).not.toHaveBeenCalled(); expect(f.http).not.toHaveBeenCalled();
  });

  it('does not skip an unrelated impossible projection during corrective unblock', async () => {
    const f = roomModerationFixture(); const block = f.seedBlock(); f.seedBlock(f.bot.id);
    f.access.markUncertain(f.state().room.id);
    await expect(f.service.unblock(f.actor(), block.id, f.gateway)).rejects.toMatchObject({ code: 'MODERATION_INCOMPLETE' });
    expect(f.state().memberBlocks).toMatchObject([{ id: block.id, state: 'UNBLOCK_PENDING' }, { memberDiscordId: f.bot.id, state: 'BLOCKED' }]);
    expect(f.store.completeRoomUnblock).not.toHaveBeenCalled(); expect(f.http).not.toHaveBeenCalled();
  });

  it('does not admit moderation from an owner departure hidden by a later return', async () => {
    const f = roomModerationFixture();
    f.coordinator.recordDeparture(f.guild.id, f.channel.id, OWNER, false); f.coordinator.recordArrival(f.guild.id, f.channel.id, OWNER);
    await expect(f.service.block(f.actor(), OTHER, f.gateway)).rejects.toMatchObject({ code: 'STALE_CONTROLS' });
    expect(f.store.stageRoomBlock).not.toHaveBeenCalled(); expect(f.http).not.toHaveBeenCalled();
  });

  it('revalidates a quarantined list owner after the native snapshot yields', async () => {
    const f = roomModerationFixture(); f.seedBlock(); f.access.markUncertain(f.state().room.id);
    const snapshot = f.gateway.snapshot.bind(f.gateway);
    vi.spyOn(f.gateway, 'snapshot').mockImplementationOnce(async id => { const live = await snapshot(id); f.state().room.ownerDiscordId = OTHER; f.state().room.controlVersion++; return live; });
    await expect(f.service.list(f.actor(), f.gateway)).rejects.toMatchObject({ code: 'STALE_CONTROLS' });
    expect(f.store.settleAccess).not.toHaveBeenCalled(); expect(f.publishLocked).not.toHaveBeenCalled();
  });

  it('takes a new channel observation when a target moves during projection', async () => {
    const f = roomModerationFixture(); const set = f.channel.permissionOverwrites.set.getMockImplementation()!;
    f.channel.permissionOverwrites.set.mockImplementationOnce(async input => { await set(input); f.states.set(OTHER, { channelId: '72345678901234567' }); });
    await expect(f.service.block(f.actor(), OTHER, f.gateway)).resolves.toMatchObject({ removedFromRoom: false });
    expect(f.http).not.toHaveBeenCalled(); expect(f.states.get(OTHER)?.channelId).toBe('72345678901234567');
  });

  it('rechecks native protection after intent and before any removal', async () => {
    const f = roomModerationFixture(); const stage = f.store.stageRoomBlock.getMockImplementation()!;
    f.store.stageRoomBlock.mockImplementationOnce(async (...args) => { const write = await stage(...args); f.guild.ownerId = OTHER; return write; });
    await expect(f.service.block(f.actor(), OTHER, f.gateway)).rejects.toMatchObject({ code: 'MODERATION_INCOMPLETE' });
    expect(f.state().memberBlocks).toHaveLength(1); expect(f.http).not.toHaveBeenCalled();
    const block = f.state().memberBlocks[0]!;
    await expect(f.service.unblock(f.actor(), block.id, f.gateway)).resolves.toMatchObject({ kind: 'unblocked' });
  });

  it('rejects malformed targets and block UUIDs through the promised API', async () => {
    const f = roomModerationFixture();
    await expect(f.service.block(f.actor(), 'invalid', f.gateway)).rejects.toThrow();
    await expect(f.service.unblock(f.actor(), 'invalid', f.gateway)).rejects.toThrow();
    expect(f.locks).toEqual([]); expect(f.state().memberBlocks).toEqual([]);
  });

  it('quarantines a temporary occupant grant when the unblocked member departs during SQL finalization', async () => {
    const f = roomModerationFixture(); const block = f.seedBlock(); f.state().room.isLocked = true;
    const complete = f.store.completeRoomUnblock.getMockImplementation()!;
    f.store.completeRoomUnblock.mockImplementationOnce(async (...args) => { const result = await complete(...args); f.leave(OTHER); return result; });
    await expect(f.service.unblock(f.actor(), block.id, f.gateway)).rejects.toMatchObject({ code: 'MODERATION_INCOMPLETE' });
    expect(f.state().memberBlocks).toEqual([]); expect(f.state().allowedMemberIds).toEqual([]);
    expect(f.access.isUncertain(f.state().room.id)).toBe(true);
    await f.reconcile(); expect(f.overwrite()).toBeUndefined();
  });

  it('does not lose roster continuity between reconciliation and final owner validation', async () => {
    const f = roomModerationFixture(); const block = f.seedBlock(); f.state().room.isLocked = true;
    const snapshot = f.gateway.snapshot.bind(f.gateway); let readsAfterComplete = 0;
    vi.spyOn(f.gateway, 'snapshot').mockImplementation(async id => {
      if (f.events.includes('complete') && ++readsAfterComplete === 2) f.leave(OTHER);
      return snapshot(id);
    });
    await expect(f.service.unblock(f.actor(), block.id, f.gateway)).rejects.toMatchObject({ code: 'MODERATION_INCOMPLETE' });
    expect(f.access.isUncertain(f.state().room.id)).toBe(true); expect(f.store.completeRoomUnblock).toHaveBeenCalledTimes(1);
    await f.reconcile(); expect(f.overwrite()).toBeUndefined();
  });

  describe('I1 departure receipts across final SQL', () => {
    const occupant = '32345678901234567';
    const depart = (f: ReturnType<typeof roomModerationFixture>, memberId: string, returns: boolean) => {
      f.leave(memberId); f.coordinator.recordDeparture(f.guild.id, f.channel.id, memberId, false);
      if (returns) { f.join(memberId); f.coordinator.recordArrival(f.guild.id, f.channel.id, memberId); }
    };

    it.each([
      { kind: 'block', returns: false }, { kind: 'block', returns: true },
      { kind: 'unblock', returns: false }, { kind: 'unblock', returns: true },
    ] as const)('quarantines $kind result on departure in the final owner SQL read (return=$returns)', async ({ kind, returns }) => {
      const f = roomModerationFixture(); f.state().room.isLocked = true;
      const block = kind === 'unblock' ? f.seedBlock() : undefined;
      const memberId = kind === 'unblock' ? OTHER : occupant;
      if (kind === 'block') f.join(occupant);
      let published = false; let confirmation = false; let injected = false;
      f.publishLocked.mockImplementationOnce(async () => { published = true; });
      const snapshot = f.gateway.snapshot.bind(f.gateway);
      vi.spyOn(f.gateway, 'snapshot').mockImplementation(async id => {
        const live = await snapshot(id);
        // Arm only AFTER the final owned snapshot was captured, not before it.
        if (published && !injected) { expect(live!.members.some(member => member.memberDiscordId === memberId)).toBe(true); confirmation = true; }
        return live;
      });
      const read = f.store.read.getMockImplementation()!;
      f.store.read.mockImplementation(async id => {
        const state = await read(id);
        if (confirmation && !injected) {
          expect(f.overwrite(memberId)!.allow.has(P.Connect)).toBe(true);
          injected = true; depart(f, memberId, returns);
        }
        return state;
      });
      const action = kind === 'unblock' ? f.service.unblock(f.actor(), block!.id, f.gateway) : f.service.block(f.actor(), OTHER, f.gateway);
      await expect(action).rejects.toMatchObject({ code: 'MODERATION_INCOMPLETE' });
      expect(injected).toBe(true); expect(f.access.isUncertain(f.state().room.id)).toBe(true);
      expect(f.publishLocked).toHaveBeenCalledTimes(1); expect(f.http).toHaveBeenCalledTimes(kind === 'block' ? 1 : 0);
      expect(f.state()).toMatchObject({ room: { ownerDiscordId: OWNER, controlVersion: 1 }, allowedMemberIds: [] });
      expect(f.state().memberBlocks).toHaveLength(kind === 'block' ? 1 : 0);
      expect(f.states.has(memberId)).toBe(returns);
      expect(f.coordinator.pendingDepartures(f.guild.id, f.channel.id)).toMatchObject([
        { memberId, ...(returns ? { returnedAt: expect.any(Date) } : {}) },
      ]);
      f.leave(memberId);
      await f.reconcile();
      expect(f.overwrite(memberId)).toBeUndefined(); expect(f.access.isUncertain(f.state().room.id)).toBe(false);
      expect(f.publishLocked).toHaveBeenCalledTimes(1); expect(f.http).toHaveBeenCalledTimes(kind === 'block' ? 1 : 0);
    });

    it.each([
      { window: 'final-confirmation', returns: false }, { window: 'final-confirmation', returns: true },
      { window: 'post-finalize', returns: false }, { window: 'post-finalize', returns: true },
    ] as const)('quarantines locked recovery on departure in $window SQL (return=$returns)', async ({ window, returns }) => {
      const f = roomModerationFixture(); f.state().room.isLocked = true; f.seedBlock(OTHER, 'UNBLOCK_PENDING');
      let confirmation = false; let injected = false;
      const snapshot = f.gateway.snapshot.bind(f.gateway);
      vi.spyOn(f.gateway, 'snapshot').mockImplementation(async id => {
        const live = await snapshot(id);
        if (f.events.includes('complete') && !injected) {
          expect(live!.members.some(member => member.memberDiscordId === OTHER)).toBe(true); confirmation = true;
        }
        return live;
      });
      const read = f.store.read.getMockImplementation()!;
      f.store.read.mockImplementation(async id => {
        const state = await read(id);
        if (!injected && (window === 'final-confirmation' ? confirmation : f.events.includes('complete'))) {
          expect(f.overwrite()!.allow.has(P.Connect)).toBe(true);
          injected = true; depart(f, OTHER, returns);
        }
        return state;
      });
      await expect(f.reconcile()).rejects.toMatchObject({ code: 'MODERATION_INCOMPLETE' });
      expect(injected).toBe(true); expect(f.access.isUncertain(f.state().room.id)).toBe(true);
      expect(f.state()).toMatchObject({ room: { ownerDiscordId: OWNER, controlVersion: 0 }, memberBlocks: [], allowedMemberIds: [] });
      expect(f.store.completeRoomUnblock).toHaveBeenCalledTimes(1);
      expect(f.publishLocked).not.toHaveBeenCalled(); expect(f.http).not.toHaveBeenCalled();
      expect(f.states.has(OTHER)).toBe(returns);
      f.leave(OTHER); await f.reconcile();
      expect(f.overwrite()).toBeUndefined(); expect(f.access.isUncertain(f.state().room.id)).toBe(false);
      expect(f.store.completeRoomUnblock).toHaveBeenCalledTimes(1);
      expect(f.publishLocked).not.toHaveBeenCalled(); expect(f.http).not.toHaveBeenCalled();
    });

    it('allows the blocked target removal receipt without invalidating other projected occupants', async () => {
      const f = roomModerationFixture(); f.state().room.isLocked = true; f.join(occupant);
      f.http.mockImplementationOnce(async id => { depart(f, id, false); });
      await expect(f.service.block(f.actor(), OTHER, f.gateway)).resolves.toMatchObject({ kind: 'blocked', removedFromRoom: true });
      expect(f.access.isUncertain(f.state().room.id)).toBe(false); expect(f.http).toHaveBeenCalledTimes(1);
    });

    it('keeps the quarantined read-only list independent of other occupant continuity', async () => {
      const f = roomModerationFixture(); const block = f.seedBlock(); f.access.markUncertain(f.state().room.id);
      let confirmation = false;
      const snapshot = f.gateway.snapshot.bind(f.gateway);
      vi.spyOn(f.gateway, 'snapshot').mockImplementationOnce(async id => { const live = await snapshot(id); confirmation = true; return live; });
      const read = f.store.read.getMockImplementation()!;
      f.store.read.mockImplementation(async id => {
        const state = await read(id); if (confirmation) { confirmation = false; depart(f, OTHER, false); } return state;
      });
      await expect(f.service.list(f.actor(), f.gateway)).resolves.toEqual([block]);
      expect(f.access.isUncertain(f.state().room.id)).toBe(true); expect(f.channel.permissionOverwrites.set).not.toHaveBeenCalled();
      expect(f.publishLocked).not.toHaveBeenCalled(); expect(f.http).not.toHaveBeenCalled();
    });
  });
});
