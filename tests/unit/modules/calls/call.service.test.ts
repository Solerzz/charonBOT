import { afterEach, describe, expect, it, vi } from 'vitest';

import { createLogger } from '../../../../src/core/logger/logger.js';
import type { CallPanelPayload } from '../../../../src/modules/calls/call-panel.view.js';
import { CallDiscordError, CallMoveUnconfirmedError } from '../../../../src/modules/calls/call.discord.js';
import { CallService } from '../../../../src/modules/calls/call.service.js';
import { creator, deferred, entry, lifecycleFixture, room } from './call.fixtures.js';
import { attachRoomRuntime, stopRoomFixtures } from './room-lifecycle.fixtures.js';

afterEach(stopRoomFixtures);

function fixture() {
  const f = lifecycleFixture();
  const logs: string[] = [];
  const logger = createLogger({ level: 'debug', destination: { write: (value: string) => { logs.push(value); } } });
  const runtime = attachRoomRuntime(f, logger);
  const service = new CallService(f.creators, f.rooms, runtime, logger);
  return { ...f, logs, runtime, service, handle: (input = entry) => service.handleVoiceTransition(input, f.gateway) };
}
function fields(payload: CallPanelPayload) {
  return JSON.parse(JSON.stringify(payload)).embeds[0].fields as { name: string; value: string }[];
}
const departure = { ...entry, oldChannelDiscordId: room.channelDiscordId, newChannelDiscordId: null, oldChannelMemberCount: 0 };

