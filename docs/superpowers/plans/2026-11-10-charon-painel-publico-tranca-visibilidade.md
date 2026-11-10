# Painel público, tranca e visibilidade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o painel público aprovado, sem confirmações repetidas, com tranca/visibilidade independentes e acesso preservado para autorizados.

**Architecture:** Reutilizar embed, coordenador por membro/sala, repositórios Prisma, projeção de permissões e serviços de posse existentes. Acrescentar um booleano persistido de tranca, uma área privada efêmera reutilizável para seleções e reconhecimento de interações adequado à mensagem de origem. Medir antes de remover redundâncias; não trocar infraestrutura ou reduzir as verificações de autorização.

**Tech Stack:** Node.js >=20.19.0; TypeScript 7.0.2; discord.js 14.28.1; Prisma/adapter-pg 7.10.1; PostgreSQL 17; Vitest 5.1.0; Zod 4.6.7; Pino 10.4.0. Sem novas dependências.

**Spec:** `docs/superpowers/specs/2026-11-10-charon-painel-publico-tranca-visibilidade-design.md`, aprovado pelo usuário. Ler também as regras preservadas em `2026-11-08-charon-v0.3.0-posse-controles-design.md`.

**Execução (2026-11-10): concluída.** As cinco tarefas e a revisão final foram aprovadas após correções. Os checklists abaixo preservam o plano original, não uma lista de trabalho a repetir. Posteriormente, com autorizações específicas, PR #5 mesclado em `main` (`b67f475`), CI antes/depois verde, novo backup/migration no `charon-dev` e início local verificados. Usuário aprovou visual e todos os botões, sem erros/mensagens repetidas; demais cenários não relatados permanecem limites da aceitação. Evidência versionada no documento de validação. Reputação adiada pelo usuário; hospedagem continua para o final.

## Global Constraints

- “Controles públicos; somente o dono pode alterar a sala.” Autorizado de entrada não ganha gestão. **Assumir sala** mantém a exceção e elegibilidade atuais.
- “Mostrar conserva o bit de tranca; destrancar conserva a visibilidade.” Autorizados veem/entram nas combinações restritas; participantes atuais não são expulsos, mas presença anterior não vira autorização permanente.
- “Preservar limite de 11 grafemas no nome e 0–99 para participantes.” Não mudar setup guiado, nome inicial, cinco segundos de transferência ou cinco minutos de prioridade.
- “Não manter transação SQL aberta enquanto espera Discord.” Preservar coordenador, CAS, validação de presença/dono/setup e compensação segura; nunca abrir/mostrar como fallback.
- “Não criar nova tabela de sessão ou alterar RLS/políticas públicas.” Nova migration, sem editar as quatro publicadas; nenhum índice para booleano sem justificativa.
- “Esta aprovação de desenho não autoriza migration remota, restart automático do bot real, registro global, mudança de cargos, limpeza de mensagens históricas, push, merge, deploy/hospedagem ou cobrança.” Não iniciar duas instâncias.
- “Testes que escrevem dados apenas em PostgreSQL local descartável, nunca no Supabase.” Não copiar/imprimir `.env`, tokens, URLs completas ou CA. Preservar TLS verificado.
- A prévia é referência, não HTML de produção: título nativo à esquerda, campos inline e botões em linhas 3+3+1; não prometer CSS ou posição exata no celular.
- Antes de explorar fontes, executar `graphify query "<pergunta>"`; ler fontes localizadas pelo grafo/leitura anterior. Depois de alterações, executar `graphify update .`. Preservar os arquivos gerados já modificados pelo usuário/hooks.

## Review Focus

1. Saída/retorno do dono durante REST ou confirmação SQL perdida: não restaurar acesso de autoridade antiga nem anunciar resultado incerto; Task 2 testa deriva, confirmação e quarentena.
2. Clique num botão v2 “pública/privada” depois do rollout: rejeitar sem executar a nova semântica; Task 4 testa todas as famílias legadas e mensagens de origem incorretas.
3. Expiração do webhook/owner A→B→A enquanto uma área privada é entregue: nenhuma área antiga pode recuperar autoridade ou duplicar silenciosamente; Tasks 3–4 testam relógio e entrega suspensa.
4. Contagem antiga chegando depois de outro fluxo/transferência: não sobrescrever a área atual e nunca ampliar o prazo de cinco segundos; Tasks 3–4 testam identidade da operação e escrita atrasada.
5. Mensagem pública ausente versus Discord proibido/incerto: recriar somente por Unknown Message confirmado; Task 5 testa os códigos 10008/50013/10003 e a contagem de chamadas.

---

## Mapa de arquivos e contratos

