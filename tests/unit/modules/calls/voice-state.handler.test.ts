import { Writable } from 'node:stream';
import { ActivityType, Collection, type VoiceState } from 'discord.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createLogger } from '../../../../src/core/logger/logger.js';
import { DiscordCallGateway } from '../../../../src/modules/calls/call.discord.js';
import { CallService } from '../../../../src/modules/calls/call.service.js';
import { VoiceStateHandler } from '../../../../src/modules/calls/voice-state.handler.js';
import { lifecycleFixture } from './call.fixtures.js';
import { attachRoomRuntime, stopRoomFixtures } from './room-lifecycle.fixtures.js';

afterEach(stopRoomFixtures);

function fixture() {
  const lines: string[] = [];
  const logger = createLogger({ level: 'error', destination: new Writable({ write(chunk, _encoding, done) { lines.push(chunk.toString()); done(); } }) });
  const ports = lifecycleFixture();
  const service = new CallService(ports.creators, ports.rooms, attachRoomRuntime(ports, logger), logger);
  const handle = vi.spyOn(service, 'handleVoiceTransition').mockResolvedValue(undefined);
  const guild = { id: '12345678901234567', voiceStates: { cache: new Collection<string, VoiceState>() } };
  const member = { id: '52345678901234567', guild, user: { bot: true }, displayName: 'Private display name', presence: { activities: [{ name: 'Private game', type: ActivityType.Playing }] } };
  const oldState = { id: member.id, guild, member, channelId: '22345678901234567', channel: { members: new Collection([['another', {}]]) } } as unknown as VoiceState;
  const newState = { ...oldState, channelId: '32345678901234567', channel: null } as VoiceState;
  return { lines, handle, guild, member, oldState, newState, handler: new VoiceStateHandler(service, logger) };
}

describe('VoiceStateHandler', () => {
  it('maps the existing transition schema and passes a guild/member gateway', async () => {
    const f = fixture();
    await f.handler.dispatch(f.oldState, f.newState);
    expect(f.handle).toHaveBeenCalledExactlyOnceWith({ guildDiscordId: '12345678901234567', memberDiscordId: '52345678901234567', memberIsBot: true, oldChannelDiscordId: '22345678901234567', newChannelDiscordId: '32345678901234567', activityName: 'Private game', displayName: 'Private display name', oldChannelMemberCount: 1 }, expect.any(DiscordCallGateway));
    const gateway = f.handle.mock.calls[0]![1];
    expect(gateway.getMemberChannelDiscordId()).toBeNull();
    f.guild.voiceStates.cache.set(f.member.id, f.newState);
    expect(gateway.getMemberChannelDiscordId()).toBe('32345678901234567');
  });

  it('maps joins without old channel and missing presence to the display-name fallback', async () => {
    const f = fixture();
    const member = { ...f.member, presence: null };
    await f.handler.dispatch({ ...f.oldState, channelId: null, channel: null } as VoiceState, { ...f.newState, member } as unknown as VoiceState);
    expect(f.handle.mock.calls[0]![0]).toMatchObject({ oldChannelDiscordId: null, oldChannelMemberCount: 0, activityName: null, displayName: 'Private display name' });
  });

  it('uses the old member for a leave when the new member is unavailable', async () => {
    const f = fixture();
    await f.handler.dispatch(f.oldState, { ...f.newState, member: null, channelId: null } as VoiceState);
    expect(f.handle.mock.calls[0]![0]).toMatchObject({ newChannelDiscordId: null, memberDiscordId: f.member.id });
  });

  it('ignores events with no guild member', async () => {
    const f = fixture();
    await f.handler.dispatch({ ...f.oldState, member: null } as VoiceState, { ...f.newState, member: null } as VoiceState);
    expect(f.handle).not.toHaveBeenCalled();
    expect(f.lines).toEqual([]);
  });

  it.each(['', '   '])('does not treat empty activity %j as a schema failure', async (name) => {
    const f = fixture();
    f.member.presence.activities[0]!.name = name;
    await f.handler.dispatch(f.oldState, f.newState);
    expect(f.handle.mock.calls[0]![0].activityName).toBeNull();
  });

  it('does not use custom status as a game name', async () => {
    const f = fixture();
    f.member.presence.activities[0]!.type = ActivityType.Custom;
    await f.handler.dispatch(f.oldState, f.newState);
    expect(f.handle.mock.calls[0]![0].activityName).toBeNull();
  });

  it('rejects invalid transitions before invoking the service', async () => {
    const f = fixture();
    await f.handler.dispatch(f.oldState, { ...f.newState, channelId: 'invalid' } as VoiceState);
    expect(f.handle).not.toHaveBeenCalled();
    expect(f.lines.join('')).toContain('ZodError');
    expect(f.lines.join('')).not.toContain('Private');
  });

  it('contains service failures and logs only IDs and error name', async () => {
    const f = fixture();
    f.handle.mockRejectedValue(new TypeError('secret raw error'));
    await expect(f.handler.dispatch(f.oldState, f.newState)).resolves.toBeUndefined();
    const log = JSON.parse(f.lines.join('')) as Record<string, unknown>;
    expect(log).toMatchObject({ guildDiscordId: f.guild.id, memberDiscordId: f.member.id, oldChannelDiscordId: f.oldState.channelId, newChannelDiscordId: f.newState.channelId, errorName: 'TypeError' });
    expect(Object.keys(log).sort()).toEqual(['errorName', 'guildDiscordId', 'hostname', 'level', 'memberDiscordId', 'msg', 'newChannelDiscordId', 'oldChannelDiscordId', 'pid', 'time'].sort());
    expect(f.lines.join('')).not.toMatch(/Private|secret raw error|stack/);
  });
});
