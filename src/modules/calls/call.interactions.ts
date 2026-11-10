import { MessageFlags, type ButtonInteraction, type Guild, type Interaction, type ModalSubmitInteraction, type StringSelectMenuInteraction, type UserSelectMenuInteraction } from 'discord.js';
import { ZodError } from 'zod';
import type { InteractionHandler } from '../../core/discord/interactions/interaction-handler.js';
import type { OwnershipService } from '../ownership/ownership.service.js';
import type { TransferService } from '../ownership/transfer.service.js';
import type { OwnershipTimers } from '../ownership/ownership.timers.js';
import type { RoomControlsService } from './room-controls.service.js';
import type { RoomPanelService } from './room-panel.service.js';
import type { RoomStateRepository } from './room-state.repository.js';
import type { RoomCoordinator } from './room.coordinator.js';
import type { CallPrivateWorkspace, CallWorkspaceDelivery, CallWorkspaceView } from './call-workspace.js';
import type { CallPanelPayload } from './call-panel.view.js';
import { RoomActionError, type RoomActor, type RoomDiscordGateway, type PendingOwnershipTransfer, type RoomState } from './room.types.js';
import { callComponentSchema, callLimitSubmissionSchema, callMemberSelectionSchema, callRenameSubmissionSchema } from './call.schemas.js';
import { requireOwnedRoom } from './room-context.js';
import { buildAccessPrompt, buildLimitModal, buildRenameModal, buildTransferPrompt, buildTransferTargetPrompt } from './call-controls.view.js';
import { acknowledgeCallAction, completeCallAction, replyCallFailure, type CallAckMode } from './call-interaction-response.js';

export type CallInteraction = ButtonInteraction | StringSelectMenuInteraction | UserSelectMenuInteraction | ModalSubmitInteraction;
type Dependencies = { store: RoomStateRepository; ownership: OwnershipService; transfers: TransferService; controls: RoomControlsService; panels: RoomPanelService; timers: OwnershipTimers; coordinator: RoomCoordinator; workspaces: CallPrivateWorkspace };

const unavailable = 'Esta ação não está disponível para você ou expirou. Use os controles atuais da sua sala.';
function failureMessage(error: unknown, invalidInput: string): string {
  if (error instanceof ZodError) return invalidInput;
  if (!(error instanceof RoomActionError)) return unavailable;
  if (error.code === 'PERMISSIONS_UNAVAILABLE') {
    const permissions = { MANAGE_ROLES: 'Gerenciar Cargos', MANAGE_CHANNELS: 'Gerenciar Canais', VIEW_CHANNEL: 'Ver Canal',
      SEND_MESSAGES: 'Enviar Mensagens', EMBED_LINKS: 'Inserir Links', READ_MESSAGE_HISTORY: 'Ler Histórico de Mensagens' };
    if (error.reason && Object.hasOwn(permissions, error.reason)) return `Peça a um administrador para conceder ao bot a permissão ${permissions[error.reason as keyof typeof permissions]}.`;
    if (error.reason === 'OVERWRITE_CAPACITY') return 'A operação excederia o limite de 100 sobrescritas de permissões. Peça a um administrador para revisar os acessos da sala.';
    if (error.reason === 'INCOMPATIBLE_OVERWRITES') return 'Há sobrescritas de permissões incompatíveis com a privacidade. Peça a um administrador para revisar os acessos da sala.';
    return 'O bot não tem as permissões necessárias. Peça a um administrador para revisar as permissões da sala.';
  }
  switch (error.code) {
    case 'TRANSFER_PENDING': return 'Já existe uma transferência pendente. Confirme, desfaça ou aguarde sua conclusão.';
    case 'PRIORITY_RESERVED': return 'Outro participante tem prioridade para assumir. Aguarde o prazo indicado no painel.';
    case 'ALREADY_OWNS_ROOM': return 'Você ou o destinatário já possui uma sala neste servidor. Escolha alguém elegível sem outra sala.';
    case 'UNKNOWN_MEMBER': return 'Escolha um membro humano elegível e presente na sala para transferir, ou um membro válido para autorizar.';
    default: return unavailable;
  }
}