| Unidade | Arquivos | Responsabilidade |
| --- | --- | --- |
| Estado durável | `prisma/schema.prisma`, nova migration `20261110020000_room_lock_state`, `src/modules/calls/room.types.ts`, `room-state.repository.ts`, `room-mutation.ts` | Tranca independente e detecção de deriva; nenhuma mudança de regras de posse |
| Acesso | `room.discord.ts`, `room-access.service.ts`, `room-controls.service.ts`, `room.runtime.ts` | Projetar quatro estados, preservar exceções e serializar alterações |
| Área privada | novo `src/modules/calls/call-workspace.ts` | Única área por sala/dono/versão, prazo do handle, fila somente de edição e isolamento de operação |
| Interface | `call-panel.view.ts`, `call-controls.view.ts`, `call.schemas.ts`, `call.interactions.ts`, novo `call-interaction-response.ts` | Embed/botões v3, modais, seleções e reconhecimento/erro por origem |
| Métricas | novo `src/modules/calls/call-action.metrics.ts`, pontos limitados em coordenador/repos/gateway/painel/interações | Medidas por ação sem payload privado; nenhuma autorização em cache |
| Aceitação | novo `docs/validation/2026-11-10-painel-publico-tranca-visibilidade.md` | Evidências locais, amostras medidas e checklist real explicitamente pendente |

Novos testes unitários: `tests/unit/modules/calls/call-workspace.test.ts`, `call-interaction-response.test.ts`, `call-action.metrics.test.ts`. Novo teste PostgreSQL: `tests/integration/room-lock-database.test.ts`. Ampliar as suítes existentes listadas nas tarefas; não criar um framework de testes ou de workflows.

## Preparação e verificações comuns

- [ ] No início da execução, carregar `using-git-worktrees` e estabelecer branch/worktree isolada a partir do main mesclado. Levar somente spec/plano aprovados; não descartar arquivos gerados ou o trabalho atual. Preservar método já escolhido: implementador novo por tarefa, revisão independente por tarefa e revisão final da branch.
- [ ] Registrar HEAD, status e baseline local com `npm run typecheck`, `npm run test:run`, `npm run build`, mantendo `RUN_DATABASE_TESTS=false` e `RUN_DATABASE_SECURITY_TESTS=false`. Não tratar os 1.078 testes históricos como uma verificação nova.
- [ ] Preparar PostgreSQL 17 **local descartável**, com `DATABASE_URL` e `DIRECT_URL` explícitas, mesma identidade/destino e banco `charon_v030_test` ou sufixo aceito pelo guard. Não carregar o ambiente do bot real. Antes de cada migration/prepare/suíte de escrita, executar o guard abaixo e interromper se falhar.

```powershell
node --import tsx --input-type=module -e "import { assertDisposableDatabaseEnvironment as guard } from './tests/integration/database-test-utils.ts'; guard();"
```

Para testes de banco, usar opt-ins `RUN_DATABASE_TESTS=true` e `RUN_DATABASE_SECURITY_TESTS=true` **apenas nesse ambiente guardado**. O fluxo local é o mesmo de `.github/workflows/ci.yml:76-97`: generate → guard/migrate deploy → prepare local → integrações seriais → status/deploy idempotente. Não fornecer credenciais remotas como exemplo.

Cada tarefa segue vermelho→verde, revisão e commit local de arquivos explícitos. Os comandos abaixo têm de terminar com exit 0 para o verde; falha inicial deve estar nas novas asserções, não em credenciais, dependências ou alvo de banco errado. Não publicar commits nem reiniciar o bot.

### Task 1: Persistir tranca sem alterar a privacidade existente

**Files:**
- Modify: `prisma/schema.prisma:38-62`, `src/modules/calls/room.types.ts:12`, `src/modules/calls/room-mutation.ts:11-25`.
- Create: `prisma/migrations/20261110020000_room_lock_state/migration.sql`, `tests/integration/room-lock-database.test.ts`.
- Modify/Test: `tests/unit/modules/calls/call.fixtures.ts:17-24`, `room-state.repository.test.ts`, `room-controls.service.test.ts`; usar `tests/integration/setup-guided-database.test.ts:52-107` como referência de teste de migration isolada.

**Interfaces:**
- Consumes: `TemporaryRoom`, `RoomSettingsPatch`, `PrismaRoomStateRepository.updateSettings(roomId, version, patch): Promise<boolean>` e `currentOwnedRoom(store, actor, gateway, expected?)` existentes.
- Produces: `TemporaryRoom.isLocked: boolean`, default false; `RoomSettingsPatch` passa a aceitar `isLocked`. Assinatura de `updateSettings` não muda. `currentOwnedRoom` também rejeita deriva de `isLocked` com `STALE_CONTROLS`.

