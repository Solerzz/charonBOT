import { z } from 'zod';

import { discordIdSchema } from '../setup/setup.schemas.js';

const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

function graphemes(value: string): string[] {
  return [...segmenter.segment(value)].map(({ segment }) => segment);
}

export const temporaryRoomNameSchema = z
  .string()
  .trim()
  .min(1, 'Temporary room name is required')
  .refine((value) => graphemes(value).length <= 11, {
    message: 'Temporary room name must contain at most 11 graphemes',
  });

export function buildInitialRoomName(
  activity: string | null,
  displayName: string,
): string {
  const source = activity?.trim() || displayName.trim() || 'Call';
  return graphemes(source).slice(0, 11).join('');
}

const callControlActionSchema = z.enum([
  'lock', 'claim', 'rename', 'rename-save', 'limit', 'limit-save',
  'visibility', 'access', 'allow-add', 'allow-remove', 'transfer', 'transfer-target',
  'moderation', 'mod-block', 'mod-list', 'mod-target', 'mod-unblock', 'mod-home',
]);
export type CallControlAction = z.infer<typeof callControlActionSchema>;
export type CallComponent =
  | { [Action in CallControlAction]: { version: 'v3'; action: Action; roomId: string; controlVersion: number } }[CallControlAction]
  | { [Action in 'confirm' | 'undo']: { version: 'v3'; action: Action; roomId: string; operationId: string } }['confirm' | 'undo']
  | { [Action in 'mod-confirm' | 'mod-cancel']: { version: 'v3'; action: Action; roomId: string; selectionId: string } }['mod-confirm' | 'mod-cancel']
  | { version: 'v3'; action: 'mod-page'; roomId: string; controlVersion: number; page: number };

const roomUuidSchema = z.string().uuid();
const safeIntegerToken = (value: string) => /^(0|[1-9]\d*)$/.test(value) && Number.isSafeInteger(Number(value));

function decodeCallComponent(value: string): CallComponent | null {
  const parts = value.split(':');
  const [prefix, version, action, roomId, token] = parts;
  if (parts.length !== (action === 'mod-page' ? 6 : 5) || prefix !== 'call' || version !== 'v3' ||
      !roomUuidSchema.safeParse(roomId).success || roomId === undefined || token === undefined) return null;

  if (action === 'confirm' || action === 'undo') {
    return roomUuidSchema.safeParse(token).success
      ? { version, action, roomId, operationId: token } : null;
  }
  if (action === 'mod-confirm' || action === 'mod-cancel') {
    return roomUuidSchema.safeParse(token).success
      ? { version, action, roomId, selectionId: token } : null;
  }
  if (action === 'mod-page') {
    const page = parts[5];
    return safeIntegerToken(token) && page !== undefined && safeIntegerToken(page)
      ? { version, action, roomId, controlVersion: Number(token), page: Number(page) } : null;
  }
  const parsedAction = callControlActionSchema.safeParse(action);
  if (!parsedAction.success || !/^(0|[1-9]\d*)$/.test(token)) return null;
  const controlVersion = Number(token);
  return Number.isSafeInteger(controlVersion)
    ? { version, action: parsedAction.data, roomId, controlVersion } : null;
}

// IDs describe a requested action; they never grant authority to perform it.
export const callComponentSchema = z.string().max(100).transform((value, context): CallComponent => {
  const decoded = decodeCallComponent(value);
  if (decoded !== null) return decoded;
  context.addIssue({ code: 'custom', message: 'Invalid or stale call custom ID' });
  return z.NEVER;
});

export function encodeCallComponent(value: CallComponent): string {
  const token = 'operationId' in value ? value.operationId : 'selectionId' in value ? value.selectionId : value.controlVersion;
  const encoded = `call:${value.version}:${value.action}:${value.roomId}:${token}${value.action === 'mod-page' ? `:${value.page}` : ''}`;
  callComponentSchema.parse(encoded);
  return encoded;
}

export const callMemberSelectionSchema = z.tuple([discordIdSchema]);
export const callRenameSubmissionSchema = z.object({ name: temporaryRoomNameSchema }).strict();
export const callLimitSubmissionSchema = z.object({
  limit: z.string().trim().regex(/^(0|[1-9]\d?)$/, 'Limit must be 0 or 1–99').transform(Number),
}).strict();

export interface VoiceTransition {
  guildDiscordId: string;
  memberDiscordId: string;
  memberIsBot: boolean;
  oldChannelDiscordId: string | null;
  newChannelDiscordId: string | null;
  activityName: string | null;
  displayName: string;
  oldChannelMemberCount: number;
}

export const voiceTransitionSchema: z.ZodType<VoiceTransition> = z
  .object({
    guildDiscordId: discordIdSchema,
    memberDiscordId: discordIdSchema,
    memberIsBot: z.boolean(),
    oldChannelDiscordId: discordIdSchema.nullable(),
    newChannelDiscordId: discordIdSchema.nullable(),
    activityName: z
      .string()
      .refine((value) => value.trim().length > 0)
      .nullable(),
    displayName: z.string().refine((value) => value.trim().length > 0),
    oldChannelMemberCount: z.number().int().nonnegative(),
  })
  .strict();