export class CallInteractions implements InteractionHandler<CallInteraction> {
  constructor(private readonly dependencies: Dependencies, private readonly gatewayFactory: (guild: Guild) => RoomDiscordGateway) {}
  canHandle(interaction: Interaction): interaction is CallInteraction {
    return (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isUserSelectMenu() || interaction.isModalSubmit())
      && interaction.customId.startsWith('call:');
  }

  async execute(interaction: CallInteraction): Promise<void> {
    let mode: CallAckMode = 'none';
    let invalidInput = 'Seleção inválida. Use os controles atuais da sala.';
    let actor: RoomActor | undefined;
    let privateOrigin = false;
    const { store, controls, ownership, transfers, workspaces } = this.dependencies;
    try {
      const parsed = callComponentSchema.safeParse(interaction.customId);
      if (!parsed.success || !interaction.inGuild() || !interaction.guild || interaction.guild.id !== interaction.guildId) {
        throw new RoomActionError('STALE_CONTROLS');
      }
      const component = parsed.data;
      const action = component.action;
      // Modal launch must be the initial response, never a deferred reply followed by showModal.
      const modal = action === 'rename' || action === 'limit';
      if (!modal) {
        mode = await acknowledgeCallAction(interaction);
      }
      const state = await store.read(component.roomId);
      if (!state || state.room.guildDiscordId !== interaction.guildId || state.room.channelDiscordId !== interaction.channelId) throw new RoomActionError('ROOM_UNAVAILABLE');
      privateOrigin = this.assertOrigin(interaction, state);
      const privateAction = ['allow-add', 'allow-remove', 'transfer-target', 'confirm', 'undo'].includes(action);
      if (privateAction !== privateOrigin) throw new RoomActionError('STALE_CONTROLS');
      const operation = 'operationId' in component ? await store.readTransfer(component.operationId) : null;
      if ('operationId' in component && (!operation || operation.roomId !== component.roomId || state.transfer?.id !== operation.id)) throw new RoomActionError('STALE_CONTROLS');
      actor = { roomId: component.roomId, guildDiscordId: interaction.guildId, memberDiscordId: interaction.user.id,
        controlVersion: 'controlVersion' in component ? component.controlVersion : operation!.controlVersion };
      const gateway = this.gatewayFactory(interaction.guild);
      if (action === 'claim') {
        if (!interaction.isButton()) throw new RoomActionError('STALE_CONTROLS');
        await ownership.claim(actor, gateway);
      } else {
        const context = await requireOwnedRoom(store, actor, gateway);
        if (privateOrigin) {
          await this.validateWorkspace(interaction, actor, gateway, operation?.id, state => {
            workspaces.adopt(actor!, this.delivery(interaction, interaction.message!.id));
            if (state.transfer && !operation) throw new RoomActionError('TRANSFER_PENDING');
          });
        }
        switch (action) {
          case 'rename': case 'limit':
            if (!interaction.isButton()) throw new RoomActionError('STALE_CONTROLS');
            await interaction.showModal(action === 'rename' ? buildRenameModal(actor, context.state.room.name) : buildLimitModal(actor, context.state.room.userLimit)); return;
          case 'rename-save':
            if (!interaction.isModalSubmit()) throw new RoomActionError('STALE_CONTROLS');
            invalidInput = 'Informe um nome não vazio com no máximo 11 grafemas.';
            await controls.rename(actor, callRenameSubmissionSchema.parse({ name: interaction.fields.getTextInputValue('name') }).name, gateway); break;
          case 'limit-save':
            if (!interaction.isModalSubmit()) throw new RoomActionError('STALE_CONTROLS');
            invalidInput = 'Informe 0 para ilimitado ou um número inteiro entre 1 e 99.';
            await controls.setLimit(actor, callLimitSubmissionSchema.parse({ limit: interaction.fields.getTextInputValue('limit') }).limit, gateway); break;
          case 'lock':
            if (!interaction.isButton()) throw new RoomActionError('STALE_CONTROLS');
            await controls.toggleLock(actor, gateway); break;
          case 'visibility':
            if (!interaction.isButton()) throw new RoomActionError('STALE_CONTROLS');
            await controls.toggleVisibility(actor, gateway); break;
          case 'access': case 'transfer':
            if (!interaction.isButton()) throw new RoomActionError('STALE_CONTROLS');
            await this.showWorkspace(interaction, actor, gateway, action === 'access' ? 'access' : 'transfer-target'); return;
          case 'allow-add': case 'allow-remove': case 'transfer-target': {
            if (!interaction.isUserSelectMenu()) throw new RoomActionError('STALE_CONTROLS');
            const [member] = callMemberSelectionSchema.parse(interaction.values);
            if (action === 'transfer-target') {
              const pending = await transfers.begin(actor, member, gateway);
              try {
                await this.showWorkspace(interaction, actor, gateway, 'transfer-target', pending.id);
                const armed = await transfers.activate(actor, pending.id, gateway);
                if (!armed?.expiresAt) throw new RoomActionError('STALE_CONTROLS');
                this.countdown(actor, armed);
              } catch (error) {
                await transfers.abortUnpublished(pending.id, gateway);
                throw error;
              }
              return;
            }
            await controls.setAllowed(actor, member, action === 'allow-add', gateway);
            await this.showWorkspace(interaction, actor, gateway, 'access'); break;
          }
          case 'confirm': case 'undo':
            if (!interaction.isButton() || !operation) throw new RoomActionError('STALE_CONTROLS');
            await transfers[action](actor, operation.id, gateway); break;
          default: throw new RoomActionError('STALE_CONTROLS');
        }
      }
      await completeCallAction(interaction, mode);
    } catch (error) {
      // Never echo SQL, Discord payloads or forged IDs. All failures stay private.
      const payload = { content: failureMessage(error, invalidInput), embeds: [], components: [], allowedMentions: { parse: [] as never[] } };
      if (actor) {
        // An access failure can durably fence the generation. Never keep its old handle.
        const current = await store.read(actor.roomId).catch(() => null);
        await workspaces.reconcile(actor.roomId, current);
        if (privateOrigin && current?.transfer && current.room.controlVersion === actor.controlVersion && interaction.guild) {
          try {
            await this.showWorkspace(interaction, actor, this.gatewayFactory(interaction.guild), 'transfer-target', current.transfer.id, payload.content);
            return;
          } catch { /* Fall through to a private failure, never the shared panel. */ }
        }
      }
      await replyCallFailure(interaction, mode, payload).catch(() => undefined);
    }
  }

