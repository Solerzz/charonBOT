# Graph Report - feature-etapa-1-infraestrutura  (2026-11-06)

## Corpus Check
- 77 files · ~48,691 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .prisma 1)

## Summary
- 937 nodes · 1593 edges · 40 communities (35 shown, 5 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 99 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fbdfc025`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Graphify Knowledge Graph (graphify-out)
- prismaNamespace.ts
- register-commands.ts
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
- SetupService
- setup.interactions.ts
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
- application.ts
- application.ts
- DiscordSetupGateway
- application.ts
- Prisma__TemporaryRoomClient
- Prisma__VoiceCreatorClient
- InteractionRegistry
- discord.js
- .execute
- PrismaVoiceCreatorRepository
- InteractionRegistry
- enums.ts
- setup.interactions.test.ts
- setup.views.test.ts
- setup.repository.ts

## God Nodes (most connected - your core abstractions)
1. `vitest` - 28 edges
2. `discord.js` - 26 edges
3. `SetupService` - 22 edges
4. `DiscordCallGateway` - 19 edges
5. `VoiceCreatorRepository` - 19 edges
6. `CallService` - 18 edges
7. `TemporaryRoomDelegate` - 18 edges
8. `VoiceCreatorDelegate` - 18 edges
9. `PrismaVoiceCreatorRepository` - 17 edges
10. `DiscordSetupGateway` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Task 3: Structured logger` --references--> `createLogger()`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-stage-1-infrastructure.md → src/core/logger/logger.ts
- `Interações` --references--> `InteractionRegistry`  [INFERRED]
  docs/architecture.md → src/core/discord/interactions/interaction-registry.ts
- `Calls: fluxo de eventos` --references--> `CallService`  [INFERRED]
  docs/architecture.md → src/modules/calls/call.service.ts
- `Calls: fluxo de eventos` --references--> `VoiceStateHandler`  [INFERRED]
  docs/architecture.md → src/modules/calls/voice-state.handler.ts
- `Calls: fluxo de eventos` --references--> `KeyedMutex`  [INFERRED]
  docs/architecture.md → src/shared/keyed-mutex.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify Maintenance and Usage Workflow** — agents_graphify_command, agents_graphify_query, agents_graphify_update, agents_graph_json, agents_graph_report, agents_wiki_index [INFERRED 0.75]

## Communities (40 total, 5 thin omitted)

### Community 0 - "Graphify Knowledge Graph (graphify-out)"
Cohesion: 0.33
Nodes (7): graphify-out/graph.json, graphify-out/GRAPH_REPORT.md, /graphify User Command, Graphify Knowledge Graph (graphify-out), graphify query / path / explain Commands, graphify update Command, graphify-out/wiki/index.md

### Community 1 - "prismaNamespace.ts"
Cohesion: 0.02
Nodes (117): AnyNull, Args, At, AtLeast, AtLoose, AtStrict, BatchPayload, Boolean (+109 more)

### Community 2 - "register-commands.ts"
Cohesion: 0.21
Nodes (10): Task 2: Validated configuration, AppConfig, environmentSchema, loadConfig(), postgresUrl, LoggerOptions, redactedPaths, sanitizeLogValue() (+2 more)

### Community 3 - "prismaNamespaceBrowser.ts"
Cohesion: 0.11
Nodes (15): $Enums, TemporaryRoom, VoiceCreator, AnyNull, DbNull, Decimal, JsonNull, ModelName (+7 more)

### Community 4 - "package.json"
Cohesion: 0.06
Nodes (40): dependencies, discord.js@14.28.1, dotenv@18.0.9, pg@8.23.1, pino@10.4.0, @prisma/adapter-pg@7.10.1, @prisma/client@7.10.1, zod@4.6.7 (+32 more)

### Community 5 - "application.test.ts"
Cohesion: 0.16
Nodes (8): Task 7: Wire Setup and Voice Events into the Application, DiscordClientPort, createLogger(), config, dependencies(), shutdownFixture(), createSilentLogger(), captureLogger()

### Community 6 - "steps"
Cohesion: 0.11
Nodes (18): jobs, verify, name, on, pull_request, push, permissions, contents (+10 more)

### Community 7 - "Arquitetura do Charon"
Cohesion: 0.06
Nodes (29): [0.1.0] - 2026-11-05, [0.2.0] - 2026-11-06, Added, Added, Changelog, Known limitations, [Unreleased], Arquitetura do Charon (+21 more)

### Community 8 - "class.ts"
Cohesion: 0.10
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
Nodes (83): AggregateTemporaryRoom, EnumRoomVisibilityFieldUpdateOperationsInput, EnumTemporaryRoomStatusFieldUpdateOperationsInput, GetTemporaryRoomAggregateType, GetTemporaryRoomGroupByPayload, IntFieldUpdateOperationsInput, NullableStringFieldUpdateOperationsInput, TemporaryRoomAggregateArgs (+75 more)

### Community 13 - "SetupService"
Cohesion: 0.09
Nodes (18): Calls module, Composition, registration, and documentation, File Structure, Persistence and shared utilities, Setup module, Task 2: Add Voice Creator Repository and Setup Service, Task 3: Build the Private Setup Dashboard, Task 4: Handle Setup Buttons, Selects, and Modals (+10 more)

### Community 14 - "setup.interactions.ts"
Cohesion: 0.21
Nodes (15): SetupCategory, SetupVoiceChannel, voicePermissions, GuildBasedInteraction, decodeSetupCustomId(), discordIdSchema, encodeSetupCustomId(), setupChannelNameSchema (+7 more)

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
Cohesion: 0.16
Nodes (9): commandDefinitions, CommandRegistrar, registerCommands(), SetupCommand, setupCommandData, botPermissions, configuration, fixture() (+1 more)

### Community 20 - "commonInputTypes.ts"
Cohesion: 0.05
Nodes (39): BoolFilter, BoolWithAggregatesFilter, DateTimeFilter, DateTimeNullableFilter, DateTimeNullableWithAggregatesFilter, DateTimeWithAggregatesFilter, EnumRoomVisibilityFilter, EnumRoomVisibilityWithAggregatesFilter (+31 more)

### Community 21 - "Charon v0.2.0 — Setup e Join-to-Create"
Cohesion: 0.08
Nodes (24): 1. Painel administrativo persistente no canal, 2. Painel administrativo privado temporário — escolhida, 3. Assistente linear passo a passo, Abordagens consideradas, Antiobjetivos, Charon v0.2.0 — Setup e Join-to-Create, Compensação de falhas, Criação e ciclo de vida da sala (+16 more)

### Community 22 - "vitest"
Cohesion: 0.05
Nodes (42): vitest, TemporaryRoom, botRoomPermissions, CallDiscordError, CallDiscordGateway, CallMoveUnconfirmedError, CreatedDiscordRoom, CreateDiscordRoomInput (+34 more)

### Community 25 - "application.ts"
Cohesion: 0.22
Nodes (4): Application, registerShutdownSignals(), SignalSource, start()

### Community 26 - "application.ts"
Cohesion: 0.29
Nodes (7): pino, ApplicationOverrides, createDefaultVoiceDispatcher(), hasRuntimeRepositories(), InteractionDispatcher, VoiceStateDispatcher, VoiceStateHandler

### Community 27 - "DiscordSetupGateway"
Cohesion: 0.27
Nodes (5): discordErrorCode(), DiscordSetupGateway, SetupDiscordError, allPermissions, fixture()

### Community 28 - "application.ts"
Cohesion: 0.26
Nodes (7): Task 4: Prisma adapter, createApplication(), checkDatabase(), createPrismaClient(), DatabaseClient, disconnectDatabase(), disconnectedClients

### Community 31 - "InteractionRegistry"
Cohesion: 0.25
Nodes (7): Charon Stage 1 Infrastructure Implementation Plan, Global Constraints, Review Focus, Task 1: Project foundation, Task 3: Structured logger, Task 6: Application lifecycle and status command, Task 7: CI, documentation, and release readiness

### Community 32 - "discord.js"
Cohesion: 0.19
Nodes (5): discord.js, createDiscordClient(), InteractionHandler, safeFailureResponse, StatusCommand

### Community 33 - ".execute"
Cohesion: 0.25
Nodes (4): SetupDiscordGateway, isGuildBased(), SetupInteractions, fixture()

### Community 35 - "InteractionRegistry"
Cohesion: 0.21
Nodes (7): Task 5: Discord client and interaction registry, Charon v0.2.0 Setup and Join-to-Create Implementation Plan, Global Constraints, Review Focus, Arquitetura, createDefaultDispatcher(), InteractionRegistry

### Community 36 - "enums.ts"
Cohesion: 0.67
Nodes (3): Task 1: Persist Voice Creator and Temporary Room State, RoomVisibility, TemporaryRoomStatus

### Community 37 - "setup.interactions.test.ts"
Cohesion: 0.25
Nodes (5): SetupDiscordGatewayFactory, SetupInteraction, first, Kind, second

### Community 38 - "setup.views.test.ts"
Cohesion: 0.50
Nodes (4): buildSetupDashboard(), first, json(), second

### Community 40 - "setup.repository.ts"
Cohesion: 0.22
Nodes (6): $Enums, PrismaClient, VoiceCreator, VoiceCreatorAlreadyConfiguredError, firstCreator, secondCreator

## Knowledge Gaps
- **3 isolated node(s):** `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 591 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `package.json` to `prismaNamespace.ts`, `prismaNamespaceBrowser.ts`, `setup.repository.ts`, `class.ts`, `TemporaryRoom.ts`, `VoiceCreator.ts`, `commonInputTypes.ts`?**
  _High betweenness centrality (0.161) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `SetupService` (e.g. with `Task 2: Add Voice Creator Repository and Setup Service` and `Task 3: Build the Private Setup Dashboard`) actually correct?**
  _`SetupService` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `prismaNamespace.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.01694915254237288 - nodes in this community are weakly interconnected._
- **Why does `InteractionRegistry` connect `InteractionRegistry` to `discord.js`, `application.ts`, `application.test.ts`, `Arquitetura do Charon`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `VoiceCreatorRepository` (e.g. with `Task 2: Add Voice Creator Repository and Setup Service` and `Task 6: Implement Temporary Room Lifecycle and Compensation`) actually correct?**
  _`VoiceCreatorRepository` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `prismaNamespaceBrowser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._