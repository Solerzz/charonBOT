import { describe, expect, it } from 'vitest';

import {
  buildInitialRoomName,
  temporaryRoomNameSchema,
  voiceTransitionSchema,
  callComponentSchema,
  encodeCallComponent,
  callMemberSelectionSchema,
  callRenameSubmissionSchema,
  callLimitSubmissionSchema,
  type CallComponent,
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

const roomId = '123e4567-e89b-42d3-a456-426614174000';
const operationId = '223e4567-e89b-42d3-a456-426614174000';
const versionActions = ['lock', 'claim', 'rename', 'rename-save', 'limit', 'limit-save', 'visibility', 'access', 'allow-add', 'allow-remove', 'transfer', 'transfer-target', 'moderation', 'mod-block', 'mod-list', 'mod-target', 'mod-unblock', 'mod-home'] as const;

describe('call v3 components', () => {
  it.each(['mod-confirm', 'mod-cancel'] as const)('keeps %s selection UUID separate from transfer operation IDs', (action) => {
    const value: CallComponent = { version: 'v3', action, roomId, selectionId: operationId };
    const encoded = encodeCallComponent(value);
    expect(encoded).toBe(`call:v3:${action}:${roomId}:${operationId}`);
    expect(encoded.length).toBeLessThanOrEqual(100);
    expect(callComponentSchema.parse(encoded)).toEqual(value);
    expect(callComponentSchema.safeParse(`call:v3:${action}:${roomId}:0`).success).toBe(false);
  });

  it.each([0, 1, Number.MAX_SAFE_INTEGER])('round-trips page %s at the largest control version within 100 characters', (page) => {
    const value: CallComponent = { version: 'v3', action: 'mod-page', roomId, controlVersion: Number.MAX_SAFE_INTEGER, page };
    const encoded = encodeCallComponent(value);
    expect(encoded).toBe(`call:v3:mod-page:${roomId}:9007199254740991:${page}`);
    expect(encoded.length).toBeLessThanOrEqual(100);
    expect(callComponentSchema.parse(encoded)).toEqual(value);
  });

  it.each(['', '-1', '1.1', '01', '+1', '1e2', 'NaN', 'Infinity', '9007199254740992', '1\n'])('rejects invalid page %j', page => {
    expect(callComponentSchema.safeParse(`call:v3:mod-page:${roomId}:0:${page}`).success).toBe(false);
  });

  it.each([
    `call:v3:mod-page:${roomId}:0`, `call:v3:mod-page:${roomId}:bad:0`,
    `call:v3:mod-home:${roomId}:0:1`, `call:v3:mod-confirm:${roomId}:${operationId}:0`,
    `call:v3:mod-cancel:${roomId}:${operationId}\n`,
  ])('rejects wrong moderation family/segment count %j', value => {
    expect(callComponentSchema.safeParse(value).success).toBe(false);
  });

  it.each(versionActions)('round-trips %s using the room and safe integer version', (action) => {
    const value: CallComponent = { version: 'v3', action, roomId, controlVersion: Number.MAX_SAFE_INTEGER };
    const encoded = encodeCallComponent(value);
    expect(encoded).toBe(`call:v3:${action}:123e4567-e89b-42d3-a456-426614174000:9007199254740991`);
    expect(callComponentSchema.parse(encoded)).toEqual(value);
    expect(encoded.length).toBeLessThanOrEqual(100);
  });

  it.each(['confirm', 'undo'] as const)('round-trips %s using the operation UUID, not the version', (action) => {
    const value: CallComponent = { version: 'v3', action, roomId, operationId };
    expect(encodeCallComponent(value)).toBe(`call:v3:${action}:${roomId}:${operationId}`);
    expect(callComponentSchema.parse(encodeCallComponent(value))).toEqual(value);
  });

  it.each([
    `call:v1:open:${roomId}:0`, `setup:v3:lock:${roomId}:0`, `call:v20:lock:${roomId}:0`,
    ...['visibility', 'menu', 'rename-save', 'confirm', 'claim'].map(action => `call:v2:${action}:${roomId}:${action === 'confirm' ? operationId : '0'}`),
    `call:v3:open:${roomId}:0`, `call:v3:menu:${roomId}:0`,
    `call:v3:lock:bad:0`,
    'call:v3:lock:123e4567-e89b-42d3-z456-426614174000:0',
    `call:v3:lock:${roomId}`, `call:v3:lock:${roomId}:0:extra`,
    ...['', '-1', '1.5', 'NaN', 'Infinity', '1e2', '+1', '01', ' 1', '9007199254740992', '9'.repeat(70), operationId].map((v) => `call:v3:lock:${roomId}:${v}`),
    `call:v3:confirm:${roomId}:0`, `call:v3:undo:${roomId}:bad`,
  ])('rejects malformed, stale or forged ID %s', (value) => {
    expect(callComponentSchema.safeParse(value).success).toBe(false);
  });

  it('accepts version zero and rejects invalid/overlong encoded builder inputs', () => {
    expect(callComponentSchema.parse(`call:v3:claim:${roomId}:0`)).toEqual({ version: 'v3', action: 'claim', roomId, controlVersion: 0 });
    for (const controlVersion of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => encodeCallComponent({ version: 'v3', action: 'lock', roomId, controlVersion })).toThrow();
    }
    expect(() => encodeCallComponent({ version: 'v3', action: 'lock', roomId: 'a'.repeat(100), controlVersion: 0 })).toThrow();
    expect(() => encodeCallComponent({ version: 'v3', action: 'confirm', roomId, operationId: 'bad' })).toThrow();
  });

  it.each([
    `call:v3:lock:${roomId}:1\n`, `call:v3:lock:${roomId}\n:1`,
    `call:v3:confirm:${roomId}:${operationId}\n`,
  ])('rejects trailing line breaks in UUID/version segments %j', (value) => {
    expect(callComponentSchema.safeParse(value).success).toBe(false);
  });
});

