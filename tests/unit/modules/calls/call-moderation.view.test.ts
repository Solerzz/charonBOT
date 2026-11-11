import { ComponentType, type APIActionRowComponent, type APIButtonComponent, type APIStringSelectComponent, type APIUserSelectComponent, type APIEmbed } from 'discord.js';
import { describe, expect, it } from 'vitest';
import { buildModerationHome, buildModerationBlockPrompt, buildModerationBlockedPage, buildModerationConfirmation, buildModerationResult, type ModerationSelection } from '../../../../src/modules/calls/call-moderation.view.js';
import type { CallPanelPayload } from '../../../../src/modules/calls/call-panel.view.js';
import { callComponentSchema } from '../../../../src/modules/calls/call.schemas.js';
import type { RoomActor, RoomMemberBlock } from '../../../../src/modules/calls/room.types.js';
import { room } from './call.fixtures.js';

const actor: RoomActor = { roomId: room.id, guildDiscordId: room.guildDiscordId, memberDiscordId: room.ownerDiscordId!, controlVersion: Number.MAX_SAFE_INTEGER };
const selectionId = '123e4567-e89b-42d3-a456-426614174000';
const memberId = '72345678901234567';
const block = (n: number, state: RoomMemberBlock['state'] = 'BLOCKED'): RoomMemberBlock => ({ id: `123e4567-e89b-42d3-a456-${String(n).padStart(12, '0')}`, roomId: room.id, memberDiscordId: String(72345678901234567n + BigInt(n)), state, deniedBefore: 0n, createdAt: new Date(0) });
function json(payload: CallPanelPayload) {
  const result = JSON.parse(JSON.stringify(payload)) as { embeds: APIEmbed[]; components: APIActionRowComponent<APIButtonComponent | APIStringSelectComponent | APIUserSelectComponent>[]; allowedMentions: unknown };
  expect(result.allowedMentions).toEqual({ parse: [] });
  for (const row of result.components) {
    expect(row.components.length).toBeLessThanOrEqual(5);
    for (const component of row.components) {
      if ('custom_id' in component) { expect(component.custom_id.length).toBeLessThanOrEqual(100); expect(callComponentSchema.safeParse(component.custom_id).success).toBe(true); }
    }
  }
  return result;
}
const actions = (payload: ReturnType<typeof json>) => payload.components.flatMap(row => row.components).map(c => 'custom_id' in c ? callComponentSchema.parse(c.custom_id).action : null);

