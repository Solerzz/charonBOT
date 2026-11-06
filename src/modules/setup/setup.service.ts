import {
  type CreateVoiceCreatorInput,
  type VoiceCreatorConfiguration,
  VoiceCreatorNotFoundError,
  type VoiceCreatorRepository,
} from './setup.repository.js';
import {
  discordIdSchema,
  setupChannelNameSchema,
  voiceCreatorIdSchema,
} from './setup.schemas.js';

export interface SetupChannelGateway {
  renameVoiceChannel(channelDiscordId: string, name: string): Promise<void>;
}

export class SetupService {
  constructor(private readonly repository: VoiceCreatorRepository) {}

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

  async toggleRoomCommands(id: string): Promise<VoiceCreatorConfiguration> {
    const parsedId = voiceCreatorIdSchema.parse(id);
    const configuration = await this.repository.findById(parsedId);
    if (configuration === null) {
      throw new VoiceCreatorNotFoundError();
    }

    return this.repository.setRoomCommandsEnabled(
      parsedId,
      !configuration.roomCommandsEnabled,
    );
  }

  async remove(id: string): Promise<void> {
    return this.repository.delete(voiceCreatorIdSchema.parse(id));
  }
}
