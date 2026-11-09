import type { Guild, OverwriteData } from 'discord.js';

import type { PendingOwnershipTransfer, RoomPresence } from '../../generated/prisma/client.js';
import type { CallPanelPayload } from './call-panel.view.js';
import type { TemporaryRoomRecord } from './call.repository.js';

export type { PendingOwnershipTransfer, RoomPresence } from '../../generated/prisma/client.js';
export type RoomActor = { roomId: string; guildDiscordId: string; memberDiscordId: string; controlVersion: number };
export type RoomMember = { memberDiscordId: string; isBot: boolean };
export type RoomSnapshot = { guildDiscordId: string; channelDiscordId: string; members: RoomMember[]; name: string; userLimit: number };
export type RoomState = { room: TemporaryRoomRecord; controlsEnabled: boolean; presences: RoomPresence[]; allowedMemberIds: string[]; transfer: PendingOwnershipTransfer | null };
export type RoomSettingsPatch = Partial<Pick<TemporaryRoomRecord, 'name' | 'userLimit' | 'visibility'>>;
export type RoomChanged = (roomId: string, gateway: RoomDiscordGateway) => Promise<void>;
export type RoomGuildResolver = (guildId: string) => Promise<Guild | null>;

export interface RoomDiscordGateway {
  snapshot(channelId: string): Promise<RoomSnapshot | null>;
  resolveMember(memberId: string): Promise<RoomMember | null>;
  rename(channelId: string, name: string): Promise<void>;
  // Compensation only: restore the captured native name without user normalization.
  restoreName(channelId: string, previousName: string): Promise<void>;
  setLimit(channelId: string, limit: number): Promise<void>;
  readAccess(channelId: string): Promise<OverwriteData[]>;
  setPrivateAccess(channelId: string, allowedIds: string[]): Promise<void>;
  setPublicAccess(channelId: string): Promise<void>;
  restoreAccess(channelId: string, previous: OverwriteData[]): Promise<void>;
  sendControlPanel(channelId: string, payload: CallPanelPayload): Promise<string>;
  updateControlPanel(channelId: string, messageId: string, payload: CallPanelPayload): Promise<void>;
  deleteControlPanel(channelId: string, messageId: string): Promise<void>;
}

export type RoomActionErrorCode =
  | 'ROOM_UNAVAILABLE' | 'CONTROLS_DISABLED' | 'NOT_PRESENT' | 'NOT_OWNER'
  | 'STALE_CONTROLS' | 'ALREADY_OWNS_ROOM' | 'PRIORITY_RESERVED' | 'TRANSFER_PENDING'
  | 'TRANSFER_EXPIRED' | 'UNKNOWN_MEMBER' | 'PERMISSIONS_UNAVAILABLE' | 'DISCORD_FAILURE'
  | 'PERSISTENCE_FAILURE' | 'PANEL_MISSING';

export class RoomActionError extends Error {
  constructor(readonly code: RoomActionErrorCode, readonly reason?:
    'MANAGE_ROLES' | 'MANAGE_CHANNELS' | 'VIEW_CHANNEL' | 'SEND_MESSAGES' | 'EMBED_LINKS' | 'READ_MESSAGE_HISTORY' | 'OVERWRITE_CAPACITY' | 'INCOMPATIBLE_OVERWRITES') {
    super(code);
    this.name = 'RoomActionError';
  }
}
