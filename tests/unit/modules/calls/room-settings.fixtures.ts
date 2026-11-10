import { OverwriteType, PermissionsBitField, type Guild, type OverwriteData } from 'discord.js';
import { vi } from 'vitest';

import { RoomAccessService } from '../../../../src/modules/calls/room-access.service.js';
import { RoomControlsService } from '../../../../src/modules/calls/room-controls.service.js';
import { DiscordRoomGateway } from '../../../../src/modules/calls/room.discord.js';
import type { RoomSettingsPatch, RoomState } from '../../../../src/modules/calls/room.types.js';
import { ownershipFixture, OWNER } from '../ownership/ownership.fixtures.js';
import { discordFixture } from './call.discord.fixtures.js';

// Keep the real services, coordinator and Discord permission projection. Only
// SQL and REST are replaced; the REST boundary maintains observable server state.
export function roomSettingsFixture() {
  const f = ownershipFixture();
  f.state().room.ownerDiscordId = OWNER;
  const discord = discordFixture();
  discord.states.clear();
  discord.states.set(OWNER, { channelId: f.state().room.channelDiscordId });
  discord.channel.setName.mockImplementation(async (name) => { discord.channel.name = name; });
  discord.channel.setUserLimit.mockImplementation(async (limit) => { discord.channel.userLimit = limit; });
  discord.channel.permissionOverwrites.set.mockImplementation(async (input) => {
    discord.channel.permissionOverwrites.cache.clear();
    for (const entry of input as OverwriteData[]) {
      const id = typeof entry.id === 'string' ? entry.id : entry.id.id;
      discord.channel.permissionOverwrites.cache.set(id, { id, type: entry.type ?? OverwriteType.Member,
        allow: new PermissionsBitField(entry.allow), deny: new PermissionsBitField(entry.deny) });
    }
  });
  const eligible = (state: RoomState | undefined, version: number) => state?.room.status === 'ACTIVE' && state.controlsEnabled && state.room.controlVersion === version;
  const store = { ...f.store,
    updateSettings: vi.fn(async (id: string, version: number, patch: RoomSettingsPatch) => {
      const state = f.states.get(id);
      if (!eligible(state, version)) return false;
      Object.assign(state!.room, patch);
      return true;
    }),
    setAllowed: vi.fn(async (id: string, version: number, member: string, allowed: boolean) => {
      const state = f.states.get(id);
      if (!eligible(state, version)) return false;
      state!.allowedMemberIds = [...new Set([...state!.allowedMemberIds.filter((id) => id !== member), ...(allowed ? [member] : [])])];
      return true;
    }),
  };
  const gateway = new DiscordRoomGateway(discord.guild as unknown as Guild);
  const access = new RoomAccessService(store, f.coordinator);
  const controls = new RoomControlsService({ store, coordinator: f.coordinator, access, onChangedLocked: f.onChangedLocked });
  const join = (id: string) => discord.states.set(id, { channelId: f.state().room.channelDiscordId });
  const leave = (id: string) => discord.states.delete(id);
  const projected = () => [...discord.channel.permissionOverwrites.cache.values()];
  const synchronize = async () => access.synchronizeLocked(f.state(), (await gateway.snapshot(f.state().room.channelDiscordId))!, gateway);
  return { ...f, ...discord, roomStates: f.states, store, gateway, access, controls, join, leave, projected, synchronize, actorFor: f.actor, actor: () => f.actor(OWNER) };
}
