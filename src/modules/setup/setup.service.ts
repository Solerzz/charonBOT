import type { Logger } from 'pino';

import { createLogger } from '../../core/logger/logger.js';
import {
  type CreateVoiceCreatorInput,
  type VoiceCreatorConfiguration,
  VoiceCreatorNotFoundError,
  type VoiceCreatorRepository,
} from './setup.repository.js';
import {
  defaultUserLimitSchema,
  discordIdSchema,
  setupChannelNameSchema,
  voiceCreatorIdSchema,
} from './setup.schemas.js';

export interface SetupChannelGateway {
  renameVoiceChannel(channelDiscordId: string, name: string): Promise<void>;
}

export class SetupService {
  constructor(
    private readonly repository: VoiceCreatorRepository,
    private readonly onControlsChanged?: (creatorId: string) => Promise<{ synced: number; failed: number }>,
    private readonly logger: Logger = createLogger({ level: 'warn' }),
  ) {}

  async list(guildDiscordId: string): Promise<VoiceCreatorConfiguration[]> {
    return this.repository.listByGuild(discordIdSchema.parse(guildDiscordId));
  }

  async add(
    input: CreateVoiceCreatorInput,
  ): Promise<VoiceCreatorConfiguration> {
    return this.repository.create({
      guildDiscordId: discordIdSchema.parse(input.guildDiscordId),
      creatorChannelDiscordId: discordIdSchema.parse(
        input.creatorChannelDiscordId,
      ),
      categoryDiscordId: discordIdSchema.parse(input.categoryDiscordId),
      ...(input.defaultUserLimit === undefined ? {} : {
        defaultUserLimit: defaultUserLimitSchema.parse(input.defaultUserLimit),
      }),
    });
  }

  async changeCategory(
    id: string,
    categoryDiscordId: string,
  ): Promise<VoiceCreatorConfiguration> {
    return this.repository.updateCategory(
      voiceCreatorIdSchema.parse(id),
      discordIdSchema.parse(categoryDiscordId),
    );
  }

  async setDefaultUserLimit(
    id: string,
    limit: number,
  ): Promise<VoiceCreatorConfiguration> {
    return this.repository.setDefaultUserLimit(
      voiceCreatorIdSchema.parse(id),
      defaultUserLimitSchema.parse(limit),
    );
  }

  async rename(
    id: string,
    name: string,
    gateway: SetupChannelGateway,
  ): Promise<void> {
    const parsedName = setupChannelNameSchema.parse(name);
    const configuration = await this.repository.findById(
      voiceCreatorIdSchema.parse(id),
    );
    if (configuration === null) {
      throw new VoiceCreatorNotFoundError();
    }

    await gateway.renameVoiceChannel(
      discordIdSchema.parse(configuration.creatorChannelDiscordId),
      parsedName,
    );
  }

  async toggleRoomCommands(id: string): Promise<{ configuration: VoiceCreatorConfiguration; synchronization: { synced: number; failed: number } | null }> {
    const parsedId = voiceCreatorIdSchema.parse(id);
    const configuration = await this.repository.findById(parsedId);
    if (configuration === null) {
      throw new VoiceCreatorNotFoundError();
    }

    const saved = await this.repository.setRoomCommandsEnabled(
      parsedId,
      !configuration.roomCommandsEnabled,
    );
    let synchronization: { synced: number; failed: number } | null = null;
    if (this.onControlsChanged) {
      try {
        synchronization = await this.onControlsChanged(parsedId);
      } catch {
        // The flag is already committed. Never present panel failure as a failed save.
        this.logger.warn({ creatorId: parsedId, operation: 'synchronizeCreator' }, 'Creator controls synchronization unconfirmed');
      }
    }
    return { configuration: saved, synchronization };
  }

  async remove(id: string): Promise<void> {
    return this.repository.delete(voiceCreatorIdSchema.parse(id));
  }
}
