# Graph Report - feature-v0.3.0-posse-controles  (2026-11-09)

## Corpus Check
- 127 files · ~115,306 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .prisma 1)

## Summary
- 1692 nodes · 3364 edges · 73 communities (59 shown, 14 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 210 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0eb6709d`
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
- File Structure
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
- room-state.repository.ts
- Review Focus
- DiscordSetupGateway
- Supabase RLS Implementation Plan
- Prisma__TemporaryRoomClient
- Prisma__VoiceCreatorClient
- RoomAllowedMember.ts
- @prisma/client
- RoomPresence.ts
- RoomActionError
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
- createDefaultDispatcher
- DiscordCallGateway
- Retomar o Charon após formatar o computador
- discord.js
- setup.repository.ts
- @prisma/client
- setup.repository.ts
- createRoomRuntime
- call.interactions.ts
- Prisma__PendingOwnershipTransferClient
- Prisma__RoomAllowedMemberClient
- Prisma__RoomPresenceClient
- scripts
- call.fixtures.ts
- setup.command.ts
- setup.command.ts
- Changelog
- Charon v0.2.0 — Setup e join-to-create
- Arquitetura do Charon
- Charon v0.3.0 — posse e controles
- Charon v0.2.0 — registro de validação
- Validação local v0.3.0
- room-context.ts
- DiscordClientPort
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
8. `RoomActor` - 33 edges
9. `RoomStateRepository` - 33 edges
10. `TransferService` - 31 edges

## Surprising Connections (you probably didn't know these)
- `Task 7: Idempotent panel synchronization and setup toggle propagation` --references--> `SetupService`  [INFERRED]
  docs/superpowers/plans/2026-11-08-charon-v0.3.0-posse-controles.md → src/modules/setup/setup.service.ts
- `Arquitetura` --references--> `InteractionRegistry`  [INFERRED]
  docs/superpowers/specs/2026-11-05-charon-v0.2.0-setup-join-to-create-design.md → src/core/discord/interactions/interaction-registry.ts
- `Task 5: Private-room access and owner settings` --references--> `requireOwnedRoom()`  [INFERRED]
  docs/superpowers/plans/2026-11-08-charon-v0.3.0-posse-controles.md → src/modules/calls/room-context.ts
- `Verificação` --references--> `assertDisposableDatabaseEnvironment()`  [INFERRED]
  docs/architecture.md → tests/integration/database-test-utils.ts
- `Task 3: Structured logger` --references--> `createLogger()`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-stage-1-infrastructure.md → src/core/logger/logger.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify Maintenance and Usage Workflow** — agents_graphify_command, agents_graphify_query, agents_graphify_update, agents_graph_json, agents_graph_report, agents_wiki_index [INFERRED 0.75]

## Communities (73 total, 14 thin omitted)

### Community 0 - "Graphify Knowledge Graph (graphify-out)"
Cohesion: 0.33
Nodes (7): graphify-out/graph.json, graphify-out/GRAPH_REPORT.md, /graphify User Command, Graphify Knowledge Graph (graphify-out), graphify query / path / explain Commands, graphify update Command, graphify-out/wiki/index.md

### Community 1 - "prismaNamespace.ts"
Cohesion: 0.02
Nodes (120): AnyNull, Args, At, AtLeast, AtLoose, AtStrict, BatchPayload, Boolean (+112 more)

### Community 2 - "prisma.ts"
Cohesion: 0.16
Nodes (11): Task 4: Prisma adapter, checkDatabase(), createPrismaClient(), DatabaseClient, disconnectDatabase(), disconnectedClients, PrismaClient, assertDisposableDatabaseEnvironment() (+3 more)

### Community 3 - "prismaNamespaceBrowser.ts"
Cohesion: 0.12
Nodes (15): AnyNull, DbNull, Decimal, JsonNull, ModelName, NullsOrder, NullTypes, PendingOwnershipTransferScalarFieldEnum (+7 more)

### Community 4 - "package.json"
Cohesion: 0.13
Nodes (18): devDependencies, prisma@7.10.1, tsx@4.23.15, @types/node@26.6.6, @types/pg@8.23.1, typescript@7.0.2, vitest@5.1.0, engines (+10 more)

### Community 5 - "vitest"
Cohesion: 0.22
Nodes (14): vitest, CallInteraction, CallInteractions, fixture(), fixture(), runtimeFixture(), roomSettingsFixture(), human() (+6 more)

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
Cohesion: 0.12
Nodes (18): pino, RoomPresence, Dependencies, Departure, OwnershipAttempt, Overwrite, Dependencies, RoomPanelService (+10 more)

### Community 14 - "File Structure"
Cohesion: 0.18
Nodes (11): Calls module, Composition, registration, and documentation, File Structure, Persistence and shared utilities, Setup module, Task 3: Build the Private Setup Dashboard, Task 8: Verify the Release and Update Documentation, buildSetupDashboard() (+3 more)

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

### Community 20 - "commonInputTypes.ts"
Cohesion: 0.05
Nodes (39): BoolFilter, BoolWithAggregatesFilter, DateTimeFilter, DateTimeNullableFilter, DateTimeNullableWithAggregatesFilter, DateTimeWithAggregatesFilter, EnumRoomVisibilityFilter, EnumRoomVisibilityWithAggregatesFilter (+31 more)

### Community 21 - "Charon v0.2.0 — Setup e Join-to-Create"
Cohesion: 0.08
Nodes (24): 1. Painel administrativo persistente no canal, 2. Painel administrativo privado temporário — escolhida, 3. Assistente linear passo a passo, Abordagens consideradas, Antiobjetivos, Arquitetura, Charon v0.2.0 — Setup e Join-to-Create, Compensação de falhas (+16 more)

### Community 22 - "createLogger"
Cohesion: 0.18
Nodes (13): createLogger(), LoggerOptions, redactedPaths, sanitizeLogValue(), sensitiveKeys, createSilentLogger(), captureLogger(), lifecycleFixture() (+5 more)

### Community 25 - "room-state.repository.ts"
Cohesion: 0.05
Nodes (19): $Enums, RoomAllowedMember, CreateTemporaryRoomInput, invalidateControls, TemporaryRoomRecord, trackedStatuses, activeWhere(), available() (+11 more)

### Community 26 - "Review Focus"
Cohesion: 0.25
Nodes (7): Charon Stage 1 Infrastructure Implementation Plan, Global Constraints, Review Focus, Task 1: Project foundation, Task 3: Structured logger, Task 6: Application lifecycle and status command, Task 7: CI, documentation, and release readiness

### Community 27 - "DiscordSetupGateway"
Cohesion: 0.29
Nodes (4): discordErrorCode(), DiscordSetupGateway, allPermissions, fixture()

### Community 28 - "Supabase RLS Implementation Plan"
Cohesion: 0.25
Nodes (7): Approved scope and approaches, Global Constraints, Progress, Re-run the read-only security test, Review Focus, Supabase RLS Implementation Plan, Task 1: Enable and verify RLS

### Community 31 - "RoomAllowedMember.ts"
Cohesion: 0.03
Nodes (74): AggregateRoomAllowedMember, GetRoomAllowedMemberAggregateType, GetRoomAllowedMemberGroupByPayload, RoomAllowedMemberAggregateArgs, RoomAllowedMemberCountAggregateInputType, RoomAllowedMemberCountAggregateOutputType, RoomAllowedMemberCountArgs, RoomAllowedMemberCountOrderByAggregateInput (+66 more)

### Community 32 - "@prisma/client"
Cohesion: 0.15
Nodes (12): dependencies, discord.js@14.28.1, dotenv@18.0.9, pg@8.23.1, pino@10.4.0, @prisma/adapter-pg@7.10.1, @prisma/client@7.10.1, zod@4.6.7 (+4 more)

### Community 33 - "RoomPresence.ts"
Cohesion: 0.03
Nodes (74): AggregateRoomPresence, GetRoomPresenceAggregateType, GetRoomPresenceGroupByPayload, RoomPresenceAggregateArgs, RoomPresenceCountAggregateInputType, RoomPresenceCountAggregateOutputType, RoomPresenceCountArgs, RoomPresenceCountOrderByAggregateInput (+66 more)

### Community 34 - "RoomActionError"
Cohesion: 0.26
Nodes (4): PendingOwnershipTransfer, RoomActor, safe(), TransferService

### Community 35 - "PendingOwnershipTransfer.ts"
Cohesion: 0.03
Nodes (73): AggregatePendingOwnershipTransfer, GetPendingOwnershipTransferAggregateType, GetPendingOwnershipTransferGroupByPayload, PendingOwnershipTransferAggregateArgs, PendingOwnershipTransferAvgAggregateInputType, PendingOwnershipTransferAvgAggregateOutputType, PendingOwnershipTransferAvgOrderByAggregateInput, PendingOwnershipTransferCountAggregateInputType (+65 more)

### Community 36 - "enums.ts"
Cohesion: 0.20
Nodes (9): Task 1: Persist Voice Creator and Temporary Room State, $Enums, PendingOwnershipTransfer, RoomAllowedMember, RoomPresence, TemporaryRoom, VoiceCreator, RoomVisibility (+1 more)

### Community 37 - "Charon v0.3.0 — posse e controles"
Cohesion: 0.08
Nodes (24): 10. Ciclo de vida e falhas — propostas técnicas, 11. Verificação e limites operacionais, 12. Fora do escopo e liberdade de implementação, 1. Objetivo e contexto, 2. Origem das decisões, 3. Abordagens de interação, 4. Painel e controles, 5. Posse e elegibilidade (+16 more)

### Community 38 - ".handleVoiceTransition"
Cohesion: 0.06
Nodes (30): Calls: fluxo de eventos, Interações, Painel B, posse e acesso, Setup, Task 6: Implement Temporary Room Lifecycle and Compensation, Baseline, isolation and test environment, Charon v0.3.0 Ownership and Room Controls Implementation Plan, File Structure (+22 more)

### Community 39 - "call-panel.view.ts"
Cohesion: 0.27
Nodes (8): Task 5: Build the Disabled Minimalist Call Panel, TemporaryRoom, buildCallPanel(), CallPanelInput, CallPanelPayload, CallPanelRow, json(), room

### Community 40 - "application.test.ts"
Cohesion: 0.15
Nodes (12): Task 7: Wire Setup and Voice Events into the Application, ApplicationOverrides, createApplication(), createDefaultVoiceDispatcher(), hasRuntimeRepositories(), InteractionDispatcher, createDiscordClient(), VoiceStateDispatcher (+4 more)

### Community 44 - "setup.interactions.ts"
Cohesion: 0.20
Nodes (17): SetupCategory, SetupVoiceChannel, voicePermissions, GuildBasedInteraction, isGuildBased(), VoiceCreatorConfiguration, decodeSetupCustomId(), discordIdSchema (+9 more)

### Community 45 - ".execute"
Cohesion: 0.28
Nodes (4): Task 4: Handle Setup Buttons, Selects, and Modals, SetupDiscordError, SetupDiscordGateway, SetupInteractions

### Community 46 - "createDefaultDispatcher"
Cohesion: 0.24
Nodes (6): Task 5: Discord client and interaction registry, Charon v0.2.0 Setup and Join-to-Create Implementation Plan, Global Constraints, Review Focus, createDefaultDispatcher(), InteractionRegistry

### Community 47 - "DiscordCallGateway"
Cohesion: 0.14
Nodes (3): CallDiscordError, DiscordCallGateway, isUnknownChannel()

### Community 48 - "Retomar o Charon após formatar o computador"
Cohesion: 0.33
Nodes (6): Antes de formatar: salvar fora do Git, De onde continuar, O que está salvo no GitHub, Recuperar o projeto, Retomar a validação da v0.3.0, Retomar o Charon após formatar o computador

### Community 49 - "discord.js"
Cohesion: 0.24
Nodes (4): discord.js, InteractionHandler, safeFailureResponse, StatusCommand

### Community 50 - "setup.repository.ts"
Cohesion: 0.10
Nodes (13): Task 2: Add Voice Creator Repository and Setup Service, VoiceCreator, SetupDiscordGatewayFactory, SetupInteraction, isPrismaErrorWithCode(), PrismaVoiceCreatorRepository, VoiceCreatorAlreadyConfiguredError, VoiceCreatorNotFoundError (+5 more)

### Community 51 - "@prisma/client"
Cohesion: 0.22
Nodes (4): config, decodeBase64AsWasm(), LogOptions, PrismaClientConstructor

### Community 52 - "setup.repository.ts"
Cohesion: 0.12
Nodes (6): CreateVoiceCreatorInput, VoiceCreatorRepository, SetupChannelGateway, SetupService, fixture(), configuration

### Community 53 - "createRoomRuntime"
Cohesion: 0.17
Nodes (3): Lock and permission contracts, RoomCoordinator, createRoomRuntime()

### Community 54 - "call.interactions.ts"
Cohesion: 0.10
Nodes (31): Validação, segurança e observabilidade, buildAccessPrompt(), buildLimitModal(), buildOwnerMenu(), buildRenameModal(), buildTransferPrompt(), buildTransferTargetPrompt(), customId() (+23 more)

### Community 58 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, commands:register, dev, prisma:generate, start, test, test:run (+1 more)

### Community 59 - "call.fixtures.ts"
Cohesion: 0.13
Nodes (19): fetch(), botRoomPermissions, CallMoveUnconfirmedError, CreatedDiscordRoom, CreateDiscordRoomInput, config, fixture(), sqlSpy() (+11 more)

### Community 60 - "setup.command.ts"
Cohesion: 0.17
Nodes (10): Task 2: Validated configuration, commandDefinitions, CommandRegistrar, registerCommands(), AppConfig, environmentSchema, loadConfig(), postgresUrl (+2 more)

### Community 61 - "setup.command.ts"
Cohesion: 0.36
Nodes (5): SetupCommand, setupCommandData, botPermissions, configuration, fixture()

### Community 62 - "Changelog"
Cohesion: 0.25
Nodes (8): [0.1.0] - 2026-11-05, [0.2.0] - 2026-11-06, 0.3.0 — preparação local em 2026-11-09 (não publicada), Added, Added, Changelog, Known limitations, [Unreleased]

### Community 63 - "Charon v0.2.0 — Setup e join-to-create"
Cohesion: 0.40
Nodes (5): Banco e verificação local, Charon v0.2.0 — Setup e join-to-create, Entregas, Estado desta preparação, Limitações operacionais

### Community 65 - "Arquitetura do Charon"
Cohesion: 0.33
Nodes (6): Arquitetura do Charon, Banco de dados, Estilo, Estrutura na v0.3.0 (preparação local), Fluxo de inicialização, Verificação

### Community 66 - "Charon v0.3.0 — posse e controles"
Cohesion: 0.40
Nodes (5): Banco local e CI (sem credenciais remotas), Charon v0.3.0 — posse e controles, Entrega implementada, Permissões e limites operacionais, Validação e checklist humano

### Community 67 - "Charon v0.2.0 — registro de validação"
Cohesion: 0.40
Nodes (5): Charon v0.2.0 — registro de validação, Discord real: verificações observadas, Limpeza e limites, PostgreSQL real: aprovado, Versão verificada

### Community 68 - "Validação local v0.3.0"
Cohesion: 0.25
Nodes (8): CI, segurança dos artefatos e limites, Fix round 1 — 2026-11-09, validação focada, Onda final combinada — 2026-11-09, RED → GREEN e caracterizações, Resultados observados, Revalidação pelo controlador — 2026-11-09, Rodada residual autorizada — 2026-11-09, Validação local v0.3.0

### Community 69 - "room-context.ts"
Cohesion: 0.26
Nodes (6): requireActiveRoom(), requireOwnedRoom(), RoomSnapshot, matchesGeneration(), matchesSnapshot(), OwnershipService

### Community 73 - "index.ts"
Cohesion: 0.22
Nodes (5): dotenv, Application, registerShutdownSignals(), SignalSource, start()

### Community 75 - "RoomActionError"
Cohesion: 0.14
Nodes (12): allowedUnion(), assertSnapshot(), RoomAccessService, Dependencies, RoomControlsService, commitRoomMutation(), currentOwnedRoom(), safeRoomAction() (+4 more)

## Knowledge Gaps
- **3 isolated node(s):** `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1035 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `@prisma/client` to `prismaNamespace.ts`, `RoomPresence.ts`, `prismaNamespaceBrowser.ts`, `package.json`, `PendingOwnershipTransfer.ts`, `TemporaryRoom.ts`, `VoiceCreator.ts`, `@prisma/client`, `commonInputTypes.ts`, `room-state.repository.ts`, `RoomAllowedMember.ts`?**
  _High betweenness centrality (0.167) - this node is a cross-community bridge._
- **What connects `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `prismaNamespace.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.01652892561983471 - nodes in this community are weakly interconnected._
- **Why does `InteractionRegistry` connect `createDefaultDispatcher` to `application.test.ts`, `discord.js`, `Charon v0.2.0 — Setup e Join-to-Create`, `.handleVoiceTransition`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Should `prismaNamespaceBrowser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Why does `Charon v0.2.0 — Setup e Join-to-Create` connect `Charon v0.2.0 — Setup e Join-to-Create` to `call.interactions.ts`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.12631578947368421 - nodes in this community are weakly interconnected._