- [ ] **Step 1 — escrever testes vermelhos de migration e round-trip.** No PostgreSQL local guardado, criar um schema aleatório de teste com a tabela anterior, RLS ativa e linhas PUBLIC/PRIVATE. Ler e executar a migration real. Asserções centrais:

```ts
expect(rows).toEqual([
  expect.objectContaining({ id: 'visible', visibility: 'PUBLIC', isLocked: false }),
  expect.objectContaining({ id: 'hidden', visibility: 'PRIVATE', isLocked: true }),
]);
expect(insertedWithoutLock.isLocked).toBe(false);
expect(rlsEnabled).toBe(true);
expect(publicPolicies).toEqual([]);
await expect(writeNullLock()).rejects.toMatchObject({ code: '23502', column: 'isLocked' });
expect(await store.read(roomId)).toMatchObject({ room: { isLocked: true, visibility: 'PUBLIC' } });
```

Comparar os demais valores antes/depois e testar alteração só de tranca sem modificar visibilidade. Incluir teste de deriva: capturar `expected`, mudar apenas `isLocked`, chamar `currentOwnedRoom(..., expected)` e esperar `STALE_CONTROLS`. Não migrar o schema público real para provar backfill.
- [ ] **Step 2 — rodar o vermelho.** Guard primeiro; `npm run test:run -- tests/integration/room-lock-database.test.ts --maxWorkers=1` e `npm run test:run -- tests/unit/modules/calls/room-controls.service.test.ts`. Falha esperada: migration/campo ausente ou deriva não rejeitada.
- [ ] **Step 3 — implementar o estado mínimo.** Acrescentar `isLocked Boolean @default(false)`; migration atômica com BEGIN/COMMIT, coluna BOOLEAN NOT NULL DEFAULT false e backfill true somente para PRIVATE. No teste de migration isolada, usar schema/search_path da conexão e limpeza explícita no finally, sem outer transaction que conflite com o COMMIT da migration. Acrescentar false à fixture central, gerar Prisma e estender comparação de deriva. Não adicionar índices ou alterar RLS.
- [ ] **Step 4 — verificar o verde.** `npm run prisma:generate`; guard/migration deploy/prepare **locais**; repetir os testes; `npm run typecheck`. O teste de backfill deve passar tanto para tabela com dados antigos quanto para novas linhas. Confirmar as quatro migrations antigas sem alterações.
- [ ] **Step 5 — autorrevisar e fazer commit local explícito.** Depois dos testes e da autorrevisão, incluir somente os arquivos da tarefa e os arquivos Prisma gerados necessários. Mensagem: `feat: persist independent room lock state`. Atualizar o grafo sem reverter o estado gerado anterior. O controller faz a revisão independente do diff commitado antes de admitir a Task 2.

### Task 2: Aplicar os quatro estados de acesso com segurança

**Files:**
- Modify: `src/modules/calls/room.types.ts`, `room.discord.ts:71-134`, `room-access.service.ts`, `room-controls.service.ts`, `room.runtime.ts`.
- Modify/Test: `tests/unit/modules/calls/room.discord.test.ts`, `room-access.service.test.ts`, `room-controls.service.test.ts`, `room.runtime.test.ts`, `room-settings.fixtures.ts`; `tests/unit/modules/ownership/ownership.fixtures.ts:93-99`; `tests/integration/ownership-database.test.ts:353-441`, `room-lock-database.test.ts`.

**Interfaces:**
- Consumes: `isLocked` da Task 1 e coordenador/validação/compensação existentes.
- Produces: `RoomAccessPolicy = { isLocked: boolean; visibility: RoomVisibility }` em `room.types.ts`; `RoomDiscordGateway.setRoomAccess(channelId: string, policy: RoomAccessPolicy, allowedIds: string[]): Promise<void>`.
- Produces: `RoomAccessService.applySettingsLocked(actor: RoomActor, state: RoomState, patch: Partial<RoomAccessPolicy>, gateway: RoomDiscordGateway): Promise<void>`, `isUncertain(roomId: string): boolean`; preservar `setVisibilityLocked` como delegação e `synchronizeLocked(state: RoomState, snapshot: RoomSnapshot, gateway: RoomDiscordGateway): Promise<void>`.
- Produces: `RoomControlsService.toggleLock(actor: RoomActor, gateway: RoomDiscordGateway): Promise<void>` e `toggleVisibility(actor: RoomActor, gateway: RoomDiscordGateway): Promise<void>`. Calcular o novo valor **dentro** de `withOwned`; manter `setVisibility` e `setAllowed` como APIs de serviço, não como semântica de botão legado.

