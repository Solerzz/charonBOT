import { describe, expect, it } from 'vitest';

import {
  discordIdSchema,
  encodeSetupCustomId,
  setupChannelNameSchema,
  setupCustomIdSchema,
  voiceCreatorIdSchema,
} from '../../../../src/modules/setup/setup.schemas.js';

const voiceCreatorId = '123e4567-e89b-42d3-a456-426614174000';

describe('setup schemas', () => {
  it('accepts Discord snowflakes and rejects malformed IDs', () => {
    expect(discordIdSchema.parse('12345678901234567')).toBe(
      '12345678901234567',
    );

    const result = discordIdSchema.safeParse('not-a-snowflake');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Invalid Discord ID');
    }
  });

  it('accepts UUID Voice Creator IDs and rejects non-UUID values', () => {
    expect(voiceCreatorIdSchema.parse(voiceCreatorId)).toBe(voiceCreatorId);

    const result = voiceCreatorIdSchema.safeParse('12345678901234567');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        'Invalid Voice Creator ID',
      );
    }
  });

  it('trims setup channel names and enforces Discord length limits', () => {
    expect(setupChannelNameSchema.parse('  Create your room  ')).toBe(
      'Create your room',
    );
    expect(setupChannelNameSchema.safeParse('   ').success).toBe(false);
    expect(setupChannelNameSchema.safeParse('x'.repeat(101)).success).toBe(
      false,
    );
  });

  it('decodes and encodes versioned setup custom IDs', () => {
    const value = {
      version: 'v1' as const,
      action: 'select' as const,
      voiceCreatorId,
    };

    expect(setupCustomIdSchema.parse(`setup:v1:select:${voiceCreatorId}`)).toEqual(
      value,
    );
    expect(encodeSetupCustomId(value)).toBe(
      `setup:v1:select:${voiceCreatorId}`,
    );
  });

  it.each([
    'setup:v2:select:123e4567-e89b-42d3-a456-426614174000',
    'setup:v1:unknown:123e4567-e89b-42d3-a456-426614174000',
    'setup:v1:select:not-a-uuid',
    'setup:v1:add-category:not-a-discord-id',
  ])('rejects malformed setup custom ID %s', (customId) => {
    const result = setupCustomIdSchema.safeParse(customId);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Invalid setup custom ID');
    }
  });
});
