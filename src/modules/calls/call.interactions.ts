import { MessageFlags, type ButtonInteraction, type Guild, type Interaction, type ModalSubmitInteraction, type StringSelectMenuInteraction, type UserSelectMenuInteraction } from 'discord.js';
import type { InteractionHandler } from '../../core/discord/interactions/interaction-handler.js';
import type { OwnershipService } from '../ownership/ownership.service.js';
import type { TransferService } from '../ownership/transfer.service.js';
import type { OwnershipTimers } from '../ownership/ownership.timers.js';
import type { RoomControlsService } from './room-controls.service.js';
import type { RoomPanelService } from './room-panel.service.js';
import type { RoomStateRepository } from './room-state.repository.js';
import { RoomActionError, type RoomActor, type RoomDiscordGateway, type PendingOwnershipTransfer } from './room.types.js';
import { callComponentSchema, callLimitSubmissionSchema, callMemberSelectionSchema, callOwnerMenuSelectionSchema, callRenameSubmissionSchema } from './call.schemas.js';
import { requireOwnedRoom } from './room-context.js';
import { buildAccessPrompt, buildLimitModal, buildOwnerMenu, buildRenameModal, buildTransferPrompt, buildTransferTargetPrompt } from './call-controls.view.js';

export type CallInteraction = ButtonInteraction | StringSelectMenuInteraction | UserSelectMenuInteraction | ModalSubmitInteraction;
type Dependencies = { store: RoomStateRepository; ownership: OwnershipService; transfers: TransferService; controls: RoomControlsService; panels: RoomPanelService; timers: OwnershipTimers };

export class CallInteractions implements InteractionHandler<CallInteraction> {
  constructor(private readonly dependencies: Dependencies, private readonly gatewayFactory: (guild: Guild) => RoomDiscordGateway) {}
  canHandle(interaction: Interaction): interaction is CallInteraction {
    return (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isUserSelectMenu() || interaction.isModalSubmit())
      && interaction.customId.startsWith('call:');
  }

