# Graph Report - feature-v0.3.0-posse-controles  (2026-11-09)

## Corpus Check
- 125 files · ~106,402 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .prisma 1)

## Summary
- 1637 nodes · 3203 edges · 57 communities (46 shown, 11 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 167 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d5921748`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Graphify Knowledge Graph (graphify-out)
- prismaNamespace.ts
- prisma.ts
- prismaNamespaceBrowser.ts
- package.json
- StatusCommand
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
- TemporaryRoomDelegate
- VoiceCreatorDelegate
- RoomStateRepository
- Review Focus
- DiscordSetupGateway
- Supabase RLS Implementation Plan
- Prisma__TemporaryRoomClient
- Prisma__VoiceCreatorClient
- RoomAllowedMember.ts
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
- PrismaVoiceCreatorRepository
- @prisma/client
- VoiceCreatorRepository
- call-controls.view.test.ts
- ownership.fixtures.ts
- Prisma__PendingOwnershipTransferClient
- Prisma__RoomAllowedMemberClient
- Prisma__RoomPresenceClient
- vitest
- setup.repository.ts

## God Nodes (most connected - your core abstractions)
1. `RoomDiscordGateway` - 58 edges
2. `RoomActionError` - 57 edges
3. `vitest` - 49 edges
4. `discord.js` - 41 edges
5. `DiscordRoomGateway` - 39 edges
6. `RoomStateRepository` - 33 edges
7. `RoomActor` - 33 edges
8. `DiscordCallGateway` - 32 edges
9. `PrismaRoomStateRepository` - 31 edges
10. `TransferService` - 27 edges

## Surprising Connections (you probably didn't know these)
- `Task 7: Idempotent panel synchronization and setup toggle propagation` --references--> `SetupService`  [INFERRED]
  docs/superpowers/plans/2026-11-08-charon-v0.3.0-posse-controles.md → src/modules/setup/setup.service.ts
- `Task 3: Structured logger` --references--> `createLogger()`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-stage-1-infrastructure.md → src/core/logger/logger.ts
- `Calls: fluxo de eventos` --references--> `CallService`  [INFERRED]
  docs/architecture.md → src/modules/calls/call.service.ts
- `Task 2: Discord room adapter, shared guards and timer lifecycle` --references--> `DiscordCallGateway`  [INFERRED]
  docs/superpowers/plans/2026-11-08-charon-v0.3.0-posse-controles.md → src/modules/calls/call.discord.ts
- `Discord real: verificações observadas` --references--> `DiscordCallGateway`  [INFERRED]
  docs/validation/2026-11-07-v0.2.0-validation.md → src/modules/calls/call.discord.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify Maintenance and Usage Workflow** — agents_graphify_command, agents_graphify_query, agents_graphify_update, agents_graph_json, agents_graph_report, agents_wiki_index [INFERRED 0.75]

## Communities (57 total, 11 thin omitted)

### Community 0 - "Graphify Knowledge Graph (graphify-out)"
Cohesion: 0.33
Nodes (7): graphify-out/graph.json, graphify-out/GRAPH_REPORT.md, /graphify User Command, Graphify Knowledge Graph (graphify-out), graphify query / path / explain Commands, graphify update Command, graphify-out/wiki/index.md

### Community 1 - "prismaNamespace.ts"
Cohesion: 0.02
Nodes (120): AnyNull, Args, At, AtLeast, AtLoose, AtStrict, BatchPayload, Boolean (+112 more)

### Community 2 - "prisma.ts"
Cohesion: 0.23
Nodes (8): Task 4: Prisma adapter, checkDatabase(), createPrismaClient(), DatabaseClient, disconnectDatabase(), disconnectedClients, fixture(), cleanup()

### Community 3 - "prismaNamespaceBrowser.ts"
Cohesion: 0.11
Nodes (17): @prisma/client@7.10.1, @prisma/client, AnyNull, DbNull, Decimal, JsonNull, ModelName, NullsOrder (+9 more)

### Community 4 - "package.json"
Cohesion: 0.06
Nodes (40): dependencies, discord.js@14.28.1, dotenv@18.0.9, pg@8.23.1, pino@10.4.0, @prisma/adapter-pg@7.10.1, zod@4.6.7, devDependencies (+32 more)

### Community 5 - "StatusCommand"
Cohesion: 0.18
Nodes (4): Task 7: Wire Setup and Voice Events into the Application, DiscordClientPort, waitForDiscordReady(), StatusCommand

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
Cohesion: 0.13
Nodes (13): Calls module, Composition, registration, and documentation, File Structure, Persistence and shared utilities, Setup module, Task 3: Build the Private Setup Dashboard, Task 4: Handle Setup Buttons, Selects, and Modals, Task 5: Build the Disabled Minimalist Call Panel (+5 more)

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
Cohesion: 0.13
Nodes (15): Task 2: Validated configuration, commandDefinitions, CommandRegistrar, registerCommands(), AppConfig, environmentSchema, loadConfig(), postgresUrl (+7 more)

### Community 20 - "commonInputTypes.ts"
Cohesion: 0.05
Nodes (39): BoolFilter, BoolWithAggregatesFilter, DateTimeFilter, DateTimeNullableFilter, DateTimeNullableWithAggregatesFilter, DateTimeWithAggregatesFilter, EnumRoomVisibilityFilter, EnumRoomVisibilityWithAggregatesFilter (+31 more)

### Community 21 - "Charon v0.2.0 — Setup e Join-to-Create"
Cohesion: 0.08
Nodes (24): 1. Painel administrativo persistente no canal, 2. Painel administrativo privado temporário — escolhida, 3. Assistente linear passo a passo, Abordagens consideradas, Antiobjetivos, Charon v0.2.0 — Setup e Join-to-Create, Compensação de falhas, Criação e ciclo de vida da sala (+16 more)

### Community 25 - "RoomStateRepository"
Cohesion: 0.13
Nodes (7): PendingOwnershipTransfer, activeWhere(), available(), ownerChange(), PrismaRoomStateRepository, uniqueError(), fixture()

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

### Community 33 - "RoomPresence.ts"
Cohesion: 0.03
Nodes (74): AggregateRoomPresence, GetRoomPresenceAggregateType, GetRoomPresenceGroupByPayload, RoomPresenceAggregateArgs, RoomPresenceCountAggregateInputType, RoomPresenceCountAggregateOutputType, RoomPresenceCountArgs, RoomPresenceCountOrderByAggregateInput (+66 more)

### Community 34 - "prisma/client.ts"
Cohesion: 0.10
Nodes (10): $Enums, PrismaClient, RoomAllowedMember, RoomPresence, CreateTemporaryRoomInput, invalidateControls, PrismaTemporaryRoomRepository, TemporaryRoomTransitionError (+2 more)

### Community 35 - "PendingOwnershipTransfer.ts"
Cohesion: 0.03
Nodes (73): AggregatePendingOwnershipTransfer, GetPendingOwnershipTransferAggregateType, GetPendingOwnershipTransferGroupByPayload, PendingOwnershipTransferAggregateArgs, PendingOwnershipTransferAvgAggregateInputType, PendingOwnershipTransferAvgAggregateOutputType, PendingOwnershipTransferAvgOrderByAggregateInput, PendingOwnershipTransferCountAggregateInputType (+65 more)

### Community 36 - "enums.ts"
Cohesion: 0.20
Nodes (9): Task 1: Persist Voice Creator and Temporary Room State, $Enums, PendingOwnershipTransfer, RoomAllowedMember, RoomPresence, TemporaryRoom, VoiceCreator, RoomVisibility (+1 more)

### Community 37 - "Charon v0.3.0 — posse e controles"
Cohesion: 0.08
Nodes (24): 10. Ciclo de vida e falhas — propostas técnicas, 11. Verificação e limites operacionais, 12. Fora do escopo e liberdade de implementação, 1. Objetivo e contexto, 2. Origem das decisões, 3. Abordagens de interação, 4. Painel e controles, 5. Posse e elegibilidade (+16 more)

### Community 38 - "call.schemas.ts"
Cohesion: 0.09
Nodes (22): CallDiscordGateway, TemporaryRoomRecord, TemporaryRoomRepository, buildInitialRoomName(), CallComponent, callComponentSchema, callControlActionSchema, callLimitSubmissionSchema (+14 more)

### Community 39 - "application.ts"
Cohesion: 0.28
Nodes (3): Application, registerShutdownSignals(), start()

### Community 40 - "application.test.ts"
Cohesion: 0.16
Nodes (14): pino, ApplicationOverrides, createApplication(), createDefaultVoiceDispatcher(), fetch(), hasRuntimeRepositories(), InteractionDispatcher, SignalSource (+6 more)

### Community 44 - "setup.interactions.ts"
Cohesion: 0.26
Nodes (12): SetupCategory, voicePermissions, GuildBasedInteraction, decodeSetupCustomId(), discordIdSchema, encodeSetupCustomId(), setupChannelNameSchema, SetupCustomId (+4 more)

### Community 45 - ".execute"
Cohesion: 0.21
Nodes (4): SetupDiscordGateway, isGuildBased(), SetupInteractions, fixture()

### Community 46 - "InteractionRegistry"
Cohesion: 0.10
Nodes (13): Task 5: Discord client and interaction registry, Charon v0.2.0 Setup and Join-to-Create Implementation Plan, Global Constraints, Review Focus, Task 8: Wire interactions, voice lifecycle and one shared room runtime, Arquitetura, createDefaultDispatcher(), InteractionHandler (+5 more)

### Community 47 - "DiscordCallGateway"
Cohesion: 0.10
Nodes (5): CallDiscordError, DiscordCallGateway, isUnknownChannel(), DiscordRoomGateway, hasCode()

### Community 48 - "Retomar o Charon após formatar o computador"
Cohesion: 0.17
Nodes (10): Antes de formatar: salvar fora do Git, De onde continuar, O que está salvo no GitHub, Recuperar o projeto, Retomar o Charon após formatar o computador, Charon v0.2.0 — registro de validação, Discord real: verificações observadas, Limpeza e limites (+2 more)

### Community 50 - "PrismaVoiceCreatorRepository"
Cohesion: 0.16
Nodes (6): VoiceCreator, isPrismaErrorWithCode(), PrismaVoiceCreatorRepository, VoiceCreatorAlreadyConfiguredError, firstCreator, secondCreator

### Community 51 - "@prisma/client"
Cohesion: 0.22
Nodes (4): config, decodeBase64AsWasm(), LogOptions, PrismaClientConstructor

### Community 52 - "VoiceCreatorRepository"
Cohesion: 0.16
Nodes (7): Task 2: Add Voice Creator Repository and Setup Service, Task 6: Implement Temporary Room Lifecycle and Compensation, CreateVoiceCreatorInput, VoiceCreatorNotFoundError, VoiceCreatorRepository, SetupChannelGateway, configuration

### Community 53 - "call-controls.view.test.ts"
Cohesion: 0.08
Nodes (35): Baseline, isolation and test environment, Charon v0.3.0 Ownership and Room Controls Implementation Plan, File Structure, Global Constraints, Review Focus, Self-review and handoff, Task 1: Persist room-control state and prove database invariants, Task 2: Discord room adapter, shared guards and timer lifecycle (+27 more)

### Community 54 - "ownership.fixtures.ts"
Cohesion: 0.06
Nodes (45): Lock and permission contracts, Shared contracts — define once, reuse in later tasks, CallInteraction, Dependencies, allowedUnion(), assertSnapshot(), RoomAccessService, requireActiveRoom() (+37 more)

### Community 59 - "vitest"
Cohesion: 0.08
Nodes (41): discord.js, vitest, createLogger(), botRoomPermissions, CallMoveUnconfirmedError, CreatedDiscordRoom, CreateDiscordRoomInput, KeyedMutex (+33 more)

### Community 61 - "setup.repository.ts"
Cohesion: 0.24
Nodes (8): SetupVoiceChannel, VoiceCreatorConfiguration, buildSetupDashboard(), SetupDashboardInput, SetupDashboardPayload, first, json(), second

## Knowledge Gaps
- **3 isolated node(s):** `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1015 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `prismaNamespaceBrowser.ts` to `prismaNamespace.ts`, `prisma/client.ts`, `PendingOwnershipTransfer.ts`, `package.json`, `RoomPresence.ts`, `TemporaryRoom.ts`, `VoiceCreator.ts`, `@prisma/client`, `commonInputTypes.ts`, `RoomAllowedMember.ts`?**
  _High betweenness centrality (0.189) - this node is a cross-community bridge._
- **What connects `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `prismaNamespace.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.01652892561983471 - nodes in this community are weakly interconnected._
- **Why does `InteractionRegistry` connect `InteractionRegistry` to `application.test.ts`, `Arquitetura do Charon`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Should `prismaNamespaceBrowser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Why does `Charon v0.2.0 — Setup e Join-to-Create` connect `Charon v0.2.0 — Setup e Join-to-Create` to `InteractionRegistry`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05603864734299517 - nodes in this community are weakly interconnected._