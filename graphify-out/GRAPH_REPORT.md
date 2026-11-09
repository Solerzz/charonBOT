# Graph Report - feature-v0.3.0-posse-controles  (2026-11-09)

## Corpus Check
- 119 files · ~100,781 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .prisma 1)

## Summary
- 1607 nodes · 2987 edges · 65 communities (52 shown, 13 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 157 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `71f708f8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Graphify Knowledge Graph (graphify-out)
- prismaNamespace.ts
- prisma.ts
- prismaNamespaceBrowser.ts
- package.json
- discord.js
- steps
- Arquitetura do Charon
- class.ts
- Charon v1 — Design
- compilerOptions
- compilerOptions
- TemporaryRoom.ts
- setup.interactions.test.ts
- SetupService
- Charon v0.1.0 — Infraestrutura
- pull_request_template.md
- PrismaClientBaseOptions
- VoiceCreator.ts
- setup.command.ts
- commonInputTypes.ts
- Charon v0.2.0 — Setup e Join-to-Create
- ownership-database.test.ts
- TemporaryRoomDelegate
- VoiceCreatorDelegate
- RoomStateRepository
- Review Focus
- DiscordSetupGateway
- Supabase RLS Implementation Plan
- Prisma__TemporaryRoomClient
- Prisma__VoiceCreatorClient
- RoomAllowedMember.ts
- vitest
- RoomPresence.ts
- prisma/client.ts
- PendingOwnershipTransfer.ts
- enums.ts
- Charon v0.3.0 — posse e controles
- call.schemas.ts
- application.ts
- application.test.ts
- PendingOwnershipTransferDelegate
- RoomAllowedMemberDelegate
- RoomPresenceDelegate
- setup.interactions.ts
- .execute
- InteractionRegistry
- DiscordCallGateway
- Retomar o Charon após formatar o computador
- DiscordRoomGateway
- PrismaVoiceCreatorRepository
- @prisma/client
- VoiceCreatorRepository
- room.types.ts
- ownership.fixtures.ts
- Prisma__PendingOwnershipTransferClient
- Prisma__RoomAllowedMemberClient
- Prisma__RoomPresenceClient
- dependencies
- call.fixtures.ts
- enums.ts
- setup.repository.ts
- scripts
- DiscordClientPort
- dotenv

## God Nodes (most connected - your core abstractions)
1. `RoomDiscordGateway` - 56 edges
2. `RoomActionError` - 53 edges
3. `vitest` - 45 edges
4. `discord.js` - 37 edges
5. `DiscordRoomGateway` - 36 edges
6. `DiscordCallGateway` - 32 edges
7. `RoomStateRepository` - 32 edges
8. `RoomActor` - 31 edges
9. `PrismaRoomStateRepository` - 29 edges
10. `SetupService` - 23 edges

## Surprising Connections (you probably didn't know these)
- `Task 7: Idempotent panel synchronization and setup toggle propagation` --references--> `SetupService`  [INFERRED]
  docs/superpowers/plans/2026-11-08-charon-v0.3.0-posse-controles.md → src/modules/setup/setup.service.ts
- `Task 3: Structured logger` --references--> `createLogger()`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-stage-1-infrastructure.md → src/core/logger/logger.ts
- `Lock and permission contracts` --references--> `RoomChanged`  [INFERRED]
  docs/superpowers/plans/2026-11-08-charon-v0.3.0-posse-controles.md → src/modules/calls/room.types.ts
- `Task 8: Wire interactions, voice lifecycle and one shared room runtime` --references--> `RoomChanged`  [INFERRED]
  docs/superpowers/plans/2026-11-08-charon-v0.3.0-posse-controles.md → src/modules/calls/room.types.ts
- `Shared contracts — define once, reuse in later tasks` --references--> `RoomActionError`  [INFERRED]
  docs/superpowers/plans/2026-11-08-charon-v0.3.0-posse-controles.md → src/modules/calls/room.types.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify Maintenance and Usage Workflow** — agents_graphify_command, agents_graphify_query, agents_graphify_update, agents_graph_json, agents_graph_report, agents_wiki_index [INFERRED 0.75]

## Communities (65 total, 13 thin omitted)

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
Cohesion: 0.15
Nodes (16): devDependencies, tsx@4.23.15, @types/node@26.6.6, @types/pg@8.23.1, typescript@7.0.2, vitest@5.1.0, engines, node (+8 more)

### Community 5 - "discord.js"
Cohesion: 0.18
Nodes (6): discord.js, createDiscordClient(), InteractionHandler, safeFailureResponse, StatusCommand, createSilentLogger()

### Community 6 - "steps"
Cohesion: 0.11
Nodes (18): jobs, verify, name, on, pull_request, push, permissions, contents (+10 more)

### Community 7 - "Arquitetura do Charon"
Cohesion: 0.06
Nodes (29): [0.1.0] - 2026-11-05, [0.2.0] - 2026-11-06, Added, Added, Changelog, Known limitations, [Unreleased], Arquitetura do Charon (+21 more)

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

### Community 13 - "setup.interactions.test.ts"
Cohesion: 0.25
Nodes (5): SetupDiscordGatewayFactory, SetupInteraction, first, Kind, second

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

### Community 19 - "setup.command.ts"
Cohesion: 0.14
Nodes (12): Task 2: Validated configuration, commandDefinitions, CommandRegistrar, registerCommands(), AppConfig, environmentSchema, postgresUrl, LoggerOptions (+4 more)

### Community 20 - "commonInputTypes.ts"
Cohesion: 0.05
Nodes (39): BoolFilter, BoolWithAggregatesFilter, DateTimeFilter, DateTimeNullableFilter, DateTimeNullableWithAggregatesFilter, DateTimeWithAggregatesFilter, EnumRoomVisibilityFilter, EnumRoomVisibilityWithAggregatesFilter (+31 more)

### Community 21 - "Charon v0.2.0 — Setup e Join-to-Create"
Cohesion: 0.08
Nodes (24): 1. Painel administrativo persistente no canal, 2. Painel administrativo privado temporário — escolhida, 3. Assistente linear passo a passo, Abordagens consideradas, Antiobjetivos, Charon v0.2.0 — Setup e Join-to-Create, Compensação de falhas, Criação e ciclo de vida da sala (+16 more)

### Community 22 - "ownership-database.test.ts"
Cohesion: 0.20
Nodes (5): RoomCoordinator, OwnershipTimers, KeyedMutex, transferRuntime(), fixture()

### Community 25 - "RoomStateRepository"
Cohesion: 0.06
Nodes (11): Lock and permission contracts, Shared contracts — define once, reuse in later tasks, PendingOwnershipTransfer, TemporaryRoomRecord, activeWhere(), available(), ownerChange(), PrismaRoomStateRepository (+3 more)

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

### Community 32 - "vitest"
Cohesion: 0.31
Nodes (9): vitest, roomSettingsFixture(), human(), OLDEST, OTHER, OWNER, ownershipFixture(), ROOM_ID (+1 more)

### Community 33 - "RoomPresence.ts"
Cohesion: 0.03
Nodes (74): AggregateRoomPresence, GetRoomPresenceAggregateType, GetRoomPresenceGroupByPayload, RoomPresenceAggregateArgs, RoomPresenceCountAggregateInputType, RoomPresenceCountAggregateOutputType, RoomPresenceCountArgs, RoomPresenceCountOrderByAggregateInput (+66 more)

### Community 34 - "prisma/client.ts"
Cohesion: 0.05
Nodes (28): Baseline, isolation and test environment, Charon v0.3.0 Ownership and Room Controls Implementation Plan, File Structure, Global Constraints, Review Focus, Self-review and handoff, Task 1: Persist room-control state and prove database invariants, Task 2: Discord room adapter, shared guards and timer lifecycle (+20 more)

### Community 35 - "PendingOwnershipTransfer.ts"
Cohesion: 0.03
Nodes (73): AggregatePendingOwnershipTransfer, GetPendingOwnershipTransferAggregateType, GetPendingOwnershipTransferGroupByPayload, PendingOwnershipTransferAggregateArgs, PendingOwnershipTransferAvgAggregateInputType, PendingOwnershipTransferAvgAggregateOutputType, PendingOwnershipTransferAvgOrderByAggregateInput, PendingOwnershipTransferCountAggregateInputType (+65 more)

### Community 36 - "enums.ts"
Cohesion: 0.29
Nodes (6): $Enums, PendingOwnershipTransfer, RoomAllowedMember, RoomPresence, TemporaryRoom, VoiceCreator

### Community 37 - "Charon v0.3.0 — posse e controles"
Cohesion: 0.08
Nodes (24): 10. Ciclo de vida e falhas — propostas técnicas, 11. Verificação e limites operacionais, 12. Fora do escopo e liberdade de implementação, 1. Objetivo e contexto, 2. Origem das decisões, 3. Abordagens de interação, 4. Painel e controles, 5. Posse e elegibilidade (+16 more)

### Community 38 - "call.schemas.ts"
Cohesion: 0.08
Nodes (33): buildAccessPrompt(), buildLimitModal(), buildOwnerMenu(), buildRenameModal(), buildTransferPrompt(), buildTransferTargetPrompt(), customId(), memberSelect() (+25 more)

### Community 39 - "application.ts"
Cohesion: 0.21
Nodes (7): Application, createApplication(), hasRuntimeRepositories(), registerShutdownSignals(), loadConfig(), start(), validEnvironment

### Community 40 - "application.test.ts"
Cohesion: 0.21
Nodes (10): pino, ApplicationOverrides, createDefaultVoiceDispatcher(), InteractionDispatcher, SignalSource, VoiceStateDispatcher, VoiceStateHandler, config (+2 more)

### Community 44 - "setup.interactions.ts"
Cohesion: 0.26
Nodes (12): SetupCategory, voicePermissions, GuildBasedInteraction, decodeSetupCustomId(), discordIdSchema, encodeSetupCustomId(), setupChannelNameSchema, SetupCustomId (+4 more)

### Community 45 - ".execute"
Cohesion: 0.24
Nodes (5): SetupDiscordError, SetupDiscordGateway, isGuildBased(), SetupInteractions, fixture()

### Community 46 - "InteractionRegistry"
Cohesion: 0.16
Nodes (8): Task 5: Discord client and interaction registry, Charon v0.2.0 Setup and Join-to-Create Implementation Plan, Global Constraints, Review Focus, Arquitetura, createDefaultDispatcher(), InteractionRegistry, SetupCommand

### Community 47 - "DiscordCallGateway"
Cohesion: 0.14
Nodes (3): CallDiscordError, DiscordCallGateway, isUnknownChannel()

### Community 48 - "Retomar o Charon após formatar o computador"
Cohesion: 0.17
Nodes (10): Antes de formatar: salvar fora do Git, De onde continuar, O que está salvo no GitHub, Recuperar o projeto, Retomar o Charon após formatar o computador, Charon v0.2.0 — registro de validação, Discord real: verificações observadas, Limpeza e limites (+2 more)

### Community 50 - "PrismaVoiceCreatorRepository"
Cohesion: 0.16
Nodes (6): VoiceCreator, isPrismaErrorWithCode(), PrismaVoiceCreatorRepository, VoiceCreatorAlreadyConfiguredError, firstCreator, secondCreator

### Community 51 - "@prisma/client"
Cohesion: 0.18
Nodes (6): @prisma/client@7.10.1, @prisma/client, config, decodeBase64AsWasm(), LogOptions, PrismaClientConstructor

### Community 52 - "VoiceCreatorRepository"
Cohesion: 0.17
Nodes (5): Task 2: Add Voice Creator Repository and Setup Service, CreateVoiceCreatorInput, VoiceCreatorNotFoundError, SetupChannelGateway, configuration

### Community 53 - "room.types.ts"
Cohesion: 0.11
Nodes (18): createLogger(), buildCallPanel(), CallPanelPayload, CallPanelRow, Overwrite, Dependencies, RoomPanelService, ConfiguredRoom (+10 more)

### Community 54 - "ownership.fixtures.ts"
Cohesion: 0.09
Nodes (25): allowedUnion(), assertSnapshot(), RoomAccessService, requireActiveRoom(), requireOwnedRoom(), Dependencies, RoomControlsService, commitRoomMutation() (+17 more)

### Community 58 - "dependencies"
Cohesion: 0.20
Nodes (9): dependencies, discord.js@14.28.1, pg@8.23.1, pino@10.4.0, @prisma/adapter-pg@7.10.1, zod@4.6.7, pg, @prisma/adapter-pg (+1 more)

### Community 59 - "call.fixtures.ts"
Cohesion: 0.14
Nodes (19): botRoomPermissions, CallMoveUnconfirmedError, CreatedDiscordRoom, CreateDiscordRoomInput, discordFixture(), rights, createInput, panel (+11 more)

### Community 60 - "enums.ts"
Cohesion: 0.67
Nodes (3): Task 1: Persist Voice Creator and Temporary Room State, RoomVisibility, TemporaryRoomStatus

### Community 61 - "setup.repository.ts"
Cohesion: 0.31
Nodes (8): SetupVoiceChannel, VoiceCreatorConfiguration, buildSetupDashboard(), SetupDashboardInput, SetupDashboardPayload, first, json(), second

### Community 62 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, commands:register, dev, prisma:generate, start, test, test:run (+1 more)

### Community 64 - "dotenv"
Cohesion: 0.40
Nodes (4): dotenv@18.0.9, prisma@7.10.1, dotenv, prisma

## Knowledge Gaps
- **3 isolated node(s):** `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1011 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `@prisma/client` to `prismaNamespace.ts`, `prisma/client.ts`, `prismaNamespaceBrowser.ts`, `package.json`, `PendingOwnershipTransfer.ts`, `RoomPresence.ts`, `TemporaryRoom.ts`, `VoiceCreator.ts`, `commonInputTypes.ts`, `RoomAllowedMember.ts`?**
  _High betweenness centrality (0.177) - this node is a cross-community bridge._
- **What connects `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `prismaNamespace.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.01652892561983471 - nodes in this community are weakly interconnected._
- **Why does `InteractionRegistry` connect `InteractionRegistry` to `application.test.ts`, `discord.js`, `Arquitetura do Charon`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Should `prismaNamespaceBrowser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Why does `discord.js` connect `discord.js` to `vitest`, `package.json`, `call.schemas.ts`, `application.test.ts`, `DiscordSetupGateway`, `setup.interactions.ts`, `setup.interactions.test.ts`, `SetupService`, `setup.command.ts`, `room.types.ts`, `ownership-database.test.ts`, `dependencies`, `call.fixtures.ts`, `setup.repository.ts`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.14705882352941177 - nodes in this community are weakly interconnected._