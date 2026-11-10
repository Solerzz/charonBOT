import type { VoiceCreatorConfiguration } from './setup.repository.js';

export interface SetupDraftContext {
  guildDiscordId: string;
  administratorDiscordId: string;
  messageDiscordId: string;
}

export interface SetupDraftRef {
  id: string;
  revision: number;
}

export interface SetupCreationInput {
  categoryDiscordId: string;
  name: string;
  defaultUserLimit: number;
}

export type SetupCreationResult =
  | { status: 'created'; configuration: VoiceCreatorConfiguration }
  | { status: 'failed' | 'partial' | 'uncertain'; channelDiscordId?: string };

export interface SetupDraft {
  id: string;
  revision: number;
  context: SetupDraftContext;
  expiresAt: number;
  status: 'editing' | 'review' | 'creating' | SetupCreationResult['status'];
  input: Partial<SetupCreationInput>;
  result?: SetupCreationResult;
}

export type ReadySetupDraft = Omit<SetupDraft, 'input'> & {
  input: SetupCreationInput;
};