- [ ] **Step 1 — escrever testes vermelhos da matriz e transições.** Ampliar fixtures reais de serviços/gateway. Para cada par `isLocked=false/true × visibility=PUBLIC/PRIVATE`, verificar @everyone, bot, dono, autorizado fora da call e participante atual. Asserções centrais:

```ts
expect(everyone.allow.has(P.ViewChannel, false)).toBe(visibility === 'PUBLIC');
expect(everyone.allow.has(P.Connect, false)).toBe(visibility === 'PUBLIC' && !isLocked);
expect(authorized.allow.has([P.ViewChannel, P.Connect, P.SendMessages], false)).toBe(true);
expect(f.member.voice.setChannel).not.toHaveBeenCalled();
await f.controls.toggleLock(f.actor(), f.gateway);
expect(f.state().room.visibility).toBe(previousVisibility);
await f.controls.toggleVisibility(f.actor(), f.gateway);
expect(f.state().room.isLocked).toBe(previousLockAfterToggle);
```

Testar saída/reentrada sem autorização, remoção de autorizado ainda presente, dono que sai, prioridade/claim/transfer, setup desligado, reinício/reuso e fechamento de sala vazia nas combinações restritas. Incluir dois toggles concorrentes, toggle+visibilidade e saída durante escrita; o estado final segue a serialização, sem lost update.
- [ ] **Step 2 — rodar o vermelho.** `npm run test:run -- tests/unit/modules/calls/room-access.service.test.ts tests/unit/modules/calls/room-controls.service.test.ts tests/unit/modules/calls/room.discord.test.ts tests/unit/modules/calls/room.runtime.test.ts`. Esperar falhas na nova API/matriz, não enfraquecer fixtures antigas para torná-las verdes.
- [ ] **Step 3 — implementar projeção e confirmação.** Reutilizar máscara `ViewChannel|Connect|SendMessages`, união dono+presença atual+allowlist+bot e preservação dos bits não geridos. Só @everyone.Connect depende de ambos os estados; ocultar também restringe chat. Projetar todos os membros excepcionais com a máscara completa, permitindo revogação determinística após saída; rejeitar grants externos incompatíveis somente com os bits efetivamente restritos. Preservar exceção nativa de Administrator, ManageRoles e capacidade de 100 sobrescritas. Atualizar todos os mocks da interface; remover os antigos métodos privados/públicos de `RoomDiscordGateway` quando não restarem consumidores desse contrato, sem tocar a API de criação `CallDiscordGateway`.
- [ ] **Step 4 — testar falhas e implementar a proteção correspondente.** Falha confirmada antes do commit restaura snapshot seguro; resposta SQL perdida exige read-back antes de decidir se o commit ocorreu. Se confirmar estado desejado com mesma autoridade, não restaurar um valor antigo. Se houver mudança de autoridade ou leitura/compensação incerta, marcar a sala incerta em memória, não informar sucesso e não executar nova mutação até `synchronizeLocked` confirmar o estado atual. `withOwned` tenta essa reconciliação sob o mesmo lock antes de prosseguir; se falhar, rejeita. A marca só some após reconciliação confirmada; startup revalida antes de admitir controles. Testar esses ramos com promises suspensas e `f.store.updateSettings` rejeitando depois de aplicar, incluindo owner A→B durante I/O. Nenhuma transação fica aberta durante REST e nenhuma restauração reaplica autorização de dono antigo.
- [ ] **Step 5 — verificar, revisar e fazer commit.** Repetir suítes da Step 2, `npm run test:run -- tests/unit/modules/ownership`, integrações locais `ownership-database.test.ts` e `room-lock-database.test.ts` seriais e typecheck. Revisão deve conferir matriz e evidência de falhas/concorrência. Commit explícito: `feat: separate room locking from visibility`; atualizar grafo.

### Task 3: Criar uma área privada reutilizável e limitada à sessão

**Files:**
- Create: `src/modules/calls/call-workspace.ts`, `tests/unit/modules/calls/call-workspace.test.ts`.
- Modify/Test: `src/modules/calls/room.runtime.ts`, `tests/unit/modules/calls/room.runtime.test.ts`, `tests/unit/application.rooms.test.ts`.

