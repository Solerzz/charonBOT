import { MessageFlags, type Interaction } from 'discord.js';
import { describe, expect, it } from 'vitest';

import { StatusCommand } from '../../../../src/modules/status/status.command.js';

function interactionFrom(value: Record<string, unknown>): Interaction {
  return value as unknown as Interaction;
}

describe('StatusCommand', () => {
  it('publishes the status slash-command definition', () => {
    const command = new StatusCommand();

    expect(command.data.toJSON()).toMatchObject({
      name: 'status',
      description: 'Mostra o estado atual do Charon.',
    });
  });

  it('handles only the status chat-input command', () => {
    const command = new StatusCommand();

    expect(
      command.canHandle(
        interactionFrom({
          commandName: 'status',
          isChatInputCommand: () => true,
        }),
      ),
    ).toBe(true);
    expect(
      command.canHandle(
        interactionFrom({
          commandName: 'setup',
          isChatInputCommand: () => true,
        }),
      ),
    ).toBe(false);
  });

  it('responds with a private online status', async () => {
    const command = new StatusCommand();
    let response: unknown;
    const interaction = interactionFrom({
      commandName: 'status',
      isChatInputCommand: () => true,
      reply: async (payload: unknown) => {
        response = payload;
      },
    });

    if (!command.canHandle(interaction)) {
      throw new Error('Expected a status interaction');
    }
    await command.execute(interaction);

    expect(response).toEqual({
      content: 'Charon está online.',
      flags: MessageFlags.Ephemeral,
    });
  });
});
