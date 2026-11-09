import { MessageFlags, type Interaction } from 'discord.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CallInteractions, type CallInteraction } from '../../../../src/modules/calls/call.interactions.js';
import { encodeCallComponent, type CallComponent } from '../../../../src/modules/calls/call.schemas.js';
import { RoomPanelService } from '../../../../src/modules/calls/room-panel.service.js';
import { TransferService } from '../../../../src/modules/ownership/transfer.service.js';
import { OWNER, OTHER } from '../ownership/ownership.fixtures.js';
import { deferred } from './call.fixtures.js';
import { roomSettingsFixture } from './room-settings.fixtures.js';

function fixture() {
  const f = roomSettingsFixture();
  f.join(OTHER);
  const transfers = new TransferService({ ...f, onChangedLocked: f.onChangedLocked });
  const panels = new RoomPanelService(f);
  const handler = new CallInteractions({ ...f, ownership: f.service, transfers, panels }, () => f.gateway);
  const interaction = (action: CallComponent['action'], kind = 'button', member = OWNER) => {
    const component = { version: 'v2', action, roomId: f.state().room.id,
      ...(['confirm', 'undo'].includes(action) ? { operationId: f.state().transfer!.id } : { controlVersion: f.state().room.controlVersion }) } as CallComponent;
    const i = {
      id: '72345678901234567', customId: encodeCallComponent(component), guild: f.guild,
      guildId: f.state().room.guildDiscordId, channelId: f.state().room.channelDiscordId, user: { id: member },
      values: [] as string[], fields: { getTextInputValue: (_key: string) => 'New' },
      inGuild: () => true, isButton: () => kind === 'button', isStringSelectMenu: () => kind === 'string',
      isUserSelectMenu: () => kind === 'user', isModalSubmit: () => kind === 'modal',
      reply: vi.fn(async (_payload: unknown) => ({ id: '82345678901234567' })),
      deferReply: vi.fn(async (_payload: unknown) => {}),
      editReply: vi.fn(async (_payload: unknown) => ({ id: '82345678901234567' })),
      showModal: vi.fn(async (_payload: unknown) => {}),
    };
    return i;
  };
  const execute = (i: ReturnType<typeof interaction>) => handler.execute(i as unknown as CallInteraction);
  return { ...f, handler, transfers, interaction, execute };
}

afterEach(() => { vi.useRealTimers(); });

