# Graph Report - feature-v0.3.0-posse-controles  (2026-11-09)

## Corpus Check
- 104 files · ~84,747 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .prisma 1)

## Summary
- 1491 nodes · 2396 edges · 63 communities (50 shown, 13 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 124 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c228d340`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Graphify Knowledge Graph (graphify-out)
- prismaNamespace.ts
- vitest
- prismaNamespaceBrowser.ts
- package.json
- application.ts
- steps
- Arquitetura do Charon
- class.ts
- Charon v1 — Design
- compilerOptions
- compilerOptions
- TemporaryRoom.ts
- File Structure
- SetupService
- Charon v0.1.0 — Infraestrutura
- pull_request_template.md
- PrismaClientBaseOptions
- VoiceCreator.ts
- register-commands.ts
- commonInputTypes.ts
- Charon v0.2.0 — Setup e Join-to-Create
- .handleVoiceTransition
- TemporaryRoomDelegate
- VoiceCreatorDelegate
- index.ts
- Review Focus
- DiscordSetupGateway
- Supabase RLS Implementation Plan
- Prisma__TemporaryRoomClient
- Prisma__VoiceCreatorClient
- RoomAllowedMember.ts
- discord.js
- RoomPresence.ts
- call.repository.ts
- PendingOwnershipTransfer.ts
- enums.ts
- Charon v0.3.0 — posse e controles
- setup.repository.ts
- PrismaRoomStateRepository
- RoomStateRepository
- PendingOwnershipTransferDelegate
- RoomAllowedMemberDelegate
- RoomPresenceDelegate
- setup.interactions.ts
- .execute
- Charon v0.3.0 Ownership and Room Controls Implementation Plan
- room.types.ts
- Retomar o Charon após formatar o computador
- DiscordCallGateway
- prisma/client.ts
- room-state.repository.ts
- VoiceCreatorConfiguration
- vitest
- KeyedMutex
- Prisma__PendingOwnershipTransferClient
- Prisma__RoomAllowedMemberClient
- Prisma__RoomPresenceClient
- call.discord.ts
- call.service.test.ts
- SetupInteractions
- enums.ts
- RoomMember

## God Nodes (most connected - your core abstractions)
1. `vitest` - 37 edges
2. `DiscordCallGateway` - 31 edges
3. `discord.js` - 31 edges
4. `DiscordRoomGateway` - 28 edges
5. `PrismaRoomStateRepository` - 28 edges
6. `SetupService` - 23 edges
7. `RoomStateRepository` - 23 edges
8. `RoomActionError` - 21 edges
9. `VoiceCreatorRepository` - 19 edges
10. `CallService` - 18 edges

## Surprising Connections (you probably didn't know these)
- `Global Constraints` --references--> `InteractionRegistry`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-v0.2.0-setup-join-to-create.md → src/core/discord/interactions/interaction-registry.ts
- `Arquitetura` --references--> `InteractionRegistry`  [INFERRED]
  docs/superpowers/specs/2026-11-05-charon-v0.2.0-setup-join-to-create-design.md → src/core/discord/interactions/interaction-registry.ts
- `Task 4: Handle Setup Buttons, Selects, and Modals` --references--> `SetupService`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-v0.2.0-setup-join-to-create.md → src/modules/setup/setup.service.ts
- `Task 3: Structured logger` --references--> `createLogger()`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-stage-1-infrastructure.md → src/core/logger/logger.ts
- `Task 2: Discord room adapter, shared guards and timer lifecycle` --references--> `CallDiscordGateway`  [INFERRED]
  docs/superpowers/plans/2026-11-08-charon-v0.3.0-posse-controles.md → src/modules/calls/call.discord.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify Maintenance and Usage Workflow** — agents_graphify_command, agents_graphify_query, agents_graphify_update, agents_graph_json, agents_graph_report, agents_wiki_index [INFERRED 0.75]

## Communities (63 total, 13 thin omitted)

### Community 0 - "Graphify Knowledge Graph (graphify-out)"
Cohesion: 0.33
Nodes (7): graphify-out/graph.json, graphify-out/GRAPH_REPORT.md, /graphify User Command, Graphify Knowledge Graph (graphify-out), graphify query / path / explain Commands, graphify update Command, graphify-out/wiki/index.md

### Community 1 - "prismaNamespace.ts"
Cohesion: 0.02
Nodes (120): AnyNull, Args, At, AtLeast, AtLoose, AtStrict, BatchPayload, Boolean (+112 more)

### Community 2 - "vitest"
Cohesion: 0.19
Nodes (9): checkDatabase(), createPrismaClient(), DatabaseClient, disconnectDatabase(), disconnectedClients, assertDisposableDatabaseEnvironment(), fixture(), cleanup() (+1 more)

### Community 3 - "prismaNamespaceBrowser.ts"
Cohesion: 0.12
Nodes (15): AnyNull, DbNull, Decimal, JsonNull, ModelName, NullsOrder, NullTypes, PendingOwnershipTransferScalarFieldEnum (+7 more)

### Community 4 - "package.json"
Cohesion: 0.06
Nodes (40): dependencies, discord.js@14.28.1, dotenv@18.0.9, pg@8.23.1, pino@10.4.0, @prisma/adapter-pg@7.10.1, @prisma/client@7.10.1, zod@4.6.7 (+32 more)

### Community 5 - "application.ts"
Cohesion: 0.14
Nodes (12): Task 7: Wire Setup and Voice Events into the Application, pino, ApplicationOverrides, createDefaultVoiceDispatcher(), DiscordClientPort, InteractionDispatcher, SignalSource, VoiceStateDispatcher (+4 more)

### Community 6 - "steps"
Cohesion: 0.11
Nodes (18): jobs, verify, name, on, pull_request, push, permissions, contents (+10 more)

### Community 7 - "Arquitetura do Charon"
Cohesion: 0.06
Nodes (29): [0.1.0] - 2026-11-05, [0.2.0] - 2026-11-06, Added, Added, Changelog, Known limitations, [Unreleased], Arquitetura do Charon (+21 more)

### Community 8 - "class.ts"
Cohesion: 0.09
Nodes (5): config, decodeBase64AsWasm(), LogOptions, PrismaClient, PrismaClientConstructor

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

### Community 13 - "File Structure"
Cohesion: 0.15
Nodes (12): Calls module, Charon v0.2.0 Setup and Join-to-Create Implementation Plan, Composition, registration, and documentation, File Structure, Global Constraints, Persistence and shared utilities, Review Focus, Setup module (+4 more)

### Community 14 - "SetupService"
Cohesion: 0.10
Nodes (12): Task 2: Add Voice Creator Repository and Setup Service, Task 6: Implement Temporary Room Lifecycle and Compensation, Task 7: Idempotent panel synchronization and setup toggle propagation, CreateVoiceCreatorInput, VoiceCreatorRepository, SetupChannelGateway, SetupService, botPermissions (+4 more)

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

### Community 19 - "register-commands.ts"
Cohesion: 0.14
Nodes (13): Task 2: Validated configuration, commandDefinitions, CommandRegistrar, registerCommands(), AppConfig, environmentSchema, postgresUrl, LoggerOptions (+5 more)

### Community 20 - "commonInputTypes.ts"
Cohesion: 0.05
Nodes (39): BoolFilter, BoolWithAggregatesFilter, DateTimeFilter, DateTimeNullableFilter, DateTimeNullableWithAggregatesFilter, DateTimeWithAggregatesFilter, EnumRoomVisibilityFilter, EnumRoomVisibilityWithAggregatesFilter (+31 more)

### Community 21 - "Charon v0.2.0 — Setup e Join-to-Create"
Cohesion: 0.08
Nodes (25): 1. Painel administrativo persistente no canal, 2. Painel administrativo privado temporário — escolhida, 3. Assistente linear passo a passo, Abordagens consideradas, Antiobjetivos, Arquitetura, Charon v0.2.0 — Setup e Join-to-Create, Compensação de falhas (+17 more)

### Community 22 - ".handleVoiceTransition"
Cohesion: 0.24
Nodes (4): CallDiscordGateway, TemporaryRoomRepository, VoiceTransition, CallService

### Community 25 - "index.ts"
Cohesion: 0.23
Nodes (7): Application, createApplication(), hasRuntimeRepositories(), registerShutdownSignals(), loadConfig(), start(), validEnvironment

### Community 26 - "Review Focus"
Cohesion: 0.22
Nodes (8): Charon Stage 1 Infrastructure Implementation Plan, Global Constraints, Review Focus, Task 1: Project foundation, Task 3: Structured logger, Task 4: Prisma adapter, Task 6: Application lifecycle and status command, Task 7: CI, documentation, and release readiness

### Community 27 - "DiscordSetupGateway"
Cohesion: 0.27
Nodes (5): discordErrorCode(), DiscordSetupGateway, SetupDiscordError, allPermissions, fixture()

### Community 28 - "Supabase RLS Implementation Plan"
Cohesion: 0.25
Nodes (7): Approved scope and approaches, Global Constraints, Progress, Re-run the read-only security test, Review Focus, Supabase RLS Implementation Plan, Task 1: Enable and verify RLS

### Community 31 - "RoomAllowedMember.ts"
Cohesion: 0.03
Nodes (74): AggregateRoomAllowedMember, GetRoomAllowedMemberAggregateType, GetRoomAllowedMemberGroupByPayload, RoomAllowedMemberAggregateArgs, RoomAllowedMemberCountAggregateInputType, RoomAllowedMemberCountAggregateOutputType, RoomAllowedMemberCountArgs, RoomAllowedMemberCountOrderByAggregateInput (+66 more)

### Community 32 - "discord.js"
Cohesion: 0.16
Nodes (6): discord.js, createDiscordClient(), InteractionHandler, safeFailureResponse, SetupCommand, StatusCommand

### Community 33 - "RoomPresence.ts"
Cohesion: 0.03
Nodes (74): AggregateRoomPresence, GetRoomPresenceAggregateType, GetRoomPresenceGroupByPayload, RoomPresenceAggregateArgs, RoomPresenceCountAggregateInputType, RoomPresenceCountAggregateOutputType, RoomPresenceCountArgs, RoomPresenceCountOrderByAggregateInput (+66 more)

### Community 34 - "call.repository.ts"
Cohesion: 0.13
Nodes (8): PrismaClient, CreateTemporaryRoomInput, invalidateControls, PrismaTemporaryRoomRepository, TemporaryRoomTransitionError, trackedStatuses, fixture(), invalidate

### Community 35 - "PendingOwnershipTransfer.ts"
Cohesion: 0.03
Nodes (73): AggregatePendingOwnershipTransfer, GetPendingOwnershipTransferAggregateType, GetPendingOwnershipTransferGroupByPayload, PendingOwnershipTransferAggregateArgs, PendingOwnershipTransferAvgAggregateInputType, PendingOwnershipTransferAvgAggregateOutputType, PendingOwnershipTransferAvgOrderByAggregateInput, PendingOwnershipTransferCountAggregateInputType (+65 more)

### Community 36 - "enums.ts"
Cohesion: 0.29
Nodes (6): $Enums, PendingOwnershipTransfer, RoomAllowedMember, RoomPresence, TemporaryRoom, VoiceCreator

### Community 37 - "Charon v0.3.0 — posse e controles"
Cohesion: 0.08
Nodes (24): 10. Ciclo de vida e falhas — propostas técnicas, 11. Verificação e limites operacionais, 12. Fora do escopo e liberdade de implementação, 1. Objetivo e contexto, 2. Origem das decisões, 3. Abordagens de interação, 4. Painel e controles, 5. Posse e elegibilidade (+16 more)

### Community 38 - "setup.repository.ts"
Cohesion: 0.15
Nodes (7): VoiceCreator, isPrismaErrorWithCode(), PrismaVoiceCreatorRepository, VoiceCreatorAlreadyConfiguredError, VoiceCreatorNotFoundError, firstCreator, secondCreator

### Community 39 - "PrismaRoomStateRepository"
Cohesion: 0.18
Nodes (4): PendingOwnershipTransfer, available(), PrismaRoomStateRepository, fixture()

### Community 44 - "setup.interactions.ts"
Cohesion: 0.16
Nodes (17): SetupCategory, voicePermissions, GuildBasedInteraction, SetupDiscordGatewayFactory, SetupInteraction, decodeSetupCustomId(), discordIdSchema, encodeSetupCustomId() (+9 more)

### Community 46 - "Charon v0.3.0 Ownership and Room Controls Implementation Plan"
Cohesion: 0.12
Nodes (17): Baseline, isolation and test environment, Charon v0.3.0 Ownership and Room Controls Implementation Plan, File Structure, Global Constraints, Lock and permission contracts, Review Focus, Self-review and handoff, Shared contracts — define once, reuse in later tasks (+9 more)

### Community 47 - "room.types.ts"
Cohesion: 0.30
Nodes (9): RoomPresence, requireActiveRoom(), requireOwnedRoom(), RoomActionErrorCode, RoomActor, RoomGuildResolver, RoomSnapshot, RoomState (+1 more)

### Community 48 - "Retomar o Charon após formatar o computador"
Cohesion: 0.17
Nodes (10): Antes de formatar: salvar fora do Git, De onde continuar, O que está salvo no GitHub, Recuperar o projeto, Retomar o Charon após formatar o computador, Charon v0.2.0 — registro de validação, Discord real: verificações observadas, Limpeza e limites (+2 more)

### Community 49 - "DiscordCallGateway"
Cohesion: 0.07
Nodes (8): CallDiscordError, DiscordCallGateway, isUnknownChannel(), CallPanelPayload, DiscordRoomGateway, hasCode(), RoomActionError, RoomDiscordGateway

### Community 50 - "prisma/client.ts"
Cohesion: 0.22
Nodes (7): $Enums, RoomAllowedMember, TemporaryRoom, buildCallPanel(), CallPanelInput, json(), room

### Community 51 - "room-state.repository.ts"
Cohesion: 0.20
Nodes (7): activeWhere(), ConfiguredRoom, ownerChange(), trackedStatuses, TransferInput, uniqueError(), RoomSettingsPatch

### Community 52 - "VoiceCreatorConfiguration"
Cohesion: 0.31
Nodes (8): SetupVoiceChannel, VoiceCreatorConfiguration, buildSetupDashboard(), SetupDashboardInput, SetupDashboardPayload, first, json(), second

### Community 53 - "vitest"
Cohesion: 0.21
Nodes (12): vitest, discordFixture(), rights, createInput, panel, creator, deferred(), entry (+4 more)

### Community 54 - "KeyedMutex"
Cohesion: 0.21
Nodes (3): OwnershipTimers, RoomCoordinator, KeyedMutex

### Community 58 - "call.discord.ts"
Cohesion: 0.23
Nodes (10): botRoomPermissions, CallMoveUnconfirmedError, CreatedDiscordRoom, CreateDiscordRoomInput, buildInitialRoomName(), graphemes(), segmenter, temporaryRoomNameSchema (+2 more)

### Community 59 - "call.service.test.ts"
Cohesion: 0.29
Nodes (7): createLogger(), createSilentLogger(), captureLogger(), lifecycleFixture(), departure, fixture(), fixture()

### Community 60 - "SetupInteractions"
Cohesion: 0.31
Nodes (4): Task 5: Discord client and interaction registry, createDefaultDispatcher(), InteractionRegistry, SetupInteractions

### Community 61 - "enums.ts"
Cohesion: 0.67
Nodes (3): Task 1: Persist Voice Creator and Temporary Room State, RoomVisibility, TemporaryRoomStatus

## Knowledge Gaps
- **3 isolated node(s):** `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1003 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `package.json` to `prismaNamespace.ts`, `RoomPresence.ts`, `prismaNamespaceBrowser.ts`, `PendingOwnershipTransfer.ts`, `class.ts`, `TemporaryRoom.ts`, `prisma/client.ts`, `VoiceCreator.ts`, `commonInputTypes.ts`, `RoomAllowedMember.ts`?**
  _High betweenness centrality (0.188) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `DiscordCallGateway` (e.g. with `Task 2: Discord room adapter, shared guards and timer lifecycle` and `Discord real: verificações observadas`) actually correct?**
  _`DiscordCallGateway` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `prismaNamespace.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.01652892561983471 - nodes in this community are weakly interconnected._
- **Why does `InteractionRegistry` connect `SetupInteractions` to `discord.js`, `application.ts`, `Arquitetura do Charon`, `File Structure`, `Charon v0.2.0 — Setup e Join-to-Create`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Should `prismaNamespaceBrowser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Why does `discord.js` connect `discord.js` to `package.json`, `application.ts`, `DiscordSetupGateway`, `setup.interactions.ts`, `SetupService`, `room.types.ts`, `prisma/client.ts`, `register-commands.ts`, `VoiceCreatorConfiguration`, `vitest`, `call.discord.ts`, `call.service.test.ts`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._