import { ActivityType, type VoiceState } from 'discord.js';
import type { Logger } from 'pino';

import { DiscordCallGateway } from './call.discord.js';
import { voiceTransitionSchema } from './call.schemas.js';
import type { CallService } from './call.service.js';

export interface VoiceStateDispatcher {
  dispatch(oldState: VoiceState, newState: VoiceState): Promise<void>;
}

export class VoiceStateHandler implements VoiceStateDispatcher {
  constructor(
    private readonly service: CallService,
    private readonly logger: Logger,
  ) {}

  async dispatch(oldState: VoiceState, newState: VoiceState): Promise<void> {
    const member = newState.member ?? oldState.member;
    if (member === null) return;

    try {
      // Presence is optional; never fetch it or require a privileged intent.
      const activity = member.presence?.activities.find(
        (candidate) =>
          candidate.type === ActivityType.Playing && candidate.name.trim().length > 0,
      );
      const transition = voiceTransitionSchema.parse({
        guildDiscordId: newState.guild.id,
        memberDiscordId: member.id,
        memberIsBot: member.user.bot,
        oldChannelDiscordId: oldState.channelId,
        newChannelDiscordId: newState.channelId,
        activityName: activity?.name ?? null,
        displayName: member.displayName,
        oldChannelMemberCount: oldState.channel?.members.size ?? 0,
      });
      const gateway = new DiscordCallGateway(newState.guild, member);
      await this.service.handleVoiceTransition(transition, gateway);
    } catch (error: unknown) {
      this.logger.error(
        {
          guildDiscordId: newState.guild.id,
          memberDiscordId: member.id,
          oldChannelDiscordId: oldState.channelId,
          newChannelDiscordId: newState.channelId,
          errorName: error instanceof Error ? error.name : 'UnknownError',
        },
        'Voice state handler failed',
      );
    }
  }
}
