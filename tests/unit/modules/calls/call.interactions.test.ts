import { MessageFlags, MessageFlagsBitField, OverwriteType, PermissionFlagsBits as P, PermissionsBitField, type Interaction } from 'discord.js';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';

import { CallInteractions, type CallInteraction } from '../../../../src/modules/calls/call.interactions.js';
import { encodeCallComponent, type CallComponent } from '../../../../src/modules/calls/call.schemas.js';
import { RoomPanelService } from '../../../../src/modules/calls/room-panel.service.js';
import { TransferService } from '../../../../src/modules/ownership/transfer.service.js';
import { OWNER, OTHER } from '../ownership/ownership.fixtures.js';
import { deferred } from './call.fixtures.js';
import { roomSettingsFixture } from './room-settings.fixtures.js';
import { CallPrivateWorkspace } from '../../../../src/modules/calls/call-workspace.js';
import { createLogger } from '../../../../src/core/logger/logger.js';
import { PrismaRoomStateRepository } from '../../../../src/modules/calls/room-state.repository.js';
import type { Prisma, PrismaClient } from '../../../../src/generated/prisma/client.js';
import { creator } from './call.fixtures.js';

function fixture() {
  const f = roomSettingsFixture();
  f.join(OTHER);
  const transfers = new TransferService({ ...f, onChangedLocked: f.onChangedLocked });
  const panels = new RoomPanelService(f);
  const workspaces = new CallPrivateWorkspace();
  const metricLines: string[] = [];
  const logger = createLogger({ level: 'info', destination: { write: line => { metricLines.push(line); } } });
  const handler = new CallInteractions({ ...f, ownership: f.service, transfers, panels, workspaces, logger }, () => f.gateway);
  const interaction = (action: CallComponent['action'], kind = 'button', member = OWNER) => {
    const component = { version: 'v3', action, roomId: f.state().room.id,
      ...(['confirm', 'undo'].includes(action) ? { operationId: f.state().transfer!.id } : { controlVersion: f.state().room.controlVersion }) } as CallComponent;
    const privateSource = kind === 'user' || action === 'confirm' || action === 'undo';
    const customId = encodeCallComponent(component);
    const i = {
      id: '72345678901234567', customId, guild: f.guild, createdTimestamp: Date.now(), applicationId: '92345678901234567',
      message: { id: privateSource ? '82345678901234567' : f.state().room.controlMessageDiscordId,
        flags: new MessageFlagsBitField(privateSource ? MessageFlags.Ephemeral : 0),
        author: { id: '92345678901234567' }, interactionMetadata: { user: { id: member } },
        components: [{ components: [{ customId }] }] },
      guildId: f.state().room.guildDiscordId, channelId: f.state().room.channelDiscordId, user: { id: member },
      values: [] as string[], fields: { getTextInputValue: (_key: string) => 'New' },
      inGuild: () => true, isButton: () => kind === 'button', isStringSelectMenu: () => kind === 'string',
      isUserSelectMenu: () => kind === 'user', isModalSubmit: () => kind === 'modal',
      isFromMessage: () => true,
      reply: vi.fn(async (_payload: unknown) => ({ id: '82345678901234567' })),
      deferReply: vi.fn(async (_payload: unknown) => {}),
      deferUpdate: vi.fn(async () => {}),
      followUp: vi.fn(async (_payload: unknown) => ({ id: '82345678901234567' })),
      deleteReply: vi.fn(async () => {}),
      editReply: vi.fn(async (_payload: unknown) => ({ id: '82345678901234567' })),
      webhook: { editMessage: vi.fn(async (_id: string, _payload: unknown) => ({ id: '82345678901234567' })) },
      showModal: vi.fn(async (_payload: unknown) => {}),
    };
    return i;
  };
  const execute = (i: ReturnType<typeof interaction>) => handler.execute(i as unknown as CallInteraction);
  return { ...f, handler, transfers, panels, workspaces, interaction, execute, metricLines };
}

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('CallInteractions real controllers', () => {
  it.each(['lock', 'visibility', 'rename-save', 'limit-save'] as const)('benchmarks %s with identical virtual boundary delays and real controllers', async action => {
    const samples: unknown[] = [];
    for (let sample = 0; sample < 3; sample++) {
      const f = fixture(); let now = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => now);
      // Real repository mapping/CAS, only its DB transport is simulated.
      const findUnique = vi.fn(async () => {
        now += 2; const s = f.state();
        return { ...structuredClone(s.room), voiceCreator: { ...creator, roomCommandsEnabled: s.controlsEnabled },
          presences: s.presences, allowedMembers: s.allowedMemberIds.map(memberDiscordId => ({ memberDiscordId })), pendingTransfer: s.transfer };
      });
      const updateMany = vi.fn(async ({ where, data }: Prisma.TemporaryRoomUpdateManyArgs) => {
        now += 2; const s = f.state();
        if (where?.id !== s.room.id || where.controlVersion !== s.room.controlVersion || !s.controlsEnabled || s.room.status !== 'ACTIVE') return { count: 0 };
        Object.assign(s.room, data); return { count: 1 };
      });
      const repository = new PrismaRoomStateRepository({ temporaryRoom: { findUnique, updateMany } } as unknown as PrismaClient);
      f.store.read.mockImplementation(id => repository.read(id));
      f.store.updateSettings.mockImplementation((...args) => repository.updateSettings(...args));
      f.onChangedLocked.mockImplementation(id => f.panels.synchronizeLocked(id, f.gateway));
      const rest: Record<string, Mock> = {
        channel: f.guild.channels.fetch, member: f.guild.members.fetch, bot: f.guild.members.fetchMe, role: f.guild.roles.fetch,
        rename: f.channel.setName, limit: f.channel.setUserLimit, access: f.channel.permissionOverwrites.set,
        messageFetch: f.channel.messages.fetch, messageEdit: f.message.edit, messageManagerEdit: f.channel.messages.edit,
      };
      for (const spy of Object.values(rest)) {
        const original = spy.getMockImplementation()!;
        spy.mockImplementation(async (...args) => { now += 5; return original(...args); });
      }
      const i = f.interaction(action, action.endsWith('-save') ? 'modal' : 'button');
      if (action === 'limit-save') i.fields.getTextInputValue = () => '4';
      i.deferUpdate.mockImplementation(async () => { now += 3; });
      const held = deferred(); const release = deferred(); const queued = deferred();
      const holder = f.coordinator.room(i.guildId, i.channelId, async () => { held.resolve(); await release.promise; });
      await held.promise;
      const originalRoom = f.coordinator.room.bind(f.coordinator);
      const roomSpy = vi.spyOn(f.coordinator, 'room').mockImplementation((guild, channel, work) => {
        queued.resolve(); return originalRoom(guild, channel, work);
      });
      const running = f.execute(i); await queued.promise; now += 7; release.resolve();
      await Promise.all([holder, running]);
      const trace = JSON.parse(f.metricLines[0]!);
      expect(trace.result).toBe('success');
      expect(trace.stages).toMatchObject({ ack: { count: 1, durationMs: 3 }, queue: { count: 2, durationMs: 7 }, persist: { count: 1, durationMs: 2 }, panel: { count: 1 } });
      const accessAction = action === 'lock' || action === 'visibility';
      expect(trace.durationMs).toBe(accessAction ? 157 : 133);
      expect(findUnique).toHaveBeenCalledTimes(accessAction ? 10 : 8);
      expect(updateMany).toHaveBeenCalledOnce();
      expect(f.channel.messages.fetch).not.toHaveBeenCalled();
      expect(f.channel.messages.edit).toHaveBeenCalledOnce();
      expect(Object.values(rest).reduce((count, spy) => count + spy.mock.calls.length, 0)).toBe(accessAction ? 25 : 21);
      expect(f.state().room).toMatchObject(action === 'lock' ? { isLocked: true } : action === 'visibility' ? { visibility: 'PRIVATE' } : action === 'rename-save' ? { name: 'New' } : { userLimit: 4 });
      samples.push({ sample, action, durationMs: trace.durationMs, stages: trace.stages,
        rest: Object.fromEntries(Object.entries(rest).map(([name, spy]) => [name, spy.mock.calls.length])),
        db: { reads: findUnique.mock.calls.length, writes: updateMany.mock.calls.length } });
      roomSpy.mockRestore(); await f.workspaces.stop(); await f.timers.stop();
    }
    if (process.env.CALL_ACTION_BENCHMARK === 'true') console.info(JSON.stringify({ benchmark: 'virtual-boundary-ms', samples }));
  });
  it('traces source ack and modal launch, and labels handled failures as error', async () => {
    const f = fixture();
    await f.execute(f.interaction('lock'));
    await f.execute(f.interaction('rename'));
    const failed = f.interaction('lock');
    f.store.read.mockRejectedValueOnce(new Error('room-secret token-secret https://private.invalid'));
    await f.execute(failed);
    const invalid = f.interaction('lock'); invalid.customId = 'call:private-forged-token'; await f.execute(invalid);
    const logs = f.metricLines.map(line => JSON.parse(line));
    expect(logs).toHaveLength(4);
    expect(logs[0]).toMatchObject({ action: 'lock', result: 'success', stages: { ack: { count: 1 }, queue: { count: 2 } } });
    expect(logs[1]).toMatchObject({ action: 'rename', result: 'success', stages: { ack: { count: 1 } } });
    expect(logs[2]).toMatchObject({ action: 'lock', result: 'error' });
    expect(logs[3]).toMatchObject({ action: 'invalid', result: 'error', stages: { ack: { count: 1 } } });
    for (const secret of ['room-secret', 'token-secret', 'private.invalid', 'private-forged-token', OWNER]) expect(f.metricLines.join('')).not.toContain(secret);
    await f.workspaces.stop(); await f.timers.stop();
  });
  it('measures private workspace publication and direct webhook edits', async () => {
    const f = fixture(); await f.execute(f.interaction('access'));
    const select = f.interaction('allow-add', 'user'); select.values = [OTHER]; await f.execute(select);
    const logs = f.metricLines.map(line => JSON.parse(line));
    expect(logs).toHaveLength(2);
    expect(logs[0]).toMatchObject({ action: 'access', result: 'success', stages: { panel: { count: 1 } } });
    expect(logs[1]).toMatchObject({ action: 'allow-add', result: 'success', stages: { panel: { count: 1 } } });
    await f.workspaces.stop(); await f.timers.stop();
  });
  it('toggles lock publicly with source ack and no generic success', async () => {
    const f = fixture(); const publicLock = f.interaction('lock');
    await f.execute(publicLock);
    expect(f.state().room.isLocked).toBe(true);
    expect(publicLock.deferUpdate).toHaveBeenCalledOnce();
    expect(publicLock.deferReply).not.toHaveBeenCalled();
    expect(publicLock.followUp).not.toHaveBeenCalled();
    expect(publicLock.deleteReply).not.toHaveBeenCalled();
    expect(JSON.stringify(publicLock.editReply.mock.calls)).not.toContain('Ação concluída');
    await f.workspaces.stop(); await f.timers.stop();
  });

  it.each(['visibility', 'menu', 'rename-save', 'confirm', 'claim'])('recognizes but rejects v2 %s before ack or mutation', async action => {
    const f = fixture(); const i = f.interaction('visibility');
    i.customId = `call:v2:${action}:${f.state().room.id}:${action === 'confirm' ? '123e4567-e89b-42d3-a456-426614174000' : '0'}`;
    expect(f.handler.canHandle(i as unknown as Interaction)).toBe(true);
    await f.execute(i);
    expect(i.reply.mock.calls[0]?.[0]).toMatchObject({ flags: MessageFlags.Ephemeral });
    expect(i.deferUpdate).not.toHaveBeenCalled();
    expect(f.store.updateSettings).not.toHaveBeenCalled(); expect(f.store.changeOwner).not.toHaveBeenCalled();
    expect(f.channel.permissionOverwrites.set).not.toHaveBeenCalled();
    await f.workspaces.stop(); await f.timers.stop();
  });

  it('submits a modal without a message using an own ephemeral reply, then removes only that response', async () => {
    const f = fixture(); const i = f.interaction('rename-save', 'modal'); i.isFromMessage = () => false;
    await f.execute(i);
    expect(f.state().room.name).toBe('New');
    expect(i.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
    expect(i.deleteReply).toHaveBeenCalledOnce(); expect(i.editReply).not.toHaveBeenCalled();
    await f.workspaces.stop(); await f.timers.stop();
  });

  it('coalesces concurrent opens, edits the returned private ID, and does not renew the public token', async () => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = fixture(); const first = f.interaction('access'); first.createdTimestamp = -800_000;
    const opened = deferred(); const release = deferred<{ id: string }>();
    first.followUp.mockImplementationOnce(async () => { opened.resolve(); return release.promise; });
    const opening = f.execute(first); await opened.promise;
    const other = f.interaction('transfer'); const reopening = f.execute(other);
    release.resolve({ id: '82345678901234567' }); await Promise.all([opening, reopening]);
    expect(first.deferUpdate.mock.invocationCallOrder[0]).toBeLessThan(f.store.read.mock.invocationCallOrder[0]!);
    expect(first.followUp).toHaveBeenCalledOnce(); expect(other.followUp).not.toHaveBeenCalled();
    expect(first.webhook.editMessage).toHaveBeenCalledWith('82345678901234567', expect.anything());
    expect(first.editReply).not.toHaveBeenCalled(); expect(other.editReply).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(99_999);
    await f.execute(f.interaction('access'));
    await vi.advanceTimersByTimeAsync(1);
    const fresh = f.interaction('access'); await f.execute(fresh);
    expect(fresh.followUp).toHaveBeenCalledOnce();
    await f.workspaces.stop(); await f.timers.stop();
  });

  it('renews only a proven private origin, using that interaction real lifetime', async () => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = fixture(); const first = f.interaction('access'); first.createdTimestamp = -899_000;
    await f.execute(first);
    const select = f.interaction('allow-add', 'user'); select.values = [OTHER]; select.createdTimestamp = -1_000;
    await f.execute(select); expect(f.state().allowedMemberIds).toEqual([OTHER]);
    await vi.advanceTimersByTimeAsync(2_000);
    const reopen = f.interaction('transfer'); await f.execute(reopen);
    expect(reopen.followUp).not.toHaveBeenCalled();
    expect(JSON.stringify(select.webhook.editMessage.mock.calls)).toContain('Selecionar novo proprietário');
    await f.workspaces.stop(); await f.timers.stop();
  });

  it.each(['panel', 'public-id', 'private-flag', 'author', 'recipient', 'component', 'disabled', 'absent', 'version'] as const)('does not adopt or mutate a private %s forgery', async fault => {
    const f = fixture(); const i = f.interaction('allow-add', 'user'); i.values = [OTHER];
    if (fault === 'panel') f.state().room.controlMessageDiscordId = null;
    if (fault === 'public-id') i.message.id = f.state().room.controlMessageDiscordId;
    if (fault === 'private-flag') i.message.flags = new MessageFlagsBitField();
    if (fault === 'author') i.message.author.id = OTHER;
    if (fault === 'recipient') i.message.interactionMetadata.user.id = OTHER;
    if (fault === 'component') i.message.components = [];
    if (fault === 'disabled') f.state().controlsEnabled = false;
    if (fault === 'absent') f.leave(OWNER);
    if (fault === 'version') f.state().room.controlVersion++;
    await f.execute(i);
    expect(f.state().allowedMemberIds).toEqual([]); expect(f.store.setAllowed).not.toHaveBeenCalled();
    expect(i.webhook.editMessage).not.toHaveBeenCalled();
    if (fault === 'panel') f.state().room.controlMessageDiscordId = '62345678901234567';
    f.state().controlsEnabled = true; f.join(OWNER);
    const open = f.interaction('access'); await f.execute(open);
    expect(open.followUp).toHaveBeenCalledOnce();
    await f.workspaces.stop(); await f.timers.stop();
  });

  it.each(['lock', 'visibility', 'rename', 'limit', 'access', 'transfer'] as const)('denies %s to an authorized nonowner and absent owner/admin', async action => {
    const f = fixture(); f.state().allowedMemberIds = [OTHER];
    const authorized = f.interaction(action, 'button', OTHER); await f.execute(authorized);
    f.leave(OWNER); const absent = f.interaction(action); await f.execute(absent);
    expect(f.state().room).toMatchObject({ name: 'Game', visibility: 'PUBLIC', isLocked: false, userLimit: 0, ownerDiscordId: OWNER });
    expect(f.store.updateSettings).not.toHaveBeenCalled(); expect(f.store.createTransfer).not.toHaveBeenCalled();
    expect(authorized.showModal).not.toHaveBeenCalled(); expect(absent.showModal).not.toHaveBeenCalled();
    expect(JSON.stringify([...authorized.followUp.mock.calls, ...authorized.reply.mock.calls])).toContain('expirou');
    await f.workspaces.stop(); await f.timers.stop();
  });

  it('reopens the SQL pending operation instead of hiding it behind access/target selection', async () => {
    const f = fixture(); const pending = await f.transfers.begin(f.actor(), OTHER, f.gateway);
    const access = f.interaction('access'); await f.execute(access);
    expect(JSON.stringify(access.followUp.mock.calls)).toContain(pending.id);
    expect(JSON.stringify(access.followUp.mock.calls)).not.toContain('Adicionar autorizado');
    const target = f.interaction('transfer'); await f.execute(target);
    expect(JSON.stringify(access.webhook.editMessage.mock.calls)).toContain(pending.id);
    expect(target.followUp).not.toHaveBeenCalled(); expect(f.store.createTransfer).toHaveBeenCalledOnce();
    await f.workspaces.stop(); await f.timers.stop();
  });

  it('does not turn a followUp returning the public ID into an editable private handle', async () => {
    const f = fixture(); const i = f.interaction('access');
    i.followUp.mockResolvedValueOnce({ id: f.state().room.controlMessageDiscordId! });
    await f.execute(i);
    await f.execute(f.interaction('transfer'));
    expect(i.webhook.editMessage).not.toHaveBeenCalledWith(f.state().room.controlMessageDiscordId, expect.anything());
    await f.workspaces.stop(); await f.timers.stop();
  });

  it('retires a fenced private handle after an indeterminate access write even though the durable change happened', async () => {
    const f = fixture(); const open = f.interaction('access'); await f.execute(open);
    f.store.setAllowed.mockImplementationOnce(async () => {
      f.state().allowedMemberIds = [OTHER]; throw new Error('lost SQL acknowledgment');
    });
    const select = f.interaction('allow-add', 'user'); select.values = [OTHER];
    await f.execute(select);
    expect(f.state().room.controlVersion).toBe(1); expect(f.state().allowedMemberIds).toEqual([OTHER]);
    expect(select.editReply).not.toHaveBeenCalled();
    expect(JSON.stringify(select.followUp.mock.calls)).toContain('expirou');
    expect(f.onChangedLocked).toHaveBeenCalled();
    const reopen = f.interaction('access'); await f.execute(reopen);
    expect(reopen.followUp).toHaveBeenCalledOnce();
    const edits = select.webhook.editMessage.mock.calls.length;
    await f.execute(select);
    expect(select.webhook.editMessage).toHaveBeenCalledTimes(edits);
    await f.workspaces.stop(); await f.timers.stop();
  });

  it('serializes public toggles against current state instead of the pre-lock snapshot', async () => {
    const f = fixture();
    await Promise.all([f.execute(f.interaction('lock')), f.execute(f.interaction('lock')), f.execute(f.interaction('visibility'))]);
    expect(f.state().room).toMatchObject({ isLocked: false, visibility: 'PRIVATE' });
    expect(f.store.updateSettings.mock.calls.map(call => call[2])).toEqual([{ isLocked: true }, { isLocked: false }, { visibility: 'PRIVATE' }]);
    await f.workspaces.stop(); await f.timers.stop();
  });

  it('leaves native and SQL name unchanged when the owner departs during the action', async () => {
    const f = fixture(); f.channel.setName.mockImplementationOnce(async name => { f.channel.name = name; f.leave(OWNER); });
    const i = f.interaction('rename-save', 'modal'); await f.execute(i);
    expect(f.state().room.name).toBe('Game'); expect(f.channel.name).toBe('Game');
    expect(i.editReply).not.toHaveBeenCalled(); expect(JSON.stringify(i.followUp.mock.calls)).toContain('expirou');
    await f.workspaces.stop(); await f.timers.stop();
  });

  it('keeps pending controls visible after a competing private access selection and clears its error on the next flow', async () => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = fixture(); const target = f.interaction('transfer-target', 'user'); target.values = [OTHER]; await f.execute(target);
    const operationId = f.state().transfer!.id;
    const access = f.interaction('allow-add', 'user'); access.values = [OTHER]; await f.execute(access);
    expect(f.state().allowedMemberIds).toEqual([]);
    expect(access.editReply).not.toHaveBeenCalled();
    expect(JSON.stringify(access.webhook.editMessage.mock.calls.at(-1))).toContain(operationId);
    expect(JSON.stringify(access.webhook.editMessage.mock.calls.at(-1))).toContain('pendente');
    const undo = f.interaction('undo'); await f.execute(undo); await vi.advanceTimersByTimeAsync(0);
    const next = f.interaction('access'); await f.execute(next);
    expect(undo.webhook.editMessage.mock.calls.at(-1)?.[1]).toMatchObject({ content: '' });
    expect(JSON.stringify(undo.webhook.editMessage.mock.calls.at(-1))).toContain('Adicionar autorizado');
    await f.workspaces.stop(); await f.timers.stop();
  });

  it('keeps a newly armed transfer visible when an older invalid selection resumes with a stale error snapshot', async () => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = fixture();
    let visible: { content?: string; components: { components: { custom_id: string; label: string }[] }[] };
    const render = (payload: unknown) => { visible = JSON.parse(JSON.stringify(payload)); return { id: '82345678901234567' }; };
    const open = f.interaction('access'); open.followUp.mockImplementation(async payload => render(payload)); await f.execute(open);
    const invalid = f.interaction('allow-add', 'user');
    invalid.editReply.mockImplementation(async payload => render(payload));
    invalid.webhook.editMessage.mockImplementation(async (_id, payload) => render(payload));
    const entered = deferred(); const release = deferred();
    let pauseNextRead = false;
    const adopt = f.workspaces.adopt.bind(f.workspaces);
    vi.spyOn(f.workspaces, 'adopt').mockImplementationOnce((...args) => { adopt(...args); pauseNextRead = true; });
    const read = f.store.read.getMockImplementation()!;
    f.store.read.mockImplementation(async id => {
      const snapshot = await read(id);
      if (pauseNextRead) {
        pauseNextRead = false;
        expect(snapshot?.transfer).toBeNull(); entered.resolve(); await release.promise;
      }
      return snapshot;
    });
    const failing = f.execute(invalid); await entered.promise;
    try {
      const target = f.interaction('transfer-target', 'user'); target.values = [OTHER];
      target.webhook.editMessage.mockImplementation(async (_id, payload) => render(payload));
      await f.execute(target);
      const pending = structuredClone(f.state().transfer!);
      expect(pending.expiresAt).toEqual(new Date(5_000));
      expect(visible!.components.flatMap(row => row.components).map(button => button.label)).toEqual(['Confirmar', 'Desfazer']);
      vi.setSystemTime(1_000); release.resolve(); await failing;
      expect(f.state().transfer).toEqual(pending);
      expect(visible!.components.flatMap(row => row.components).map(button => button.custom_id)).toEqual([
        `call:v3:confirm:${f.state().room.id}:${pending.id}`, `call:v3:undo:${f.state().room.id}:${pending.id}`,
      ]);
      expect(invalid.editReply).not.toHaveBeenCalled();
      expect(f.store.createTransfer).toHaveBeenCalledOnce(); expect(f.store.armTransfer).toHaveBeenCalledOnce();
      expect(open.followUp).toHaveBeenCalledOnce(); expect(invalid.followUp).not.toHaveBeenCalled(); expect(target.followUp).not.toHaveBeenCalled();
      expect(f.state().room.ownerDiscordId).toBe(OWNER);
    } finally {
      release.resolve(); await failing; await f.workspaces.stop(); await f.timers.stop();
    }
  });

  it('releases the coordinator while a queued private error waits for Discord delivery', async () => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = fixture(); await f.execute(f.interaction('access'));
    const entered = deferred(); const release = deferred(); const created = deferred();
    const invalid = f.interaction('allow-add', 'user');
    invalid.webhook.editMessage.mockImplementationOnce(async () => { entered.resolve(); await release.promise; return { id: '82345678901234567' }; });
    const failing = f.execute(invalid); await entered.promise;
    const create = f.store.createTransfer.getMockImplementation()!;
    f.store.createTransfer.mockImplementationOnce(async input => { const pending = await create(input); created.resolve(); return pending; });
    const target = f.interaction('transfer-target', 'user'); target.values = [OTHER];
    const transferring = f.execute(target);
    try {
      await created.promise;
      expect(f.state().transfer?.expiresAt).toBeNull();
      release.resolve(); await Promise.all([failing, transferring]);
      expect(f.state().transfer?.expiresAt).toEqual(new Date(5_000));
      expect(JSON.stringify(target.webhook.editMessage.mock.calls.at(-1))).toContain(f.state().transfer!.id);
      expect(invalid.editReply).not.toHaveBeenCalled();
    } finally {
      release.resolve(); await Promise.all([failing, transferring]); await f.workspaces.stop(); await f.timers.stop();
    }
  });

  it('checks SQL pending state again at private adoption, not only in preflight', async () => {
    const f = fixture(); let reads = 0;
    f.store.read.mockImplementation(async id => {
      if (++reads === 3) f.state().transfer = { id: '123e4567-e89b-42d3-a456-426614174000', roomId: id,
        ownerDiscordId: OWNER, targetDiscordId: OTHER, controlVersion: 0, expiresAt: null };
      return structuredClone(f.roomStates.get(id) ?? null);
    });
    const select = f.interaction('allow-add', 'user'); select.values = [OTHER]; await f.execute(select);
    expect(f.state().allowedMemberIds).toEqual([]); expect(f.store.setAllowed).not.toHaveBeenCalled();
    expect(JSON.stringify(select.webhook.editMessage.mock.calls)).toContain(f.state().transfer!.id);
    await f.workspaces.stop(); await f.timers.stop();
  });

  it('revalidates SQL after draining an obsolete view before show/adopt', async () => {
    const f = fixture(); const entered = deferred(); const release = deferred();
    await f.workspaces.show(f.actor(), { kind: 'transfer-pending', operationId: 'old', payload: { embeds: [], components: [] } }, async () => ({
      messageId: '82345678901234567', expiresAt: Date.now() + 900_000,
      edit: async () => ({ id: '82345678901234567' }), deactivate: async () => { entered.resolve(); await release.promise; },
    }));
    const open = f.interaction('access'); const showing = f.execute(open); await entered.promise;
    f.state().room.controlVersion++; f.state().controlsEnabled = false;
    release.resolve(); await showing;
    expect(JSON.stringify(open.followUp.mock.calls)).not.toContain('Adicionar autorizado');
    expect(JSON.stringify(open.followUp.mock.calls)).toContain('expirou');
    await f.workspaces.stop(); await f.timers.stop();
  });

  it.each(['owner', 'version', 'room'] as const)('does not publish an inconsistent SQL pending %s from a public open', async fault => {
    const f = fixture(); await f.transfers.begin(f.actor(), OTHER, f.gateway);
    if (fault === 'owner') f.state().transfer!.ownerDiscordId = OTHER;
    if (fault === 'version') f.state().transfer!.controlVersion++;
    if (fault === 'room') f.state().transfer!.roomId = '123e4567-e89b-42d3-a456-426614174000';
    const open = f.interaction('access'); await f.execute(open);
    expect(JSON.stringify(open.followUp.mock.calls)).not.toContain('Confirmar');
    expect(JSON.stringify(open.followUp.mock.calls)).toContain('expirou');
    expect(f.store.armTransfer).not.toHaveBeenCalled();
    await f.workspaces.stop(); await f.timers.stop();
  });
  it.each(['pending', 'permission', 'capacity', 'overwrites', 'rename', 'limit', 'unexpected'] as const)('explains %s failures privately without upstream payloads', async (fault) => {
    const f = fixture();
    const i = f.interaction(fault === 'pending' ? 'transfer-target' : fault === 'rename' ? 'rename-save' : fault === 'limit' ? 'limit-save' : 'visibility',
      fault === 'pending' ? 'user' : ['rename', 'limit'].includes(fault) ? 'modal' : 'button');
    i.values = [OTHER];
    if (fault === 'pending') await f.transfers.begin(f.actor(), OTHER, f.gateway);
    if (fault === 'permission') f.channel.permissionsFor.mockReturnValue(new PermissionsBitField([P.ViewChannel]));
    if (fault === 'capacity') for (let n = 0; n < 100; n++) f.channel.permissionOverwrites.cache.set(`${BigInt(n) + 80000000000000000n}`, { id: `${BigInt(n) + 80000000000000000n}`, type: OverwriteType.Role, allow: new PermissionsBitField(), deny: new PermissionsBitField(P.Speak) });
    if (fault === 'overwrites') f.channel.permissionOverwrites.cache.set(OTHER, { id: OTHER, type: OverwriteType.Role, allow: new PermissionsBitField(P.Connect), deny: new PermissionsBitField() });
    if (fault === 'rename' || fault === 'limit') i.fields.getTextInputValue = () => fault === 'rename' ? 'private-sentinel-invalid-name' : '100';
    if (fault === 'unexpected') f.channel.permissionOverwrites.set.mockRejectedValueOnce(new Error('private-sentinel-token-sql'));
    await f.execute(i);
    const text = JSON.stringify([...i.editReply.mock.calls, ...i.followUp.mock.calls, ...i.webhook.editMessage.mock.calls]);
    const reason = { pending: 'pendente', permission: 'Gerenciar Cargos', capacity: '100', overwrites: 'sobrescritas', rename: '11', limit: '99', unexpected: 'expirou' }[fault];
    expect(text).toContain(reason); expect(text).not.toContain('private-sentinel');
    expect(i.deferUpdate).toHaveBeenCalledOnce(); expect(i.deferReply).not.toHaveBeenCalled();
    expect(f.state().room.visibility).toBe('PUBLIC');
    await f.timers.stop();
  });
  it('opens a single private workspace and privately rejects nonowners and legacy IDs', async () => {
    const f = fixture();
    const denied = f.interaction('access', 'button', OTHER);
    await f.execute(denied);
    expect(denied.editReply).not.toHaveBeenCalled();
    expect(denied.followUp.mock.calls[0]?.[0]).toMatchObject({ flags: MessageFlags.Ephemeral, content: expect.stringContaining('expirou') });
    const owner = f.interaction('access');
    await f.execute(owner);
    expect(JSON.stringify(owner.followUp.mock.calls)).toContain('Adicionar autorizado');
    const next = f.interaction('transfer'); await f.execute(next);
    expect(next.followUp).not.toHaveBeenCalled();
    expect(owner.webhook.editMessage).toHaveBeenCalledWith('82345678901234567', expect.anything());
    expect(JSON.stringify(owner.webhook.editMessage.mock.calls)).toContain('Selecionar novo proprietário');
    expect(owner.editReply).not.toHaveBeenCalled(); expect(next.editReply).not.toHaveBeenCalled();
    const legacy = f.interaction('access'); legacy.customId = 'call:v1:open:old';
    expect(f.handler.canHandle(legacy as unknown as Interaction)).toBe(true);
    await f.execute(legacy);
    expect(legacy.reply.mock.calls[0]?.[0]).toMatchObject({ flags: MessageFlags.Ephemeral });
    expect(f.state().room.name).toBe('Game');
    await f.workspaces.stop(); await f.timers.stop();
  });

  it.each(['version', 'guild', 'channel', 'room', 'absent', 'disabled', 'owner'])(
    'rejects a %s forgery/stale menu without a native or durable mutation', async (fault) => {
      const f = fixture();
      const i = f.interaction('rename-save', 'modal');
      if (fault === 'version') f.state().room.controlVersion++;
      if (fault === 'guild') i.guildId = OTHER;
      if (fault === 'channel') i.channelId = OTHER;
      if (fault === 'room') i.customId = i.customId.replace(f.state().room.id, '323e4567-e89b-42d3-a456-426614174000');
      if (fault === 'absent') f.leave(OWNER);
      if (fault === 'disabled') f.state().controlsEnabled = false;
      if (fault === 'owner') f.state().room.ownerDiscordId = OTHER;
      await f.execute(i);
      expect(i.followUp.mock.calls.length + i.reply.mock.calls.length).toBe(1);
      expect(i.editReply).not.toHaveBeenCalled();
      expect(JSON.stringify([...i.followUp.mock.calls, ...i.reply.mock.calls])).toContain('expirou');
      expect(f.channel.name).toBe('Game');
      expect(f.state().room.name).toBe('Game');
      await f.timers.stop();
    },
  );

  it('opens a native modal without deferring and submits normalized rename/limit/privacy/access actions', async () => {
    const f = fixture();
    const menu = f.interaction('rename');
    await f.execute(menu);
    expect(menu.showModal).toHaveBeenCalledOnce();
    expect(menu.deferReply).not.toHaveBeenCalled();
    expect(menu.deferUpdate).not.toHaveBeenCalled();
    const rename = f.interaction('rename-save', 'modal');
    await f.execute(rename);
    expect(f.state().room.name).toBe('New');
    const limit = f.interaction('limit-save', 'modal'); limit.fields.getTextInputValue = () => '0';
    await f.execute(limit);
    expect(f.channel.userLimit).toBe(0);
    const visibility = f.interaction('visibility');
    await f.execute(visibility);
    expect(f.state().room.visibility).toBe('PRIVATE');
    const allow = f.interaction('allow-add', 'user'); allow.values = [OTHER];
    await f.execute(allow);
    expect(f.state().allowedMemberIds).toEqual([OTHER]);
    const remove = f.interaction('allow-remove', 'user'); remove.values = [OTHER]; await f.execute(remove);
    expect(f.state().allowedMemberIds).toEqual([]);
    const access = f.interaction('access'); await f.execute(access);
    expect(JSON.stringify(remove.webhook.editMessage.mock.calls)).toContain('Adicionar autorizado');
    const transfer = f.interaction('transfer'); await f.execute(transfer);
    expect(JSON.stringify(remove.webhook.editMessage.mock.calls)).toContain('Selecionar novo proprietário');
    await f.workspaces.stop(); await f.timers.stop();
  });

  it('rejects A original menu after real A -> B -> A transfers, but accepts A fresh menu', async () => {
    const f = fixture(); const original = f.interaction('rename-save', 'modal');
    const first = await f.transfers.begin(f.actorFor(OWNER), OTHER, f.gateway);
    await f.transfers.confirm(f.actorFor(OWNER), first.id, f.gateway);
    const second = await f.transfers.begin(f.actorFor(OTHER), OWNER, f.gateway);
    await f.transfers.confirm(f.actorFor(OTHER), second.id, f.gateway);
    expect(f.state().room).toMatchObject({ ownerDiscordId: OWNER, controlVersion: 2 });
    await f.execute(original);
    expect(f.state().room.name).toBe('Game');
    expect(f.channel.name).toBe('Game');
    expect(JSON.stringify(original.followUp.mock.calls)).toContain('expirou');
    await f.execute(f.interaction('rename-save', 'modal'));
    expect(f.channel.name).toBe('New');
    await f.timers.stop();
  });

  it('validates public claims with individual priority and rejects malformed branch input privately', async () => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = fixture(); f.state().room.ownerDiscordId = null;
    Object.assign(f.state().room, { priorityMemberDiscordId: OTHER, priorityExpiresAt: new Date(300_000) });
    const reserved = f.interaction('claim'); await f.execute(reserved);
    expect(JSON.stringify(reserved.followUp.mock.calls)).toContain('prioridade');
    expect(f.state().room.ownerDiscordId).toBeNull();
    const claim = f.interaction('claim', 'button', OTHER); await f.execute(claim);
    expect(f.state().room.ownerDiscordId).toBe(OTHER);
    const invalid = f.interaction('lock', 'string', OTHER); invalid.customId = invalid.customId.replace(':lock:', ':menu:'); await f.execute(invalid);
    expect(invalid.reply.mock.calls[0]?.[0]).toMatchObject({ flags: MessageFlags.Ephemeral });
    const wrongKind = f.interaction('rename-save', 'button', OTHER); await f.execute(wrongKind);
    expect(f.state().room.name).toBe('Game');
    await f.timers.stop();
  });

  it('arms only after confirmed publication; later edit failure never extends the true deadline', async () => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = fixture(); const delivered = deferred<{ id: string }>(); const editing = deferred();
    const target = f.interaction('transfer-target', 'user'); target.values = [OTHER];
    target.webhook.editMessage.mockImplementationOnce(async () => { editing.resolve(); return delivered.promise; });
    const publishing = f.execute(target);
    await editing.promise;
    expect(f.state().transfer?.expiresAt).toBeNull();
    await vi.advanceTimersByTimeAsync(8_000);
    expect(f.state().room.ownerDiscordId).toBe(OWNER);
    delivered.resolve({ id: '82345678901234567' }); await publishing;
    expect(f.state().transfer?.expiresAt?.getTime()).toBe(13_000);
    target.webhook.editMessage.mockRejectedValueOnce(new Error('private payload'));
    await vi.advanceTimersByTimeAsync(999);
    expect(target.webhook.editMessage).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(target.webhook.editMessage).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(4_000);
    expect(f.state().room.ownerDiscordId).toBe(OTHER);
    expect(f.state().transfer).toBeNull();
    await f.workspaces.stop(); await f.timers.stop();
  });

  it.each(['failed', 'unconfirmed', 'canceled'] as const)('never arms a %s private prompt', async (fault) => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = fixture(); const i = f.interaction('transfer-target', 'user'); i.values = [OTHER];
    i.webhook.editMessage.mockImplementationOnce(async () => {
      if (fault === 'failed') throw new Error('unconfirmed response');
      if (fault === 'canceled') await f.transfers.cancelForRoomLocked(f.state().room.id);
      return fault === 'unconfirmed' ? undefined! : { id: '82345678901234567' };
    });
    await f.execute(i);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(f.state().transfer).toBeNull();
    expect(f.state().room.ownerDiscordId).toBe(OWNER);
    await f.workspaces.stop(); await f.timers.stop();
  });

  it('aborts a prompt delivered after shutdown instead of persisting an untimed transfer', async () => {
    vi.useFakeTimers();
    const f = fixture(); const i = f.interaction('transfer-target', 'user'); i.values = [OTHER];
    i.webhook.editMessage.mockImplementationOnce(async () => { await f.timers.stop(); return { id: '82345678901234567' }; });
    await f.execute(i);
    expect(f.state().transfer).toBeNull();
    expect(f.store.armTransfer).not.toHaveBeenCalled();
  });

  it('does not let a canceled in-flight countdown replace a newer operation countdown', async () => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = fixture(); const original = f.interaction('transfer-target', 'user'); original.values = [OTHER];
    await f.execute(original);
    const entered = deferred(); const release = deferred();
    original.webhook.editMessage.mockImplementationOnce(async () => { entered.resolve(); await release.promise; return { id: '82345678901234567' }; });
    await vi.advanceTimersByTimeAsync(1_000); await entered.promise;
    await f.execute(f.interaction('undo'));
    const next = f.interaction('transfer-target', 'user'); next.values = [OTHER];
    const publishing = f.execute(next);
    release.resolve(); await publishing; await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(next.webhook.editMessage).toHaveBeenCalledTimes(2);
    expect(original.webhook.editMessage).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(next.webhook.editMessage.mock.calls.at(-1))).toContain(f.state().transfer!.id);
    await f.workspaces.stop(); await f.timers.stop();
  });

  it('denies second-room recipients and recipient confirmation/undo; concurrent owner buttons commit at most once', async () => {
    vi.useFakeTimers();
    const f = fixture(); f.ownElsewhere(OTHER);
    const rejected = f.interaction('transfer-target', 'user'); rejected.values = [OTHER];
    await f.execute(rejected); expect(f.state().transfer).toBeNull();
    f.roomStates.delete(`other-${OTHER}`);
    const i = f.interaction('transfer-target', 'user'); i.values = [OTHER]; await f.execute(i);
    expect(f.state().transfer, JSON.stringify(i.editReply.mock.calls)).not.toBeNull();
    await f.execute(f.interaction('confirm', 'button', OTHER));
    await f.execute(f.interaction('undo', 'button', OTHER));
    expect(f.state().transfer).not.toBeNull();
    await Promise.all([f.execute(f.interaction('confirm')), f.execute(f.interaction('undo'))]);
    expect(f.state().room.ownerDiscordId).toBe(OTHER);
    expect(f.state().room.controlVersion).toBe(1);
    await f.timers.stop();
  });
});
