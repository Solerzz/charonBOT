# Graph Report - feature-v0.3.0-posse-controles  (2026-11-09)

## Corpus Check
- 109 files · ~91,179 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .prisma 1)

## Summary
- 1535 nodes · 2621 edges · 61 communities (50 shown, 11 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 129 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fb19a7c0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Graphify Knowledge Graph (graphify-out)
- prismaNamespace.ts
- prisma.ts
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
- InteractionRegistry
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
- RoomStateRepository
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
- index.ts
- PrismaRoomStateRepository
- PendingOwnershipTransferDelegate
- RoomAllowedMemberDelegate
- RoomPresenceDelegate
- setup.interactions.ts
- .execute
- Charon v0.3.0 Ownership and Room Controls Implementation Plan
- room-state.repository.ts
- Retomar o Charon após formatar o computador
- DiscordCallGateway
- prisma/client.ts
- Task 2: Add Voice Creator Repository and Setup Service
- VoiceCreatorConfiguration
- createLogger
- ownership.fixtures.ts
- Prisma__PendingOwnershipTransferClient
- Prisma__RoomAllowedMemberClient
- Prisma__RoomPresenceClient
- setup.interactions.test.ts
- DiscordClientPort
- enums.ts

## God Nodes (most connected - your core abstractions)
1. `vitest` - 40 edges
2. `RoomDiscordGateway` - 39 edges
3. `RoomActionError` - 35 edges
4. `DiscordCallGateway` - 31 edges
5. `discord.js` - 31 edges
6. `PrismaRoomStateRepository` - 29 edges
7. `DiscordRoomGateway` - 28 edges
8. `RoomStateRepository` - 27 edges
9. `SetupService` - 23 edges
10. `KeyedMutex` - 21 edges

## Surprising Connections (you probably didn't know these)
- `Task 7: Idempotent panel synchronization and setup toggle propagation` --references--> `SetupService`  [INFERRED]
  docs/superpowers/plans/2026-11-08-charon-v0.3.0-posse-controles.md → src/modules/setup/setup.service.ts
- `Task 3: Structured logger` --references--> `createLogger()`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-stage-1-infrastructure.md → src/core/logger/logger.ts
- `Shared contracts — define once, reuse in later tasks` --references--> `RoomActionError`  [INFERRED]
  docs/superpowers/plans/2026-11-08-charon-v0.3.0-posse-controles.md → src/modules/calls/room.types.ts
- `Calls: fluxo de eventos` --references--> `CallService`  [INFERRED]
  docs/architecture.md → src/modules/calls/call.service.ts
- `Task 2: Discord room adapter, shared guards and timer lifecycle` --references--> `DiscordCallGateway`  [INFERRED]
  docs/superpowers/plans/2026-11-08-charon-v0.3.0-posse-controles.md → src/modules/calls/call.discord.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify Maintenance and Usage Workflow** — agents_graphify_command, agents_graphify_query, agents_graphify_update, agents_graph_json, agents_graph_report, agents_wiki_index [INFERRED 0.75]

## Communities (61 total, 11 thin omitted)

### Community 0 - "Graphify Knowledge Graph (graphify-out)"
Cohesion: 0.33
Nodes (7): graphify-out/graph.json, graphify-out/GRAPH_REPORT.md, /graphify User Command, Graphify Knowledge Graph (graphify-out), graphify query / path / explain Commands, graphify update Command, graphify-out/wiki/index.md

### Community 1 - "prismaNamespace.ts"
Cohesion: 0.02
Nodes (120): AnyNull, Args, At, AtLeast, AtLoose, AtStrict, BatchPayload, Boolean (+112 more)

### Community 2 - "prisma.ts"
Cohesion: 0.31
Nodes (6): Task 4: Prisma adapter, checkDatabase(), createPrismaClient(), DatabaseClient, disconnectDatabase(), disconnectedClients

### Community 3 - "prismaNamespaceBrowser.ts"
Cohesion: 0.12
Nodes (15): AnyNull, DbNull, Decimal, JsonNull, ModelName, NullsOrder, NullTypes, PendingOwnershipTransferScalarFieldEnum (+7 more)

### Community 4 - "package.json"
Cohesion: 0.06
Nodes (40): dependencies, discord.js@14.28.1, dotenv@18.0.9, pg@8.23.1, pino@10.4.0, @prisma/adapter-pg@7.10.1, @prisma/client@7.10.1, zod@4.6.7 (+32 more)

### Community 5 - "application.ts"
Cohesion: 0.15
Nodes (15): pino, ApplicationOverrides, createApplication(), createDefaultDispatcher(), createDefaultVoiceDispatcher(), hasRuntimeRepositories(), InteractionDispatcher, createDiscordClient() (+7 more)

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

### Community 13 - "InteractionRegistry"
Cohesion: 0.22
Nodes (6): Task 5: Discord client and interaction registry, Charon v0.2.0 Setup and Join-to-Create Implementation Plan, Global Constraints, Review Focus, Arquitetura, InteractionRegistry

### Community 14 - "SetupService"
Cohesion: 0.11
Nodes (16): Calls module, Composition, registration, and documentation, File Structure, Persistence and shared utilities, Setup module, Task 3: Build the Private Setup Dashboard, Task 4: Handle Setup Buttons, Selects, and Modals, Task 5: Build the Disabled Minimalist Call Panel (+8 more)

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
Cohesion: 0.13
Nodes (14): Task 2: Validated configuration, commandDefinitions, CommandRegistrar, registerCommands(), AppConfig, environmentSchema, loadConfig(), postgresUrl (+6 more)

### Community 20 - "commonInputTypes.ts"
Cohesion: 0.05
Nodes (39): BoolFilter, BoolWithAggregatesFilter, DateTimeFilter, DateTimeNullableFilter, DateTimeNullableWithAggregatesFilter, DateTimeWithAggregatesFilter, EnumRoomVisibilityFilter, EnumRoomVisibilityWithAggregatesFilter (+31 more)

### Community 21 - "Charon v0.2.0 — Setup e Join-to-Create"
Cohesion: 0.08
Nodes (24): 1. Painel administrativo persistente no canal, 2. Painel administrativo privado temporário — escolhida, 3. Assistente linear passo a passo, Abordagens consideradas, Antiobjetivos, Charon v0.2.0 — Setup e Join-to-Create, Compensação de falhas, Criação e ciclo de vida da sala (+16 more)

### Community 22 - ".handleVoiceTransition"
Cohesion: 0.15
Nodes (12): CallDiscordGateway, buildCallPanel(), TemporaryRoomRepository, buildInitialRoomName(), graphemes(), segmenter, temporaryRoomNameSchema, VoiceTransition (+4 more)

### Community 25 - "RoomStateRepository"
Cohesion: 0.10
Nodes (4): Lock and permission contracts, Shared contracts — define once, reuse in later tasks, TemporaryRoomRecord, RoomStateRepository

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

### Community 32 - "discord.js"
Cohesion: 0.24
Nodes (4): discord.js, InteractionHandler, safeFailureResponse, StatusCommand

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
Cohesion: 0.23
Nodes (3): isPrismaErrorWithCode(), PrismaVoiceCreatorRepository, VoiceCreatorAlreadyConfiguredError

### Community 39 - "index.ts"
Cohesion: 0.24
Nodes (4): Application, registerShutdownSignals(), SignalSource, start()

### Community 40 - "PrismaRoomStateRepository"
Cohesion: 0.16
Nodes (5): PendingOwnershipTransfer, available(), PrismaRoomStateRepository, uniqueError(), fixture()

### Community 44 - "setup.interactions.ts"
Cohesion: 0.26
Nodes (12): SetupCategory, voicePermissions, GuildBasedInteraction, decodeSetupCustomId(), discordIdSchema, encodeSetupCustomId(), setupChannelNameSchema, SetupCustomId (+4 more)

### Community 45 - ".execute"
Cohesion: 0.24
Nodes (5): SetupDiscordError, SetupDiscordGateway, isGuildBased(), SetupInteractions, fixture()

### Community 46 - "Charon v0.3.0 Ownership and Room Controls Implementation Plan"
Cohesion: 0.12
Nodes (15): Baseline, isolation and test environment, Charon v0.3.0 Ownership and Room Controls Implementation Plan, File Structure, Global Constraints, Review Focus, Self-review and handoff, Task 1: Persist room-control state and prove database invariants, Task 2: Discord room adapter, shared guards and timer lifecycle (+7 more)

### Community 47 - "room-state.repository.ts"
Cohesion: 0.18
Nodes (8): activeWhere(), ConfiguredRoom, ownerChange(), trackedStatuses, TransferInput, RoomSettingsPatch, fixture(), cleanup()

### Community 48 - "Retomar o Charon após formatar o computador"
Cohesion: 0.17
Nodes (10): Antes de formatar: salvar fora do Git, De onde continuar, O que está salvo no GitHub, Recuperar o projeto, Retomar o Charon após formatar o computador, Charon v0.2.0 — registro de validação, Discord real: verificações observadas, Limpeza e limites (+2 more)

### Community 49 - "DiscordCallGateway"
Cohesion: 0.05
Nodes (33): vitest, TemporaryRoom, botRoomPermissions, CallDiscordError, CallMoveUnconfirmedError, CreatedDiscordRoom, CreateDiscordRoomInput, DiscordCallGateway (+25 more)

### Community 50 - "prisma/client.ts"
Cohesion: 0.17
Nodes (6): $Enums, RoomAllowedMember, RoomPresence, VoiceCreator, firstCreator, secondCreator

### Community 51 - "Task 2: Add Voice Creator Repository and Setup Service"
Cohesion: 0.17
Nodes (5): Task 2: Add Voice Creator Repository and Setup Service, CreateVoiceCreatorInput, VoiceCreatorNotFoundError, SetupChannelGateway, configuration

### Community 52 - "VoiceCreatorConfiguration"
Cohesion: 0.31
Nodes (8): SetupVoiceChannel, VoiceCreatorConfiguration, buildSetupDashboard(), SetupDashboardInput, SetupDashboardPayload, first, json(), second

### Community 53 - "createLogger"
Cohesion: 0.36
Nodes (3): createLogger(), createSilentLogger(), captureLogger()

### Community 54 - "ownership.fixtures.ts"
Cohesion: 0.06
Nodes (28): requireActiveRoom(), requireOwnedRoom(), RoomCoordinator, RoomActionError, RoomActor, RoomChanged, RoomDiscordGateway, RoomState (+20 more)

### Community 58 - "setup.interactions.test.ts"
Cohesion: 0.25
Nodes (5): SetupDiscordGatewayFactory, SetupInteraction, first, Kind, second

### Community 60 - "enums.ts"
Cohesion: 0.67
Nodes (3): Task 1: Persist Voice Creator and Temporary Room State, RoomVisibility, TemporaryRoomStatus

## Knowledge Gaps
- **3 isolated node(s):** `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1008 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `package.json` to `prismaNamespace.ts`, `RoomPresence.ts`, `prismaNamespaceBrowser.ts`, `PendingOwnershipTransfer.ts`, `class.ts`, `TemporaryRoom.ts`, `prisma/client.ts`, `VoiceCreator.ts`, `commonInputTypes.ts`, `RoomAllowedMember.ts`?**
  _High betweenness centrality (0.192) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `DiscordCallGateway` (e.g. with `Task 2: Discord room adapter, shared guards and timer lifecycle` and `Discord real: verificações observadas`) actually correct?**
  _`DiscordCallGateway` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `prismaNamespace.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.01652892561983471 - nodes in this community are weakly interconnected._
- **Why does `InteractionRegistry` connect `InteractionRegistry` to `discord.js`, `createLogger`, `application.ts`, `Arquitetura do Charon`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Should `prismaNamespaceBrowser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `DiscordCallGateway` to `discord.js`, `prisma.ts`, `call.repository.ts`, `package.json`, `application.ts`, `index.ts`, `setup.interactions.ts`, `SetupService`, `prisma/client.ts`, `register-commands.ts`, `Task 2: Add Voice Creator Repository and Setup Service`, `createLogger`, `ownership.fixtures.ts`, `.handleVoiceTransition`, `VoiceCreatorConfiguration`, `setup.interactions.test.ts`, `DiscordSetupGateway`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._