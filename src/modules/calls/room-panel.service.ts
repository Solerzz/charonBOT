import type { Logger } from 'pino';

import { createLogger } from '../../core/logger/logger.js';
import { buildCallPanel } from './call-panel.view.js';
import { DiscordRoomGateway } from './room.discord.js';
import type { RoomCoordinator } from './room.coordinator.js';
import type { RoomStateRepository } from './room-state.repository.js';
import { RoomActionError, type RoomDiscordGateway, type RoomGuildResolver } from './room.types.js';
import { measureCallStage } from './call-action.metrics.js';

type Dependencies = { store: RoomStateRepository; coordinator: RoomCoordinator; logger?: Logger };

export class RoomPanelService {
  private readonly logger: Logger;

  constructor(private readonly dependencies: Dependencies) {
    this.logger = dependencies.logger ?? createLogger({ level: 'warn' });
  }

  // Caller already holds this room's lock. Never acquire member/room locks here.
  async synchronizeLocked(roomId: string, gateway: RoomDiscordGateway): Promise<void> {
    return measureCallStage('panel', () => this.synchronizePanelLocked(roomId, gateway));
  }

  private async synchronizePanelLocked(roomId: string, gateway: RoomDiscordGateway): Promise<void> {
    const { store } = this.dependencies;
    let channelDiscordId: string | undefined;
    let messageDiscordId: string | null = null;
    try {
      const state = await store.read(roomId);
      if (!state || state.room.status === 'CLOSED') return;
      const { room, controlsEnabled } = state;
      channelDiscordId = room.channelDiscordId;
      messageDiscordId = room.controlMessageDiscordId;
      if (!controlsEnabled) {
        if (messageDiscordId === null) return;
        await gateway.deleteControlPanel(channelDiscordId, messageDiscordId);
        if (!await store.setPanelId(roomId, room.controlVersion, messageDiscordId, null)) throw new RoomActionError('STALE_CONTROLS');
        return;
      }
      if (room.status !== 'ACTIVE') return;
      const snapshot = await gateway.snapshot(channelDiscordId);
      if (!snapshot || snapshot.guildDiscordId !== room.guildDiscordId || snapshot.channelDiscordId !== channelDiscordId) throw new RoomActionError('ROOM_UNAVAILABLE');
      const payload = buildCallPanel({ room, participantCount: snapshot.members.length, observedAt: new Date() });
      if (messageDiscordId !== null) {
        try {
          await gateway.updateControlPanel(channelDiscordId, messageDiscordId, payload);
          const current = await store.read(roomId);
          if (!current || !current.controlsEnabled || current.room.status !== 'ACTIVE'
            || current.room.controlVersion !== room.controlVersion || current.room.controlMessageDiscordId !== messageDiscordId) throw new RoomActionError('STALE_CONTROLS');
          return;
        } catch (error) {
          if (!(error instanceof RoomActionError) || error.code !== 'PANEL_MISSING') throw error;
        }
      }
      let createdId: string;
      try {
        createdId = await gateway.sendControlPanel(channelDiscordId, payload);
      } catch {
        // Preserve the existing bounded initial-send retry, not an outer retry loop.
        createdId = await gateway.sendControlPanel(channelDiscordId, payload);
      }
      try {
        if (await store.setPanelId(roomId, room.controlVersion, messageDiscordId, createdId)) return;
      } catch {
        // A lost database reply is not proof the write failed. Do not delete a
        // newly tracked winner; if the read is uncertain, retain it and report IDs.
        const current = await store.read(roomId).catch(() => null);
        if (!current || current.room.controlMessageDiscordId === createdId) {
          messageDiscordId = createdId;
          throw new RoomActionError('PERSISTENCE_FAILURE');
        }
        await this.deleteDuplicate(roomId, channelDiscordId, createdId, gateway);
        throw new RoomActionError('PERSISTENCE_FAILURE');
      }
      await this.deleteDuplicate(roomId, channelDiscordId, createdId, gateway);
      throw new RoomActionError('STALE_CONTROLS');
    } catch (error) {
      const safe = error instanceof RoomActionError ? error : new RoomActionError('PERSISTENCE_FAILURE');
      this.logger.warn({ roomId, channelDiscordId, messageDiscordId, code: safe.code }, 'Room panel synchronization failed');
      throw safe;
    }
  }

  async synchronizeCreator(creatorId: string, resolveGuild: RoomGuildResolver): Promise<{ synced: number; failed: number }> {
    const { store, coordinator } = this.dependencies;
    const counts = { synced: 0, failed: 0 };
    const rooms = await store.listForCreator(creatorId).catch(() => {
      this.logger.warn({ creatorId, code: 'PERSISTENCE_FAILURE' }, 'Creator room enumeration failed');
      throw new RoomActionError('PERSISTENCE_FAILURE');
    });
    for (const room of rooms.filter(({ status }) => status === 'ACTIVE')) {
      try {
        await coordinator.room(room.guildDiscordId, room.channelDiscordId, async () => {
          const guild = await resolveGuild(room.guildDiscordId);
          if (!guild || guild.id !== room.guildDiscordId) throw new RoomActionError('ROOM_UNAVAILABLE');
          await this.synchronizeLocked(room.id, new DiscordRoomGateway(guild));
        });
        counts.synced++;
      } catch (error) {
        counts.failed++;
        this.logger.warn({ creatorId, roomId: room.id, guildDiscordId: room.guildDiscordId, channelDiscordId: room.channelDiscordId,
          code: error instanceof RoomActionError ? error.code : 'PERSISTENCE_FAILURE' }, 'Creator room panel synchronization failed');
      }
    }
    return counts;
  }

  private async deleteDuplicate(roomId: string, channelDiscordId: string, messageDiscordId: string, gateway: RoomDiscordGateway): Promise<void> {
    try {
      await gateway.deleteControlPanel(channelDiscordId, messageDiscordId);
    } catch {
      this.logger.warn({ roomId, channelDiscordId, messageDiscordId }, 'Duplicate room panel cleanup failed');
      throw new RoomActionError('DISCORD_FAILURE');
    }
  }
}
