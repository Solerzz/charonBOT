import { MessageFlags, type Interaction } from 'discord.js';
import type { Logger } from 'pino';

import type { InteractionHandler } from './interaction-handler.js';

const safeFailureResponse = {
  content: 'Não foi possível concluir esta ação.',
  flags: MessageFlags.Ephemeral,
} as const;

export class InteractionRegistry {
  readonly #handlers: InteractionHandler<Interaction>[] = [];

  public constructor(private readonly logger: Logger) {}

  public register<TInteraction extends Interaction>(
    handler: InteractionHandler<TInteraction>,
  ): void {
    this.#handlers.push(handler as InteractionHandler<Interaction>);
  }

  public async dispatch(interaction: Interaction): Promise<boolean> {
    try {
      const handler = this.#handlers.find((candidate) =>
        candidate.canHandle(interaction),
      );

      if (!handler) {
        return false;
      }

      await handler.execute(interaction);
    } catch (error) {
      this.logger.error(
        {
          interactionId: interaction.id,
          errorName: error instanceof Error ? error.name : 'UnknownError',
        },
        'Interaction handler failed',
      );
      await this.#respondWithFailure(interaction);
      return true;
    }

    return true;
  }

  async #respondWithFailure(interaction: Interaction): Promise<void> {
    if (!interaction.isRepliable()) {
      return;
    }

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(safeFailureResponse);
      } else {
        await interaction.reply(safeFailureResponse);
      }
    } catch (error) {
      this.logger.error(
        {
          interactionId: interaction.id,
          errorName: error instanceof Error ? error.name : 'UnknownError',
        },
        'Interaction failure response could not be sent',
      );
    }
  }
}
