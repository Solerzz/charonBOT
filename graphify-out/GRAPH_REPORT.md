# Graph Report - feature-v0.3.0-posse-controles  (2026-11-10)

## Corpus Check
- 154 files · ~168,105 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .prisma 1)

## Summary
- 1966 nodes · 4270 edges · 90 communities (76 shown, 14 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 268 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `97f07371`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Graphify Knowledge Graph (graphify-out)
- prismaNamespace.ts
- OwnershipTimers
- prismaNamespaceBrowser.ts
- package.json
- PrismaRoomStateRepository
- local-database
- Charon
- prisma.ts
- Charon v1 — Design
- compilerOptions
- compilerOptions
- TemporaryRoom.ts
- call.fixtures.ts
- Charon — painel público, tranca e visibilidade independentes
- Charon v0.1.0 — Infraestrutura
- pull_request_template.md
- PrismaClientBaseOptions
- VoiceCreator.ts
- DiscordCallGateway
- commonInputTypes.ts
- Charon v0.2.0 — Setup e Join-to-Create
- class.ts
- TemporaryRoomDelegate
- VoiceCreatorDelegate
- createRoomRuntime
- setup-creation.interactions.ts
- RoomActor
- Supabase RLS Implementation Plan
- Prisma__TemporaryRoomClient
- Prisma__VoiceCreatorClient
- RoomAllowedMember.ts
- Charon — criação guiada de canais de entrada
- RoomPresence.ts
- application.ts
- PendingOwnershipTransfer.ts
- enums.ts
- Charon v0.3.0 — posse e controles
- CallService
- createLogger
- PrismaTemporaryRoomRepository
- PendingOwnershipTransferDelegate
- RoomAllowedMemberDelegate
- RoomPresenceDelegate
- setup.repository.ts
- PrismaClient
- setup-creation.interactions.ts
- env.ts
- Retomar o Charon após formatar o computador
- createLogger
- RoomState
- PrismaVoiceCreatorRepository
- call.schemas.ts
- DiscordSetupGateway
- discord.js
- Prisma__PendingOwnershipTransferClient
- Prisma__RoomAllowedMemberClient
- Prisma__RoomPresenceClient
- File Structure
- call.fixtures.ts
- RoomActionError
- setup.interactions.ts
- Changelog
- Charon v0.2.0 — Setup e join-to-create
- Arquitetura do Charon
- Charon v0.3.0 — posse e controles
- InteractionHandler
- Validação local v0.3.0
- Setup guiado — evidência local e validação pendente
- call-action.metrics.ts
- Charon v0.4.0 — remoção e bloqueio pelo dono
- CallInteractions
- DiscordClientPort
- Setup guiado do Charon Implementation Plan
- RoomDiscordGateway
- SetupDiscordGateway
- RoomStateRepository
- setup-creation.interactions.test.ts
- CallPanelPayload
- CallPrivateWorkspace
- call-controls.view.test.ts
- Validação local — painel público, tranca e visibilidade
- logger.ts
- SetupCreationService
- setup-guided-database.test.ts
- call.interactions.ts
- call-workspace.test.ts
- OwnershipService
- interaction-registry.test.ts

## God Nodes (most connected - your core abstractions)
1. `RoomDiscordGateway` - 68 edges
2. `RoomActionError` - 65 edges
3. `vitest` - 60 edges
4. `discord.js` - 50 edges
5. `RoomActor` - 47 edges
6. `createRoomRuntime()` - 45 edges
7. `createLogger()` - 40 edges
8. `DiscordRoomGateway` - 38 edges
9. `RoomState` - 38 edges
10. `DiscordCallGateway` - 34 edges

## Surprising Connections (you probably didn't know these)
- `Task 7: Idempotent panel synchronization and setup toggle propagation` --references--> `SetupService`  [INFERRED]
  docs/superpowers/plans/2026-11-08-charon-v0.3.0-posse-controles.md → src/modules/setup/setup.service.ts
- `Global Constraints` --references--> `InteractionRegistry`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-v0.2.0-setup-join-to-create.md → src/core/discord/interactions/interaction-registry.ts
- `Arquitetura` --references--> `InteractionRegistry`  [INFERRED]
  docs/superpowers/specs/2026-11-05-charon-v0.2.0-setup-join-to-create-design.md → src/core/discord/interactions/interaction-registry.ts
- `Contratos compartilhados do novo fluxo` --references--> `VoiceCreatorConfiguration`  [INFERRED]
  docs/superpowers/plans/2026-11-10-charon-setup-guiado.md → src/modules/setup/setup.repository.ts
- `Autorrevisão do plano` --references--> `RoomAccessPolicy`  [INFERRED]
  docs/superpowers/plans/2026-11-10-charon-painel-publico-tranca-visibilidade.md → src/modules/calls/room.types.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify Maintenance and Usage Workflow** — agents_graphify_command, agents_graphify_query, agents_graphify_update, agents_graph_json, agents_graph_report, agents_wiki_index [INFERRED 0.75]

## Communities (90 total, 14 thin omitted)

### Community 0 - "Graphify Knowledge Graph (graphify-out)"
Cohesion: 0.33
Nodes (7): graphify-out/graph.json, graphify-out/GRAPH_REPORT.md, /graphify User Command, Graphify Knowledge Graph (graphify-out), graphify query / path / explain Commands, graphify update Command, graphify-out/wiki/index.md

### Community 1 - "prismaNamespace.ts"
Cohesion: 0.02
Nodes (120): AnyNull, Args, At, AtLeast, AtLoose, AtStrict, BatchPayload, Boolean (+112 more)

### Community 2 - "OwnershipTimers"
Cohesion: 0.10
Nodes (14): Baseline, isolation and test environment, Charon v0.3.0 Ownership and Room Controls Implementation Plan, File Structure, Global Constraints, Review Focus, Self-review and handoff, Task 1: Persist room-control state and prove database invariants, Task 2: Discord room adapter, shared guards and timer lifecycle (+6 more)

### Community 3 - "prismaNamespaceBrowser.ts"
Cohesion: 0.12
Nodes (15): AnyNull, DbNull, Decimal, JsonNull, ModelName, NullsOrder, NullTypes, PendingOwnershipTransferScalarFieldEnum (+7 more)

### Community 4 - "package.json"
Cohesion: 0.06
Nodes (37): dependencies, discord.js@14.28.1, dotenv@18.0.9, pino@10.4.0, @prisma/adapter-pg@7.10.1, @prisma/client@7.10.1, zod@4.6.7, devDependencies (+29 more)

### Community 5 - "PrismaRoomStateRepository"
Cohesion: 0.12
Nodes (9): PendingOwnershipTransfer, measureCallStage(), TemporaryRoomRecord, activeWhere(), available(), ownerChange(), PrismaRoomStateRepository, uniqueError() (+1 more)

### Community 6 - "local-database"
Cohesion: 0.06
Nodes (37): DATABASE_URL, DIRECT_URL, POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, RUN_DATABASE_SECURITY_TESTS, RUN_DATABASE_TESTS, jobs (+29 more)

### Community 7 - "Charon"
Cohesion: 0.25
Nodes (8): Charon, Comandos, Desenvolvimento, Instalação, Posse e controles da v0.3.0, Requisitos, Segurança, Variáveis de ambiente

### Community 8 - "prisma.ts"
Cohesion: 0.15
Nodes (15): Task 4: Prisma adapter, createApplication(), fetch(), hasRuntimeRepositories(), checkDatabase(), createPrismaClient(), DatabaseClient, disconnectDatabase() (+7 more)

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
Nodes (118): AggregateTemporaryRoom, EnumRoomVisibilityFieldUpdateOperationsInput, EnumTemporaryRoomStatusFieldUpdateOperationsInput, GetTemporaryRoomAggregateType, GetTemporaryRoomGroupByPayload, NullableStringFieldUpdateOperationsInput, TemporaryRoom$allowedMembersArgs, TemporaryRoom$pendingTransferArgs (+110 more)

### Community 13 - "call.fixtures.ts"
Cohesion: 0.29
Nodes (12): vitest, CallInteraction, deferred(), runtimes, roomSettingsFixture(), human(), OLDEST, OTHER (+4 more)

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

### Community 19 - "DiscordCallGateway"
Cohesion: 0.10
Nodes (5): CallDiscordError, DiscordCallGateway, isUnknownChannel(), DiscordRoomGateway, hasCode()

### Community 20 - "commonInputTypes.ts"
Cohesion: 0.05
Nodes (39): BoolFilter, BoolWithAggregatesFilter, DateTimeFilter, DateTimeNullableFilter, DateTimeNullableWithAggregatesFilter, DateTimeWithAggregatesFilter, EnumRoomVisibilityFilter, EnumRoomVisibilityWithAggregatesFilter (+31 more)

### Community 21 - "Charon v0.2.0 — Setup e Join-to-Create"
Cohesion: 0.08
Nodes (24): 1. Painel administrativo persistente no canal, 2. Painel administrativo privado temporário — escolhida, 3. Assistente linear passo a passo, Abordagens consideradas, Antiobjetivos, Arquitetura, Charon v0.2.0 — Setup e Join-to-Create, Compensação de falhas (+16 more)

### Community 22 - "class.ts"
Cohesion: 0.22
Nodes (4): config, decodeBase64AsWasm(), LogOptions, PrismaClientConstructor

### Community 25 - "createRoomRuntime"
Cohesion: 0.14
Nodes (10): Lock and permission contracts, Shared contracts — define once, reuse in later tasks, recordCallStage(), Departure, OwnershipAttempt, RoomCoordinator, createRoomRuntime(), KeyedMutex (+2 more)

### Community 26 - "setup-creation.interactions.ts"
Cohesion: 0.26
Nodes (13): Task 3: Build the Private Setup Dashboard, SetupVoiceChannel, VoiceCreatorConfiguration, encodeSetupCreationCustomId(), buildSetupCreationCategory(), buildSetupCreationReview(), buildSetupDashboard(), formatDefaultLimit() (+5 more)

### Community 27 - "RoomActor"
Cohesion: 0.26
Nodes (3): RoomActor, safe(), TransferService

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

### Community 34 - "application.ts"
Cohesion: 0.19
Nodes (11): Task 7: Wire Setup and Voice Events into the Application, pino, ApplicationOverrides, createDefaultVoiceDispatcher(), InteractionDispatcher, SignalSource, VoiceStateDispatcher, VoiceStateHandler (+3 more)

### Community 35 - "PendingOwnershipTransfer.ts"
Cohesion: 0.03
Nodes (73): AggregatePendingOwnershipTransfer, GetPendingOwnershipTransferAggregateType, GetPendingOwnershipTransferGroupByPayload, PendingOwnershipTransferAggregateArgs, PendingOwnershipTransferAvgAggregateInputType, PendingOwnershipTransferAvgAggregateOutputType, PendingOwnershipTransferAvgOrderByAggregateInput, PendingOwnershipTransferCountAggregateInputType (+65 more)

### Community 36 - "enums.ts"
Cohesion: 0.20
Nodes (9): Task 1: Persist Voice Creator and Temporary Room State, $Enums, PendingOwnershipTransfer, RoomAllowedMember, RoomPresence, TemporaryRoom, VoiceCreator, RoomVisibility (+1 more)

### Community 37 - "Charon v0.3.0 — posse e controles"
Cohesion: 0.08
Nodes (24): 10. Ciclo de vida e falhas — propostas técnicas, 11. Verificação e limites operacionais, 12. Fora do escopo e liberdade de implementação, 1. Objetivo e contexto, 2. Origem das decisões, 3. Abordagens de interação, 4. Painel e controles, 5. Posse e elegibilidade (+16 more)

### Community 38 - "CallService"
Cohesion: 0.10
Nodes (21): Calls: fluxo de eventos, Interações, Painel B, posse e acesso, Setup, Task 6: Implement Temporary Room Lifecycle and Compensation, Aceitação real e rollout — checklist original e estado posterior, Autorrevisão do plano, Global Constraints (+13 more)

### Community 39 - "createLogger"
Cohesion: 0.24
Nodes (10): createLogger(), captureLogger(), lifecycleFixture(), departure, fixture(), fixture(), attachRoomRuntime(), cleanups (+2 more)

### Community 40 - "PrismaTemporaryRoomRepository"
Cohesion: 0.15
Nodes (5): PrismaClient, PrismaTemporaryRoomRepository, TemporaryRoomTransitionError, fixture(), invalidate

### Community 44 - "setup.repository.ts"
Cohesion: 0.09
Nodes (15): Task 2: Add Voice Creator Repository and Setup Service, $Enums, RoomAllowedMember, RoomPresence, VoiceCreator, SetupDiscordGatewayFactory, CreateVoiceCreatorInput, VoiceCreatorAlreadyConfiguredError (+7 more)

### Community 46 - "setup-creation.interactions.ts"
Cohesion: 0.15
Nodes (17): contextOf(), requirePrivateAdministrator(), resultMessage(), SetupCreationInteractions, SetupCreationInput, SetupCreationResult, SetupDraft, SetupDraftContext (+9 more)

### Community 47 - "env.ts"
Cohesion: 0.28
Nodes (3): Application, registerShutdownSignals(), start()

### Community 48 - "Retomar o Charon após formatar o computador"
Cohesion: 0.33
Nodes (6): Antes de formatar: salvar fora do Git, De onde continuar, O que está salvo no GitHub, Recuperar o projeto, Retomar a validação da v0.3.0, Retomar o Charon após formatar o computador

### Community 49 - "createLogger"
Cohesion: 0.25
Nodes (7): Charon Stage 1 Infrastructure Implementation Plan, Global Constraints, Review Focus, Task 1: Project foundation, Task 3: Structured logger, Task 6: Application lifecycle and status command, Task 7: CI, documentation, and release readiness

### Community 50 - "RoomState"
Cohesion: 0.24
Nodes (10): allowedUnion(), assertSnapshot(), RoomAccessService, safePrevious(), sameAccess(), sameAuthority(), sameIds(), currentOwnedRoom() (+2 more)

### Community 51 - "PrismaVoiceCreatorRepository"
Cohesion: 0.23
Nodes (3): isPrismaErrorWithCode(), PrismaVoiceCreatorRepository, runtimeFixture()

### Community 52 - "call.schemas.ts"
Cohesion: 0.22
Nodes (14): buildInitialRoomName(), CallComponent, callComponentSchema, callControlActionSchema, callLimitSubmissionSchema, callMemberSelectionSchema, callRenameSubmissionSchema, decodeCallComponent() (+6 more)

### Community 53 - "DiscordSetupGateway"
Cohesion: 0.16
Nodes (11): Charon v0.2.0 — registro de validação, Discord real: verificações observadas, Limpeza e limites, PostgreSQL real: aprovado, Versão verificada, discordErrorCode(), DiscordSetupGateway, SetupDiscordError (+3 more)

### Community 54 - "discord.js"
Cohesion: 0.15
Nodes (9): discord.js, commandDefinitions, CommandRegistrar, registerCommands(), setupCommandData, StatusCommand, botPermissions, configuration (+1 more)

### Community 58 - "File Structure"
Cohesion: 0.20
Nodes (9): Calls module, Charon v0.2.0 Setup and Join-to-Create Implementation Plan, Composition, registration, and documentation, File Structure, Global Constraints, Persistence and shared utilities, Review Focus, Setup module (+1 more)

### Community 59 - "call.fixtures.ts"
Cohesion: 0.26
Nodes (10): discordFixture(), rights, createInput, panel, creator, entry, room, fixture() (+2 more)

### Community 60 - "RoomActionError"
Cohesion: 0.15
Nodes (21): Task 1: Persistir tranca sem alterar a privacidade existente, requireActiveRoom(), requireOwnedRoom(), Dependencies, Overwrite, commitRoomMutation(), Dependencies, ConfiguredRoom (+13 more)

### Community 61 - "setup.interactions.ts"
Cohesion: 0.13
Nodes (23): botRoomPermissions, CallMoveUnconfirmedError, CreatedDiscordRoom, invalidateControls, trackedStatuses, SetupCategory, voicePermissions, decodeSetupCustomId() (+15 more)

### Community 62 - "Changelog"
Cohesion: 0.25
Nodes (8): [0.1.0] - 2026-11-05, [0.2.0] - 2026-11-06, 0.3.0 — integrada e validada no servidor de testes em 2026-11-10, Added, Added, Changelog, Known limitations, [Unreleased]

### Community 63 - "Charon v0.2.0 — Setup e join-to-create"
Cohesion: 0.40
Nodes (5): Banco e verificação local, Charon v0.2.0 — Setup e join-to-create, Entregas, Estado desta preparação, Limitações operacionais

### Community 65 - "Arquitetura do Charon"
Cohesion: 0.33
Nodes (6): Arquitetura do Charon, Banco de dados, Estilo, Estrutura na v0.3.0 (preparação local), Fluxo de inicialização, Verificação

### Community 66 - "Charon v0.3.0 — posse e controles"
Cohesion: 0.40
Nodes (5): Banco local e CI (sem credenciais remotas), Charon v0.3.0 — posse e controles, Entrega implementada, Permissões e limites operacionais, Validação e limites do aceite humano

### Community 67 - "InteractionHandler"
Cohesion: 0.17
Nodes (7): Task 5: Discord client and interaction registry, createDefaultDispatcher(), InteractionHandler, InteractionRegistry, safeFailureResponse, SetupCommand, fixture()

### Community 68 - "Validação local v0.3.0"
Cohesion: 0.18
Nodes (11): Aceite da revisão local — 2026-11-09, CI, segurança dos artefatos e limites, Fix round 1 — 2026-11-09, validação focada, Follow-up M2 — 2026-11-09, M2 — envelope da consulta inicial — 2026-11-09, Onda final combinada — 2026-11-09, RED → GREEN e caracterizações, Resultados observados (+3 more)

### Community 69 - "Setup guiado — evidência local e validação pendente"
Cohesion: 0.22
Nodes (8): Aceitação final após revisão independente, Cobertura por requisito, Discord real — PENDENTE, não executado, Estado e limites de autorização, Gate final observado, Limitações mantidas, Setup guiado — evidência local e validação pendente, TDD observado

### Community 70 - "call-action.metrics.ts"
Cohesion: 0.24
Nodes (8): actions, CallActionStage, CallTraceAction, markCallActionFailed(), runCallActionTrace(), Trace, traces, fixture()

### Community 71 - "Charon v0.4.0 — remoção e bloqueio pelo dono"
Cohesion: 0.13
Nodes (14): 1. Objetivo e escopo, 2. Decisões do usuário e contexto preservado, 3. Abordagens consideradas, 4. Fluxo de interação — propostas técnicas sujeitas ao aceite do desenho, 5. Precedência e permissões efetivas, 6. Estado durável e consistência — escolhas técnicas do assistente, 7. Verificação necessária, 8. Entrega, limites e próximos passos (+6 more)

### Community 72 - "CallInteractions"
Cohesion: 0.30
Nodes (5): buildTransferPrompt(), CallInteractions, encodeCallComponent(), fixture(), fixture()

### Community 74 - "Setup guiado do Charon Implementation Plan"
Cohesion: 0.13
Nodes (14): Contratos compartilhados do novo fluxo, Gate de verificação — apenas local, Global Constraints, Handoff, Mapa de arquivos e interfaces, Preparação de execução — antes da Tarefa 1, Review Focus, Self-review do plano (+6 more)

### Community 75 - "RoomDiscordGateway"
Cohesion: 0.15
Nodes (4): RoomControlsService, RoomPanelService, RoomDiscordGateway, fixture()

### Community 76 - "SetupDiscordGateway"
Cohesion: 0.10
Nodes (8): Task 4: Handle Setup Buttons, Selects, and Modals, Task 4: Conectar wizard e edição do padrão ao dashboard privado, SetupDiscordGateway, isGuildBased(), SetupInteractions, VoiceCreatorRepository, SetupService, fixture()

### Community 78 - "setup-creation.interactions.test.ts"
Cohesion: 0.25
Nodes (7): context, fixture(), event(), review(), start(), json(), stores

### Community 79 - "CallPanelPayload"
Cohesion: 0.22
Nodes (10): Task 5: Build the Disabled Minimalist Call Panel, Task 6: Compact panel B, private menu and strict component schemas, TemporaryRoom, buildCallPanel(), CallPanelInput, CallPanelPayload, CallPanelRow, CallControlAction (+2 more)

### Community 80 - "CallPrivateWorkspace"
Cohesion: 0.33
Nodes (4): Task 3: Criar uma área privada reutilizável e limitada à sessão, CallPrivateWorkspace, keyOf(), validDelivery()

### Community 81 - "call-controls.view.test.ts"
Cohesion: 0.25
Nodes (10): Validação, segurança e observabilidade, buildAccessPrompt(), buildLimitModal(), buildRenameModal(), buildTransferTargetPrompt(), customId(), memberSelect(), actor (+2 more)

### Community 82 - "Validação local — painel público, tranca e visibilidade"
Cohesion: 0.18
Nodes (11): Aceitação humana — aprovada no escopo relatado, Antes — capturado com fetch ainda presente (2026-11-10, 17:57 e 17:59 local), Benchmark reproduzível de fronteiras (não é latência do Discord), Decisões registradas durante a execução, Depois, Escopo e limites, Gates locais — evidência histórica da Task 5, Integração Git e rollout autorizados — concluídos em 2026-11-10 (+3 more)

### Community 83 - "logger.ts"
Cohesion: 0.21
Nodes (10): Task 2: Validated configuration, AppConfig, environmentSchema, loadConfig(), postgresUrl, LoggerOptions, redactedPaths, sanitizeLogValue() (+2 more)

### Community 84 - "SetupCreationService"
Cohesion: 0.28
Nodes (5): SetupCreationService, ReadySetupDraft, SetupChannelCreationError, configuration, fixture()

### Community 85 - "setup-guided-database.test.ts"
Cohesion: 0.30
Nodes (4): pg@8.23.1, pg, assertDisposableDatabaseEnvironment(), prepare()

### Community 86 - "call.interactions.ts"
Cohesion: 0.29
Nodes (8): zod, acknowledgeCallAction(), CallAckMode, completeCallAction(), replyCallFailure(), Dependencies, failureMessage(), failure

### Community 87 - "call-workspace.test.ts"
Cohesion: 0.21
Nodes (8): CallWorkspaceDelivery, CallWorkspaceView, Workspace, access, actor, payload(), pending(), target

### Community 88 - "OwnershipService"
Cohesion: 0.35
Nodes (4): Task 3: Continuous presence and five-minute claim priority, matchesGeneration(), matchesSnapshot(), OwnershipService

### Community 89 - "interaction-registry.test.ts"
Cohesion: 0.32
Nodes (3): Task 3: Criar entrada com permissões preservadas e compensação conservadora, createDiscordClient(), createSilentLogger()

## Knowledge Gaps
- **3 isolated node(s):** `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1139 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `package.json` to `prismaNamespace.ts`, `RoomPresence.ts`, `prismaNamespaceBrowser.ts`, `PendingOwnershipTransfer.ts`, `setup.repository.ts`, `TemporaryRoom.ts`, `VoiceCreator.ts`, `commonInputTypes.ts`, `class.ts`, `RoomAllowedMember.ts`?**
  _High betweenness centrality (0.159) - this node is a cross-community bridge._
- **What connects `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `prismaNamespace.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.01652892561983471 - nodes in this community are weakly interconnected._
- **Why does `InteractionRegistry` connect `InteractionHandler` to `application.ts`, `CallService`, `Charon v0.2.0 — Setup e Join-to-Create`, `interaction-registry.test.ts`, `File Structure`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Should `OwnershipTimers` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Why does `Arquitetura do Charon` connect `Arquitetura do Charon` to `architecture.md`, `CallService`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Should `prismaNamespaceBrowser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._