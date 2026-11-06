import { describe, expect, it } from 'vitest';

import {
  buildInitialRoomName,
  temporaryRoomNameSchema,
  voiceTransitionSchema,
} from '../../../../src/modules/calls/call.schemas.js';

describe('call schemas', () => {
  it('falls back to the display name when the activity is empty', () => {
    expect(buildInitialRoomName('   ', 'Display Name')).toBe('Display Nam');
  });

  it('truncates room names to 11 graphemes without splitting emoji', () => {
    const name = buildInitialRoomName(null, '😀😀😀😀😀😀😀😀😀😀😀😀');

    expect(name).toBe('😀😀😀😀😀😀😀😀😀😀😀');
    expect(temporaryRoomNameSchema.parse(name)).toBe(name);
  });

  it('parses a complete voice transition without changing its values', () => {
    const transition = {
      guildDiscordId: '123456789012345678',
      memberDiscordId: '223456789012345678',
      memberIsBot: false,
      oldChannelDiscordId: '323456789012345678',
      newChannelDiscordId: null,
      activityName: ' Playing Charon ',
      displayName: ' Traveler ',
      oldChannelMemberCount: 2,
    };

    expect(voiceTransitionSchema.parse(transition)).toEqual(transition);
  });

  it.each([
    { guildDiscordId: 'invalid' },
    { memberDiscordId: 'invalid' },
    { oldChannelMemberCount: -1 },
    { oldChannelMemberCount: 1.5 },
  ])('rejects malformed voice transition fields: %o', (change) => {
    const result = voiceTransitionSchema.safeParse({
      guildDiscordId: '123456789012345678',
      memberDiscordId: '223456789012345678',
      memberIsBot: false,
      oldChannelDiscordId: null,
      newChannelDiscordId: '323456789012345678',
      activityName: null,
      displayName: 'Traveler',
      oldChannelMemberCount: 0,
      ...change,
    });

    expect(result.success).toBe(false);
  });
});
