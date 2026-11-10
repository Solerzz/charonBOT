import { Client, GatewayIntentBits } from 'discord.js';

export function createDiscordClient(): Client {
  return new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
    // A replayed POST after a timeout/5xx can create an untracked channel.
    // Keep Discord's rate-limit queue, but surface ambiguous failures to callers.
    rest: { retries: 0 },
  });
}