**Interfaces:**
- Consumes: `RoomActor`, `RoomState`, `CallPanelPayload`, logger/relógio e lifecycle do runtime. A área não chama serviços de alteração nem confere autoridade por cache.
- Produces: `CallWorkspaceDelivery = { messageId: string; expiresAt: number; edit(payload: CallPanelPayload): Promise<{ id: string }>; deactivate(): Promise<void> }`.
- Produces: `CallWorkspaceView = { kind: 'access' | 'transfer-target'; payload: CallPanelPayload } | { kind: 'transfer-pending'; operationId: string; payload: CallPanelPayload }`.
- Produces: `CallPrivateWorkspace` com construtor `(now: () => number = Date.now)`, `show(actor: RoomActor, view: CallWorkspaceView, create: (payload: CallPanelPayload) => Promise<CallWorkspaceDelivery>): Promise<CallWorkspaceDelivery>`, `editPending(actor: RoomActor, operationId: string, payload: CallPanelPayload, terminal?: boolean): Promise<boolean>`, `adopt(actor: RoomActor, delivery: CallWorkspaceDelivery): void`, `reconcile(roomId: string, state: RoomState | null): Promise<void>` e `stop(): Promise<void>`. O runtime expõe a única instância como `workspaces`.

- [ ] **Step 1 — escrever testes vermelhos do contrato.** Usar `vi.useFakeTimers`, entregas falsas e `deferred` existentes. Asserções centrais:

```ts
await workspaces.show(actor, accessView, create);
await workspaces.show(actor, targetView, create);
expect(create).toHaveBeenCalledTimes(1);
expect(delivery.edit).toHaveBeenCalledWith(targetView.payload);
await vi.advanceTimersByTimeAsync(900_000);
await workspaces.show(actor, accessView, create);
expect(create).toHaveBeenCalledTimes(2);
expect(await workspaces.editPending(actor, 'old-operation', payload)).toBe(false);
```

Também testar opens concorrentes, expiry+edit em voo, A→B→A com outra versão, controle desligado, sala fechada/ausente, stop durante create e callback antigo chegando após outra operação. Entrega sem ID nunca vale como publicação. Falha incerta de create não dispara retry automático nem cria uma segunda área; novo clique numa mensagem privada comprovada pode adotá-la após revalidação, ou a sessão aguarda expiração.
- [ ] **Step 2 — rodar o vermelho.** `npm run test:run -- tests/unit/modules/calls/call-workspace.test.ts`, esperando classe/métodos ausentes.
- [ ] **Step 3 — implementar apenas gestão da mensagem.** Chavear por guild/sala/dono/controlVersion; serializar create/edit por essa chave sem introduzir lock de mutação de sala. Toda edição atrasada verifica geração/operação após esperar a fila. Expiração real é `interaction.createdTimestamp + 900_000`, não “15 minutos desde o último clique público”; só uma interação privada validada pode atualizar o handle via `adopt`. Não manter timers/handles de sessões expiradas sem limpeza: usar expiração preguiçosa mais timer único para o próximo vencimento, cancelado no stop. Não armazenar tokens fora das closures em memória.
- [ ] **Step 4 — ligar invalidação ao runtime e verificar.** `onChangedLocked`, reconciliação de saídas, setup, sala encerrada e shutdown invalidam geração antes de aguardar deactivation; fila de mensagem nunca volta a adquirir o lock da sala. `show` não substitui `transfer-pending` por outra seleção; retornar/reexibir a pendência atual, validada contra estado atual pelo handler na Task 4. `reconcile` remove autoridade velha mesmo se o edit no Discord falhar. Rodar workspace/runtime/application tests e typecheck; nenhum usuário passa a depender dessa área para ter permissão.
- [ ] **Step 5 — revisão e commit.** Conferir expiração, operações antigas, ausência de tokens nos logs e drenagem. Commit explícito: `feat: reuse private call action workspace`; atualizar grafo. Interface principal só será conectada na Task 4.

### Task 4: Conectar o painel público e eliminar respostas genéricas

**Files:**
- Modify: `src/modules/calls/call-panel.view.ts`, `call-controls.view.ts`, `call.schemas.ts`, `call.interactions.ts`.
- Create: `src/modules/calls/call-interaction-response.ts`, `tests/unit/modules/calls/call-interaction-response.test.ts`.
- Modify/Test: `tests/unit/modules/calls/call-panel.view.test.ts`, `call-controls.view.test.ts`, `call.schemas.test.ts`, `call.interactions.test.ts`; fixtures de mensagem em `call.discord.fixtures.ts` se necessário.