describe('CallInteractions real controllers', () => {
  it('opens only a private owner menu and privately rejects nonowners and legacy IDs', async () => {
    const f = fixture();
    const denied = f.interaction('open', 'button', OTHER);
    await f.execute(denied);
    expect(JSON.stringify(denied.editReply.mock.calls)).not.toContain('Escolher ação');
    expect(denied.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
    const owner = f.interaction('open');
    await f.execute(owner);
    expect(JSON.stringify(owner.editReply.mock.calls)).toContain('Escolher ação');
    const legacy = f.interaction('open'); legacy.customId = 'call:v1:open:old';
    expect(f.handler.canHandle(legacy as unknown as Interaction)).toBe(true);
    await f.execute(legacy);
    expect(legacy.reply.mock.calls[0]?.[0]).toMatchObject({ flags: MessageFlags.Ephemeral });
    expect(f.state().room.name).toBe('Game');
    await f.timers.stop();
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
      expect(i.editReply.mock.calls.length + i.reply.mock.calls.length).toBe(1);
      expect(JSON.stringify([...i.editReply.mock.calls, ...i.reply.mock.calls])).toContain('expirou');
      expect(f.channel.name).toBe('Game');
      expect(f.state().room.name).toBe('Game');
      await f.timers.stop();
    },
  );

  it('opens a native modal without deferring and submits normalized rename/limit/privacy/access actions', async () => {
    const f = fixture();
    const menu = f.interaction('menu', 'string'); menu.values = ['rename'];
    await f.execute(menu);
    expect(menu.showModal).toHaveBeenCalledOnce();
    expect(menu.deferReply).not.toHaveBeenCalled();
    const rename = f.interaction('rename-save', 'modal');
    await f.execute(rename);
    expect(f.state().room.name).toBe('New');
    const limit = f.interaction('limit-save', 'modal'); limit.fields.getTextInputValue = () => '0';
    await f.execute(limit);
    expect(f.channel.userLimit).toBe(0);
    const visibility = f.interaction('menu', 'string'); visibility.values = ['visibility'];
    await f.execute(visibility);
    expect(f.state().room.visibility).toBe('PRIVATE');
    const allow = f.interaction('allow-add', 'user'); allow.values = [OTHER];
    await f.execute(allow);
    expect(f.state().allowedMemberIds).toEqual([OTHER]);
    const remove = f.interaction('allow-remove', 'user'); remove.values = [OTHER]; await f.execute(remove);
    expect(f.state().allowedMemberIds).toEqual([]);
    const access = f.interaction('menu', 'string'); access.values = ['access']; await f.execute(access);
    expect(JSON.stringify(access.editReply.mock.calls)).toContain('Adicionar autorizado');
    const transfer = f.interaction('menu', 'string'); transfer.values = ['transfer']; await f.execute(transfer);
    expect(JSON.stringify(transfer.editReply.mock.calls)).toContain('Selecionar novo proprietário');
    await f.timers.stop();
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
    expect(JSON.stringify(original.editReply.mock.calls)).toContain('expirou');
    await f.execute(f.interaction('rename-save', 'modal'));
    expect(f.channel.name).toBe('New');
    await f.timers.stop();
  });

  it('validates public claims with individual priority and rejects malformed branch input privately', async () => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = fixture(); f.state().room.ownerDiscordId = null;
    Object.assign(f.state().room, { priorityMemberDiscordId: OTHER, priorityExpiresAt: new Date(300_000) });
    const reserved = f.interaction('claim'); await f.execute(reserved);
    expect(f.state().room.ownerDiscordId).toBeNull();
    const claim = f.interaction('claim', 'button', OTHER); await f.execute(claim);
    expect(f.state().room.ownerDiscordId).toBe(OTHER);
    const invalid = f.interaction('menu', 'string', OTHER); invalid.values = ['not-approved']; await f.execute(invalid);
    expect(invalid.reply.mock.calls[0]?.[0]).toMatchObject({ flags: MessageFlags.Ephemeral });
    const wrongKind = f.interaction('rename-save', 'button', OTHER); await f.execute(wrongKind);
    expect(f.state().room.name).toBe('Game');
    await f.timers.stop();
  });

  it('arms only after confirmed publication; later edit failure never extends the true deadline', async () => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = fixture(); const delivered = deferred<{ id: string }>(); const editing = deferred();
    const target = f.interaction('transfer-target', 'user'); target.values = [OTHER];
    target.editReply.mockImplementationOnce(async () => { editing.resolve(); return delivered.promise; });
    const publishing = f.execute(target);
    await editing.promise;
    expect(f.state().transfer?.expiresAt).toBeNull();
    await vi.advanceTimersByTimeAsync(8_000);
    expect(f.state().room.ownerDiscordId).toBe(OWNER);
    delivered.resolve({ id: '82345678901234567' }); await publishing;
    expect(f.state().transfer?.expiresAt?.getTime()).toBe(13_000);
    target.editReply.mockRejectedValueOnce(new Error('private payload'));
    await vi.advanceTimersByTimeAsync(999);
    expect(target.editReply).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(target.editReply).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(4_000);
    expect(f.state().room.ownerDiscordId).toBe(OTHER);
    expect(f.state().transfer).toBeNull();
    await f.timers.stop();
  });

  it.each(['failed', 'unconfirmed', 'canceled'] as const)('never arms a %s private prompt', async (fault) => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = fixture(); const i = f.interaction('transfer-target', 'user'); i.values = [OTHER];
    i.editReply.mockImplementationOnce(async () => {
      if (fault === 'failed') throw new Error('unconfirmed response');
      if (fault === 'canceled') await f.transfers.cancelForRoomLocked(f.state().room.id);
      return fault === 'unconfirmed' ? undefined! : { id: '82345678901234567' };
    });
    await f.execute(i);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(f.state().transfer).toBeNull();
    expect(f.state().room.ownerDiscordId).toBe(OWNER);
    await f.timers.stop();
  });

  it('aborts a prompt delivered after shutdown instead of persisting an untimed transfer', async () => {
    vi.useFakeTimers();
    const f = fixture(); const i = f.interaction('transfer-target', 'user'); i.values = [OTHER];
    i.editReply.mockImplementationOnce(async () => { await f.timers.stop(); return { id: '82345678901234567' }; });
    await f.execute(i);
    expect(f.state().transfer).toBeNull();
    expect(f.store.armTransfer).not.toHaveBeenCalled();
  });

  it('does not let a canceled in-flight countdown replace a newer operation countdown', async () => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const f = fixture(); const original = f.interaction('transfer-target', 'user'); original.values = [OTHER];
    await f.execute(original);
    const entered = deferred(); const release = deferred();
    original.editReply.mockImplementationOnce(async () => { entered.resolve(); await release.promise; return { id: '82345678901234567' }; });
    await vi.advanceTimersByTimeAsync(1_000); await entered.promise;
    await f.execute(f.interaction('undo'));
    const next = f.interaction('transfer-target', 'user'); next.values = [OTHER]; await f.execute(next);
    release.resolve(); await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(next.editReply).toHaveBeenCalledTimes(2);
    expect(original.editReply).toHaveBeenCalledTimes(2);
    await f.timers.stop();
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