  private assertOrigin(interaction: CallInteraction, state: RoomState): boolean {
    if (!state.room.controlMessageDiscordId) throw new RoomActionError('STALE_CONTROLS');
    if (interaction.isModalSubmit() && !interaction.isFromMessage()) return false;
    const message = interaction.message;
    if (!message?.id) throw new RoomActionError('STALE_CONTROLS');
    if (!message.flags.has(MessageFlags.Ephemeral)) {
      if (message.id !== state.room.controlMessageDiscordId) throw new RoomActionError('STALE_CONTROLS');
      return false;
    }
    if (message.id === state.room.controlMessageDiscordId || message.author.id !== interaction.applicationId
      || message.interactionMetadata?.user.id !== interaction.user.id
      || !message.components.some(row => 'components' in row && row.components.some(component => 'customId' in component && component.customId === interaction.customId))) {
      throw new RoomActionError('STALE_CONTROLS');
    }
    return true;
  }

  private delivery(interaction: CallInteraction, messageId: string): CallWorkspaceDelivery {
    const edit = (payload: CallPanelPayload) => interaction.webhook.editMessage(messageId, { content: '', ...payload });
    return { messageId, expiresAt: interaction.createdTimestamp + 900_000, edit,
      deactivate: async () => { await edit({ content: 'Área encerrada. Use os controles atuais da sala.', embeds: [], components: [], allowedMentions: { parse: [] } }); } };
  }