**Interfaces:**
- Consumes: toggles da Task 2, `workspaces` da Task 3 e serviços existentes de rename/limite/claim/transferência.
- Produces: `CallPanelInput.room` inclui `isLocked`; `buildCallPanel(input): CallPanelPayload` preserva sua assinatura.
- Produces: componentes novos **v3**, ações `lock`, `visibility`, `rename`, `rename-save`, `limit`, `limit-save`, `access`, `allow-add`, `allow-remove`, `transfer`, `transfer-target`, `claim`, `confirm`, `undo`. Sala/versão para controles e operationId para confirm/undo; continuar limite de 100 caracteres. IDs v1/v2 são reconhecidos como família call, mas rejeitados antes de qualquer mutação.
- Produces: `CallAckMode = 'none' | 'source' | 'ephemeral'`; `acknowledgeCallAction(interaction: CallInteraction): Promise<CallAckMode>`, `completeCallAction(interaction: CallInteraction, mode: CallAckMode): Promise<void>`, `replyCallFailure(interaction: CallInteraction, mode: CallAckMode, payload: CallPanelPayload & { content: string }): Promise<void>` no helper novo. Abertura de modal não chama acknowledge. Importar `CallInteraction` como type-only para não criar dependência circular em runtime.

- [ ] **Step 1 — escrever testes vermelhos de payload/roteamento/ack.** Atualizar fixture para `deferUpdate`, `followUp`, `deleteReply`, `message`, `isFromMessage` e webhook explícito; distinguir mensagem pública de privada. Testar:

```ts
expect(payload.components.map(row => row.components.length)).toEqual([3, 3, 1]);
expect(payload.embeds[0].data.fields?.[0]).toMatchObject({ name: 'Sala', value: 'SD', inline: true });
expect(JSON.stringify(payload)).not.toContain('Abrir controles');
await execute(publicLock);
expect(publicLock.deferUpdate).toHaveBeenCalledOnce();
expect(publicLock.deferReply).not.toHaveBeenCalled();
expect(publicLock.followUp).not.toHaveBeenCalled();
expect(JSON.stringify(publicLock.editReply.mock.calls)).not.toContain('Ação concluída');
```

Cobrir as quatro combinações de labels/estado, campos inline com quebra compatível, markdown/menções escapados, prioridade e controles sem dono. Renomear abre modal com `showModal` como resposta inicial; submit de mensagem usa deferUpdate; submit sem mensagem usa deferReply privado e deleteReply somente da própria resposta ao concluir. Erro pós-ack público usa followUp privado, nunca editReply sobre o painel; erro pós-ack privado edita sua área. Falhas anteriores ao ack usam reply privado.
- [ ] **Step 2 — rodar o vermelho.** `npm run test:run -- tests/unit/modules/calls/call-panel.view.test.ts tests/unit/modules/calls/call.schemas.test.ts tests/unit/modules/calls/call-controls.view.test.ts tests/unit/modules/calls/call-interaction-response.test.ts tests/unit/modules/calls/call.interactions.test.ts`.
- [ ] **Step 3 — implementar builders v3 e respostas por origem.** Linhas `[lock,visibility,rename]`, `[limit,access,transfer]`, `[claim]`; somente nome escapado em Sala, título esquerdo e estados independentes. Seis alterações desabilitadas quando sem dono; claim desabilitado quando há dono. Remover `buildOwnerMenu`, ações open/menu e schemas auxiliares quando a mudança tornar seus consumidores órfãos. Preservar validação de 11 grafemas, limites e allowedMentions. Extrair só o tratamento de resposta para o helper; não criar um framework de interação.
- [ ] **Step 4 — integrar a área privada sem trocar a mensagem pública por engano.** Botão público access/transfer faz deferUpdate antes do trabalho, valida o ator e chama workspace.show; no primeiro open, o callback usa `followUp({ flags: Ephemeral, ...payload })` e guarda edição pelo **messageId privado retornado**, nunca `@original` dessa interação pública. Opens seguintes só editam a área ativa. Seleções privadas comprovadas usam a origem privada e podem renovar o handle; não adotar IDs apenas por customId. Toda ação ainda confere guild/canal/sala/versão, dono/presença/setup; handlers não usam estado de antes do lock para calcular toggle. Reabrir durante transferência mostra a operação do banco, não outra seleção.
- [ ] **Step 5 — preservar transferência e autorização em testes.** Migrar a contagem para `workspaces.editPending` com operationId. Armar somente após entrega confirmada, prazo real invariável de 5.000 ms; callback antigo/edição tardia não sobrescreve fluxo novo. Reexecutar os casos existentes de publicação não confirmada, shutdown durante publicação, confirm/undo concorrentes, saída durante ação, A→B→A, prioridade de 300.000 ms e destinatário que já possui sala. Testar dono/admin fora da call e autorizado não dono: nenhuma alteração. Testar v2 de visibility/menu/modal/confirm/claim: nenhuma mutação e erro privado. Painel ausente, origem falsa ou controles desligados não ganham acesso por customId.
- [ ] **Step 6 — verificar, revisar e fazer commit.** Repetir suítes da Step 2, `npm run test:run -- tests/unit/modules/ownership`, typecheck e build. Revisão deve conferir todos os ramos de ack (sem apagar a mensagem pública com deleteReply), mensagens acumuladas e contagem antiga. Commit explícito: `feat: expose owner controls on the public call panel`; atualizar grafo.

