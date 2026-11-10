import { afterEach, describe, expect, it } from 'vitest';

import { createLogger } from '../../../../src/core/logger/logger.js';
import { CallService } from '../../../../src/modules/calls/call.service.js';
import { creator, entry, lifecycleFixture, room } from './call.fixtures.js';
import { discordFixture } from './call.discord.fixtures.js';
import { attachRoomRuntime, stopRoomFixtures } from './room-lifecycle.fixtures.js';

afterEach(stopRoomFixtures);

describe('owner limits with creator defaults', () => {
  it('changes 4 to 8, reduces below occupancy without eviction, and leaves default 4 and entry 0 for the next call', async () => {
    const f = lifecycleFixture(); const d = discordFixture();
    f.configuration.defaultUserLimit = 4;
    const logger = createLogger({ level: 'silent' });
    const runtime = attachRoomRuntime(f, logger);
    const calls = new CallService(f.creators, f.rooms, runtime, logger);
    await calls.handleVoiceTransition(entry, d.gateway);
    expect(d.channel.userLimit).toBe(4);
    const actor = { roomId: room.id, guildDiscordId: creator.guildDiscordId, memberDiscordId: entry.memberDiscordId, controlVersion: 0 };
    d.member.voice.setChannel.mockClear();
    await runtime.controls.setLimit(actor, 8, d.gateway);
    expect(f.records.get(room.id)).toMatchObject({ userLimit: 8, controlMessageDiscordId: room.controlMessageDiscordId });
    expect(d.channel.userLimit).toBe(8);
    expect(JSON.stringify(d.channel.messages.edit.mock.calls)).toContain('1 / 8');
    d.states.set('72345678901234567', { channelId: d.channel.id });
    d.states.set('82345678901234567', { channelId: d.channel.id });
    await runtime.controls.setLimit(actor, 1, d.gateway);
    expect(d.channel.userLimit).toBe(1);
    expect(f.records.get(room.id)?.userLimit).toBe(1);
    expect(d.gateway.getChannelMemberCount(d.channel.id)).toBe(3);
    expect(d.member.voice.setChannel).not.toHaveBeenCalled();
    expect(JSON.stringify(d.channel.messages.edit.mock.calls)).toContain('3 / 1');
    expect(f.configuration.defaultUserLimit).toBe(4);
    expect(d.entryChannel.userLimit).toBe(0);
    expect(f.creators.setDefaultUserLimit).not.toHaveBeenCalled();
    d.states.clear();
    await calls.handleVoiceTransition({ ...entry, oldChannelDiscordId: d.channel.id, newChannelDiscordId: null }, d.gateway);
    expect(f.records.get(room.id)?.status).toBe('CLOSED');
    d.states.set(entry.memberDiscordId, { channelId: d.entryChannel.id });
    await calls.handleVoiceTransition(entry, d.gateway);
    expect(d.channel.userLimit).toBe(4);
    expect(f.records.get(room.id)?.userLimit).toBe(4);
    expect(d.entryChannel.userLimit).toBe(0);
    expect(d.channel.setUserLimit.mock.calls).toEqual([[8], [1]]);
  });
});
