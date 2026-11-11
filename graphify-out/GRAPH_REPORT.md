# Graph Report - feature-v0.4.0-moderacao-dono  (2026-11-11)

## Corpus Check
- 171 files · ~204,722 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .prisma 1)

## Summary
- 2243 nodes · 4991 edges · 93 communities (76 shown, 17 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 288 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `187f441b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Graphify Knowledge Graph (graphify-out)
- prismaNamespace.ts
- RoomMemberBlock.ts
- prismaNamespaceBrowser.ts
- package.json
- PrismaRoomStateRepository
- local-database
- Charon
- createRoomRuntime
- Charon v1 — Design
- compilerOptions
- compilerOptions
- TemporaryRoom.ts
- call.service.test.ts
- Charon — painel público, tranca e visibilidade independentes
- Charon v0.1.0 — Infraestrutura
- pull_request_template.md
- PrismaClientBaseOptions
- VoiceCreator.ts
- CallService
- commonInputTypes.ts
- Charon v0.2.0 — Setup e Join-to-Create
- class.ts
- TemporaryRoomDelegate
- VoiceCreatorDelegate
- room-moderation-database.test.ts
- RoomMemberBlockDelegate
- call-moderation.view.ts
- Supabase RLS Implementation Plan
- Prisma__TemporaryRoomClient
- Prisma__VoiceCreatorClient
- RoomAllowedMember.ts
- Charon — criação guiada de canais de entrada
- RoomPresence.ts
- discord.js
- PendingOwnershipTransfer.ts
- browser.ts
- Charon v0.3.0 — posse e controles
- RoomCoordinator
- DiscordRoomGateway
- prisma/client.ts
- PendingOwnershipTransferDelegate
- RoomAllowedMemberDelegate
- RoomPresenceDelegate
- Review Focus
- PrismaClient
- SetupDraftStore
- Charon v0.2.0 — Setup e join-to-create
- Retomar o Charon após formatar o computador
- Charon v0.3.0 Ownership and Room Controls Implementation Plan
- vitest
- setup.command.ts
- Charon v0.3.0 — posse e controles
- DiscordSetupGateway
- RoomActionError
- Prisma__PendingOwnershipTransferClient
- Prisma__RoomAllowedMemberClient
- Prisma__RoomPresenceClient
- SetupCreationService
- CHANGELOG.md
- room.types.ts
- setup-creation.interactions.ts
- Changelog
- Charon v0.2.0 — registro de validação
- Arquitetura do Charon
- RoomModerationService
- RoomActor
- Validação local v0.3.0
- File Structure
- PrismaVoiceCreatorRepository
- Charon v0.4.0 — remoção e bloqueio pelo dono
- RoomStateRepository
- room-moderation.transport.ts
- Setup guiado do Charon Implementation Plan
- setup.repository.ts
- setup-creation.interactions.test.ts
- enums.ts
- OwnershipService
- Validação e rollout — painel público, tranca e visibilidade
- CallPanelPayload
- call-controls.view.test.ts
- Prisma__RoomMemberBlockClient
- call-action.metrics.ts
- createLogger
- call.schemas.ts
- CallPanelPayload
- application.rooms.test.ts
- CallInteractions
- call.interactions.ts
- OwnershipTimers
- DiscordClientPort
- call.discord.ts

## God Nodes (most connected - your core abstractions)
1. `RoomDiscordGateway` - 85 edges
2. `RoomActionError` - 81 edges
3. `RoomActor` - 68 edges
4. `vitest` - 68 edges
5. `discord.js` - 63 edges
6. `createRoomRuntime()` - 54 edges
7. `RoomState` - 46 edges
8. `DiscordRoomGateway` - 44 edges
9. `createLogger()` - 43 edges
10. `PrismaRoomStateRepository` - 41 edges

## Surprising Connections (you probably didn't know these)
- `Task 7: Idempotent panel synchronization and setup toggle propagation` --references--> `SetupService`  [INFERRED]
  docs/superpowers/plans/2026-11-08-charon-v0.3.0-posse-controles.md → src/modules/setup/setup.service.ts
- `Global Constraints` --references--> `InteractionRegistry`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-v0.2.0-setup-join-to-create.md → src/core/discord/interactions/interaction-registry.ts
- `Arquitetura` --references--> `InteractionRegistry`  [INFERRED]
  docs/superpowers/specs/2026-11-05-charon-v0.2.0-setup-join-to-create-design.md → src/core/discord/interactions/interaction-registry.ts
- `Task 4: Conectar o painel público e eliminar respostas genéricas` --references--> `CallInteraction`  [INFERRED]
  docs/superpowers/plans/2026-11-10-charon-painel-publico-tranca-visibilidade.md → src/modules/calls/call.interactions.ts
- `Autorrevisão do plano` --references--> `RoomAccessPolicy`  [INFERRED]
  docs/superpowers/plans/2026-11-10-charon-painel-publico-tranca-visibilidade.md → src/modules/calls/room.types.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify Maintenance and Usage Workflow** — agents_graphify_command, agents_graphify_query, agents_graphify_update, agents_graph_json, agents_graph_report, agents_wiki_index [INFERRED 0.75]

## Communities (93 total, 17 thin omitted)

### Community 0 - "Graphify Knowledge Graph (graphify-out)"
Cohesion: 0.33
Nodes (7): graphify-out/graph.json, graphify-out/GRAPH_REPORT.md, /graphify User Command, Graphify Knowledge Graph (graphify-out), graphify query / path / explain Commands, graphify update Command, graphify-out/wiki/index.md

### Community 1 - "prismaNamespace.ts"
Cohesion: 0.02
Nodes (125): AnyNull, Args, At, AtLeast, AtLoose, AtStrict, BatchPayload, BigIntFieldRefInput (+117 more)

### Community 2 - "RoomMemberBlock.ts"
Cohesion: 0.02
Nodes (82): AggregateRoomMemberBlock, BigIntFieldUpdateOperationsInput, EnumRoomMemberBlockStateFieldUpdateOperationsInput, GetRoomMemberBlockAggregateType, GetRoomMemberBlockGroupByPayload, RoomMemberBlockAggregateArgs, RoomMemberBlockAvgAggregateInputType, RoomMemberBlockAvgAggregateOutputType (+74 more)

### Community 3 - "prismaNamespaceBrowser.ts"
Cohesion: 0.11
Nodes (16): AnyNull, DbNull, Decimal, JsonNull, ModelName, NullsOrder, NullTypes, PendingOwnershipTransferScalarFieldEnum (+8 more)

### Community 4 - "package.json"
Cohesion: 0.06
Nodes (38): dependencies, discord.js@14.28.1, dotenv@18.0.9, pino@10.4.0, @prisma/adapter-pg@7.10.1, @prisma/client@7.10.1, zod@4.6.7, devDependencies (+30 more)

### Community 5 - "PrismaRoomStateRepository"
Cohesion: 0.11
Nodes (9): PendingOwnershipTransfer, measureCallStage(), TemporaryRoomRecord, activeWhere(), available(), ownerChange(), PrismaRoomStateRepository, uniqueError() (+1 more)

### Community 6 - "local-database"
Cohesion: 0.06
Nodes (37): DATABASE_URL, DIRECT_URL, POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, RUN_DATABASE_SECURITY_TESTS, RUN_DATABASE_TESTS, jobs (+29 more)

### Community 7 - "Charon"
Cohesion: 0.25
Nodes (8): Charon, Comandos, Desenvolvimento, Instalação, Posse e controles da v0.3.0, Requisitos, Segurança, Variáveis de ambiente

### Community 8 - "createRoomRuntime"
Cohesion: 0.18
Nodes (17): Task 1: Persistir tranca sem alterar a privacidade existente, allowedUnion(), assertSnapshot(), RoomAccessService, safePrevious(), sameAccess(), sameAuthority(), sameIds() (+9 more)

### Community 9 - "Charon v1 — Design"
Cohesion: 0.14
Nodes (13): Administrative setup, Architecture, Charon v1 — Design, Intent, Non-goals for v1, Ownership, Persistence and recovery, Releases (+5 more)

### Community 10 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, module, moduleResolution, noUncheckedIndexedAccess, skipLibCheck (+4 more)

### Community 11 - "compilerOptions"
Cohesion: 0.18
Nodes (10): ./tsconfig.json, compilerOptions, declaration, outDir, rootDir, sourceMap, types, exclude (+2 more)

### Community 12 - "TemporaryRoom.ts"
Cohesion: 0.02
Nodes (129): AggregateTemporaryRoom, EnumRoomVisibilityFieldUpdateOperationsInput, EnumTemporaryRoomStatusFieldUpdateOperationsInput, GetTemporaryRoomAggregateType, GetTemporaryRoomGroupByPayload, NullableStringFieldUpdateOperationsInput, TemporaryRoom$allowedMembersArgs, TemporaryRoom$memberBlocksArgs (+121 more)

### Community 13 - "call.service.test.ts"
Cohesion: 0.15
Nodes (15): RoomPresence, rights, createInput, panel, creator, entry, lifecycleFixture(), room (+7 more)

### Community 14 - "Charon — painel público, tranca e visibilidade independentes"
Cohesion: 0.08
Nodes (23): 10. Limites operacionais e fora de escopo, 1. Objetivo e origem, 2. Abordagens consideradas, 3. Interface aprovada e limites nativos, 4. Respostas sem poluição de chat, 5. Matriz de acesso, 6. Estado persistido e compatibilidade, 7. Consistência, posse e ciclo de vida (+15 more)

### Community 15 - "Charon v0.1.0 — Infraestrutura"
Cohesion: 0.50
Nodes (3): Charon v0.1.0 — Infraestrutura, Destaques, Fora desta versão

### Community 16 - "pull_request_template.md"
Cohesion: 0.50
Nodes (3): Objetivo, Riscos e decisões, Verificação

### Community 17 - "PrismaClientBaseOptions"
Cohesion: 0.67
Nodes (3): PrismaClientBaseOptions, PrismaClientOptionsWithAccelerateUrl, PrismaClientOptionsWithAdapter

### Community 18 - "VoiceCreator.ts"
Cohesion: 0.02
Nodes (81): AggregateVoiceCreator, BoolFieldUpdateOperationsInput, DateTimeFieldUpdateOperationsInput, GetVoiceCreatorAggregateType, GetVoiceCreatorGroupByPayload, IntFieldUpdateOperationsInput, NullableDateTimeFieldUpdateOperationsInput, StringFieldUpdateOperationsInput (+73 more)

### Community 19 - "CallService"
Cohesion: 0.06
Nodes (27): Task 6: Implement Temporary Room Lifecycle and Compensation, Aceitação real e rollout — checklist original e estado posterior, Autorrevisão do plano, Global Constraints, Handoff, Mapa de arquivos e contratos, Painel público, tranca e visibilidade — Implementation Plan, Preparação e verificações comuns (+19 more)

### Community 20 - "commonInputTypes.ts"
Cohesion: 0.04
Nodes (47): BigIntFilter, BigIntWithAggregatesFilter, BoolFilter, BoolWithAggregatesFilter, DateTimeFilter, DateTimeNullableFilter, DateTimeNullableWithAggregatesFilter, DateTimeWithAggregatesFilter (+39 more)

### Community 21 - "Charon v0.2.0 — Setup e Join-to-Create"
Cohesion: 0.08
Nodes (25): 1. Painel administrativo persistente no canal, 2. Painel administrativo privado temporário — escolhida, 3. Assistente linear passo a passo, Abordagens consideradas, Antiobjetivos, Arquitetura, Charon v0.2.0 — Setup e Join-to-Create, Compensação de falhas (+17 more)

### Community 22 - "class.ts"
Cohesion: 0.22
Nodes (4): config, decodeBase64AsWasm(), LogOptions, PrismaClientConstructor

### Community 25 - "room-moderation-database.test.ts"
Cohesion: 0.17
Nodes (5): LockObservation, roomModerationFixture(), fixture(), runtimes, transports

### Community 27 - "call-moderation.view.ts"
Cohesion: 0.27
Nodes (12): back(), buildModerationBlockedPage(), buildModerationBlockPrompt(), buildModerationConfirmation(), buildModerationHome(), buildModerationResult(), button(), member() (+4 more)

### Community 28 - "Supabase RLS Implementation Plan"
Cohesion: 0.25
Nodes (7): Approved scope and approaches, Global Constraints, Progress, Re-run the read-only security test, Review Focus, Supabase RLS Implementation Plan, Task 1: Enable and verify RLS

### Community 31 - "RoomAllowedMember.ts"
Cohesion: 0.03
Nodes (74): AggregateRoomAllowedMember, GetRoomAllowedMemberAggregateType, GetRoomAllowedMemberGroupByPayload, RoomAllowedMemberAggregateArgs, RoomAllowedMemberCountAggregateInputType, RoomAllowedMemberCountAggregateOutputType, RoomAllowedMemberCountArgs, RoomAllowedMemberCountOrderByAggregateInput (+66 more)

### Community 32 - "Charon — criação guiada de canais de entrada"
Cohesion: 0.15
Nodes (12): 10. Operação e aprovação, 11. Referências e liberdade do implementador, 1. Intenção e decisões do usuário, 2. Abordagens consideradas, 3. Escopo e limites, 4. Fluxo administrativo, 5. Rascunhos, autorização e interações antigas, 6. Criação do canal e falhas parciais (+4 more)

### Community 33 - "RoomPresence.ts"
Cohesion: 0.03
Nodes (74): AggregateRoomPresence, GetRoomPresenceAggregateType, GetRoomPresenceGroupByPayload, RoomPresenceAggregateArgs, RoomPresenceCountAggregateInputType, RoomPresenceCountAggregateOutputType, RoomPresenceCountArgs, RoomPresenceCountOrderByAggregateInput (+66 more)

### Community 34 - "discord.js"
Cohesion: 0.09
Nodes (24): Task 5: Discord client and interaction registry, Task 7: Wire Setup and Voice Events into the Application, discord.js, pino, ApplicationOverrides, createDefaultDispatcher(), createDefaultVoiceDispatcher(), InteractionDispatcher (+16 more)

### Community 35 - "PendingOwnershipTransfer.ts"
Cohesion: 0.03
Nodes (73): AggregatePendingOwnershipTransfer, GetPendingOwnershipTransferAggregateType, GetPendingOwnershipTransferGroupByPayload, PendingOwnershipTransferAggregateArgs, PendingOwnershipTransferAvgAggregateInputType, PendingOwnershipTransferAvgAggregateOutputType, PendingOwnershipTransferAvgOrderByAggregateInput, PendingOwnershipTransferCountAggregateInputType (+65 more)

### Community 36 - "browser.ts"
Cohesion: 0.25
Nodes (7): $Enums, PendingOwnershipTransfer, RoomAllowedMember, RoomMemberBlock, RoomPresence, TemporaryRoom, VoiceCreator

### Community 37 - "Charon v0.3.0 — posse e controles"
Cohesion: 0.08
Nodes (24): 10. Ciclo de vida e falhas — propostas técnicas, 11. Verificação e limites operacionais, 12. Fora do escopo e liberdade de implementação, 1. Objetivo e contexto, 2. Origem das decisões, 3. Abordagens de interação, 4. Painel e controles, 5. Posse e elegibilidade (+16 more)

### Community 38 - "RoomCoordinator"
Cohesion: 0.15
Nodes (6): Lock and permission contracts, Shared contracts — define once, reuse in later tasks, recordCallStage(), RoomCoordinator, KeyedMutex, transferRuntime()

### Community 39 - "DiscordRoomGateway"
Cohesion: 0.16
Nodes (3): DiscordRoomGateway, hasCode(), RoomModerationTransport

### Community 40 - "prisma/client.ts"
Cohesion: 0.08
Nodes (14): $Enums, PrismaClient, RoomAllowedMember, VoiceCreator, CreateTemporaryRoomInput, invalidateControls, PrismaTemporaryRoomRepository, TemporaryRoomTransitionError (+6 more)

### Community 44 - "Review Focus"
Cohesion: 0.25
Nodes (7): Charon Stage 1 Infrastructure Implementation Plan, Global Constraints, Review Focus, Task 1: Project foundation, Task 3: Structured logger, Task 6: Application lifecycle and status command, Task 7: CI, documentation, and release readiness

### Community 46 - "SetupDraftStore"
Cohesion: 0.16
Nodes (14): contextOf(), requirePrivateAdministrator(), resultMessage(), SetupCreationInput, SetupCreationResult, SetupDraft, SetupDraftContext, SetupDraftRef (+6 more)

### Community 47 - "Charon v0.2.0 — Setup e join-to-create"
Cohesion: 0.33
Nodes (5): Banco e verificação local, Charon v0.2.0 — Setup e join-to-create, Entregas, Estado desta preparação, Limitações operacionais

### Community 48 - "Retomar o Charon após formatar o computador"
Cohesion: 0.33
Nodes (6): Antes de formatar: salvar fora do Git, De onde continuar, O que está salvo no GitHub, Recuperar o projeto, Retomar a validação da v0.3.0, Retomar o Charon após formatar o computador

### Community 49 - "Charon v0.3.0 Ownership and Room Controls Implementation Plan"
Cohesion: 0.14
Nodes (13): Baseline, isolation and test environment, Charon v0.3.0 Ownership and Room Controls Implementation Plan, File Structure, Global Constraints, Review Focus, Self-review and handoff, Task 1: Persist room-control state and prove database invariants, Task 3: Continuous presence and five-minute claim priority (+5 more)

### Community 50 - "vitest"
Cohesion: 0.18
Nodes (12): vitest, deferred(), runtimes, panel, runtimes, human(), OLDEST, OTHER (+4 more)

### Community 51 - "setup.command.ts"
Cohesion: 0.11
Nodes (13): Task 2: Validated configuration, commandDefinitions, CommandRegistrar, registerCommands(), Application, registerShutdownSignals(), AppConfig, environmentSchema (+5 more)

### Community 52 - "Charon v0.3.0 — posse e controles"
Cohesion: 0.40
Nodes (5): Banco local e CI (sem credenciais remotas), Charon v0.3.0 — posse e controles, Entrega implementada, Permissões e limites operacionais, Validação e limites do aceite humano

### Community 53 - "DiscordSetupGateway"
Cohesion: 0.20
Nodes (7): discordErrorCode(), DiscordSetupGateway, SetupChannelCreationError, SetupDiscordError, allPermissions, creationFixture(), fixture()

### Community 54 - "RoomActionError"
Cohesion: 0.15
Nodes (3): RoomDiscordGateway, safe(), TransferService

### Community 58 - "SetupCreationService"
Cohesion: 0.42
Nodes (4): SetupCreationService, ReadySetupDraft, configuration, fixture()

### Community 59 - "CHANGELOG.md"
Cohesion: 0.15
Nodes (10): Evidência local, Mudanças, Pendências de rollout, v0.4.0 — moderação direta do dono (validada somente localmente), Contrato entregue, Correções da revisão final, Evidência composta, Gates observados (+2 more)

### Community 60 - "room.types.ts"
Cohesion: 0.14
Nodes (23): RoomMemberBlock, requireActiveRoom(), requireOwnedRoom(), Dependencies, Departure, OwnershipAttempt, Overwrite, moderationDeniedBefore() (+15 more)

### Community 61 - "setup-creation.interactions.ts"
Cohesion: 0.13
Nodes (31): SetupCategory, SetupVoiceChannel, voicePermissions, GuildBasedInteraction, SetupDiscordGatewayFactory, VoiceCreatorNotFoundError, decodeSetupCustomId(), defaultUserLimitSchema (+23 more)

### Community 62 - "Changelog"
Cohesion: 0.22
Nodes (9): [0.1.0] - 2026-11-05, [0.2.0] - 2026-11-06, 0.3.0 — integrada e validada no servidor de testes em 2026-11-10, 0.4.0 — implementação e validação locais em 2026-11-11; rollout pendente, Added, Added, Changelog, Known limitations (+1 more)

### Community 63 - "Charon v0.2.0 — registro de validação"
Cohesion: 0.40
Nodes (5): Charon v0.2.0 — registro de validação, Discord real: verificações observadas, Limpeza e limites, PostgreSQL real: aprovado, Versão verificada

### Community 65 - "Arquitetura do Charon"
Cohesion: 0.33
Nodes (6): Arquitetura do Charon, Banco de dados, Estilo, Estrutura na v0.3.0 (preparação local), Fluxo de inicialização, Verificação

### Community 66 - "RoomModerationService"
Cohesion: 0.16
Nodes (4): accessMembers(), assertSnapshot(), RoomModerationService, sameState()

### Community 67 - "RoomActor"
Cohesion: 0.25
Nodes (3): RoomControlsService, RoomActor, RoomBlockWrite

### Community 68 - "Validação local v0.3.0"
Cohesion: 0.18
Nodes (11): Aceite da revisão local — 2026-11-09, CI, segurança dos artefatos e limites, Fix round 1 — 2026-11-09, validação focada, Follow-up M2 — 2026-11-09, M2 — envelope da consulta inicial — 2026-11-09, Onda final combinada — 2026-11-09, RED → GREEN e caracterizações, Resultados observados (+3 more)

### Community 69 - "File Structure"
Cohesion: 0.20
Nodes (9): Calls module, Charon v0.2.0 Setup and Join-to-Create Implementation Plan, Composition, registration, and documentation, File Structure, Global Constraints, Persistence and shared utilities, Review Focus, Setup module (+1 more)

### Community 70 - "PrismaVoiceCreatorRepository"
Cohesion: 0.23
Nodes (3): isPrismaErrorWithCode(), PrismaVoiceCreatorRepository, runtimeFixture()

### Community 71 - "Charon v0.4.0 — remoção e bloqueio pelo dono"
Cohesion: 0.13
Nodes (14): 1. Objetivo e escopo, 2. Decisões do usuário e contexto preservado, 3. Abordagens consideradas, 4. Fluxo de interação — propostas técnicas sujeitas ao aceite do desenho, 5. Precedência e permissões efetivas, 6. Estado durável e consistência — escolhas técnicas do assistente, 7. Verificação necessária, 8. Entrega, limites e próximos passos (+6 more)

### Community 73 - "room-moderation.transport.ts"
Cohesion: 0.50
Nodes (3): createRoomModerationTransport(), NotInRoom, fixture()

### Community 74 - "Setup guiado do Charon Implementation Plan"
Cohesion: 0.25
Nodes (7): Gate de verificação — apenas local, Global Constraints, Handoff, Preparação de execução — antes da Tarefa 1, Review Focus, Self-review do plano, Setup guiado do Charon Implementation Plan

### Community 76 - "setup.repository.ts"
Cohesion: 0.06
Nodes (23): Task 2: Add Voice Creator Repository and Setup Service, Task 3: Build the Private Setup Dashboard, Task 4: Handle Setup Buttons, Selects, and Modals, Contratos compartilhados do novo fluxo, Mapa de arquivos e interfaces, Task 1: Persistir e editar o limite padrão sem alterar configurações antigas, Task 2: Rascunhos privados com revisão, TTL e confirmação única, Task 3: Criar entrada com permissões preservadas e compensação conservadora (+15 more)

### Community 78 - "setup-creation.interactions.test.ts"
Cohesion: 0.21
Nodes (8): SetupInteraction, context, fixture(), event(), review(), start(), json(), stores

### Community 80 - "enums.ts"
Cohesion: 0.50
Nodes (4): Task 1: Persist Voice Creator and Temporary Room State, RoomMemberBlockState, RoomVisibility, TemporaryRoomStatus

### Community 81 - "OwnershipService"
Cohesion: 0.38
Nodes (3): matchesGeneration(), matchesSnapshot(), OwnershipService

### Community 82 - "Validação e rollout — painel público, tranca e visibilidade"
Cohesion: 0.18
Nodes (11): Aceitação humana — aprovada no escopo relatado, Antes — capturado com fetch ainda presente (2026-11-10, 17:57 e 17:59 local), Benchmark reproduzível de fronteiras (não é latência do Discord), Decisões registradas durante a execução, Depois, Escopo e limites, Gates locais — evidência histórica da Task 5, Integração Git e rollout autorizados — concluídos em 2026-11-10 (+3 more)

### Community 83 - "CallPanelPayload"
Cohesion: 0.27
Nodes (9): Task 5: Build the Disabled Minimalist Call Panel, Task 6: Compact panel B, private menu and strict component schemas, TemporaryRoom, buildCallPanel(), CallPanelInput, CallPanelRow, CallControlAction, json() (+1 more)

### Community 84 - "call-controls.view.test.ts"
Cohesion: 0.28
Nodes (9): buildAccessPrompt(), buildLimitModal(), buildRenameModal(), buildTransferTargetPrompt(), customId(), memberSelect(), actor, Control (+1 more)

### Community 86 - "call-action.metrics.ts"
Cohesion: 0.27
Nodes (8): actions, CallActionStage, CallTraceAction, markCallActionFailed(), runCallActionTrace(), Trace, traces, fixture()

### Community 88 - "createLogger"
Cohesion: 0.11
Nodes (21): createApplication(), fetch(), hasRuntimeRepositories(), createLogger(), LoggerOptions, redactedPaths, sanitizeLogValue(), sensitiveKeys (+13 more)

### Community 89 - "call.schemas.ts"
Cohesion: 0.21
Nodes (15): buildInitialRoomName(), CallComponent, callComponentSchema, callControlActionSchema, callLimitSubmissionSchema, callMemberSelectionSchema, callRenameSubmissionSchema, decodeCallComponent() (+7 more)

### Community 90 - "CallPanelPayload"
Cohesion: 0.07
Nodes (37): Task 3: Criar uma área privada reutilizável e limitada à sessão, Autorrevisão do plano, Global Constraints, Handoff, Mapa de arquivos e contratos, Moderação direta do dono — Implementation Plan, Preparação e segurança da execução, Review Focus (+29 more)

### Community 91 - "application.rooms.test.ts"
Cohesion: 0.16
Nodes (14): Task 4: Prisma adapter, pg@8.23.1, pg, checkDatabase(), createPrismaClient(), DatabaseClient, disconnectDatabase(), disconnectedClients (+6 more)

### Community 92 - "CallInteractions"
Cohesion: 0.26
Nodes (6): buildTransferPrompt(), CallInteractions, id(), encodeCallComponent(), fixture(), fixture()

### Community 93 - "call.interactions.ts"
Cohesion: 0.32
Nodes (8): acknowledgeCallAction(), CallAckMode, completeCallAction(), replyCallFailure(), CallInteraction, Dependencies, failureMessage(), failure

### Community 100 - "call.discord.ts"
Cohesion: 0.15
Nodes (10): Calls: fluxo de eventos, Interações, Painel B, posse e acesso, Setup, Task 5: Aplicar o padrão às novas calls e fechar verificação/documentação, botRoomPermissions, CallMoveUnconfirmedError, CreatedDiscordRoom (+2 more)

## Knowledge Gaps
- **3 isolated node(s):** `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1313 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `package.json` to `prismaNamespace.ts`, `RoomMemberBlock.ts`, `prismaNamespaceBrowser.ts`, `PendingOwnershipTransfer.ts`, `RoomPresence.ts`, `prisma/client.ts`, `TemporaryRoom.ts`, `VoiceCreator.ts`, `commonInputTypes.ts`, `class.ts`, `RoomAllowedMember.ts`?**
  _High betweenness centrality (0.169) - this node is a cross-community bridge._
- **What connects `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `prismaNamespace.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.015873015873015872 - nodes in this community are weakly interconnected._
- **Why does `Arquitetura do Charon` connect `Arquitetura do Charon` to `architecture.md`, `call.discord.ts`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `RoomMemberBlock.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.024096385542168676 - nodes in this community are weakly interconnected._
- **Why does `InteractionRegistry` connect `discord.js` to `Charon v0.2.0 — Setup e Join-to-Create`, `call.discord.ts`, `File Structure`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Should `prismaNamespaceBrowser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._