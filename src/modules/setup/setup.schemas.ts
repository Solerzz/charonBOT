import { z } from 'zod';

export const discordIdSchema: z.ZodString = z
  .string()
  .regex(/^\d{17,20}$/, 'Invalid Discord ID');

export const voiceCreatorIdSchema: z.ZodString = z
  .string()
  .uuid('Invalid Voice Creator ID');

type VoiceCreatorAction =
  | 'select'
  | 'change-category'
  | 'rename'
  | 'toggle-commands'
  | 'delete'
  | 'confirm-delete'
  | 'cancel';

export type SetupCustomId =
  | { version: 'v1'; action: 'add' }
  | { version: 'v1'; action: 'add-category'; discordId: string }
  | {
      version: 'v1';
      action: VoiceCreatorAction;
      voiceCreatorId: string;
    };

const voiceCreatorActions = new Set<VoiceCreatorAction>([
  'select',
  'change-category',
  'rename',
  'toggle-commands',
  'delete',
  'confirm-delete',
  'cancel',
]);

function decodeSetupCustomId(value: string): SetupCustomId | null {
  const parts = value.split(':');
  if (parts[0] !== 'setup' || parts[1] !== 'v1') {
    return null;
  }

  const action = parts[2];
  if (action === 'add' && parts.length === 3) {
    return { version: 'v1', action };
  }

  const identifier = parts[3];
  if (parts.length !== 4 || identifier === undefined) {
    return null;
  }

  if (action === 'add-category' && discordIdSchema.safeParse(identifier).success) {
    return { version: 'v1', action, discordId: identifier };
  }

  if (
    voiceCreatorActions.has(action as VoiceCreatorAction) &&
    voiceCreatorIdSchema.safeParse(identifier).success
  ) {
    return {
      version: 'v1',
      action: action as VoiceCreatorAction,
      voiceCreatorId: identifier,
    };
  }

  return null;
}

export const setupCustomIdSchema: z.ZodType<SetupCustomId> = z
  .string()
  .transform((value, context): SetupCustomId => {
    const decoded = decodeSetupCustomId(value);
    if (decoded !== null) {
      return decoded;
    }

    context.addIssue({
      code: 'custom',
      message: 'Invalid setup custom ID',
    });
    return z.NEVER;
  });

export function encodeSetupCustomId(value: SetupCustomId): string {
  switch (value.action) {
    case 'add':
      return 'setup:v1:add';
    case 'add-category':
      return `setup:v1:add-category:${value.discordId}`;
    default:
      return `setup:v1:${value.action}:${value.voiceCreatorId}`;
  }
}