### Task 5: Medir, remover fetch redundante e fechar a validação local

**Files:**
- Create: `src/modules/calls/call-action.metrics.ts`, `tests/unit/modules/calls/call-action.metrics.test.ts`, `docs/validation/2026-11-10-painel-publico-tranca-visibilidade.md`.
- Modify: pontos limitados em `src/modules/calls/call.interactions.ts`, `room.coordinator.ts`, `room-state.repository.ts`, `room.discord.ts:143-152`, `room-panel.service.ts`; testes correspondentes de interações, coordinator, repositório, Discord e painel.

**Interfaces:**
- Produces: `CallActionStage = 'ack' | 'queue' | 'state' | 'discord' | 'persist' | 'panel'`; `CallTraceAction = CallComponent['action'] | 'invalid'`; `runCallActionTrace<T>(logger: Logger, action: CallTraceAction, work: () => Promise<T>): Promise<T>`, `measureCallStage<T>(stage: CallActionStage, work: () => Promise<T>): Promise<T>`, `recordCallStage(stage: CallActionStage, durationMs: number): void` no módulo de métricas.
- Usar AsyncLocalStorage nativo para isolar a medição por ação. Um log estruturado final por ação: correlação aleatória do trace, ação da allowlist, resultado fixo, duração total e durações/contagens por etapa. Nunca usar customId bruto como ação/correlação nem texto da exception como resultado. Sem ação ativa, helpers são transparentes. Contagens são de operações instrumentadas, não chamadas HTTP reais; chamadas REST adicionais são contadas por spies na fixture de benchmark.
- `updateControlPanel(channelId, messageId, payload): Promise<void>` mantém a assinatura e as garantias, usando `channel.messages.edit(messageId, payload)` sem fetch prévio depois da verificação atual de canal/permissões.

- [ ] **Step 1 — escrever testes vermelhos das métricas, sem mudar a operação.** Dois traces concorrentes não compartilham medidas; sucesso e erro emitem uma vez; erro interno não imprime payload, nomes de sala, IDs de membros, tokens ou URLs. Tempo de fila mede apenas a espera até entrar no lock, não toda a mutação. Instrumentar ack/modal, fila, leituras/persistência e gateway/painel sem englobar períodos simultâneos como se fossem soma exata. Verificar soma/tempo total sem prometer percentis com uma amostra.
- [ ] **Step 2 — executar o vermelho e implementar a instrumentação.** `npm run test:run -- tests/unit/modules/calls/call-action.metrics.test.ts`. Depois do verde, registrar baseline reproduzível da Task 4 usando fixtures reais + spies de REST/DB e delays controlados para lock, hide, rename e limite. Guardar tamanho da amostra, contagens e durações no documento de validação; esses valores são simulação de fronteira, não latência real do Discord.
- [ ] **Step 3 — escrever o teste que comprova o fetch desnecessário.** Na suíte room.discord, mudar a fixture para `messages.edit` e registrar o vermelho:

```ts
await gateway.updateControlPanel(channelId, messageId, panel);
expect(channel.messages.fetch).not.toHaveBeenCalled();
expect(channel.messages.edit).toHaveBeenCalledExactlyOnceWith(messageId, panel);
```

Mover os casos de erro de edição para messages.edit: 10008→PANEL_MISSING; 50013→DISCORD_FAILURE; canal 10003→ROOM_UNAVAILABLE. Na suíte de painel, somente PANEL_MISSING permite substituir a mensagem rastreada; erro incerto/proibido não envia outra mensagem.
- [ ] **Step 4 — implementar a edição direta e comparar.** Preservar a checagem atual de canal e permissões. Repetir baseline com o mesmo número de ações e delays; comprovar redução de exatamente um fetch de mensagem por edição do painel nesse caminho, sem alegar redução fixa em segundos no Discord. Não eliminar leituras finais/CAS ou fetches de autoridade para “otimizar”. Outras otimizações só entram se um teste antes/depois demonstrar redundância sem alterar as garantias; se demandarem novo contrato/escopo, registrar e adiar.
- [ ] **Step 5 — executar gates completos e registrar evidências.** Ambiente comum com ambos opt-ins false: `npm run typecheck`, `npm run test:run`, `npm run build`, `git diff --check`. No ambiente PostgreSQL local guardado: generate → migrate deploy → prepare local → `npm run test:run -- tests/integration --maxWorkers=1` → migrate status/deploy idempotente. Atualizar grafo. Contar aprovados/pulados/falhos observados; não reutilizar números históricos. Testes de simulação de DOM da prévia não substituem esses gates nem a aceitação real.
- [ ] **Step 6 — revisão final e commit local.** Commit explícito da tarefa: `perf: measure call actions and avoid redundant panel fetch`. Depois, revisor novo avalia a branch completa contra spec/plano e casos de Review Focus. Corrigir achados com novo vermelho→verde e reverificar gates afetados. Manter o produto sem push/merge/hosting enquanto não autorizado.

