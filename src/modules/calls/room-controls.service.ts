import type { RoomVisibility } from '../../generated/prisma/client.js';
import type { RoomAccessService } from './room-access.service.js';
import { temporaryRoomNameSchema } from './call.schemas.js';
import type { RoomCoordinator } from './room.coordinator.js';
import { commitRoomMutation, currentOwnedRoom, safeRoomAction } from './room-mutation.js';
import type { RoomStateRepository } from './room-state.repository.js';
import { RoomActionError, type RoomActor, type RoomChanged, type RoomDiscordGateway, type RoomSettingsPatch, type RoomState } from './room.types.js';

type Dependencies = { store: RoomStateRepository; coordinator: RoomCoordinator; access: RoomAccessService; onChangedLocked: RoomChanged };

export class RoomControlsService {
  constructor(private readonly dependencies: Dependencies) {}

  async rename(actor: RoomActor, name: string, gateway: RoomDiscordGateway): Promise<void> {
    const normalized = temporaryRoomNameSchema.parse(name);
    await this.withOwned(actor, gateway, async (state) => {
      const { snapshot } = await currentOwnedRoom(this.dependencies.store, actor, gateway, state);
      await this.changeSetting(actor, state, gateway, { name: normalized },
        () => gateway.rename(state.room.channelDiscordId, normalized), () => gateway.restoreName(state.room.channelDiscordId, snapshot.name));
    });
  }

  async setLimit(actor: RoomActor, limit: number, gateway: RoomDiscordGateway): Promise<void> {
    if (!Number.isInteger(limit) || limit < 0 || limit > 99) throw new RangeError('Invalid room limit');
    await this.withOwned(actor, gateway, async (state) => {
      const { snapshot } = await currentOwnedRoom(this.dependencies.store, actor, gateway, state);
      await this.changeSetting(actor, state, gateway, { userLimit: limit },
        () => gateway.setLimit(state.room.channelDiscordId, limit), () => gateway.setLimit(state.room.channelDiscordId, snapshot.userLimit));
    });
  }

  async setVisibility(actor: RoomActor, visibility: RoomVisibility, gateway: RoomDiscordGateway): Promise<void> {
    await this.withOwned(actor, gateway, (state) => this.dependencies.access.setVisibilityLocked(actor, state, visibility, gateway));
  }

  async setAllowed(actor: RoomActor, memberId: string, allowed: boolean, gateway: RoomDiscordGateway): Promise<void> {
    await this.withOwned(actor, gateway, (state) => this.dependencies.access.setAllowedLocked(actor, state, memberId, allowed, gateway));
  }

  private async changeSetting(actor: RoomActor, state: RoomState, gateway: RoomDiscordGateway, patch: RoomSettingsPatch, apply: () => Promise<void>, restore: () => Promise<void>): Promise<void> {
    await commitRoomMutation(state, apply, async () => {
      await currentOwnedRoom(this.dependencies.store, actor, gateway, state);
      this.dependencies.coordinator.assertContinuous(actor.guildDiscordId, state.room.channelDiscordId, [actor.memberDiscordId]);
      if (!await this.dependencies.store.updateSettings(state.room.id, actor.controlVersion, patch)) throw new RoomActionError('STALE_CONTROLS');
    }, restore);
  }

  private async withOwned(actor: RoomActor, gateway: RoomDiscordGateway, work: (state: RoomState) => Promise<void>): Promise<void> {
    const { store, coordinator, onChangedLocked } = this.dependencies;
    await safeRoomAction(() => coordinator.member(actor.guildDiscordId, actor.memberDiscordId, async () => {
      const initial = await store.read(actor.roomId);
      if (!initial || initial.room.guildDiscordId !== actor.guildDiscordId) throw new RoomActionError('ROOM_UNAVAILABLE');
      await coordinator.room(actor.guildDiscordId, initial.room.channelDiscordId, async () => {
        const { state } = await currentOwnedRoom(store, actor, gateway);
        if (state.room.channelDiscordId !== initial.room.channelDiscordId) throw new RoomActionError('ROOM_UNAVAILABLE');
        coordinator.assertContinuous(actor.guildDiscordId, state.room.channelDiscordId, [actor.memberDiscordId]);
        await work(state);
        // Committed state only; callback failure is not a failed setting CAS.
        await safeRoomAction(() => onChangedLocked(actor.roomId, gateway), 'DISCORD_FAILURE');
      });
    }));
  }
}
