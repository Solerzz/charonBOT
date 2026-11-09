# Graph Report - feature-v0.3.0-posse-controles  (2026-11-09)

## Corpus Check
- 127 files · ~116,425 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .prisma 1)

## Summary
- 1693 nodes · 3365 edges · 70 communities (58 shown, 12 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 210 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f15ecc1c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Graphify Knowledge Graph (graphify-out)
- prismaNamespace.ts
- prisma.ts
- prismaNamespaceBrowser.ts
- package.json
- vitest
- local-database
- Charon
- class.ts
- Charon v1 — Design
- compilerOptions
- compilerOptions
- TemporaryRoom.ts
- ownership-database.test.ts
- SetupService
- Charon v0.1.0 — Infraestrutura
- pull_request_template.md
- PrismaClientBaseOptions
- VoiceCreator.ts
- DiscordRoomGateway
- commonInputTypes.ts
- Charon v0.2.0 — Setup e Join-to-Create
- createLogger
- TemporaryRoomDelegate
- VoiceCreatorDelegate
- createRoomRuntime
- Review Focus
- DiscordSetupGateway
- Supabase RLS Implementation Plan
- Prisma__TemporaryRoomClient
- Prisma__VoiceCreatorClient
- RoomAllowedMember.ts
- room-state.repository.ts
- RoomPresence.ts
- setup.repository.ts
- PendingOwnershipTransfer.ts
- enums.ts
- Charon v0.3.0 — posse e controles
- .handleVoiceTransition
- call-panel.view.ts
- application.test.ts
- PendingOwnershipTransferDelegate
- RoomAllowedMemberDelegate
- RoomPresenceDelegate
- setup.interactions.ts
- .execute
- InteractionHandler
- call.discord.ts
- Retomar o Charon após formatar o computador
- setup.interactions.test.ts
- PrismaVoiceCreatorRepository
- @prisma/client
- setup.repository.ts
- logger.ts
- call.interactions.ts
- Prisma__PendingOwnershipTransferClient
- Prisma__RoomAllowedMemberClient
- Prisma__RoomPresenceClient
- enums.ts
- call.fixtures.ts
- setup.command.ts
- Changelog
- Charon v0.2.0 — Setup e join-to-create
- Arquitetura do Charon
- Charon v0.3.0 — posse e controles
- Charon v0.2.0 — registro de validação
- Validação local v0.3.0
- index.ts
- RoomActionError

## God Nodes (most connected - your core abstractions)
1. `RoomActionError` - 59 edges
2. `RoomDiscordGateway` - 58 edges
3. `vitest` - 49 edges
4. `discord.js` - 41 edges
5. `DiscordRoomGateway` - 39 edges
6. `createRoomRuntime()` - 36 edges
7. `DiscordCallGateway` - 34 edges
8. `RoomStateRepository` - 33 edges
9. `RoomActor` - 33 edges
10. `TransferService` - 31 edges

## Surprising Connections (you probably didn't know these)
- `Task 7: Idempotent panel synchronization and setup toggle propagation` --references--> `SetupService`  [INFERRED]
  docs/superpowers/plans/2026-11-08-charon-v0.3.0-posse-controles.md → src/modules/setup/setup.service.ts
- `Verificação` --references--> `assertDisposableDatabaseEnvironment()`  [INFERRED]
  docs/architecture.md → tests/integration/database-test-utils.ts
- `Task 3: Structured logger` --references--> `createLogger()`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-stage-1-infrastructure.md → src/core/logger/logger.ts
- `Validação, segurança e observabilidade` --references--> `customId()`  [INFERRED]
  docs/superpowers/specs/2026-11-05-charon-v0.2.0-setup-join-to-create-design.md → src/modules/calls/call-controls.view.ts
- `Calls: fluxo de eventos` --references--> `RoomCoordinator`  [INFERRED]
  docs/architecture.md → src/modules/calls/room.coordinator.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify Maintenance and Usage Workflow** — agents_graphify_command, agents_graphify_query, agents_graphify_update, agents_graph_json, agents_graph_report, agents_wiki_index [INFERRED 0.75]

## Communities (70 total, 12 thin omitted)

### Community 0 - "Graphify Knowledge Graph (graphify-out)"
Cohesion: 0.33
Nodes (7): graphify-out/graph.json, graphify-out/GRAPH_REPORT.md, /graphify User Command, Graphify Knowledge Graph (graphify-out), graphify query / path / explain Commands, graphify update Command, graphify-out/wiki/index.md

### Community 1 - "prismaNamespace.ts"
Cohesion: 0.02
Nodes (120): AnyNull, Args, At, AtLeast, AtLoose, AtStrict, BatchPayload, Boolean (+112 more)

### Community 2 - "prisma.ts"
Cohesion: 0.19
Nodes (10): Task 4: Prisma adapter, checkDatabase(), createPrismaClient(), DatabaseClient, disconnectDatabase(), disconnectedClients, assertDisposableDatabaseEnvironment(), fixture() (+2 more)

### Community 3 - "prismaNamespaceBrowser.ts"
Cohesion: 0.12
Nodes (15): AnyNull, DbNull, Decimal, JsonNull, ModelName, NullsOrder, NullTypes, PendingOwnershipTransferScalarFieldEnum (+7 more)

### Community 4 - "package.json"
Cohesion: 0.06
Nodes (40): dependencies, discord.js@14.28.1, dotenv@18.0.9, pg@8.23.1, pino@10.4.0, @prisma/adapter-pg@7.10.1, @prisma/client@7.10.1, zod@4.6.7 (+32 more)

### Community 5 - "vitest"
Cohesion: 0.28
Nodes (10): discord.js, CallInteraction, roomSettingsFixture(), human(), OLDEST, OTHER, OWNER, ownershipFixture() (+2 more)

### Community 6 - "local-database"
Cohesion: 0.06
Nodes (37): DATABASE_URL, DIRECT_URL, POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, RUN_DATABASE_SECURITY_TESTS, RUN_DATABASE_TESTS, jobs (+29 more)

### Community 7 - "Charon"
Cohesion: 0.25
Nodes (8): Charon, Comandos, Desenvolvimento, Instalação, Posse e controles da v0.3.0, Requisitos, Segurança, Variáveis de ambiente

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
Nodes (119): AggregateTemporaryRoom, EnumRoomVisibilityFieldUpdateOperationsInput, EnumTemporaryRoomStatusFieldUpdateOperationsInput, GetTemporaryRoomAggregateType, GetTemporaryRoomGroupByPayload, IntFieldUpdateOperationsInput, NullableStringFieldUpdateOperationsInput, TemporaryRoom$allowedMembersArgs (+111 more)

### Community 13 - "ownership-database.test.ts"
Cohesion: 0.13
Nodes (15): Lock and permission contracts, Task 2: Discord room adapter, shared guards and timer lifecycle, pino, Departure, OwnershipAttempt, Overwrite, Dependencies, RoomActionErrorCode (+7 more)

### Community 14 - "SetupService"
Cohesion: 0.17
Nodes (13): Calls module, Composition, registration, and documentation, File Structure, Persistence and shared utilities, Setup module, Task 3: Build the Private Setup Dashboard, Task 4: Handle Setup Buttons, Selects, and Modals, Task 8: Verify the Release and Update Documentation (+5 more)

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
Cohesion: 0.03
Nodes (74): AggregateVoiceCreator, BoolFieldUpdateOperationsInput, DateTimeFieldUpdateOperationsInput, GetVoiceCreatorAggregateType, GetVoiceCreatorGroupByPayload, NullableDateTimeFieldUpdateOperationsInput, StringFieldUpdateOperationsInput, VoiceCreator$temporaryRoomsArgs (+66 more)

### Community 19 - "DiscordRoomGateway"
Cohesion: 0.10
Nodes (5): CallDiscordError, DiscordCallGateway, isUnknownChannel(), DiscordRoomGateway, hasCode()

### Community 20 - "commonInputTypes.ts"
Cohesion: 0.05
Nodes (39): BoolFilter, BoolWithAggregatesFilter, DateTimeFilter, DateTimeNullableFilter, DateTimeNullableWithAggregatesFilter, DateTimeWithAggregatesFilter, EnumRoomVisibilityFilter, EnumRoomVisibilityWithAggregatesFilter (+31 more)

### Community 21 - "Charon v0.2.0 — Setup e Join-to-Create"
Cohesion: 0.08
Nodes (24): 1. Painel administrativo persistente no canal, 2. Painel administrativo privado temporário — escolhida, 3. Assistente linear passo a passo, Abordagens consideradas, Antiobjetivos, Charon v0.2.0 — Setup e Join-to-Create, Compensação de falhas, Criação e ciclo de vida da sala (+16 more)

### Community 22 - "createLogger"
Cohesion: 0.33
Nodes (8): createLogger(), RoomPresence, lifecycleFixture(), fixture(), attachRoomRuntime(), cleanups, stopRoomFixtures(), fixture()

### Community 25 - "createRoomRuntime"
Cohesion: 0.09
Nodes (8): RoomCoordinator, createRoomRuntime(), activeWhere(), available(), ownerChange(), PrismaRoomStateRepository, uniqueError(), fixture()

### Community 26 - "Review Focus"
Cohesion: 0.25
Nodes (7): Charon Stage 1 Infrastructure Implementation Plan, Global Constraints, Review Focus, Task 1: Project foundation, Task 3: Structured logger, Task 6: Application lifecycle and status command, Task 7: CI, documentation, and release readiness

### Community 27 - "DiscordSetupGateway"
Cohesion: 0.27
Nodes (5): discordErrorCode(), DiscordSetupGateway, SetupDiscordError, allPermissions, fixture()

### Community 28 - "Supabase RLS Implementation Plan"
Cohesion: 0.25
Nodes (7): Approved scope and approaches, Global Constraints, Progress, Re-run the read-only security test, Review Focus, Supabase RLS Implementation Plan, Task 1: Enable and verify RLS

### Community 31 - "RoomAllowedMember.ts"
Cohesion: 0.03
Nodes (74): AggregateRoomAllowedMember, GetRoomAllowedMemberAggregateType, GetRoomAllowedMemberGroupByPayload, RoomAllowedMemberAggregateArgs, RoomAllowedMemberCountAggregateInputType, RoomAllowedMemberCountAggregateOutputType, RoomAllowedMemberCountArgs, RoomAllowedMemberCountOrderByAggregateInput (+66 more)

### Community 32 - "room-state.repository.ts"
Cohesion: 0.12
Nodes (13): $Enums, PrismaClient, RoomAllowedMember, VoiceCreator, CreateTemporaryRoomInput, invalidateControls, trackedStatuses, ConfiguredRoom (+5 more)

### Community 33 - "RoomPresence.ts"
Cohesion: 0.03
Nodes (74): AggregateRoomPresence, GetRoomPresenceAggregateType, GetRoomPresenceGroupByPayload, RoomPresenceAggregateArgs, RoomPresenceCountAggregateInputType, RoomPresenceCountAggregateOutputType, RoomPresenceCountArgs, RoomPresenceCountOrderByAggregateInput (+66 more)

### Community 34 - "setup.repository.ts"
Cohesion: 0.31
Nodes (8): SetupVoiceChannel, VoiceCreatorConfiguration, buildSetupDashboard(), SetupDashboardInput, SetupDashboardPayload, first, json(), second

### Community 35 - "PendingOwnershipTransfer.ts"
Cohesion: 0.03
Nodes (73): AggregatePendingOwnershipTransfer, GetPendingOwnershipTransferAggregateType, GetPendingOwnershipTransferGroupByPayload, PendingOwnershipTransferAggregateArgs, PendingOwnershipTransferAvgAggregateInputType, PendingOwnershipTransferAvgAggregateOutputType, PendingOwnershipTransferAvgOrderByAggregateInput, PendingOwnershipTransferCountAggregateInputType (+65 more)

### Community 36 - "enums.ts"
Cohesion: 0.29
Nodes (6): $Enums, PendingOwnershipTransfer, RoomAllowedMember, RoomPresence, TemporaryRoom, VoiceCreator

### Community 37 - "Charon v0.3.0 — posse e controles"
Cohesion: 0.08
Nodes (24): 10. Ciclo de vida e falhas — propostas técnicas, 11. Verificação e limites operacionais, 12. Fora do escopo e liberdade de implementação, 1. Objetivo e contexto, 2. Origem das decisões, 3. Abordagens de interação, 4. Painel e controles, 5. Posse e elegibilidade (+16 more)

### Community 38 - ".handleVoiceTransition"
Cohesion: 0.10
Nodes (9): Task 6: Implement Temporary Room Lifecycle and Compensation, CallDiscordGateway, PrismaTemporaryRoomRepository, TemporaryRoomRecord, TemporaryRoomRepository, TemporaryRoomTransitionError, VoiceTransition, CallService (+1 more)

### Community 39 - "call-panel.view.ts"
Cohesion: 0.20
Nodes (10): Task 5: Build the Disabled Minimalist Call Panel, TemporaryRoom, buildCallPanel(), CallPanelInput, CallPanelPayload, CallPanelRow, RoomPanelService, json() (+2 more)

### Community 40 - "application.test.ts"
Cohesion: 0.12
Nodes (15): Task 7: Wire Setup and Voice Events into the Application, ApplicationOverrides, createApplication(), createDefaultVoiceDispatcher(), DiscordClientPort, fetch(), hasRuntimeRepositories(), InteractionDispatcher (+7 more)

### Community 44 - "setup.interactions.ts"
Cohesion: 0.28
Nodes (11): SetupCategory, voicePermissions, GuildBasedInteraction, decodeSetupCustomId(), discordIdSchema, encodeSetupCustomId(), setupChannelNameSchema, setupCustomIdSchema (+3 more)

### Community 45 - ".execute"
Cohesion: 0.21
Nodes (4): SetupDiscordGateway, isGuildBased(), SetupInteractions, SetupCustomId

### Community 46 - "InteractionHandler"
Cohesion: 0.11
Nodes (11): Task 5: Discord client and interaction registry, Charon v0.2.0 Setup and Join-to-Create Implementation Plan, Global Constraints, Review Focus, Arquitetura, createDefaultDispatcher(), InteractionHandler, InteractionRegistry (+3 more)

### Community 47 - "call.discord.ts"
Cohesion: 0.28
Nodes (5): botRoomPermissions, CallMoveUnconfirmedError, CreatedDiscordRoom, CreateDiscordRoomInput, RoomRuntime

### Community 48 - "Retomar o Charon após formatar o computador"
Cohesion: 0.33
Nodes (6): Antes de formatar: salvar fora do Git, De onde continuar, O que está salvo no GitHub, Recuperar o projeto, Retomar a validação da v0.3.0, Retomar o Charon após formatar o computador

### Community 49 - "setup.interactions.test.ts"
Cohesion: 0.22
Nodes (6): SetupDiscordGatewayFactory, SetupInteraction, first, fixture(), Kind, second

### Community 50 - "PrismaVoiceCreatorRepository"
Cohesion: 0.24
Nodes (3): isPrismaErrorWithCode(), PrismaVoiceCreatorRepository, runtimeFixture()

### Community 51 - "@prisma/client"
Cohesion: 0.22
Nodes (4): config, decodeBase64AsWasm(), LogOptions, PrismaClientConstructor

### Community 52 - "setup.repository.ts"
Cohesion: 0.11
Nodes (7): Task 2: Add Voice Creator Repository and Setup Service, CreateVoiceCreatorInput, VoiceCreatorAlreadyConfiguredError, VoiceCreatorNotFoundError, VoiceCreatorRepository, SetupChannelGateway, configuration

### Community 53 - "logger.ts"
Cohesion: 0.25
Nodes (5): LoggerOptions, redactedPaths, sanitizeLogValue(), sensitiveKeys, captureLogger()

### Community 54 - "call.interactions.ts"
Cohesion: 0.11
Nodes (33): buildAccessPrompt(), buildLimitModal(), buildOwnerMenu(), buildRenameModal(), buildTransferPrompt(), buildTransferTargetPrompt(), customId(), memberSelect() (+25 more)

### Community 58 - "enums.ts"
Cohesion: 0.67
Nodes (3): Task 1: Persist Voice Creator and Temporary Room State, RoomVisibility, TemporaryRoomStatus

### Community 59 - "call.fixtures.ts"
Cohesion: 0.15
Nodes (17): vitest, config, fixture(), sqlSpy(), discordFixture(), rights, createInput, panel (+9 more)

### Community 60 - "setup.command.ts"
Cohesion: 0.16
Nodes (11): Task 2: Validated configuration, commandDefinitions, CommandRegistrar, registerCommands(), AppConfig, environmentSchema, loadConfig(), postgresUrl (+3 more)

### Community 62 - "Changelog"
Cohesion: 0.25
Nodes (8): [0.1.0] - 2026-11-05, [0.2.0] - 2026-11-06, 0.3.0 — preparação local em 2026-11-09 (não publicada), Added, Added, Changelog, Known limitations, [Unreleased]

### Community 63 - "Charon v0.2.0 — Setup e join-to-create"
Cohesion: 0.40
Nodes (5): Banco e verificação local, Charon v0.2.0 — Setup e join-to-create, Entregas, Estado desta preparação, Limitações operacionais

### Community 65 - "Arquitetura do Charon"
Cohesion: 0.20
Nodes (10): Arquitetura do Charon, Banco de dados, Calls: fluxo de eventos, Estilo, Estrutura na v0.3.0 (preparação local), Fluxo de inicialização, Interações, Painel B, posse e acesso (+2 more)

### Community 66 - "Charon v0.3.0 — posse e controles"
Cohesion: 0.40
Nodes (5): Banco local e CI (sem credenciais remotas), Charon v0.3.0 — posse e controles, Entrega implementada, Permissões e limites operacionais, Validação e checklist humano

### Community 67 - "Charon v0.2.0 — registro de validação"
Cohesion: 0.40
Nodes (5): Charon v0.2.0 — registro de validação, Discord real: verificações observadas, Limpeza e limites, PostgreSQL real: aprovado, Versão verificada

### Community 68 - "Validação local v0.3.0"
Cohesion: 0.22
Nodes (9): CI, segurança dos artefatos e limites, Fix round 1 — 2026-11-09, validação focada, Follow-up M2 — 2026-11-09, Onda final combinada — 2026-11-09, RED → GREEN e caracterizações, Resultados observados, Revalidação pelo controlador — 2026-11-09, Rodada residual autorizada — 2026-11-09 (+1 more)

### Community 73 - "index.ts"
Cohesion: 0.22
Nodes (4): Application, registerShutdownSignals(), SignalSource, start()

### Community 75 - "RoomActionError"
Cohesion: 0.05
Nodes (41): Baseline, isolation and test environment, Charon v0.3.0 Ownership and Room Controls Implementation Plan, File Structure, Global Constraints, Review Focus, Self-review and handoff, Shared contracts — define once, reuse in later tasks, Task 1: Persist room-control state and prove database invariants (+33 more)

## Knowledge Gaps
- **3 isolated node(s):** `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1036 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `package.json` to `room-state.repository.ts`, `prismaNamespace.ts`, `RoomPresence.ts`, `prismaNamespaceBrowser.ts`, `PendingOwnershipTransfer.ts`, `TemporaryRoom.ts`, `VoiceCreator.ts`, `@prisma/client`, `commonInputTypes.ts`, `RoomAllowedMember.ts`?**
  _High betweenness centrality (0.191) - this node is a cross-community bridge._
- **What connects `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `prismaNamespace.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.01652892561983471 - nodes in this community are weakly interconnected._
- **Why does `InteractionRegistry` connect `InteractionHandler` to `application.test.ts`, `Arquitetura do Charon`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Should `prismaNamespaceBrowser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `call.fixtures.ts` to `prisma.ts`, `package.json`, `vitest`, `ownership-database.test.ts`, `SetupService`, `createLogger`, `DiscordSetupGateway`, `room-state.repository.ts`, `setup.repository.ts`, `call-panel.view.ts`, `application.test.ts`, `setup.interactions.ts`, `InteractionHandler`, `setup.interactions.test.ts`, `setup.repository.ts`, `logger.ts`, `call.interactions.ts`, `setup.command.ts`, `index.ts`, `RoomActionError`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.058693244739756366 - nodes in this community are weakly interconnected._