describe('CallService', () => {
  it('closes an empty quarantined room despite an unavailable access fence, retiring memory only after SQL closure', async () => {
    const f = fixture(); await f.handle();
    const record = f.records.get(room.id)!;
    vi.spyOn(f.runtime.store, 'updateSettings').mockRejectedValueOnce(new Error('indeterminate access SQL'));
    const fence = vi.spyOn(f.runtime.store, 'settleAccess').mockRejectedValue(new Error('unavailable fence'));
    await expect(f.runtime.controls.toggleLock({ roomId: room.id, guildDiscordId: room.guildDiscordId,
      memberDiscordId: room.ownerDiscordId!, controlVersion: record.controlVersion }, f.gateway)).rejects.toMatchObject({ code: 'PERSISTENCE_FAILURE' });
    expect(f.runtime.access.isUncertain(room.id)).toBe(true);
    const attempts = fence.mock.calls.length;
    const closing = f.rooms.markClosed.getMockImplementation()!;
    f.rooms.markClosed.mockImplementationOnce(async id => {
      expect(f.runtime.access.isUncertain(id)).toBe(true);
      return closing(id);
    });
    f.counts.set(room.channelDiscordId, 0); f.setMemberChannel(null);
    await f.handle(departure);
    expect(f.records.get(room.id)?.status).toBe('CLOSED'); expect(f.gateway.deleteChannel).toHaveBeenCalledOnce();
    expect(fence).toHaveBeenCalledTimes(attempts); expect(f.runtime.access.isUncertain(room.id)).toBe(false);
  });

  it.each([[0, '1 / Ilimitado'], [1, '1 / 1'], [4, '1 / 4'], [99, '1 / 99']] as const)('copies default %i to Discord, initial persistence and the retained panel', async (userLimit, capacity) => {
    const f = fixture(); f.configuration.defaultUserLimit = userLimit;
    await f.handle();
    expect(f.gateway.createTemporaryChannel).toHaveBeenCalledExactlyOnceWith({ categoryDiscordId: creator.categoryDiscordId, name: 'Game', userLimit });
    expect(f.rooms.createCreating).toHaveBeenCalledWith(expect.objectContaining({ name: 'Game', userLimit }));
    expect(f.records.get(room.id)).toMatchObject({ userLimit, controlMessageDiscordId: room.controlMessageDiscordId });
    expect(fields(f.gateway.sendControlPanel.mock.calls[0]![1])).toContainEqual({ name: 'Participantes', value: capacity, inline: true });
    expect(f.gateway.setLimit).not.toHaveBeenCalled();
    expect(f.gateway.rename).not.toHaveBeenCalled();
  });

  it.each([-1, 100, 1.5, undefined])('rejects invalid creator default %s before creating a channel or row', async (limit) => {
    const f = fixture(); f.configuration.defaultUserLimit = limit as number;
    await expect(f.handle()).rejects.toThrow();
    expect(f.gateway.createTemporaryChannel).not.toHaveBeenCalled();
    expect(f.rooms.createCreating).not.toHaveBeenCalled();
  });

  it('uses a captured creator snapshot while create awaits a concurrent default/category edit', async () => {
    const f = fixture(); f.configuration.defaultUserLimit = 4;
    const started = deferred(); const release = deferred();
    f.gateway.createTemporaryChannel.mockImplementationOnce(async () => {
      started.resolve(); await release.promise; return { channelDiscordId: room.channelDiscordId };
    });
    const creating = f.handle(); await started.promise;
    f.configuration.defaultUserLimit = 8; f.configuration.categoryDiscordId = '82345678901234567';
    release.resolve(); await creating;
    expect(f.gateway.createTemporaryChannel).toHaveBeenCalledExactlyOnceWith({ categoryDiscordId: creator.categoryDiscordId, name: 'Game', userLimit: 4 });
    expect(f.records.get(room.id)?.userLimit).toBe(4);
    expect(f.creators.findByChannel).toHaveBeenCalledOnce();
    expect(fields(f.gateway.sendControlPanel.mock.calls[0]![1])).toContainEqual({ name: 'Participantes', value: '1 / 4', inline: true });
  });

  it('reuses an owner-edited room without resetting its name, limit or panel after a template edit', async () => {
    const f = fixture(); f.configuration.defaultUserLimit = 99;
    f.records.set(room.id, { ...room, name: 'Owner name', userLimit: 8 });
    f.counts.set(room.channelDiscordId, 1);
    await f.handle();
    expect(f.gateway.createTemporaryChannel).not.toHaveBeenCalled();
    expect(f.rooms.createCreating).not.toHaveBeenCalled();
    expect(f.gateway.rename).not.toHaveBeenCalled(); expect(f.gateway.setLimit).not.toHaveBeenCalled();
    expect(f.records.get(room.id)).toMatchObject({ name: 'Owner name', userLimit: 8, controlMessageDiscordId: room.controlMessageDiscordId });
    expect(f.gateway.sendControlPanel).not.toHaveBeenCalled();
    expect(fields(f.gateway.updateControlPanel.mock.calls[0]![2])).toContainEqual({ name: 'Participantes', value: '2 / 8', inline: true });
  });

  it('applies an edited default only to the next newly created room and keeps automatic display-name fallback', async () => {
    const f = fixture(); f.configuration.defaultUserLimit = 4;
    await f.handle();
    const previous = f.records.get(room.id)!;
    f.configuration.defaultUserLimit = 8;
    expect(previous.userLimit).toBe(4);
    f.counts.set(room.channelDiscordId, 0); f.setMemberChannel(null);
    await f.handle(departure);
    f.setMemberChannel(creator.creatorChannelDiscordId);
    await f.handle({ ...entry, activityName: null });
    expect(f.gateway.createTemporaryChannel).toHaveBeenNthCalledWith(2, { categoryDiscordId: creator.categoryDiscordId, name: 'Member', userLimit: 8 });
    expect(f.records.get(room.id)?.userLimit).toBe(8);
  });
  it('retires historical coordinator metadata after permanently closing successive rooms', async () => {
    const f = fixture();
    const state = f.runtime.coordinator as unknown as { generations: Map<string, number>; departures: Map<string, unknown>; ownershipAttempts: Map<string, unknown>; accepted: Map<string, unknown> };
    for (let n = 0; n < 4; n++) {
      const current = { ...room, id: `223e4567-e89b-42d3-a456-42661417400${n}`, channelDiscordId: String(80000000000000000n + BigInt(n)) };
      f.records.set(current.id, current);
      await f.runtime.coordinator.room(current.guildDiscordId, current.channelDiscordId, () =>
        f.runtime.coordinator.changeOwnership(current.guildDiscordId, current.channelDiscordId, 0, null,
          () => f.runtime.store.changeOwner(current.id, 0, entry.memberDiscordId, null)));
      f.setMemberChannel(null);
      await f.handle({ ...departure, oldChannelDiscordId: current.channelDiscordId });
      expect(f.records.get(current.id)?.status).toBe('CLOSED');
      expect(state.generations.size).toBe(0);
      expect(state.departures.size).toBe(0);
      expect(state.ownershipAttempts.size).toBe(0);
      expect(state.accepted.size).toBe(0);
    }
  });

  it('retires a closed key only after accepted member work drains without wiping a live key or resurrecting late work', async () => {
    const f = fixture(); f.records.set(room.id, room);
    const live = { ...room, id: '323e4567-e89b-42d3-a456-426614174000', channelDiscordId: '82345678901234567' };
    f.records.set(live.id, live);
    const coordinator = f.runtime.coordinator;
    const state = coordinator as unknown as { generations: Map<string, number>; departures: Map<string, unknown>; ownershipAttempts: Map<string, unknown>; accepted: Map<string, unknown> };
    for (const current of [room, live]) await coordinator.room(current.guildDiscordId, current.channelDiscordId, () =>
      coordinator.changeOwnership(current.guildDiscordId, current.channelDiscordId, 0, null,
        () => f.runtime.store.changeOwner(current.id, 0, entry.memberDiscordId, null)));
    coordinator.recordDeparture(live.guildDiscordId, live.channelDiscordId, entry.memberDiscordId, false);
    const closedKey = `${room.guildDiscordId}:${room.channelDiscordId}`;
    const liveKey = `${live.guildDiscordId}:${live.channelDiscordId}`;
    const entered = deferred(); const release = deferred();
    const held = coordinator.member(entry.guildDiscordId, entry.memberDiscordId, async () => { entered.resolve(); await release.promise; });
    await entered.promise;
    f.setMemberChannel(null);
    const late = f.handle(departure);
    await f.handle({ ...departure, memberDiscordId: '72345678901234567' });
    expect(f.records.get(room.id)?.status).toBe('CLOSED');
    expect(state.generations.get(closedKey)).toBe(1); // Accepted member work still holds generation safety.
    release.resolve(); await Promise.all([held, late]);
    expect(state.generations.has(closedKey)).toBe(false);
    expect(state.departures.has(closedKey)).toBe(false);
    expect(state.ownershipAttempts.has(closedKey)).toBe(false);
    expect(state.accepted.size).toBe(0);
    expect(state.generations.get(liveKey)).toBe(1);
    expect(coordinator.pendingDepartures(live.guildDiscordId, live.channelDiscordId)).toHaveLength(1);
    await f.handle(departure); // A newly received event for durable CLOSED history cannot resurrect its key.
    expect(state.generations.has(closedKey)).toBe(false);
    expect(state.generations.get(liveKey)).toBe(1);
    expect(coordinator.pendingDepartures(live.guildDiscordId, live.channelDiscordId)).toHaveLength(1);
  });

  it('creates and closes disabled-creator rooms without ever publishing a panel', async () => {
    const f = fixture(); f.setControlsEnabled(false);
    await f.handle();
    expect(f.records.get(room.id)?.status).toBe('ACTIVE');
    expect(f.gateway.sendControlPanel).not.toHaveBeenCalled();
    expect((await f.runtime.store.read(room.id))?.presences).toHaveLength(1);
    f.counts.set(room.channelDiscordId, 0); f.setMemberChannel(null);
    await f.handle(departure);
    expect(f.records.get(room.id)?.status).toBe('CLOSED');
  });
  it('creates, persists, moves and sends a real panel, then activates with the message ID', async () => {
    const f = fixture();
    await f.handle();
    expect(f.gateway.createTemporaryChannel).toHaveBeenCalledExactlyOnceWith({ categoryDiscordId: creator.categoryDiscordId, name: 'Game', userLimit: 0 });
    expect(f.rooms.createCreating).toHaveBeenCalledExactlyOnceWith({ guildDiscordId: entry.guildDiscordId, voiceCreatorId: creator.id, channelDiscordId: room.channelDiscordId, ownerDiscordId: entry.memberDiscordId, name: 'Game', userLimit: 0 });
    expect(f.gateway.moveMember).toHaveBeenCalledExactlyOnceWith(room.channelDiscordId, creator.creatorChannelDiscordId);
    expect(fields(f.gateway.sendControlPanel.mock.calls[0]![1])).toContainEqual({ name: 'Participantes', value: '1 / Ilimitado', inline: true });
    expect(f.records.get(room.id)).toMatchObject({ status: 'ACTIVE', controlMessageDiscordId: room.controlMessageDiscordId });
  });

  it.each([
    { ...entry, memberIsBot: true },
    { ...entry, newChannelDiscordId: '72345678901234567' },
    { ...entry, oldChannelDiscordId: entry.newChannelDiscordId },
    { ...entry, newChannelDiscordId: null },
  ])('does not create for bots, unrelated moves, disconnects or same-channel updates: %j', async (input) => {
    const f = fixture();
    await f.handle(input);
    expect(f.gateway.createTemporaryChannel).not.toHaveBeenCalled();
  });

  it('serializes duplicate entries and never creates a second room for the active owner', async () => {
    const f = fixture();
    await Promise.all([f.handle(), f.handle()]);
    expect(f.gateway.createTemporaryChannel).toHaveBeenCalledTimes(1);
    expect(f.gateway.moveMember).toHaveBeenCalledTimes(1);
    f.setMemberChannel(creator.creatorChannelDiscordId);
    await f.handle();
    expect(f.gateway.createTemporaryChannel).toHaveBeenCalledTimes(1);
    expect(f.gateway.moveMember).toHaveBeenCalledTimes(2);
  });

  it('keeps existing rooms functional after the creator configuration is deleted', async () => {
    const f = fixture();
    f.records.set(room.id, room);
    f.creators.findByChannel.mockResolvedValue(null);
    f.counts.set(room.channelDiscordId, 2);
    f.setMemberChannel(null);
    await f.handle(departure);
    expect(f.records.get(room.id)?.ownerDiscordId).toBeNull();
    expect(fields(f.gateway.updateControlPanel.mock.calls[0]![2])).toContainEqual({ name: 'Proprietário', value: 'Sem proprietário', inline: true });
    expect(fields(f.gateway.updateControlPanel.mock.calls[0]![2])).toContainEqual({ name: 'Participantes', value: '2 / Ilimitado', inline: true });
    await f.handle();
    expect(f.gateway.createTemporaryChannel).not.toHaveBeenCalled();
  });

  it('keeps a non-owner departure harmless but invalidates a same-generation owner departure after return', async () => {
    const f = fixture();
    f.records.set(room.id, room);
    f.counts.set(room.channelDiscordId, 2);
    f.setMemberChannel(room.channelDiscordId);
    await f.handle({ ...departure, memberDiscordId: '72345678901234567' });
    expect(f.rooms.clearOwner).not.toHaveBeenCalled();
    f.setMemberChannel(room.channelDiscordId);
    await f.handle(departure);
    expect(f.records.get(room.id)).toMatchObject({ ownerDiscordId: null, controlVersion: 1 });
  });

  it('refreshes both old and new room panels when a participant moves between rooms', async () => {
    const f = fixture();
    const other = { ...room, id: '323e4567-e89b-42d3-a456-426614174000', channelDiscordId: '82345678901234567', ownerDiscordId: null };
    f.records.set(room.id, room); f.records.set(other.id, other);
    f.counts.set(room.channelDiscordId, 1); f.counts.set(other.channelDiscordId, 3);
    f.setMemberChannel(other.channelDiscordId);
    await f.handle({ ...departure, newChannelDiscordId: other.channelDiscordId });
    expect(f.gateway.updateControlPanel.mock.calls.map((c) => c[0])).toEqual([room.channelDiscordId, other.channelDiscordId]);
    expect(fields(f.gateway.updateControlPanel.mock.calls[1]![2])).toContainEqual({ name: 'Participantes', value: '3 / Ilimitado', inline: true });
  });

  it('closes an empty room using live state even when the event snapshot says occupied', async () => {
    const f = fixture();
    f.records.set(room.id, room); f.setMemberChannel(null);
    await f.handle({ ...departure, oldChannelMemberCount: 20 });
    expect(f.gateway.deleteChannel).toHaveBeenCalledExactlyOnceWith(room.channelDiscordId);
    expect(f.records.get(room.id)?.status).toBe('CLOSED');
    await f.handle(departure);
    expect(f.gateway.deleteChannel).toHaveBeenCalledTimes(1);
  });

  it('does not delete a room that becomes occupied while beginClosing awaits', async () => {
    const f = fixture();
    f.records.set(room.id, room); f.setMemberChannel(null);
    f.rooms.beginClosing.mockImplementationOnce(async () => { f.counts.set(room.channelDiscordId, 1); return { ...room, status: 'CLOSING' }; });
    await f.handle(departure);
    expect(f.gateway.deleteChannel).not.toHaveBeenCalled();
    expect(f.rooms.markClosed).not.toHaveBeenCalled();
  });

  it.each(['beginClosing', 'deleteChannel'] as const)('clears the absent owner when another member joins while %s awaits', async (stage) => {
    const f = fixture();
    f.records.set(room.id, room); f.setMemberChannel(null);
    const started = deferred(); const finish = deferred();
    if (stage === 'beginClosing') {
      const beginClosing = f.rooms.beginClosing.getMockImplementation()!;
      f.rooms.beginClosing.mockImplementationOnce(async (id) => {
        const closing = await beginClosing(id);
        started.resolve();
        await finish.promise;
        return closing;
      });
    } else {
      f.gateway.deleteChannel.mockImplementationOnce(async () => {
        started.resolve();
        await finish.promise;
        throw new CallDiscordError(); // Adapter refuses deletion after its fetch sees a new occupant.
      });
    }
    const leaving = f.handle(departure);
    await started.promise;
    f.counts.set(room.channelDiscordId, 1);
    finish.resolve();
    await leaving;
    expect(f.records.get(room.id)).toMatchObject({ status: 'CLOSING', ownerDiscordId: null });
    expect(f.rooms.clearOwner).toHaveBeenCalledExactlyOnceWith(room.id, entry.memberDiscordId);
    expect(f.rooms.markClosed).not.toHaveBeenCalled();
    expect(f.gateway.updateControlPanel).not.toHaveBeenCalled(); // CLOSING handles are not interactive panels.
  });

  it('does not redirect a former owner after deletion fails and another member later joins', async () => {
    const f = fixture();
    const retained = { ...room, id: '323e4567-e89b-42d3-a456-426614174000', channelDiscordId: '82345678901234567' };
    f.records.set(retained.id, retained); f.setMemberChannel(null);
    f.gateway.deleteChannel.mockRejectedValueOnce(new Error('permission'));
    await f.handle({ ...departure, oldChannelDiscordId: retained.channelDiscordId });
    f.counts.set(retained.channelDiscordId, 1);
    f.setMemberChannel(retained.channelDiscordId);
    await f.handle({ ...entry, memberDiscordId: '72345678901234567', newChannelDiscordId: retained.channelDiscordId });
    expect(f.records.get(retained.id)).toMatchObject({ status: 'CLOSING', ownerDiscordId: null });
    f.setMemberChannel(creator.creatorChannelDiscordId);
    await f.handle();
    expect(f.gateway.createTemporaryChannel).toHaveBeenCalledTimes(1);
    expect(f.gateway.moveMember).toHaveBeenCalledExactlyOnceWith(room.channelDiscordId, creator.creatorChannelDiscordId);
  });

  it('does not restore old ownership if the owner returns while closure awaits', async () => {
    const f = fixture();
    f.records.set(room.id, room); f.setMemberChannel(null);
    const beginClosing = f.rooms.beginClosing.getMockImplementation()!;
    f.rooms.beginClosing.mockImplementationOnce(async (id) => {
      const closing = await beginClosing(id);
      f.setMemberChannel(room.channelDiscordId); f.counts.set(room.channelDiscordId, 1);
      return closing;
    });
    await f.handle(departure);
    expect(f.records.get(room.id)).toMatchObject({ status: 'CLOSING', ownerDiscordId: null });
    expect(f.rooms.clearOwner).toHaveBeenCalledOnce();
    expect(f.gateway.deleteChannel).not.toHaveBeenCalled();
  });

  it('compensates failed creating persistence by deleting the Discord channel', async () => {
    const f = fixture(); f.configuration.defaultUserLimit = 4;
    f.rooms.createCreating.mockRejectedValueOnce(new Error('sensitive name'));
    await f.handle();
    expect(f.gateway.deleteChannel).toHaveBeenCalledExactlyOnceWith(room.channelDiscordId);
    expect(f.gateway.moveMember).not.toHaveBeenCalled();
    expect(f.logs.join('')).not.toContain('sensitive name');
  });

  it('compensates move failure by closing and deleting the unoccupied new room', async () => {
    const f = fixture(); f.configuration.defaultUserLimit = 4;
    f.gateway.moveMember.mockRejectedValueOnce(new Error('move failed'));
    await f.handle();
    expect(f.records.get(room.id)?.status).toBe('CLOSED');
    expect(f.records.get(room.id)?.userLimit).toBe(4);
    expect(f.gateway.deleteChannel).toHaveBeenCalledExactlyOnceWith(room.channelDiscordId);
    expect(f.gateway.sendControlPanel).not.toHaveBeenCalled();
  });

  it('rechecks voice after channel creation awaits and never drags a member back after disconnect', async () => {
    const f = fixture();
    const started = deferred(); const gate = deferred<{ channelDiscordId: string }>();
    f.gateway.createTemporaryChannel.mockImplementationOnce(async () => { started.resolve(); return gate.promise; });
    const creating = f.handle();
    await started.promise;
    f.setMemberChannel(null);
    const leaving = f.handle({ ...entry, oldChannelDiscordId: creator.creatorChannelDiscordId, newChannelDiscordId: null });
    gate.resolve({ channelDiscordId: room.channelDiscordId });
    await Promise.all([creating, leaving]);
    expect(f.gateway.moveMember).not.toHaveBeenCalled();
    expect(f.gateway.deleteChannel).toHaveBeenCalledExactlyOnceWith(room.channelDiscordId);
    expect(f.records.get(room.id)?.status).toBe('CLOSED');
  });

  it('retries the first panel-send failure once and saves the successful message ID', async () => {
    const f = fixture();
    f.gateway.sendControlPanel.mockRejectedValueOnce(new Error('first'));
    await f.handle();
    expect(f.gateway.sendControlPanel).toHaveBeenCalledTimes(2);
    expect(f.records.get(room.id)).toMatchObject({ status: 'ACTIVE', controlMessageDiscordId: room.controlMessageDiscordId });
  });

  it('keeps an active usable room with a null panel after both sends fail and logs only safe metadata', async () => {
    const f = fixture();
    f.gateway.sendControlPanel.mockRejectedValue(new Error('Game sensitive message'));
    await f.handle();
    expect(f.gateway.sendControlPanel).toHaveBeenCalledTimes(2);
    expect(f.records.get(room.id)).toMatchObject({ status: 'ACTIVE', controlMessageDiscordId: null });
    expect(f.gateway.deleteChannel).not.toHaveBeenCalled();
    expect(f.logs.join('')).not.toContain('Game');
    expect(f.logs.join('')).toContain('Error');
  });

  it('retains CLOSING tracking after delete fails and retries on a later voice event', async () => {
    const f = fixture();
    f.records.set(room.id, room); f.setMemberChannel(null);
    f.gateway.deleteChannel.mockRejectedValueOnce(new Error('permission'));
    await f.handle(departure);
    expect(f.records.get(room.id)?.status).toBe('CLOSING');
    expect(f.rooms.markClosed).not.toHaveBeenCalled();
    await f.handle(departure);
    expect(f.records.get(room.id)?.status).toBe('CLOSED');
  });

  it('retains durable CREATING state after final DB failure without deleting an occupied room or duplicating ownership', async () => {
    const f = fixture();
    f.rooms.markActive.mockRejectedValueOnce(new Error('DB offline'));
    await f.handle();
    expect(f.records.get(room.id)?.status).toBe('CREATING');
    expect(f.gateway.deleteChannel).not.toHaveBeenCalled();
    f.setMemberChannel(creator.creatorChannelDiscordId);
    await f.handle();
    expect(f.gateway.createTemporaryChannel).toHaveBeenCalledTimes(1);
    expect(f.records.get(room.id)?.status).toBe('ACTIVE');
  });

  it('queues synthetic move events without deadlocking or creating duplicate rooms', async () => {
    const f = fixture();
    let synthetic: Promise<void> | undefined;
    f.gateway.moveMember.mockImplementationOnce(async (id) => {
      f.setMemberChannel(id); f.counts.set(id, 1);
      synthetic = f.handle({ ...entry, oldChannelDiscordId: creator.creatorChannelDiscordId, newChannelDiscordId: id });
    });
    await f.handle();
    await synthetic;
    expect(f.gateway.createTemporaryChannel).toHaveBeenCalledTimes(1);
    expect(f.records.get(room.id)?.status).toBe('ACTIVE');
  });

  it('serializes overlapping room departures from different members', async () => {
    const f = fixture();
    f.records.set(room.id, room); f.setMemberChannel(null);
    await Promise.all([f.handle(departure), f.handle({ ...departure, memberDiscordId: '72345678901234567' })]);
    expect(f.gateway.deleteChannel).toHaveBeenCalledTimes(1);
    expect(f.records.get(room.id)?.status).toBe('CLOSED');
  });

  it('holds the new room lock while creating persistence awaits so another departure cannot close it before the move', async () => {
    const f = fixture();
    const persisted = deferred(); const finishPersist = deferred(); const competingLock = deferred();
    const create = f.rooms.createCreating.getMockImplementation()!;
    f.rooms.createCreating.mockImplementationOnce(async (input) => {
      const record = await create(input);
      persisted.resolve();
      await finishPersist.promise;
      return record;
    });
    const run = f.runtime.coordinator.room.bind(f.runtime.coordinator);
    let observeCompeting = false;
    vi.spyOn(f.runtime.coordinator, 'room').mockImplementation((guild, channel, operation) => {
      if (observeCompeting && guild === entry.guildDiscordId && channel === room.channelDiscordId) competingLock.resolve();
      return run(guild, channel, operation);
    });
    const creating = f.handle();
    await persisted.promise;
    observeCompeting = true;
    const departureEvent = f.handle({ ...departure, memberDiscordId: '72345678901234567' });
    await competingLock.promise;
    finishPersist.resolve();
    await Promise.all([creating, departureEvent]);
    expect(f.gateway.deleteChannel).not.toHaveBeenCalled();
    expect(f.records.get(room.id)?.status).toBe('ACTIVE');
  });

  it('does not destroy an occupied room after an uncertain move failure and clears the absent owner', async () => {
    const f = fixture(); f.configuration.defaultUserLimit = 4;
    f.gateway.moveMember.mockImplementationOnce(async () => {
      f.counts.set(room.channelDiscordId, 1); // A different member arrived.
      throw new Error('move failed');
    });
    await f.handle();
    expect(f.gateway.deleteChannel).not.toHaveBeenCalled();
    expect(f.records.get(room.id)).toMatchObject({ status: 'ACTIVE', ownerDiscordId: null, userLimit: 4 });
  });

  it('clears the absent creator owner when creation is cancelled but somebody else occupies the new room', async () => {
    const f = fixture();
    const create = f.rooms.createCreating.getMockImplementation()!;
    f.rooms.createCreating.mockImplementationOnce(async (input) => {
      const record = await create(input);
      f.setMemberChannel(null);
      f.counts.set(room.channelDiscordId, 1);
      return record;
    });
    await f.handle();
    expect(f.gateway.moveMember).not.toHaveBeenCalled();
    expect(f.gateway.deleteChannel).not.toHaveBeenCalled();
    expect(f.records.get(room.id)).toMatchObject({ status: 'ACTIVE', ownerDiscordId: null });
  });

  it('clears the absent creator owner if cancelled creation cleanup becomes occupied while closing', async () => {
    const f = fixture();
    const create = f.rooms.createCreating.getMockImplementation()!;
    f.rooms.createCreating.mockImplementationOnce(async (input) => {
      const created = await create(input);
      f.setMemberChannel(null);
      return created;
    });
    const beginClosing = f.rooms.beginClosing.getMockImplementation()!;
    f.rooms.beginClosing.mockImplementationOnce(async (id) => {
      const closing = await beginClosing(id);
      f.counts.set(room.channelDiscordId, 1);
      return closing;
    });
    await f.handle();
    expect(f.records.get(room.id)).toMatchObject({ status: 'CLOSING', ownerDiscordId: null });
    expect(f.rooms.clearOwner).toHaveBeenCalledExactlyOnceWith(room.id, entry.memberDiscordId);
    expect(f.rooms.markActive).not.toHaveBeenCalled();
    expect(f.gateway.moveMember).not.toHaveBeenCalled();
    expect(f.gateway.deleteChannel).not.toHaveBeenCalled();
  });

  it('continues arrival processing after an old-room panel edit fails', async () => {
    const f = fixture();
    const old = { ...room, id: '323e4567-e89b-42d3-a456-426614174000', channelDiscordId: '82345678901234567', ownerDiscordId: null };
    f.records.set(old.id, old);
    f.counts.set(old.channelDiscordId, 1);
    f.gateway.updateControlPanel.mockRejectedValueOnce(new Error('private room name'));
    await f.handle({ ...entry, oldChannelDiscordId: old.channelDiscordId });
    expect(f.gateway.createTemporaryChannel).toHaveBeenCalledTimes(1);
    expect(f.logs.join('')).not.toContain('private room name');
  });

  it('still closes rooms on bot departures without allowing bots to trigger creation', async () => {
    const f = fixture();
    f.records.set(room.id, room);
    await f.handle({ ...departure, memberIsBot: true, newChannelDiscordId: creator.creatorChannelDiscordId });
    expect(f.records.get(room.id)?.status).toBe('CLOSED');
    expect(f.gateway.createTemporaryChannel).not.toHaveBeenCalled();
  });

  it('retains tracking when the final close DB write fails after Discord deletion', async () => {
    const f = fixture();
    f.records.set(room.id, room);
    f.rooms.markClosed.mockRejectedValueOnce(new Error('DB offline'));
    await f.handle(departure);
    expect(f.records.get(room.id)?.status).toBe('CLOSING');
    await f.handle(departure);
    expect(f.records.get(room.id)?.status).toBe('CLOSED');
  });

  it('creates a new room if the previously owned room closes while its lookup awaits', async () => {
    const f = fixture();
    f.rooms.findActiveByOwner.mockResolvedValueOnce(room);
    // By the time its room lock is acquired, that row is no longer open.
    await f.handle();
    expect(f.gateway.createTemporaryChannel).toHaveBeenCalledTimes(1);
    expect(f.records.get(room.id)?.status).toBe('ACTIVE');
  });

  it('retries an empty owned CLOSING room on creator re-entry before creating a replacement', async () => {
    const f = fixture();
    const old = { ...room, id: '323e4567-e89b-42d3-a456-426614174000', channelDiscordId: '82345678901234567', status: 'CLOSING' as const };
    f.records.set(old.id, old);
    await f.handle();
    expect(f.gateway.deleteChannel).toHaveBeenCalledExactlyOnceWith(old.channelDiscordId);
    expect(f.records.get(old.id)?.status).toBe('CLOSED');
    expect(f.gateway.createTemporaryChannel).toHaveBeenCalledTimes(1);
  });

  it('retains recoverable CREATING tracking when REST movement succeeds but voice-state confirmation fails', async () => {
    const f = fixture();
    f.gateway.moveMember.mockRejectedValueOnce(new CallMoveUnconfirmedError());
    await f.handle();
    expect(f.records.get(room.id)?.status).toBe('CREATING');
    expect(f.gateway.deleteChannel).not.toHaveBeenCalled();
    expect(f.rooms.beginClosing).not.toHaveBeenCalled();
    f.counts.set(room.channelDiscordId, 1);
    f.setMemberChannel(room.channelDiscordId);
    await f.handle({ ...entry, oldChannelDiscordId: creator.creatorChannelDiscordId, newChannelDiscordId: room.channelDiscordId });
    expect(f.records.get(room.id)?.status).toBe('ACTIVE');
  });

  it('logs the actual new channel ID if gateway postflight compensation fails before persistence', async () => {
    const f = fixture();
    f.gateway.createTemporaryChannel.mockRejectedValueOnce(new CallDiscordError(room.channelDiscordId));
    await f.handle();
    expect(f.rooms.createCreating).not.toHaveBeenCalled();
    expect(f.logs.join('')).toContain(`"channelDiscordId":"${room.channelDiscordId}"`);
    expect(f.logs.join('')).not.toContain('Game');
  });
});
