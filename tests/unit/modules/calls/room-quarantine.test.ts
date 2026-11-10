import { MessageFlags, MessageFlagsBitField } from 'discord.js';
import type { Logger } from 'pino';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PrismaClient } from '../../../../src/generated/prisma/client.js';
import { CallInteractions, type CallInteraction } from '../../../../src/modules/calls/call.interactions.js';
import { encodeCallComponent, type CallComponent } from '../../../../src/modules/calls/call.schemas.js';
import { createRoomRuntime } from '../../../../src/modules/calls/room.runtime.js';
import { OWNER, OTHER } from '../ownership/ownership.fixtures.js';
import { deferred } from './call.fixtures.js';
import { roomSettingsFixture } from './room-settings.fixtures.js';

const runtimes: ReturnType<typeof createRoomRuntime>[] = [];
afterEach(async () => {
  await Promise.all(runtimes.splice(0).map(runtime => runtime.stop()));
  vi.useRealTimers(); vi.restoreAllMocks();
});

function fixture() {
  const f = roomSettingsFixture(); f.join(OTHER);
  const logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn() } as unknown as Logger;
  // Compose the production runtime/handler. Only the SQL and REST boundaries
  // are replaced, with durable rows, pending operations and native overwrites.
  const runtime = createRoomRuntime({} as PrismaClient, logger); runtimes.push(runtime);
  for (const method of ['read', 'readTransfer', 'findOwnedRoom', 'syncPresence', 'savePriority', 'changeOwner',
    'createTransfer', 'armTransfer', 'cancelTransfer', 'discardTransfer', 'invalidateTransfers',
    'finishTransfer', 'settleAccess', 'updateSettings', 'setAllowed'] as const) {
    vi.spyOn(runtime.store, method).mockImplementation(f.store[method] as never);
  }
  const handler = new CallInteractions({ ...runtime, logger }, () => f.gateway);
  const interaction = (action: CallComponent['action'], privateSource = false) => {
    const customId = encodeCallComponent({ version: 'v3', action, roomId: f.state().room.id,
      controlVersion: f.state().room.controlVersion } as CallComponent);
    return {
      customId, guild: f.guild, guildId: f.guild.id, channelId: f.channel.id,
      createdTimestamp: Date.now(), applicationId: f.bot.id, user: { id: OWNER },
      message: { id: privateSource ? '82345678901234567' : f.state().room.controlMessageDiscordId,
        flags: new MessageFlagsBitField(privateSource ? MessageFlags.Ephemeral : 0), author: { id: f.bot.id },
        interactionMetadata: { user: { id: OWNER } }, components: [{ components: [{ customId }] }] },
      values: [OTHER], inGuild: () => true, isButton: () => !privateSource, isStringSelectMenu: () => false,
      isUserSelectMenu: () => privateSource, isModalSubmit: () => false,
      deferUpdate: vi.fn(async () => {}), followUp: vi.fn(async () => ({ id: '82345678901234567' })),
      webhook: { editMessage: vi.fn(async () => ({ id: '82345678901234567' })) },
    };
  };
  const execute = (i: ReturnType<typeof interaction>) => handler.execute(i as unknown as CallInteraction);
  let fenceAvailable = false;
  const settle = f.store.settleAccess.getMockImplementation()!;
  f.store.settleAccess.mockImplementation(async (...args) => {
    if (!fenceAvailable) throw new Error('private SQL fence unavailable');
    return settle(...args);
  });
  const quarantine = async () => {
    f.store.updateSettings.mockRejectedValueOnce(new Error('indeterminate access writer'));
    await expect(runtime.controls.toggleLock(f.actor(), f.gateway)).rejects.toMatchObject({ code: 'PERSISTENCE_FAILURE' });
    expect(runtime.access.isUncertain(f.state().room.id)).toBe(true);
  };
  return { ...f, runtime, interaction, execute, quarantine, recover: () => { fenceAvailable = true; } };
}