describe('call modal and select submissions', () => {
  it('accepts exactly one valid member ID without treating it as eligibility', () => {
    expect(callMemberSelectionSchema.parse(['12345678901234567'])).toEqual(['12345678901234567']);
    for (const values of [[], ['12345678901234567', '22345678901234567'], ['bad'], ['1234567890123456'], ['1'.repeat(21)]]) {
      expect(callMemberSelectionSchema.safeParse(values).success).toBe(false);
    }
  });

  it('reuses trimmed Unicode grapheme validation for rename modal submissions', () => {
    expect(callRenameSubmissionSchema.parse({ name: `  ${'👩🏽‍💻'.repeat(11)}  ` })).toEqual({ name: '👩🏽‍💻'.repeat(11) });
    for (const value of [{ name: '   ' }, { name: '👩🏽‍💻'.repeat(12) }, { name: 'ok', extra: 'bad' }, { name: 4 }]) {
      expect(callRenameSubmissionSchema.safeParse(value).success).toBe(false);
    }
  });

  it.each([['0', 0], ['1', 1], ['99', 99], [' 12 ', 12]])('parses limit text %s without blank coercion', (limit, expected) => {
    expect(callLimitSubmissionSchema.parse({ limit })).toEqual({ limit: expected });
  });

  it.each(['', ' ', '100', '-1', '1.5', '1e1', '+1', '01', 'NaN', 'Infinity'])('rejects invalid limit text %j', (limit) => {
    expect(callLimitSubmissionSchema.safeParse({ limit }).success).toBe(false);
  });

  it('rejects missing, nontext and extra modal fields', () => {
    for (const value of [{}, { limit: 0 }, { limit: '1', extra: true }]) {
      expect(callLimitSubmissionSchema.safeParse(value).success).toBe(false);
    }
  });
});