describe('native private moderation builders', () => {
  it('offers block and unblock without public member information', () => {
    const home = json(buildModerationHome(actor));
    expect(actions(home)).toEqual(['mod-block', 'mod-list']);
    expect(home.components[0]!.components.map(c => 'label' in c && c.label)).toEqual(['Bloquear membro', 'Desbloquear membro']);
  });

  it('selects exactly one guild user, including members outside the call', () => {
    const prompt = json(buildModerationBlockPrompt(actor));
    expect(prompt.components[0]!.components[0]).toMatchObject({ type: ComponentType.UserSelect, min_values: 1, max_values: 1 });
    expect(actions(prompt)).toEqual(['mod-target', 'mod-home']);
    expect(JSON.stringify(prompt)).toContain('fora da call');
  });

  it('sorts a copy by member/id and paginates 25 records without requiring guild lookups', () => {
    const records = Array.from({ length: 51 }, (_, n) => block(n)).reverse();
    const first = json(buildModerationBlockedPage(actor, records, 0));
    const select = first.components[0]!.components[0]!;
    expect(select).toMatchObject({ type: ComponentType.StringSelect, min_values: 1, max_values: 1 });
    if (select.type !== ComponentType.StringSelect) throw new Error('expected select');
    expect(select.options.map(o => o.value)).toEqual(Array.from({ length: 25 }, (_, n) => block(n).id));
    expect(select.options.every(o => o.label.length <= 100)).toBe(true);
    expect(actions(first)).toEqual(['mod-unblock', 'mod-page', 'mod-home']);
    const pageNumbers = (p: ReturnType<typeof json>) => p.components.flatMap(r => r.components).flatMap(c => {
      if (!('custom_id' in c)) return [];
      const parsed = callComponentSchema.parse(c.custom_id); return parsed.action === 'mod-page' ? [parsed.page] : [];
    });
    expect(pageNumbers(first)).toEqual([1]);
    const middle = json(buildModerationBlockedPage(actor, records, 1));
    expect(actions(middle)).toEqual(['mod-unblock', 'mod-page', 'mod-page', 'mod-home']);
    expect(pageNumbers(middle)).toEqual([0, 2]);
    const last = json(buildModerationBlockedPage(actor, records, 2));
    expect(actions(last)).toEqual(['mod-unblock', 'mod-page', 'mod-home']);
    expect(pageNumbers(last)).toEqual([1]);
    expect(records[0]!.id).toBe(block(50).id);
    const tied = json(buildModerationBlockedPage(actor, [{ ...block(2), memberDiscordId: memberId }, { ...block(1), memberDiscordId: memberId }], 0));
    const tiedSelect = tied.components[0]!.components[0]!;
    if (tiedSelect.type !== ComponentType.StringSelect) throw new Error('expected select');
    expect(tiedSelect.options.map(o => o.value)).toEqual([block(1).id, block(2).id]);
  });

  it('shows recoverable UNBLOCK_PENDING rather than reporting successful release', () => {
    const page = json(buildModerationBlockedPage(actor, [block(0, 'UNBLOCK_PENDING')], 0));
    const select = page.components[0]!.components[0]!;
    if (select.type !== ComponentType.StringSelect) throw new Error('expected select');
    expect(select.options[0]).toMatchObject({ value: block(0).id, description: expect.stringMatching(/pendente/i) });
    expect(JSON.stringify(page)).not.toContain('Membro desbloqueado');
  });

  it('explains empty lists and clamps out-of-range pages without invalid navigation', () => {
    const empty = json(buildModerationBlockedPage(actor, [], 0));
    expect(actions(empty)).toEqual(['mod-home']);
    expect(JSON.stringify(empty)).toContain('Nenhum');
    expect(actions(json(buildModerationBlockedPage(actor, [block(0)], 999)))).toEqual(['mod-unblock', 'mod-home']);
    for (const page of [-1, 1.5, NaN, Infinity]) expect(() => buildModerationBlockedPage(actor, [], page)).toThrow();
  });

  it.each(['block', 'unblock'] as const)('binds %s confirmation only to selection UUID, not target or operation ID', kind => {
    const selection: ModerationSelection = kind === 'block' ? { id: selectionId, kind, memberId } : { id: selectionId, kind, blockId: block(0).id };
    const confirmation = json(buildModerationConfirmation(actor, selection, memberId));
    expect(actions(confirmation)).toEqual(['mod-confirm', 'mod-cancel']);
    for (const c of confirmation.components[0]!.components) {
      if (!('custom_id' in c)) throw new Error('expected ID');
      expect(callComponentSchema.parse(c.custom_id)).toMatchObject({ selectionId });
      expect(c.custom_id).not.toContain(memberId);
    }
    expect(JSON.stringify(confirmation.embeds)).toContain(`<@${memberId}>`);
    expect(JSON.stringify(confirmation)).toMatch(kind === 'block' ? /voz.*chat/ : /autorizar novamente/);
  });

  it('escapes untrusted target text and does not enable mention notifications', () => {
    const result = json(buildModerationConfirmation(actor, { id: selectionId, kind: 'unblock', blockId: block(0).id }, '**@everyone'));
    expect(JSON.stringify(result.embeds)).not.toContain('<@**@everyone>');
    expect(result.embeds[0]!.description).toContain('\\*\\*@\u200beveryone');
  });

  it.each(['blocked', 'unblocked'] as const)('renders committed %s outcomes with current-version navigation', kind => {
    const result = json(buildModerationResult(actor, { actor, kind, memberDiscordId: memberId, removedFromRoom: true }));
    expect(JSON.stringify(result)).toContain(kind === 'blocked' ? 'Membro bloqueado' : 'Membro desbloqueado');
    expect(actions(result)).toEqual(['mod-home']);
    expect(JSON.stringify(result)).toContain(kind === 'blocked' ? 'removido da call' : 'autorizar novamente');
  });
});
