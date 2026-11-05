import type { Interaction } from 'discord.js';

export interface InteractionHandler<
  TInteraction extends Interaction = Interaction,
> {
  canHandle(interaction: Interaction): interaction is TInteraction;
  execute(interaction: TInteraction): Promise<void>;
}