  private async validateWorkspace(interaction: CallInteraction, actor: RoomActor, gateway: RoomDiscordGateway, operationId: string | undefined, prepare: (state: RoomState) => void): Promise<void> {
    const { store, coordinator } = this.dependencies;
    await coordinator.member(actor.guildDiscordId, actor.memberDiscordId, () => coordinator.room(actor.guildDiscordId, interaction.channelId!, async () => {
      await this.dependencies.workspaces.reconcile(actor.roomId, await store.read(actor.roomId));
      const { state } = await requireOwnedRoom(store, actor, gateway);
      if (state.room.channelDiscordId !== interaction.channelId) throw new RoomActionError('ROOM_UNAVAILABLE');
      this.assertOrigin(interaction, state);
      const pending = state.transfer;
      if ((pending && (pending.roomId !== actor.roomId || pending.controlVersion !== actor.controlVersion || pending.ownerDiscordId !== actor.memberDiscordId))
        || (operationId && pending?.id !== operationId)) throw new RoomActionError('STALE_CONTROLS');
      coordinator.assertContinuous(actor.guildDiscordId, state.room.channelDiscordId, [actor.memberDiscordId]);
      // Start delivery synchronously with the validated generation, but never hold
      // coordinator locks while awaiting this delivery queue (lifecycle drains it).
      prepare(state);
    }));
  }

  private async showWorkspace(interaction: CallInteraction, actor: RoomActor, gateway: RoomDiscordGateway, kind: 'access' | 'transfer-target', operationId?: string, content?: string): Promise<void> {
    let publishing!: Promise<CallWorkspaceDelivery>;
    let pendingFailure: { operationId: string; payload: CallPanelPayload } | undefined;
    await this.validateWorkspace(interaction, actor, gateway, operationId, state => {
      const pending = state.transfer;
      const view: CallWorkspaceView = pending
        ? { kind: 'transfer-pending', operationId: pending.id, payload: { ...buildTransferPrompt(actor, pending, this.seconds(pending)), ...(content ? { content } : {}) } }
        : { kind, payload: kind === 'access' ? buildAccessPrompt(actor) : buildTransferTargetPrompt(actor) };
      if (content && view.kind === 'transfer-pending') pendingFailure = view;
      publishing = this.dependencies.workspaces.show(actor, view, async payload => {
        // Only public opens create a response. Private selections proved their
        // origin and adopted it before entering this path.
        if (interaction.message?.flags.has(MessageFlags.Ephemeral)) throw new RoomActionError('STALE_CONTROLS');
        const message = await interaction.followUp({ ...payload, flags: MessageFlags.Ephemeral });
        if (!message?.id || message.id === state.room.controlMessageDiscordId) throw new RoomActionError('DISCORD_FAILURE');
        return this.delivery(interaction, message.id);
      });
    });
    await publishing;
    if (pendingFailure) await this.dependencies.workspaces.editPending(actor, pendingFailure.operationId, pendingFailure.payload);
  }

  private seconds(pending: PendingOwnershipTransfer): number {
    return pending.expiresAt ? Math.min(5, Math.max(0, Math.ceil((pending.expiresAt.getTime() - Date.now()) / 1_000))) : 5;
  }

  private countdown(actor: RoomActor, pending: PendingOwnershipTransfer): void {
    const { timers, store, transfers, workspaces } = this.dependencies;
    let ended = false;
    transfers.watchPrompt(actor.roomId, pending.id, () => {
      ended = true;
      timers.cancel(`countdown:${actor.roomId}`);
      if (!timers.isStopped) timers.schedule(`transfer-prompt-terminal:${pending.id}`, new Date(), async () => {
        await workspaces.editPending(actor, pending.id, { embeds: [], components: [], allowedMentions: { parse: [] }, content: 'Transferência encerrada. Use os controles atuais da sala.' }, true);
      });
    });
    const tick = async (): Promise<void> => {
      if (ended || timers.isStopped) return;
      const current = await store.readTransfer(pending.id);
      if (!current || current.expiresAt === null || current.expiresAt <= new Date()) {
        transfers.finishPrompt(actor.roomId, pending.id);
        return;
      }
      if (ended || timers.isStopped) return;
      await workspaces.editPending(actor, pending.id, buildTransferPrompt(actor, current, this.seconds(current)));
      // Rendering never owns or extends the transfer's real deadline.
      const stillPending = await store.readTransfer(pending.id);
      if (!ended && !timers.isStopped && stillPending?.expiresAt && stillPending.expiresAt > new Date()) {
        timers.schedule(`countdown:${actor.roomId}`, new Date(Date.now() + 1_000), tick);
      }
    };
    if (!timers.isStopped) timers.schedule(`countdown:${actor.roomId}`, new Date(Date.now() + 1_000), tick);
  }
}
