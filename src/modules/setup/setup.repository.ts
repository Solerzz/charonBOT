import {
  Prisma,
  type PrismaClient,
  type VoiceCreator,
} from '../../generated/prisma/client.js';

export type VoiceCreatorConfiguration = VoiceCreator;

export type CreateVoiceCreatorInput = Pick<
  VoiceCreatorConfiguration,
  'guildDiscordId' | 'creatorChannelDiscordId' | 'categoryDiscordId'
>;

export class VoiceCreatorAlreadyConfiguredError extends Error {
  constructor() {
    super('Voice creator channel is already configured');
    this.name = 'VoiceCreatorAlreadyConfiguredError';
  }
}

export class VoiceCreatorNotFoundError extends Error {
  constructor() {
    super('Voice creator configuration not found');
    this.name = 'VoiceCreatorNotFoundError';
  }
}

export interface VoiceCreatorRepository {
  listByGuild(guildDiscordId: string): Promise<VoiceCreatorConfiguration[]>;
  findById(id: string): Promise<VoiceCreatorConfiguration | null>;
  findByChannel(
    creatorChannelDiscordId: string,
  ): Promise<VoiceCreatorConfiguration | null>;
  create(input: CreateVoiceCreatorInput): Promise<VoiceCreatorConfiguration>;
  updateCategory(
    id: string,
    categoryDiscordId: string,
  ): Promise<VoiceCreatorConfiguration>;
  setRoomCommandsEnabled(
    id: string,
    enabled: boolean,
  ): Promise<VoiceCreatorConfiguration>;
  delete(id: string): Promise<void>;
}

function isPrismaErrorWithCode(error: unknown, code: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}

export class PrismaVoiceCreatorRepository implements VoiceCreatorRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listByGuild(guildDiscordId: string): Promise<VoiceCreatorConfiguration[]> {
    return this.prisma.voiceCreator.findMany({
      where: { guildDiscordId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  findById(id: string): Promise<VoiceCreatorConfiguration | null> {
    return this.prisma.voiceCreator.findFirst({
      where: { id, deletedAt: null },
    });
  }

  findByChannel(
    creatorChannelDiscordId: string,
  ): Promise<VoiceCreatorConfiguration | null> {
    return this.prisma.voiceCreator.findFirst({
      where: { creatorChannelDiscordId, deletedAt: null },
    });
  }

  async create(
    input: CreateVoiceCreatorInput,
  ): Promise<VoiceCreatorConfiguration> {
    try {
      return await this.prisma.voiceCreator.create({ data: input });
    } catch (error: unknown) {
      if (isPrismaErrorWithCode(error, 'P2002')) {
        throw new VoiceCreatorAlreadyConfiguredError();
      }

      throw error;
    }
  }

  async updateCategory(
    id: string,
    categoryDiscordId: string,
  ): Promise<VoiceCreatorConfiguration> {
    try {
      return await this.prisma.voiceCreator.update({
        where: { id, deletedAt: null },
        data: { categoryDiscordId },
      });
    } catch (error: unknown) {
      this.throwNotFound(error);
    }
  }

  async setRoomCommandsEnabled(
    id: string,
    enabled: boolean,
  ): Promise<VoiceCreatorConfiguration> {
    try {
      return await this.prisma.voiceCreator.update({
        where: { id, deletedAt: null },
        data: { roomCommandsEnabled: enabled },
      });
    } catch (error: unknown) {
      this.throwNotFound(error);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.voiceCreator.update({
        where: { id, deletedAt: null },
        data: { deletedAt: new Date() },
      });
    } catch (error: unknown) {
      this.throwNotFound(error);
    }
  }

  private throwNotFound(error: unknown): never {
    if (isPrismaErrorWithCode(error, 'P2025')) {
      throw new VoiceCreatorNotFoundError();
    }

    throw error;
  }
}
