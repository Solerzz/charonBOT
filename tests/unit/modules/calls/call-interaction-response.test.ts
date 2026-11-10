import { MessageFlags } from 'discord.js';
import { describe, expect, it, vi } from 'vitest';
import type { CallInteraction } from '../../../../src/modules/calls/call.interactions.js';
import { acknowledgeCallAction, completeCallAction, replyCallFailure } from '../../../../src/modules/calls/call-interaction-response.js';

const failure = { content: 'Falhou', embeds: [], components: [], allowedMentions: { parse: [] as never[] } };
function fixture(origin: 'public' | 'private' | 'none', modal = false) {
  const i = {
    isModalSubmit: () => modal, isFromMessage: () => origin !== 'none',
    message: origin === 'none' ? null : { id: origin, flags: { has: (flag: number) => flag === MessageFlags.Ephemeral && origin === 'private' } },
    deferUpdate: vi.fn(async () => {}), deferReply: vi.fn(async (_payload: unknown) => {}),
    reply: vi.fn(async (_payload: unknown) => {}), followUp: vi.fn(async (_payload: unknown) => {}),
    editReply: vi.fn(async (_payload: unknown) => {}), deleteReply: vi.fn(async () => {}),
  };
  return { i, interaction: i as unknown as CallInteraction };
}

describe('call responses by origin', () => {
  it.each(['public', 'private'] as const)('acknowledges %s components without a thinking reply or generic success', async origin => {
    const { i, interaction } = fixture(origin);
    const mode = await acknowledgeCallAction(interaction);
    expect(mode).toBe('source'); expect(i.deferUpdate).toHaveBeenCalledOnce(); expect(i.deferReply).not.toHaveBeenCalled();
    await completeCallAction(interaction, mode);
    expect(i.deleteReply).not.toHaveBeenCalled(); expect(i.editReply).not.toHaveBeenCalled(); expect(i.followUp).not.toHaveBeenCalled();
  });
  it.each(['public', 'private', 'none'] as const)('acknowledges modal from %s and deletes only its own deferred response', async origin => {
    const { i, interaction } = fixture(origin, true);
    const mode = await acknowledgeCallAction(interaction);
    expect(mode).toBe(origin === 'none' ? 'ephemeral' : 'source');
    await completeCallAction(interaction, mode);
    expect(i.deleteReply).toHaveBeenCalledTimes(origin === 'none' ? 1 : 0);
    if (origin === 'none') expect(i.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
    else expect(i.deferUpdate).toHaveBeenCalledOnce();
  });
  it.each(['public', 'private', 'none'] as const)('keeps post-ack %s failures out of the public panel', async origin => {
    const { i, interaction } = fixture(origin, origin === 'none');
    const mode = await acknowledgeCallAction(interaction);
    await replyCallFailure(interaction, mode, failure);
    if (origin !== 'none') {
      expect(i.followUp).toHaveBeenCalledWith({ ...failure, flags: MessageFlags.Ephemeral });
      expect(i.editReply).not.toHaveBeenCalled();
    } else expect(i.editReply).toHaveBeenCalledWith(failure);
    expect(i.deleteReply).not.toHaveBeenCalled();
  });
  it.each(['delivered', 'superseded', 'failed'] as const)('uses the ordered private delivery when %s without an unordered source edit', async outcome => {
    const { i, interaction } = fixture('private');
    const queued: string[] = [];
    await replyCallFailure(interaction, 'source', failure, async () => {
      if (outcome === 'failed') throw new Error('delivery unavailable');
      if (outcome === 'delivered') queued.push(failure.content);
      return outcome === 'delivered';
    });
    expect(queued).toEqual(outcome === 'delivered' ? ['Falhou'] : []);
    expect(i.editReply).not.toHaveBeenCalled();
    expect(i.followUp).toHaveBeenCalledTimes(outcome === 'delivered' ? 0 : 1);
    if (outcome !== 'delivered') expect(i.followUp).toHaveBeenCalledWith({ ...failure, flags: MessageFlags.Ephemeral });
  });
  it('uses a private initial reply for pre-ack failure', async () => {
    const { i, interaction } = fixture('public');
    await replyCallFailure(interaction, 'none', failure);
    expect(i.reply).toHaveBeenCalledWith({ ...failure, flags: MessageFlags.Ephemeral });
    expect(i.editReply).not.toHaveBeenCalled();
  });
});