describe('room-wide access quarantine with the real runtime', () => {
  it.each(['CLOSED', 'absent'] as const)('retires real unsettled access obligations only after confirmed %s SQL state', async terminal => {
    const f = fixture(); await f.quarantine(); const roomId = f.state().room.id;
    const memory = f.runtime.access as unknown as { uncertain: Set<string>; unsettled: Map<string, number> };
    expect(memory.unsettled.size).toBe(1);
    if (terminal === 'absent') f.roomStates.delete(roomId); else f.state().room.status = 'CLOSED';
    await f.runtime.coordinator.room(f.guild.id, f.channel.id, () => f.runtime.observeLocked(roomId, f.gateway));
    expect(memory.uncertain.size).toBe(0); expect(memory.unsettled.size).toBe(0);
  });

  it.each(['ACTIVE', 'CLOSING'] as const)('does not retire real %s unsettled obligations on failed reconciliation', async status => {
    const f = fixture(); await f.quarantine(); f.state().room.status = status;
    const memory = f.runtime.access as unknown as { unsettled: Map<string, number> };
    await expect(f.runtime.coordinator.room(f.guild.id, f.channel.id, () => f.runtime.observeLocked(f.state().room.id, f.gateway))).rejects.toMatchObject({ code: 'PERSISTENCE_FAILURE' });
    expect(memory.unsettled.size).toBe(1); expect(f.runtime.access.isUncertain(f.state().room.id)).toBe(true);
  });

  it('rejects a private transfer selection before creation/arming/CAS while the access fence is unavailable', async () => {
    const f = fixture(); await f.execute(f.interaction('transfer'));
    await f.quarantine(); const attempts = f.store.settleAccess.mock.calls.length;
    await f.execute(f.interaction('transfer-target', true));
    expect(f.state().transfer).toBeNull();
    expect(f.store.createTransfer).not.toHaveBeenCalled(); expect(f.store.armTransfer).not.toHaveBeenCalled();
    expect(f.store.changeOwner).not.toHaveBeenCalled();
    expect(f.store.settleAccess.mock.calls.length).toBeGreaterThan(attempts);
    expect(f.runtime.access.isUncertain(f.state().room.id)).toBe(true);
  });

  it('publishes the recovered generation, retires the old workspace and rejects old actors before allowing current controls', async () => {
    const f = fixture(); const open = f.interaction('transfer'); await f.execute(open);
    const old = f.actor(); await f.quarantine(); f.recover();
    await expect(f.runtime.transfers.begin(old, OTHER, f.gateway)).rejects.toMatchObject({ code: 'STALE_CONTROLS' });
    expect(f.store.createTransfer).not.toHaveBeenCalled(); expect(f.state().room.controlVersion).toBe(1);
    expect(f.runtime.access.isUncertain(old.roomId)).toBe(false);
    expect(JSON.stringify(f.channel.messages.edit.mock.calls)).toContain(':1');
    await f.runtime.workspaces.reconcile(old.roomId, await f.runtime.store.read(old.roomId));
    expect(open.webhook.editMessage).toHaveBeenCalledWith('82345678901234567', expect.objectContaining({ components: [] }));
    const transfer = await f.runtime.transfers.begin(f.actor(), OTHER, f.gateway);
    const armed = await f.runtime.transfers.activate(f.actor(), transfer.id, f.gateway);
    expect(armed?.expiresAt?.getTime()).toBeGreaterThanOrEqual(Date.now() + 4_900);
  });

  it.each(['activate', 'confirm', 'timeout'] as const)('does not admit pending %s before access settlement', async action => {
    vi.useFakeTimers(); const f = fixture();
    const pending = await f.runtime.transfers.begin(f.actor(), OTHER, f.gateway);
    if (action !== 'activate') await f.runtime.transfers.activate(f.actor(), pending.id, f.gateway);
    const deadline = f.state().transfer!.expiresAt?.getTime();
    await f.quarantine(); f.store.armTransfer.mockClear();
    if (action === 'timeout') vi.setSystemTime(Date.now() + 5_000);
    const result = action === 'activate' ? f.runtime.transfers.activate(f.actor(), pending.id, f.gateway)
      : action === 'confirm' ? f.runtime.transfers.confirm(f.actor(), pending.id, f.gateway)
        : f.runtime.transfers.expire(pending.id, f.gateway);
    await expect(result).rejects.toMatchObject({ code: 'PERSISTENCE_FAILURE' });
    expect(f.store.armTransfer).not.toHaveBeenCalled(); expect(f.store.finishTransfer).not.toHaveBeenCalled();
    expect(f.state().room.ownerDiscordId).toBe(OWNER);
    // Safe cancellation is permitted; no recovery path may extend/rearm it.
    expect(f.state().transfer).toBeNull();
    expect(f.runtime.timers.scheduledDeadlines().has(`transfer:${pending.roomId}`)).toBe(false);
    if (deadline !== undefined) expect(deadline).toBe(Date.now() + (action === 'timeout' ? 0 : 5_000));
  });

  it.each(['activate', 'confirm', 'timeout'] as const)('rejects an old pending %s after recovery invalidates its generation', async action => {
    vi.useFakeTimers(); const f = fixture(); const old = f.actor();
    const pending = await f.runtime.transfers.begin(old, OTHER, f.gateway);
    if (action !== 'activate') await f.runtime.transfers.activate(old, pending.id, f.gateway);
    await f.quarantine(); f.recover();
    if (action === 'timeout') vi.setSystemTime(Date.now() + 5_000);
    if (action === 'timeout') await f.runtime.transfers.expire(pending.id, f.gateway);
    else await expect(action === 'activate' ? f.runtime.transfers.activate(old, pending.id, f.gateway)
      : f.runtime.transfers.confirm(old, pending.id, f.gateway)).rejects.toMatchObject({ code: 'STALE_CONTROLS' });
    expect(f.store.finishTransfer).not.toHaveBeenCalled(); expect(f.state().transfer).toBeNull();
    expect(f.state().room).toMatchObject({ ownerDiscordId: OWNER, controlVersion: 1 });
    expect(f.runtime.access.isUncertain(old.roomId)).toBe(false);
  });

  it('quarantines claim without blocking owner departure, then fences the old claimant and accepts a current one', async () => {
    const f = fixture(); await f.quarantine(); f.leave(OWNER);
    f.runtime.coordinator.recordDeparture(f.guild.id, f.channel.id, OWNER, false);
    await f.runtime.coordinator.room(f.guild.id, f.channel.id, () => f.runtime.reconcileDeparturesLocked(f.state().room.id));
    expect(f.state().room.ownerDiscordId).toBeNull();
    const old = f.actorFor(OTHER); f.store.changeOwner.mockClear();
    await expect(f.runtime.ownership.claim(old, f.gateway)).rejects.toMatchObject({ code: 'PERSISTENCE_FAILURE' });
    expect(f.store.changeOwner).not.toHaveBeenCalled();
    f.recover();
    // Departure already advanced the generation: the fence need not bump again,
    // but the claimant still must wait for native projection/publication.
    await f.runtime.ownership.claim(f.actorFor(OTHER), f.gateway);
    expect(f.state().room.ownerDiscordId).toBe(OTHER);
    expect(f.runtime.access.isUncertain(old.roomId)).toBe(false);
  });

  it('rejects an old claim generation when settlement itself advances the generation', async () => {
    const f = fixture(); await f.quarantine();
    // An ownerless row can be observed after an external lifecycle write.
    f.state().room.ownerDiscordId = null; const old = f.actorFor(OTHER);
    f.recover();
    await expect(f.runtime.ownership.claim(old, f.gateway)).rejects.toMatchObject({ code: 'STALE_CONTROLS' });
    expect(f.store.changeOwner).not.toHaveBeenCalled(); expect(f.state().room.controlVersion).toBe(1);
    await f.runtime.ownership.claim(f.actorFor(OTHER), f.gateway);
    expect(f.state().room.ownerDiscordId).toBe(OTHER);
  });

  it('does not admit a recovered transfer if publishing the fenced controls fails', async () => {
    const f = fixture(); await f.quarantine(); f.recover();
    f.channel.messages.edit.mockRejectedValueOnce(new Error('private REST publication failure'));
    await expect(f.runtime.transfers.begin(f.actor(), OTHER, f.gateway)).rejects.toBeDefined();
    expect(f.store.createTransfer).not.toHaveBeenCalled(); expect(f.runtime.access.isUncertain(f.state().room.id)).toBe(true);
    const pending = await f.runtime.transfers.begin(f.actor(), OTHER, f.gateway);
    expect(f.state().transfer?.id).toBe(pending.id);
  });

  it('allows undo and unpublished cleanup without attempting the unavailable fence', async () => {
    const f = fixture(); const pending = await f.runtime.transfers.begin(f.actor(), OTHER, f.gateway);
    await f.runtime.transfers.activate(f.actor(), pending.id, f.gateway); await f.quarantine();
    const attempts = f.store.settleAccess.mock.calls.length;
    await f.runtime.transfers.undo(f.actor(), pending.id, f.gateway);
    expect(f.state().transfer).toBeNull(); expect(f.store.settleAccess).toHaveBeenCalledTimes(attempts);
    await f.runtime.transfers.abortUnpublished(pending.id, f.gateway);
    expect(f.runtime.access.isUncertain(f.state().room.id)).toBe(true);
  });

  it('keeps an already armed deadline unchanged across successful non-fencing reconciliation and rejects late confirmation', async () => {
    vi.useFakeTimers(); const f = fixture();
    const pending = await f.runtime.transfers.begin(f.actor(), OTHER, f.gateway);
    const armed = await f.runtime.transfers.activate(f.actor(), pending.id, f.gateway);
    const deadline = armed!.expiresAt!.getTime();
    f.runtime.access.markUncertain(pending.roomId);
    const entered = deferred(); const release = deferred();
    const write = f.channel.permissionOverwrites.set.getMockImplementation()!;
    f.channel.permissionOverwrites.set.mockImplementationOnce(async input => { await write(input); entered.resolve(); await release.promise; });
    const confirming = f.runtime.transfers.confirm(f.actor(), pending.id, f.gateway);
    const outcome = confirming.catch((error: unknown) => error);
    await entered.promise;
    expect(f.state().room.ownerDiscordId).toBe(OWNER); expect(f.store.finishTransfer).not.toHaveBeenCalled();
    expect(f.state().transfer!.expiresAt!.getTime()).toBe(deadline);
    vi.setSystemTime(deadline); release.resolve();
    expect(await outcome).toMatchObject({ code: 'TRANSFER_EXPIRED' });
    expect(f.runtime.timers.scheduledDeadlines().get(`transfer:${pending.roomId}`)?.getTime()).toBe(deadline);
    await f.runtime.transfers.expire(pending.id, f.gateway);
    expect(f.state().room.ownerDiscordId).toBe(OTHER);
    expect(f.store.armTransfer).toHaveBeenCalledTimes(1);
  });
});