## Aceitação real e rollout — checklist original e estado posterior

Durante a implementação local, estes itens deveriam ficar **pendentes**, aguardando autorização separada. As autorizações posteriores e os resultados estão registrados em `docs/validation/2026-11-10-painel-publico-tranca-visibilidade.md`: backup/migration/início local concluídos e botões aprovados pelo usuário. A matriz completa multiusuário/mobile e latência real não foram especificamente relatadas. Preservar abaixo o checklist original para referência, sem repetir operações concluídas:

1. Confirmar destino, processo real existente, novo backup privado e autorização específica antes da quinta migration no Supabase. Checar histórico/checksums, aplicar somente a migration nova, verificar backfill/default/NOT NULL/RLS/dados/TLS independentemente. Nunca executar prepare/grants/testes de escrita remotos.
2. Com autorização de restart local, parar de forma limpa pelo stopFile da instância existente; confirmar PID/comando e encerramento antes de iniciar a nova. Não executar o código com isLocked contra o banco ainda não migrado. Preservar comandos apenas no servidor de teste e globais zero.
3. Conferir o painel real desktop/celular, linhas, nome único, labels e ausência de “pensando”/sucessos repetidos nos caminhos suportados. Testar modais, erro privado, reuso e expiração da área privada; registrar qualquer limitação nativa do caminho de modal sem origem.
4. Testar as quatro combinações com membro comum, participante e autorizado; incluir saída do dono, próximo dono, sala vazia, setup on/off e manutenção dos estados. Como o bot atual possui Administrator, a validação de restrições exige também um membro comum sem esse bypass; não mudar cargos automaticamente.
5. Coletar durações reais por etapa/amostra e observar rate limits. Distinguir tempo de reconhecimento, conclusão e atualização do painel; hosting permanece fora do escopo e reservado ao final do projeto.

## Autorrevisão do plano

- [x] Cobertura: spec §§3–4→Tasks 3–4; §§5–7→Tasks 1–3; §8→Task 5; §§9–10→gates locais e checklist separado de rollout. Nenhum pedido visual exige Components V2 ou centralização impossível.
- [x] Contratos: `isLocked`, `RoomAccessPolicy`, `setRoomAccess`, `applySettingsLocked`, `toggleLock/toggleVisibility`, `workspaces` e helpers de ack/métrica têm nomes/retornos definidos antes de serem consumidos. Atualizar fixtures reais, não usar casts para esconder campos ausentes.
- [x] Review Focus: os cinco cenários estão nos testes das tarefas donas, não só na revisão manual. Verificar especialmente edição pelo ID privado e o prazo de 900.000 ms do handle versus 5.000 ms da transferência.
- [x] Granularidade/proporção: cada tarefa tem um entregável testável, vermelho/verde, verificação e gate independente. O plano fixa interfaces/testes, não implementações completas nem abstrações extras.
- [x] Operação: nenhum passo local usa o `.env` remoto, inicia o bot, registra comandos, altera schema remoto ou publica Git. Aprovação do plano será solicitada antes de iniciar execução.

## Handoff

Execução realizada: **subagente implementador por tarefa + revisão independente antes da próxima + revisão final**, após confirmação explícita do plano pelo usuário. Checkpoint de produto final `5d4af1a`, integrado via PR #5/merge `b67f475`. Rollout autorizado e aceite manual dos botões registrados em `docs/validation/2026-11-10-painel-publico-tranca-visibilidade.md`. Handoff: entrega de painel/posse/controles documentada; reputação para outro dia e hospedagem reservada ao final. Não inferir autorização para novas operações remotas, tags/releases ou reinício adicional.

Referências de API: [Discord — reconhecimento em três segundos e tokens de quinze minutos](https://docs.discord.com/developers/interactions/receiving-and-responding). O índice devolveu páginas SDK 14.26.2; os contratos foram conferidos na instalação **14.28.1**, em `node_modules/discord.js/typings/index.d.ts:3045-3077` (`followUp`, `deferUpdate`, `isFromMessage`) e `5298-5311` (`MessageManager.edit`). Essa conferência de assinatura não substitui testes/aceitação real; não alterar dependências para coincidir com a documentação indexada.
