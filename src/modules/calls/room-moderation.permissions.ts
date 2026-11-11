import { OverwriteType, PermissionFlagsBits as P, PermissionsBitField, type OverwriteData } from 'discord.js';

import type { RoomAccessPolicy, RoomMemberBlock } from './room.types.js';

export const moderationDenyBits = P.Connect | P.SendMessages | P.SendTTSMessages | P.SendVoiceMessages | P.SendPolls;
const accessBits = P.ViewChannel | P.Connect | P.SendMessages;

export function moderationDeniedBefore(access: readonly OverwriteData[], memberId: string): bigint {
  const overwrite = access.find(entry => entry.type === OverwriteType.Member && (typeof entry.id === 'string' ? entry.id : entry.id.id) === memberId);
  return new PermissionsBitField(overwrite?.deny).bitfield & moderationDenyBits;
}

// Stable across DB clones/order, without attempting to JSON-serialize bigint.
export function sameRoomBlocks(a: readonly RoomMemberBlock[], b: readonly RoomMemberBlock[]): boolean {
  const canonical = (blocks: readonly RoomMemberBlock[]) => JSON.stringify(blocks.map(({ id, memberDiscordId, state, deniedBefore }) =>
    [id, memberDiscordId, state, deniedBefore.toString()]).sort((x, y) => String(x[1]).localeCompare(String(y[1])) || String(x[0]).localeCompare(String(y[0]))));
  return canonical(a) === canonical(b);
}

// Used for forward projection AND captured-overwrite compensation. Presence and
// old grants never outrank BLOCKED. A pending unblock inherits today's policy,
// not the member's authorization before the block.
export function projectModerationAccess(previous: readonly OverwriteData[], policy: RoomAccessPolicy, allowedIds: readonly string[], blocks: readonly RoomMemberBlock[]) {
  const projected = new Map(previous.map(entry => {
    const id = typeof entry.id === 'string' ? entry.id : entry.id.id;
    return [id, { id, type: entry.type ?? OverwriteType.Member, allow: new PermissionsBitField(entry.allow).bitfield, deny: new PermissionsBitField(entry.deny).bitfield }];
  }));
  for (const block of blocks) {
    const id = block.memberDiscordId;
    const old = projected.get(id) ?? { id, type: OverwriteType.Member, allow: 0n, deny: 0n };
    const mask = moderationDenyBits | P.ViewChannel;
    let allow = old.allow & ~mask; let deny = old.deny & ~mask;
    if (block.state === 'BLOCKED') {
      deny |= moderationDenyBits;
      if (policy.visibility === 'PRIVATE') deny |= P.ViewChannel;
      else allow |= P.ViewChannel;
    } else {
      deny |= block.deniedBefore & moderationDenyBits;
      if (allowedIds.includes(id)) { allow |= accessBits; deny &= ~accessBits; }
    }
    if (allow || deny) projected.set(id, { ...old, type: OverwriteType.Member, allow, deny });
    else projected.delete(id);
  }
  return [...projected.values()];
}
