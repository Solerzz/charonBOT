import { randomUUID } from 'node:crypto';
import { MessageFlags, type ButtonInteraction, type Guild, type Interaction, type ModalSubmitInteraction, type StringSelectMenuInteraction, type UserSelectMenuInteraction } from 'discord.js';
import { z, ZodError } from 'zod';
import type { Logger } from 'pino';
import { createLogger } from '../../core/logger/logger.js';
import { markCallActionFailed, measureCallStage, runCallActionTrace } from './call-action.metrics.js';
import type { InteractionHandler } from '../../core/discord/interactions/interaction-handler.js';
import type { OwnershipService } from '../ownership/ownership.service.js';
import type { TransferService } from '../ownership/transfer.service.js';
import type { OwnershipTimers } from '../ownership/ownership.timers.js';
import type { RoomControlsService } from './room-controls.service.js';
import type { RoomModerationService } from './room-moderation.service.js';
import { buildModerationHome, buildModerationBlockPrompt, buildModerationBlockedPage, buildModerationConfirmation, buildModerationResult, type ModerationSelection } from './call-moderation.view.js';
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
type Dependencies = { store: RoomStateRepository; ownership: OwnershipService; transfers: TransferService; controls: RoomControlsService; moderation: RoomModerationService; panels: RoomPanelService; timers: OwnershipTimers; coordinator: RoomCoordinator; workspaces: CallPrivateWorkspace; logger?: Logger };

const unavailable = 'Esta ação não está disponível para você ou expirou. Use os controles atuais da sua sala.';
function failureMessage(error: unknown, invalidInput: string): string {
  if (error instanceof ZodError) return invalidInput;
  if (!(error instanceof RoomActionError)) return unavailable;
  if (error.code === 'PERMISSIONS_UNAVAILABLE') {
    const permissions = { MANAGE_ROLES: 'Gerenciar Cargos', MANAGE_CHANNELS: 'Gerenciar Canais', VIEW_CHANNEL: 'Ver Canal',
      SEND_MESSAGES: 'Enviar Mensagens', EMBED_LINKS: 'Inserir Links', READ_MESSAGE_HISTORY: 'Ler Histórico de Mensagens', MOVE_MEMBERS: 'Mover Membros' };
    if (error.reason && Object.hasOwn(permissions, error.reason)) return `Peça a um administrador para conceder ao bot a permissão ${permissions[error.reason as keyof typeof permissions]}.`;
    if (error.reason === 'OVERWRITE_CAPACITY') return 'A operação excederia o limite de 100 sobrescritas de permissões. Peça a um administrador para revisar os acessos da sala.';
    if (error.reason === 'INCOMPATIBLE_OVERWRITES') return 'Há sobrescritas de permissões incompatíveis com a privacidade. Peça a um administrador para revisar os acessos da sala.';
    return 'O bot não tem as permissões necessárias. Peça a um administrador para revisar as permissões da sala.';
  }
  switch (error.code) {
    case 'PROTECTED_MEMBER': return 'Não é possível bloquear o dono da sala, bots ou administradores.';
    case 'MEMBER_BLOCKED': return 'Este membro está bloqueado nesta sala. Desbloqueie antes de autorizar ou transferir.';
    case 'MODERATION_INCOMPLETE': return 'A alteração foi salva, mas a aplicação no Discord ainda não foi confirmada. Use os controles atuais para consultar ou recuperar o estado; a autorização anterior não é restaurada.';
    case 'TRANSFER_PENDING': return 'Já existe uma transferência pendente. Confirme, desfaça ou aguarde sua conclusão.';
    case 'PRIORITY_RESERVED': return 'Outro participante tem prioridade para assumir. Aguarde o prazo indicado no painel.';
    case 'ALREADY_OWNS_ROOM': return 'Você ou o destinatário já possui uma sala neste servidor. Escolha alguém elegível sem outra sala.';
    case 'UNKNOWN_MEMBER': return 'Escolha um membro humano elegível e presente na sala para transferir, ou um membro válido para autorizar.';
    default: return unavailable;
  }
}

export class CallInteractions implements InteractionHandler<CallInteraction> {
  private readonly logger: Logger;
  constructor(private readonly dependencies: Dependencies, private readonly gatewayFactory: (guild: Guild) => RoomDiscordGateway) {
    this.logger = dependencies.logger ?? createLogger({ level: 'info' });
  }
  canHandle(interaction: Interaction): interaction is CallInteraction {
    return (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isUserSelectMenu() || interaction.isModalSubmit())
      && interaction.customId.startsWith('call:');
  }

