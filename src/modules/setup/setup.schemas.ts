import { z } from 'zod';

export const discordIdSchema: z.ZodString = z
  .string()
  .regex(/^\d{17,20}$/, 'Invalid Discord ID');

export const voiceCreatorIdSchema: z.ZodString = z
  .string()
  .uuid('Invalid Voice Creator ID');

export const setupChannelNameSchema: z.ZodString = z
  .string()
  .trim()
  .min(1, 'Setup channel name is required')
  .max(100, 'Setup channel name must contain at most 100 characters');

export const defaultUserLimitSchema = z.number().int().min(0).max(99);

export const setupDefaultLimitInputSchema = z
  .string()
  .trim()
  .regex(/^(0|[1-9][0-9]?)$/, 'Invalid default room limit')
  .transform(Number)
  .pipe(defaultUserLimitSchema);

type VoiceCreatorAction =
  | 'select'
  | 'change-category'
  | 'rename'
  | 'default-limit'
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
  'default-limit',
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

type SetupCreationAction = 'category' | 'form' | 'back' | 'cancel' | 'confirm';
export type SetupCreationCustomId =
  | { version: 'v2'; action: 'start' }
  | { version: 'v2'; action: SetupCreationAction; id: string; revision: number };

const setupCreationActionSchema = z.enum(['category', 'form', 'back', 'cancel', 'confirm']);

export const setupCreationCustomIdSchema: z.ZodType<SetupCreationCustomId> = z.string().max(100)
  .transform((value, context): SetupCreationCustomId => {
    if (value === 'setup:v2:create:start') return { version: 'v2', action: 'start' };
    const parts = value.split(':');
    const action = setupCreationActionSchema.safeParse(parts[3]);
    const id = voiceCreatorIdSchema.safeParse(parts[4]);
    const revision = parts[5];
    if (parts.length === 6 && parts[0] === 'setup' && parts[1] === 'v2' && parts[2] === 'create'
      && action.success && id.success && revision !== undefined && /^(0|[1-9]\d*)$/.test(revision)
      && Number.isSafeInteger(Number(revision))) {
      return { version: 'v2', action: action.data, id: id.data, revision: Number(revision) };
    }
    context.addIssue({ code: 'custom', message: 'Invalid setup creation custom ID' });
    return z.NEVER;
  });

export function encodeSetupCreationCustomId(value: SetupCreationCustomId): string {
  const encoded = value.action === 'start' ? 'setup:v2:create:start'
    : `setup:v2:create:${value.action}:${value.id}:${value.revision}`;
  setupCreationCustomIdSchema.parse(encoded);
  return encoded;
}
