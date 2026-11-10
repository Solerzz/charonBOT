import type { Logger } from 'pino';

import type { ReadySetupDraft, SetupCreationResult } from './setup-creation.types.js';
import { SetupChannelCreationError, type SetupDiscordGateway } from './setup.discord.js';
import type { VoiceCreatorConfiguration, VoiceCreatorRepository } from './setup.repository.js';
import { defaultUserLimitSchema, discordIdSchema, setupChannelNameSchema } from './setup.schemas.js';

export class SetupCreationService {
  constructor(
    private readonly repository: VoiceCreatorRepository,
    private readonly logger: Logger,
  ) {}

  public async list(guildDiscordId: string): Promise<VoiceCreatorConfiguration[]> {
    return this.repository.listByGuild(discordIdSchema.parse(guildDiscordId));
  }

  public async create(draft: ReadySetupDraft, gateway: SetupDiscordGateway): Promise<SetupCreationResult> {
    let name: string;
    try {
      discordIdSchema.parse(draft.context.guildDiscordId);
      discordIdSchema.parse(draft.input.categoryDiscordId);
      defaultUserLimitSchema.parse(draft.input.defaultUserLimit);
      name = setupChannelNameSchema.parse(draft.input.name);
      const category = await gateway.getCategory(draft.input.categoryDiscordId);
      if (category?.id !== draft.input.categoryDiscordId) return { status: 'failed' };
    } catch (error: unknown) {
      this.logFailure(draft, 'preflight', error);
      return { status: 'failed' };
    }

    let channelDiscordId: string;
    try {
      const channel = await gateway.createVoiceCreator({ categoryDiscordId: draft.input.categoryDiscordId, name });
      if (!discordIdSchema.safeParse(channel.id).success) return { status: 'uncertain' };
      channelDiscordId = channel.id;
    } catch (error: unknown) {
      this.logFailure(draft, 'create', error,
        error instanceof SetupChannelCreationError && discordIdSchema.safeParse(error.channelDiscordId).success ? error.channelDiscordId : undefined);
      if (error instanceof SetupChannelCreationError) {
        if (error.certainty === 'rejected') return { status: 'failed' };
        if (error.certainty === 'created' && discordIdSchema.safeParse(error.channelDiscordId).success) {
          return this.recover(draft, gateway, error.channelDiscordId!);
        }
      }
      return { status: 'uncertain' };
    }

    try {
      const configuration = await this.repository.create({
        guildDiscordId: draft.context.guildDiscordId,
        creatorChannelDiscordId: channelDiscordId,
        categoryDiscordId: draft.input.categoryDiscordId,
        defaultUserLimit: draft.input.defaultUserLimit,
      });
      if (this.matches(draft, channelDiscordId, configuration)) return { status: 'created', configuration };
      // A mismatched response is not evidence that persistence is absent.
    } catch (error: unknown) {
      this.logFailure(draft, 'persist', error, channelDiscordId);
    }
    return this.recover(draft, gateway, channelDiscordId);
  }

  private async recover(draft: ReadySetupDraft, gateway: SetupDiscordGateway, channelDiscordId: string): Promise<SetupCreationResult> {
    let stored: VoiceCreatorConfiguration | null;
    try {
      stored = await this.repository.findStoredByChannel(channelDiscordId);
    } catch (error: unknown) {
      this.logFailure(draft, 'verify-persistence', error, channelDiscordId);
      return { status: 'uncertain', channelDiscordId };
    }
    if (stored !== null) {
      return this.matches(draft, channelDiscordId, stored)
        ? { status: 'created', configuration: stored }
        : { status: 'uncertain', channelDiscordId };
    }
    try {
      if (await gateway.deleteCreatedVoiceCreatorIfEmpty(channelDiscordId)) {
        return { status: 'failed', channelDiscordId };
      }
    } catch (error: unknown) {
      this.logFailure(draft, 'compensate', error, channelDiscordId);
    }
    this.logFailure(draft, 'preserved', undefined, channelDiscordId);
    return { status: 'partial', channelDiscordId };
  }

  private matches(draft: ReadySetupDraft, channelDiscordId: string, configuration: VoiceCreatorConfiguration): boolean {
    return configuration.deletedAt === null &&
      configuration.guildDiscordId === draft.context.guildDiscordId &&
      configuration.creatorChannelDiscordId === channelDiscordId &&
      configuration.categoryDiscordId === draft.input.categoryDiscordId &&
      configuration.defaultUserLimit === draft.input.defaultUserLimit;
  }

  private logFailure(draft: ReadySetupDraft, operation: string, error?: unknown, channelDiscordId?: string): void {
    // Never serialize errors: Discord/SQL errors may contain request bodies/URLs.
    const errorType = error instanceof SetupChannelCreationError ? 'SetupChannelCreationError' : error instanceof Error ? 'Error' : 'UnknownError';
    this.logger.warn({ operation, draftId: draft.id, guildDiscordId: draft.context.guildDiscordId, channelDiscordId, errorType }, 'Setup creation could not be confirmed');
  }
}
