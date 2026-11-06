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