  async execute(interaction: CallInteraction): Promise<void> {
    const parsed = callComponentSchema.safeParse(interaction.customId);
    return runCallActionTrace(this.logger, parsed.success ? parsed.data.action : 'invalid', () => this.executeTraced(interaction, parsed));
  }

  private async executeTraced(interaction: CallInteraction, parsed: ReturnType<typeof callComponentSchema.safeParse>): Promise<void> {
    let mode: CallAckMode = 'none';
    let invalidInput = 'Seleção inválida. Use os controles atuais da sala.';
    let actor: RoomActor | undefined;
    let privateOrigin = false;
    let moderationStarted = false;
    let moderationReturned = false;
    const selectionAction = parsed.success && (parsed.data.action === 'mod-confirm' || parsed.data.action === 'mod-cancel');
    const { store, controls, moderation, ownership, transfers, workspaces } = this.dependencies;
    try {
      if (!parsed.success || !interaction.inGuild() || !interaction.guild || interaction.guild.id !== interaction.guildId) {
        throw new RoomActionError('STALE_CONTROLS');
      }
      const component = parsed.data;
      const action = component.action;
      // Modal launch must be the initial response, never a deferred reply followed by showModal.
      const modal = action === 'rename' || action === 'limit';
      if (!modal) {
        mode = await measureCallStage('ack', () => acknowledgeCallAction(interaction));
      }
      const state = await store.read(component.roomId);
      if (!state || state.room.guildDiscordId !== interaction.guildId || state.room.channelDiscordId !== interaction.channelId) throw new RoomActionError('ROOM_UNAVAILABLE');
      privateOrigin = this.assertOrigin(interaction, state);
      const privateAction = ['allow-add', 'allow-remove', 'transfer-target', 'confirm', 'undo', 'mod-home', 'mod-block', 'mod-list', 'mod-target', 'mod-unblock', 'mod-page', 'mod-confirm', 'mod-cancel'].includes(action);
      if (privateAction !== privateOrigin) throw new RoomActionError('STALE_CONTROLS');
      const operation = 'operationId' in component ? await store.readTransfer(component.operationId) : null;
      if ('operationId' in component && (!operation || operation.roomId !== component.roomId || state.transfer?.id !== operation.id)) throw new RoomActionError('STALE_CONTROLS');
      const selected = 'selectionId' in component ? workspaces.readModerationSelection(component.roomId, interaction.guildId, interaction.user.id, interaction.message!.id, component.selectionId) : null;
      if ('selectionId' in component && !selected) throw new RoomActionError('STALE_CONTROLS');
      actor = selected?.actor ?? { roomId: component.roomId, guildDiscordId: interaction.guildId, memberDiscordId: interaction.user.id,
        controlVersion: 'controlVersion' in component ? component.controlVersion : operation!.controlVersion };
      const gateway = this.gatewayFactory(interaction.guild);
      if (action === 'claim') {
        if (!interaction.isButton()) throw new RoomActionError('STALE_CONTROLS');
        await ownership.claim(actor, gateway);
      } else {
        const context = await requireOwnedRoom(store, actor, gateway);
        let selection: ModerationSelection | undefined;
        if (privateOrigin) {
          await this.validateWorkspace(interaction, actor, gateway, operation?.id, state => {
            if ('selectionId' in component) {
              const current = workspaces.readModerationSelection(actor!.roomId, actor!.guildDiscordId, actor!.memberDiscordId, interaction.message!.id, component.selectionId);
              if (!current || current.actor.controlVersion !== actor!.controlVersion) throw new RoomActionError('STALE_CONTROLS');
              if (state.transfer) throw new RoomActionError('TRANSFER_PENDING');
              selection = workspaces.consumeModerationSelection(actor!, interaction.message!.id, component.selectionId) ?? undefined;
              if (!selection) throw new RoomActionError('STALE_CONTROLS');
            }
            workspaces.adopt(actor!, this.delivery(interaction, interaction.message!.id));
            if (state.transfer && !operation) throw new RoomActionError('TRANSFER_PENDING');
          });
        }
        switch (action) {
          case 'moderation': case 'mod-home': case 'mod-block': case 'mod-list': case 'mod-page': case 'mod-cancel': {
            if (!interaction.isButton()) throw new RoomActionError('STALE_CONTROLS');
            await this.showWorkspaceView(interaction, actor, gateway, state => ({ kind: 'moderation', payload:
              action === 'mod-block' ? buildModerationBlockPrompt(actor!)
                : action === 'mod-list' || action === 'mod-page' ? buildModerationBlockedPage(actor!, state.memberBlocks, action === 'mod-page' ? component.page : 0)
                  : buildModerationHome(actor!) })); return;
          }
          case 'mod-target': case 'mod-unblock': {
            if (!interaction.isUserSelectMenu() && !interaction.isStringSelectMenu()) throw new RoomActionError('STALE_CONTROLS');
            if (action === 'mod-target' ? !interaction.isUserSelectMenu() : !interaction.isStringSelectMenu()) throw new RoomActionError('STALE_CONTROLS');
            const [target] = action === 'mod-target' ? callMemberSelectionSchema.parse(interaction.values) : z.tuple([z.uuid()]).parse(interaction.values);
            await this.showWorkspaceView(interaction, actor, gateway, state => {
              if (state.transfer) throw new RoomActionError('TRANSFER_PENDING');
              const block = action === 'mod-unblock' ? state.memberBlocks.find(record => record.id === target) : undefined;
              if (action === 'mod-unblock' && !block) throw new RoomActionError('STALE_CONTROLS');
              const selection: ModerationSelection = action === 'mod-target' ? { id: randomUUID(), kind: 'block', memberId: target } : { id: randomUUID(), kind: 'unblock', blockId: target };
              return { kind: 'moderation-confirm', selection, payload: buildModerationConfirmation(actor!, selection, block?.memberDiscordId ?? target) };
            }); return;
          }
          case 'mod-confirm': {
            if (!interaction.isButton() || !selection) throw new RoomActionError('STALE_CONTROLS');
            moderationStarted = true;
            const result = selection.kind === 'block' ? await moderation.block(actor, selection.memberId, gateway) : await moderation.unblock(actor, selection.blockId, gateway);
            moderationReturned = true;
            await this.finishModeration(interaction, actor, result.actor, gateway, buildModerationResult(result.actor, result)); return;
          }
          case 'rename': case 'limit':
            if (!interaction.isButton()) throw new RoomActionError('STALE_CONTROLS');
            await measureCallStage('ack', () => interaction.showModal(action === 'rename' ? buildRenameModal(actor!, context.state.room.name) : buildLimitModal(actor!, context.state.room.userLimit))); return;
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
      markCallActionFailed();
      // Never echo SQL, Discord payloads or forged IDs. All failures stay private.
      const payload = { content: failureMessage(error, invalidInput), embeds: [], components: [], allowedMentions: { parse: [] as never[] } };
      if (moderationStarted && actor && interaction.guild) {
        // Never replay a saved intent or create a second message after mutation.
        // Workspace lineage fences this result if another flow has already won.
        if (moderationReturned) return;
        const current = await store.read(actor.roomId).catch(() => null);
        // A stage/fence can advance once. A later epoch (including A→B→A)
        // cannot become the old attempt's authority merely because A owns again.
        if (current && current.room.ownerDiscordId === actor.memberDiscordId
          && current.room.controlVersion >= actor.controlVersion && current.room.controlVersion <= actor.controlVersion + 1) {
          const after = { ...actor, controlVersion: current.room.controlVersion };
          await this.finishModeration(interaction, actor, after, this.gatewayFactory(interaction.guild), payload).catch(() => undefined);
        }
        return;
      }
      let delivery: Promise<boolean> | undefined;
      if (actor && interaction.guild && !selectionAction) {
        // Locate the lock only. This possibly delayed snapshot is never authority
        // for authority; validateWorkspace starts reconciliation under the
        // coordinator, drains outside it, then validates SQL/live authority again.
        const location = await store.read(actor.roomId).catch(() => null);
        const failedActor = actor;
        await this.validateWorkspace(interaction, failedActor, this.gatewayFactory(interaction.guild), undefined, state => {
          if (privateOrigin && mode === 'source') {
            const pending = state.transfer;
            delivery = workspaces.editFailure(failedActor, interaction.message!.id, payload,
              pending ? { operationId: pending.id, payload: buildTransferPrompt(failedActor, pending, this.seconds(pending)) } : null);
          }
        }, location?.room.channelDiscordId ?? interaction.channelId!).catch(() => undefined);
      }
      await measureCallStage(mode === 'none' ? 'ack' : 'panel', () => replyCallFailure(interaction, mode, payload, delivery ? () => delivery! : undefined)).catch(() => undefined);
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
    const edit = (payload: CallPanelPayload) => measureCallStage('panel', () => interaction.webhook.editMessage(messageId, { content: '', ...payload }));
    return { messageId, expiresAt: interaction.createdTimestamp + 900_000, edit,
      deactivate: async () => { await edit({ content: 'Área encerrada. Use os controles atuais da sala.', embeds: [], components: [], allowedMentions: { parse: [] } }); } };
  }

  private async validateWorkspace(interaction: CallInteraction, actor: RoomActor, gateway: RoomDiscordGateway, operationId: string | undefined, prepare: (state: RoomState) => void, channelId = interaction.channelId!): Promise<void> {
    const { store, coordinator } = this.dependencies;
    let draining: Promise<void> | undefined;
    // Snapshot and synchronous retirement share the coordinator with new opens.
    // Release every lock before draining delivery, then revalidate authority.
    await coordinator.member(actor.guildDiscordId, actor.memberDiscordId, () => coordinator.room(actor.guildDiscordId, channelId, async () => {
      draining = this.dependencies.workspaces.reconcile(actor.roomId, await store.read(actor.roomId));
    }));
    await draining;
    await coordinator.member(actor.guildDiscordId, actor.memberDiscordId, () => coordinator.room(actor.guildDiscordId, channelId, async () => {
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

  private async showWorkspace(interaction: CallInteraction, actor: RoomActor, gateway: RoomDiscordGateway, kind: 'access' | 'transfer-target', operationId?: string): Promise<void> {
    return this.showWorkspaceView(interaction, actor, gateway, () => ({ kind, payload: kind === 'access' ? buildAccessPrompt(actor) : buildTransferTargetPrompt(actor) }), operationId);
  }

  private async showWorkspaceView(interaction: CallInteraction, actor: RoomActor, gateway: RoomDiscordGateway, build: (state: RoomState) => CallWorkspaceView, operationId?: string): Promise<void> {
    let publishing!: Promise<CallWorkspaceDelivery>;
    await this.validateWorkspace(interaction, actor, gateway, operationId, state => {
      const pending = state.transfer;
      const view: CallWorkspaceView = pending
        ? { kind: 'transfer-pending', operationId: pending.id, payload: buildTransferPrompt(actor, pending, this.seconds(pending)) }
        : build(state);
      publishing = this.dependencies.workspaces.show(actor, view, async payload => {
        // Only public opens create a response. Private selections proved their
        // origin and adopted it before entering this path.
        if (interaction.message?.flags.has(MessageFlags.Ephemeral)) throw new RoomActionError('STALE_CONTROLS');
        const message = await measureCallStage('panel', () => interaction.followUp({ ...payload, flags: MessageFlags.Ephemeral }));
        if (!message?.id || message.id === state.room.controlMessageDiscordId) throw new RoomActionError('DISCORD_FAILURE');
        return this.delivery(interaction, message.id);
      });
    });
    await publishing;
  }

  private async finishModeration(interaction: CallInteraction, before: RoomActor, after: RoomActor, gateway: RoomDiscordGateway, payload: CallPanelPayload): Promise<void> {
    const { store, coordinator, workspaces } = this.dependencies;
    let publishing: Promise<boolean> | undefined;
    await coordinator.member(after.guildDiscordId, after.memberDiscordId, () => coordinator.room(after.guildDiscordId, interaction.channelId!, async () => {
      const { state } = await requireOwnedRoom(store, after, gateway);
      if (state.room.channelDiscordId !== interaction.channelId || state.transfer) throw new RoomActionError('STALE_CONTROLS');
      this.assertOrigin(interaction, state);
      const current = await store.read(after.roomId);
      if (!current || !current.controlsEnabled || current.room.status !== 'ACTIVE' || current.room.ownerDiscordId !== after.memberDiscordId
        || current.room.controlVersion !== after.controlVersion || current.transfer) throw new RoomActionError('STALE_CONTROLS');
      coordinator.assertContinuous(after.guildDiscordId, state.room.channelDiscordId, [after.memberDiscordId]);
      publishing = workspaces.replaceAfterMutation(before, after, this.delivery(interaction, interaction.message!.id), { kind: 'moderation', payload });
    }));
    await publishing;
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
