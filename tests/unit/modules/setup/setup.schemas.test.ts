import { describe, expect, it } from 'vitest';

import {
  defaultUserLimitSchema,
  discordIdSchema,
  encodeSetupCustomId,
  encodeSetupCreationCustomId,
  setupCreationCustomIdSchema,
  setupChannelNameSchema,
  setupCustomIdSchema,
  setupDefaultLimitInputSchema,
  voiceCreatorIdSchema,
} from '../../../../src/modules/setup/setup.schemas.js';

const voiceCreatorId = '123e4567-e89b-42d3-a456-426614174000';

describe('setup schemas', () => {
  it('isolates creation from editing and encodes the default editor', () => {
    expect(setupCreationCustomIdSchema.parse('setup:v2:create:start')).toEqual({ version: 'v2', action: 'start' });
    expect(encodeSetupCreationCustomId({ version: 'v2', action: 'start' })).toBe('setup:v2:create:start');
    expect(setupCustomIdSchema.parse(`setup:v1:default-limit:${voiceCreatorId}`)).toEqual({ version: 'v1', action: 'default-limit', voiceCreatorId });
  });

  it.each(['category', 'form', 'back', 'cancel', 'confirm'] as const)('roundtrips creation action %s with a safe revision', (action) => {
    const value = { version: 'v2' as const, action, id: voiceCreatorId, revision: Number.MAX_SAFE_INTEGER };
    const encoded = encodeSetupCreationCustomId(value);
    expect(encoded).toBe(`setup:v2:create:${action}:${voiceCreatorId}:9007199254740991`);
    expect(encoded.length).toBeLessThanOrEqual(100);
    expect(setupCreationCustomIdSchema.parse(encoded)).toEqual(value);
    expect(setupCustomIdSchema.safeParse(encoded).success).toBe(false);
  });

  it.each(['-1', '1.5', '01', '1e1', '', '9007199254740992', 'Infinity'])('rejects unsafe/noncanonical creation revision %s', (revision) => {
    expect(setupCreationCustomIdSchema.safeParse(`setup:v2:create:confirm:${voiceCreatorId}:${revision}`).success).toBe(false);
  });

  it.each(['setup:v2:create:start:extra', 'setup:v2:create', 'setup:v2:create:unknown', `setup:v2:create:confirm:${voiceCreatorId}:0:extra`, 'setup:v2:create:form:invalid:0', 'x'.repeat(101)])('rejects malformed creation IDs: %s', (id) => {
    expect(setupCreationCustomIdSchema.safeParse(id).success).toBe(false);
  });

  it('refuses to encode invalid creation references', () => {
    expect(() => encodeSetupCreationCustomId({ version: 'v2', action: 'confirm', id: voiceCreatorId, revision: -1 })).toThrow();
  });
  it.each([0, 1, 4, 99])('accepts default room limit %s', (limit) => {
    expect(defaultUserLimitSchema.parse(limit)).toBe(limit);
  });

  it.each([-1, 100, 1.5, NaN, Infinity, '4', null])('rejects invalid default room limit %s', (limit) => {
    expect(defaultUserLimitSchema.safeParse(limit).success).toBe(false);
  });

  it.each([['0', 0], ['1', 1], ['99', 99], [' 4 ', 4]] as const)(
    'parses canonical default limit input %s', (input, limit) => {
      expect(setupDefaultLimitInputSchema.parse(input)).toBe(limit);
    },
  );

  it.each(['', '   ', '01', '1e1', '1.5', '-1', '100', '+1', '1 0', 'NaN', 'Infinity'])(
    'rejects noncanonical default limit input %s', (input) => {
      expect(setupDefaultLimitInputSchema.safeParse(input).success).toBe(false);
    },
  );

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
