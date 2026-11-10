import { MessageFlags } from 'discord.js';
import type { CallInteraction } from './call.interactions.js';
import type { CallPanelPayload } from './call-panel.view.js';

export type CallAckMode = 'none' | 'source' | 'ephemeral';

export async function acknowledgeCallAction(interaction: CallInteraction): Promise<CallAckMode> {
  if (!interaction.isModalSubmit() || interaction.isFromMessage()) {
    await interaction.deferUpdate();
    return 'source';
  }
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  return 'ephemeral';
}

export async function completeCallAction(interaction: CallInteraction, mode: CallAckMode): Promise<void> {
  // Source acknowledgements can point at the shared panel. Never delete them.
  if (mode === 'ephemeral') await interaction.deleteReply();
}

export async function replyCallFailure(interaction: CallInteraction, mode: CallAckMode, payload: CallPanelPayload & { content: string }): Promise<void> {
  if (mode === 'none') await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
  else if (mode === 'ephemeral' || interaction.message?.flags.has(MessageFlags.Ephemeral)) await interaction.editReply(payload);
  else await interaction.followUp({ ...payload, flags: MessageFlags.Ephemeral });
}