  async execute(interaction: CallInteraction): Promise<void> {
    let acknowledged = false;
    const { store, controls, ownership, transfers } = this.dependencies;
    try {
      const parsed = callComponentSchema.safeParse(interaction.customId);
      if (!parsed.success || !interaction.inGuild() || !interaction.guild || interaction.guild.id !== interaction.guildId) {
        throw new RoomActionError('STALE_CONTROLS');
      }
      const component = parsed.data;
      let action = component.action;
      if (action === 'menu') {
        if (!interaction.isStringSelectMenu()) throw new RoomActionError('STALE_CONTROLS');
        [action] = callOwnerMenuSelectionSchema.parse(interaction.values);
      }
      // Modal launch must be the initial response, never a deferred reply followed by showModal.
      const modal = action === 'rename' || action === 'limit';
      if (!modal) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        acknowledged = true;
      }
      const state = await store.read(component.roomId);
      if (!state || state.room.guildDiscordId !== interaction.guildId || state.room.channelDiscordId !== interaction.channelId) throw new RoomActionError('ROOM_UNAVAILABLE');
      const operation = 'operationId' in component ? await store.readTransfer(component.operationId) : null;
      if ('operationId' in component && (!operation || operation.roomId !== component.roomId)) throw new RoomActionError('STALE_CONTROLS');
      const actor: RoomActor = { roomId: component.roomId, guildDiscordId: interaction.guildId, memberDiscordId: interaction.user.id,
        controlVersion: 'controlVersion' in component ? component.controlVersion : operation!.controlVersion };
      const gateway = this.gatewayFactory(interaction.guild);
      if (action === 'claim') {
        if (!interaction.isButton()) throw new RoomActionError('STALE_CONTROLS');
        await ownership.claim(actor, gateway);
      } else {
        const context = await requireOwnedRoom(store, actor, gateway);
        switch (action) {
          case 'open':
            if (!interaction.isButton()) throw new RoomActionError('STALE_CONTROLS');
            await interaction.editReply(buildOwnerMenu(actor)); return;
          case 'rename': case 'limit':
            if (!interaction.isButton() && !interaction.isStringSelectMenu()) throw new RoomActionError('STALE_CONTROLS');
            await interaction.showModal(action === 'rename' ? buildRenameModal(actor, context.state.room.name) : buildLimitModal(actor, context.state.room.userLimit)); return;
          case 'rename-save':
            if (!interaction.isModalSubmit()) throw new RoomActionError('STALE_CONTROLS');
            await controls.rename(actor, callRenameSubmissionSchema.parse({ name: interaction.fields.getTextInputValue('name') }).name, gateway); break;
          case 'limit-save':
            if (!interaction.isModalSubmit()) throw new RoomActionError('STALE_CONTROLS');
            await controls.setLimit(actor, callLimitSubmissionSchema.parse({ limit: interaction.fields.getTextInputValue('limit') }).limit, gateway); break;
          case 'visibility':
            if (!interaction.isButton() && !interaction.isStringSelectMenu()) throw new RoomActionError('STALE_CONTROLS');
            await controls.setVisibility(actor, context.state.room.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC', gateway); break;
          case 'access': case 'transfer':
            if (!interaction.isButton() && !interaction.isStringSelectMenu()) throw new RoomActionError('STALE_CONTROLS');
            await interaction.editReply(action === 'access' ? buildAccessPrompt(actor) : buildTransferTargetPrompt(actor)); return;
          case 'allow-add': case 'allow-remove': case 'transfer-target': {
            if (!interaction.isUserSelectMenu()) throw new RoomActionError('STALE_CONTROLS');
            const [member] = callMemberSelectionSchema.parse(interaction.values);
            if (action === 'transfer-target') {
              const pending = await transfers.begin(actor, member, gateway);
              try {
                const published = await interaction.editReply(buildTransferPrompt(actor, pending, 5));
                // editReply's native Message is delivery confirmation; a missing/uncertain reply never arms.
                if (!published?.id) throw new RoomActionError('DISCORD_FAILURE');
                const armed = await transfers.activate(actor, pending.id, gateway);
                if (!armed?.expiresAt) throw new RoomActionError('STALE_CONTROLS');
                this.countdown(interaction, actor, armed);
              } catch (error) {
                await transfers.abortUnpublished(pending.id, gateway);
                throw error;
              }
              return;
            }
            await controls.setAllowed(actor, member, action === 'allow-add', gateway); break;
          }
          case 'confirm': case 'undo':
            if (!interaction.isButton() || !operation) throw new RoomActionError('STALE_CONTROLS');
            await transfers[action](actor, operation.id, gateway); break;
          default: throw new RoomActionError('STALE_CONTROLS');
        }
      }
      await interaction.editReply({ content: 'Ação concluída.', embeds: [], components: [], allowedMentions: { parse: [] } });
    } catch {
      // Never echo SQL, Discord payloads or forged IDs. All failures stay private.
      const payload = { content: 'Esta ação não está disponível para você ou expirou. Use os controles atuais da sua sala.', embeds: [], components: [], allowedMentions: { parse: [] as never[] } };
      if (acknowledged) await interaction.editReply(payload).catch(() => undefined);
      else await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral }).catch(() => undefined);
    }
  }

  private countdown(interaction: CallInteraction, actor: RoomActor, pending: PendingOwnershipTransfer): void {
    const { timers, store } = this.dependencies;
    const tick = async (): Promise<void> => {
      const current = await store.readTransfer(pending.id);
      if (!current || current.expiresAt === null || current.expiresAt <= new Date()) {
        await interaction.editReply({ content: 'Transferência encerrada. Use os controles atuais da sala.', embeds: [], components: [], allowedMentions: { parse: [] } }).catch(() => undefined);
        return;
      }
      const seconds = Math.min(5, Math.max(0, Math.ceil((current.expiresAt.getTime() - Date.now()) / 1_000)));
      await interaction.editReply(buildTransferPrompt(actor, current, seconds)).catch(() => undefined);
      // Rendering never owns or extends the transfer's real deadline.
      const stillPending = await store.readTransfer(pending.id);
      if (!timers.isStopped && stillPending?.expiresAt && stillPending.expiresAt > new Date()) {
        timers.schedule(`countdown:${actor.roomId}`, new Date(Date.now() + 1_000), tick);
      }
    };
    if (!timers.isStopped) timers.schedule(`countdown:${actor.roomId}`, new Date(Date.now() + 1_000), tick);
  }
}
