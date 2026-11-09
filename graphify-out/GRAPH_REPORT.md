# Graph Report - feature-v0.3.0-posse-controles  (2026-11-09)

## Corpus Check
- 115 files · ~95,631 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .prisma 1)

## Summary
- 1567 nodes · 2830 edges · 57 communities (45 shown, 12 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 148 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `111fa468`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Graphify Knowledge Graph (graphify-out)
- prismaNamespace.ts
- prisma.ts
- prismaNamespaceBrowser.ts
- package.json
- application.test.ts
- steps
- Arquitetura do Charon
- class.ts
- Charon v1 — Design
- compilerOptions
- compilerOptions
- TemporaryRoom.ts
- setup.interactions.test.ts
- File Structure
- Charon v0.1.0 — Infraestrutura
- pull_request_template.md
- PrismaClientBaseOptions
- VoiceCreator.ts
- setup.command.ts
- commonInputTypes.ts
- Charon v0.2.0 — Setup e Join-to-Create
- vitest
- TemporaryRoomDelegate
- VoiceCreatorDelegate
- PrismaRoomStateRepository
- Review Focus
- DiscordSetupGateway
- Supabase RLS Implementation Plan
- Prisma__TemporaryRoomClient
- Prisma__VoiceCreatorClient
- RoomAllowedMember.ts
- InteractionHandler
- RoomPresence.ts
- call.repository.ts
- PendingOwnershipTransfer.ts
- enums.ts
- Charon v0.3.0 — posse e controles
- PrismaVoiceCreatorRepository
- setup.command.test.ts
- DiscordClientPort
- PendingOwnershipTransferDelegate
- RoomAllowedMemberDelegate
- RoomPresenceDelegate
- setup.interactions.ts
- .execute
- Charon v0.3.0 Ownership and Room Controls Implementation Plan
- Retomar o Charon após formatar o computador
- DiscordCallGateway
- setup.repository.ts
- logger.ts
- SetupService
- ownership.fixtures.ts
- Prisma__PendingOwnershipTransferClient
- Prisma__RoomAllowedMemberClient
- Prisma__RoomPresenceClient
- enums.ts

## God Nodes (most connected - your core abstractions)
1. `RoomDiscordGateway` - 52 edges
2. `RoomActionError` - 48 edges
3. `vitest` - 43 edges
4. `discord.js` - 33 edges
5. `DiscordCallGateway` - 31 edges
6. `RoomStateRepository` - 31 edges
7. `DiscordRoomGateway` - 30 edges
8. `PrismaRoomStateRepository` - 29 edges
9. `RoomActor` - 29 edges
10. `SetupService` - 23 edges

## Surprising Connections (you probably didn't know these)
- `Global Constraints` --references--> `InteractionRegistry`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-v0.2.0-setup-join-to-create.md → src/core/discord/interactions/interaction-registry.ts
- `Task 4: Handle Setup Buttons, Selects, and Modals` --references--> `SetupService`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-v0.2.0-setup-join-to-create.md → src/modules/setup/setup.service.ts
- `Task 3: Structured logger` --references--> `createLogger()`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-stage-1-infrastructure.md → src/core/logger/logger.ts
- `Shared contracts — define once, reuse in later tasks` --references--> `RoomActionError`  [INFERRED]
  docs/superpowers/plans/2026-11-08-charon-v0.3.0-posse-controles.md → src/modules/calls/room.types.ts
- `Calls: fluxo de eventos` --references--> `CallService`  [INFERRED]
  docs/architecture.md → src/modules/calls/call.service.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify Maintenance and Usage Workflow** — agents_graphify_command, agents_graphify_query, agents_graphify_update, agents_graph_json, agents_graph_report, agents_wiki_index [INFERRED 0.75]

## Communities (57 total, 12 thin omitted)

### Community 0 - "Graphify Knowledge Graph (graphify-out)"
Cohesion: 0.33
Nodes (7): graphify-out/graph.json, graphify-out/GRAPH_REPORT.md, /graphify User Command, Graphify Knowledge Graph (graphify-out), graphify query / path / explain Commands, graphify update Command, graphify-out/wiki/index.md

### Community 1 - "prismaNamespace.ts"
Cohesion: 0.02
Nodes (120): AnyNull, Args, At, AtLeast, AtLoose, AtStrict, BatchPayload, Boolean (+112 more)

### Community 2 - "prisma.ts"
Cohesion: 0.26
Nodes (8): Task 4: Prisma adapter, checkDatabase(), createPrismaClient(), DatabaseClient, disconnectDatabase(), disconnectedClients, fixture(), cleanup()

### Community 3 - "prismaNamespaceBrowser.ts"
Cohesion: 0.12
Nodes (15): AnyNull, DbNull, Decimal, JsonNull, ModelName, NullsOrder, NullTypes, PendingOwnershipTransferScalarFieldEnum (+7 more)

### Community 4 - "package.json"
Cohesion: 0.06
Nodes (40): dependencies, discord.js@14.28.1, dotenv@18.0.9, pg@8.23.1, pino@10.4.0, @prisma/adapter-pg@7.10.1, @prisma/client@7.10.1, zod@4.6.7 (+32 more)

### Community 5 - "application.test.ts"
Cohesion: 0.17
Nodes (13): ApplicationOverrides, createApplication(), createDefaultVoiceDispatcher(), hasRuntimeRepositories(), InteractionDispatcher, SignalSource, createLogger(), VoiceStateDispatcher (+5 more)

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

### Community 13 - "setup.interactions.test.ts"
Cohesion: 0.25
Nodes (5): SetupDiscordGatewayFactory, SetupInteraction, first, Kind, second

### Community 14 - "File Structure"
Cohesion: 0.15
Nodes (12): Calls module, Charon v0.2.0 Setup and Join-to-Create Implementation Plan, Composition, registration, and documentation, File Structure, Global Constraints, Persistence and shared utilities, Review Focus, Setup module (+4 more)

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
Cohesion: 0.17
Nodes (7): discord.js, commandDefinitions, CommandRegistrar, registerCommands(), setupCommandData, StatusCommand, config

### Community 20 - "commonInputTypes.ts"
Cohesion: 0.05
Nodes (39): BoolFilter, BoolWithAggregatesFilter, DateTimeFilter, DateTimeNullableFilter, DateTimeNullableWithAggregatesFilter, DateTimeWithAggregatesFilter, EnumRoomVisibilityFilter, EnumRoomVisibilityWithAggregatesFilter (+31 more)

### Community 21 - "Charon v0.2.0 — Setup e Join-to-Create"
Cohesion: 0.08
Nodes (24): 1. Painel administrativo persistente no canal, 2. Painel administrativo privado temporário — escolhida, 3. Assistente linear passo a passo, Abordagens consideradas, Antiobjetivos, Charon v0.2.0 — Setup e Join-to-Create, Compensação de falhas, Criação e ciclo de vida da sala (+16 more)

### Community 22 - "vitest"
Cohesion: 0.06
Nodes (49): Task 6: Compact panel B, private menu and strict component schemas, pino, vitest, TemporaryRoom, botRoomPermissions, CallDiscordGateway, CallMoveUnconfirmedError, CreatedDiscordRoom (+41 more)

### Community 25 - "PrismaRoomStateRepository"
Cohesion: 0.06
Nodes (12): Lock and permission contracts, Shared contracts — define once, reuse in later tasks, PendingOwnershipTransfer, TemporaryRoomRecord, activeWhere(), available(), ownerChange(), PrismaRoomStateRepository (+4 more)

### Community 26 - "Review Focus"
Cohesion: 0.22
Nodes (8): Charon Stage 1 Infrastructure Implementation Plan, Global Constraints, Review Focus, Task 1: Project foundation, Task 2: Validated configuration, Task 3: Structured logger, Task 6: Application lifecycle and status command, Task 7: CI, documentation, and release readiness

### Community 27 - "DiscordSetupGateway"
Cohesion: 0.29
Nodes (4): discordErrorCode(), DiscordSetupGateway, allPermissions, fixture()

### Community 28 - "Supabase RLS Implementation Plan"
Cohesion: 0.25
Nodes (7): Approved scope and approaches, Global Constraints, Progress, Re-run the read-only security test, Review Focus, Supabase RLS Implementation Plan, Task 1: Enable and verify RLS

### Community 31 - "RoomAllowedMember.ts"
Cohesion: 0.03
Nodes (74): AggregateRoomAllowedMember, GetRoomAllowedMemberAggregateType, GetRoomAllowedMemberGroupByPayload, RoomAllowedMemberAggregateArgs, RoomAllowedMemberCountAggregateInputType, RoomAllowedMemberCountAggregateOutputType, RoomAllowedMemberCountArgs, RoomAllowedMemberCountOrderByAggregateInput (+66 more)

### Community 32 - "InteractionHandler"
Cohesion: 0.15
Nodes (8): Task 5: Discord client and interaction registry, Arquitetura, createDefaultDispatcher(), createDiscordClient(), InteractionHandler, InteractionRegistry, safeFailureResponse, createSilentLogger()

### Community 33 - "RoomPresence.ts"
Cohesion: 0.03
Nodes (74): AggregateRoomPresence, GetRoomPresenceAggregateType, GetRoomPresenceGroupByPayload, RoomPresenceAggregateArgs, RoomPresenceCountAggregateInputType, RoomPresenceCountAggregateOutputType, RoomPresenceCountArgs, RoomPresenceCountOrderByAggregateInput (+66 more)

### Community 34 - "call.repository.ts"
Cohesion: 0.08
Nodes (13): $Enums, PrismaClient, RoomAllowedMember, RoomPresence, CreateTemporaryRoomInput, invalidateControls, PrismaTemporaryRoomRepository, TemporaryRoomTransitionError (+5 more)

### Community 35 - "PendingOwnershipTransfer.ts"
Cohesion: 0.03
Nodes (73): AggregatePendingOwnershipTransfer, GetPendingOwnershipTransferAggregateType, GetPendingOwnershipTransferGroupByPayload, PendingOwnershipTransferAggregateArgs, PendingOwnershipTransferAvgAggregateInputType, PendingOwnershipTransferAvgAggregateOutputType, PendingOwnershipTransferAvgOrderByAggregateInput, PendingOwnershipTransferCountAggregateInputType (+65 more)

### Community 36 - "enums.ts"
Cohesion: 0.29
Nodes (6): $Enums, PendingOwnershipTransfer, RoomAllowedMember, RoomPresence, TemporaryRoom, VoiceCreator

### Community 37 - "Charon v0.3.0 — posse e controles"
Cohesion: 0.08
Nodes (24): 10. Ciclo de vida e falhas — propostas técnicas, 11. Verificação e limites operacionais, 12. Fora do escopo e liberdade de implementação, 1. Objetivo e contexto, 2. Origem das decisões, 3. Abordagens de interação, 4. Painel e controles, 5. Posse e elegibilidade (+16 more)

### Community 39 - "setup.command.test.ts"
Cohesion: 0.33
Nodes (4): SetupCommand, botPermissions, configuration, fixture()

### Community 44 - "setup.interactions.ts"
Cohesion: 0.15
Nodes (20): SetupCategory, SetupVoiceChannel, voicePermissions, GuildBasedInteraction, isGuildBased(), decodeSetupCustomId(), discordIdSchema, encodeSetupCustomId() (+12 more)

### Community 45 - ".execute"
Cohesion: 0.30
Nodes (3): SetupDiscordError, SetupDiscordGateway, SetupInteractions

### Community 46 - "Charon v0.3.0 Ownership and Room Controls Implementation Plan"
Cohesion: 0.14
Nodes (13): Baseline, isolation and test environment, Charon v0.3.0 Ownership and Room Controls Implementation Plan, File Structure, Global Constraints, Review Focus, Self-review and handoff, Task 1: Persist room-control state and prove database invariants, Task 2: Discord room adapter, shared guards and timer lifecycle (+5 more)

### Community 48 - "Retomar o Charon após formatar o computador"
Cohesion: 0.17
Nodes (10): Antes de formatar: salvar fora do Git, De onde continuar, O que está salvo no GitHub, Recuperar o projeto, Retomar o Charon após formatar o computador, Charon v0.2.0 — registro de validação, Discord real: verificações observadas, Limpeza e limites (+2 more)

### Community 49 - "DiscordCallGateway"
Cohesion: 0.10
Nodes (5): CallDiscordError, DiscordCallGateway, isUnknownChannel(), DiscordRoomGateway, hasCode()

### Community 50 - "setup.repository.ts"
Cohesion: 0.17
Nodes (10): Task 2: Add Voice Creator Repository and Setup Service, VoiceCreator, CreateVoiceCreatorInput, VoiceCreatorAlreadyConfiguredError, VoiceCreatorConfiguration, VoiceCreatorNotFoundError, SetupChannelGateway, firstCreator (+2 more)

### Community 51 - "logger.ts"
Cohesion: 0.15
Nodes (12): Application, registerShutdownSignals(), AppConfig, environmentSchema, loadConfig(), postgresUrl, LoggerOptions, redactedPaths (+4 more)

### Community 52 - "SetupService"
Cohesion: 0.15
Nodes (5): Task 6: Implement Temporary Room Lifecycle and Compensation, Task 7: Idempotent panel synchronization and setup toggle propagation, VoiceCreatorRepository, SetupService, fixture()

### Community 54 - "ownership.fixtures.ts"
Cohesion: 0.08
Nodes (33): allowedUnion(), assertSnapshot(), RoomAccessService, requireActiveRoom(), requireOwnedRoom(), Dependencies, RoomControlsService, commitRoomMutation() (+25 more)

### Community 60 - "enums.ts"
Cohesion: 0.67
Nodes (3): Task 1: Persist Voice Creator and Temporary Room State, RoomVisibility, TemporaryRoomStatus

## Knowledge Gaps
- **3 isolated node(s):** `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1004 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `package.json` to `prismaNamespace.ts`, `call.repository.ts`, `prismaNamespaceBrowser.ts`, `PendingOwnershipTransfer.ts`, `RoomPresence.ts`, `class.ts`, `TemporaryRoom.ts`, `VoiceCreator.ts`, `commonInputTypes.ts`, `RoomAllowedMember.ts`?**
  _High betweenness centrality (0.187) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `DiscordCallGateway` (e.g. with `Task 2: Discord room adapter, shared guards and timer lifecycle` and `Discord real: verificações observadas`) actually correct?**
  _`DiscordCallGateway` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `prismaNamespace.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.01652892561983471 - nodes in this community are weakly interconnected._
- **Why does `InteractionRegistry` connect `InteractionHandler` to `application.test.ts`, `File Structure`, `Arquitetura do Charon`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Should `prismaNamespaceBrowser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Why does `Interações` connect `Arquitetura do Charon` to `InteractionHandler`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._