# Graph Report - feature-etapa-1-infraestrutura  (2026-11-06)

## Corpus Check
- 75 files · ~46,600 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .prisma 1)

## Summary
- 923 nodes · 1568 edges · 39 communities (34 shown, 5 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 96 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `26b0c0fa`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Graphify Knowledge Graph (graphify-out)
- prismaNamespace.ts
- register-commands.ts
- prismaNamespaceBrowser.ts
- package.json
- File Structure
- steps
- Arquitetura do Charon
- class.ts
- Charon v1 — Design
- compilerOptions
- compilerOptions
- TemporaryRoom.ts
- setup.interactions.ts
- Changelog
- Charon v0.1.0 — Infraestrutura
- pull_request_template.md
- PrismaClientBaseOptions
- VoiceCreator.ts
- DiscordCallGateway
- commonInputTypes.ts
- Charon v0.2.0 — Setup e Join-to-Create
- vitest
- TemporaryRoomDelegate
- VoiceCreatorDelegate
- application.ts
- application.test.ts
- vitest
- application.ts
- Prisma__TemporaryRoomClient
- Prisma__VoiceCreatorClient
- InteractionRegistry
- discord.js
- call.service.ts
- PrismaVoiceCreatorRepository
- call.fixtures.ts
- enums.ts
- call-panel.view.ts
- prisma/client.ts

## God Nodes (most connected - your core abstractions)
1. `vitest` - 27 edges
2. `discord.js` - 26 edges
3. `SetupService` - 22 edges
4. `DiscordCallGateway` - 19 edges
5. `VoiceCreatorRepository` - 19 edges
6. `TemporaryRoomDelegate` - 18 edges
7. `VoiceCreatorDelegate` - 18 edges
8. `CallService` - 17 edges
9. `DiscordSetupGateway` - 16 edges
10. `PrismaVoiceCreatorRepository` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Interações` --references--> `InteractionRegistry`  [INFERRED]
  docs/architecture.md → src/core/discord/interactions/interaction-registry.ts
- `Global Constraints` --references--> `InteractionRegistry`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-v0.2.0-setup-join-to-create.md → src/core/discord/interactions/interaction-registry.ts
- `Task 4: Handle Setup Buttons, Selects, and Modals` --references--> `SetupService`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-v0.2.0-setup-join-to-create.md → src/modules/setup/setup.service.ts
- `Task 6: Implement Temporary Room Lifecycle and Compensation` --references--> `VoiceCreatorRepository`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-v0.2.0-setup-join-to-create.md → src/modules/setup/setup.repository.ts
- `Task 3: Structured logger` --references--> `createLogger()`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-stage-1-infrastructure.md → src/core/logger/logger.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify Maintenance and Usage Workflow** — agents_graphify_command, agents_graphify_query, agents_graphify_update, agents_graph_json, agents_graph_report, agents_wiki_index [INFERRED 0.75]

## Communities (39 total, 5 thin omitted)

### Community 0 - "Graphify Knowledge Graph (graphify-out)"
Cohesion: 0.33
Nodes (7): graphify-out/graph.json, graphify-out/GRAPH_REPORT.md, /graphify User Command, Graphify Knowledge Graph (graphify-out), graphify query / path / explain Commands, graphify update Command, graphify-out/wiki/index.md

### Community 1 - "prismaNamespace.ts"
Cohesion: 0.02
Nodes (117): AnyNull, Args, At, AtLeast, AtLoose, AtStrict, BatchPayload, Boolean (+109 more)

### Community 2 - "register-commands.ts"
Cohesion: 0.13
Nodes (15): Task 2: Validated configuration, commandDefinitions, CommandRegistrar, registerCommands(), AppConfig, environmentSchema, loadConfig(), postgresUrl (+7 more)

### Community 3 - "prismaNamespaceBrowser.ts"
Cohesion: 0.12
Nodes (14): @prisma/client@7.10.1, @prisma/client, AnyNull, DbNull, Decimal, JsonNull, ModelName, NullsOrder (+6 more)

### Community 4 - "package.json"
Cohesion: 0.06
Nodes (38): dependencies, discord.js@14.28.1, dotenv@18.0.9, pg@8.23.1, pino@10.4.0, @prisma/adapter-pg@7.10.1, zod@4.6.7, devDependencies (+30 more)

### Community 5 - "File Structure"
Cohesion: 0.11
Nodes (14): Calls module, Charon v0.2.0 Setup and Join-to-Create Implementation Plan, Composition, registration, and documentation, File Structure, Global Constraints, Persistence and shared utilities, Review Focus, Setup module (+6 more)

### Community 6 - "steps"
Cohesion: 0.11
Nodes (18): jobs, verify, name, on, pull_request, push, permissions, contents (+10 more)

### Community 7 - "Arquitetura do Charon"
Cohesion: 0.12
Nodes (14): Arquitetura do Charon, Banco de dados, Estilo, Estrutura da Etapa 1, Fluxo de inicialização, Interações, Próximos módulos, Charon (+6 more)

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

### Community 13 - "setup.interactions.ts"
Cohesion: 0.05
Nodes (46): Task 2: Add Voice Creator Repository and Setup Service, Task 3: Build the Private Setup Dashboard, discordErrorCode(), DiscordSetupGateway, SetupCategory, SetupDiscordError, SetupDiscordGateway, SetupVoiceChannel (+38 more)

### Community 14 - "Changelog"
Cohesion: 0.40
Nodes (4): [0.1.0] - 2026-11-05, Added, Changelog, [Unreleased]

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

### Community 19 - "DiscordCallGateway"
Cohesion: 0.26
Nodes (4): CallDiscordError, DiscordCallGateway, isUnknownChannel(), CallPanelPayload

### Community 20 - "commonInputTypes.ts"
Cohesion: 0.05
Nodes (39): BoolFilter, BoolWithAggregatesFilter, DateTimeFilter, DateTimeNullableFilter, DateTimeNullableWithAggregatesFilter, DateTimeWithAggregatesFilter, EnumRoomVisibilityFilter, EnumRoomVisibilityWithAggregatesFilter (+31 more)

### Community 21 - "Charon v0.2.0 — Setup e Join-to-Create"
Cohesion: 0.08
Nodes (24): 1. Painel administrativo persistente no canal, 2. Painel administrativo privado temporário — escolhida, 3. Assistente linear passo a passo, Abordagens consideradas, Antiobjetivos, Charon v0.2.0 — Setup e Join-to-Create, Compensação de falhas, Criação e ciclo de vida da sala (+16 more)

### Community 22 - "vitest"
Cohesion: 0.19
Nodes (5): CallDiscordGateway, TemporaryRoomRecord, TemporaryRoomRepository, VoiceTransition, CallService

### Community 25 - "application.ts"
Cohesion: 0.24
Nodes (4): Application, registerShutdownSignals(), SignalSource, start()

### Community 26 - "application.test.ts"
Cohesion: 0.17
Nodes (13): ApplicationOverrides, createApplication(), createDefaultDispatcher(), createDefaultVoiceDispatcher(), hasRuntimeRepositories(), InteractionDispatcher, createDiscordClient(), VoiceStateDispatcher (+5 more)

### Community 27 - "vitest"
Cohesion: 0.20
Nodes (9): vitest, createLogger(), CallMoveUnconfirmedError, KeyedMutex, captureLogger(), lifecycleFixture(), departure, fixture() (+1 more)

### Community 28 - "application.ts"
Cohesion: 0.31
Nodes (6): Task 4: Prisma adapter, checkDatabase(), createPrismaClient(), DatabaseClient, disconnectDatabase(), disconnectedClients

### Community 31 - "InteractionRegistry"
Cohesion: 0.15
Nodes (10): Charon Stage 1 Infrastructure Implementation Plan, Global Constraints, Review Focus, Task 1: Project foundation, Task 3: Structured logger, Task 5: Discord client and interaction registry, Task 6: Application lifecycle and status command, Task 7: CI, documentation, and release readiness (+2 more)

### Community 32 - "discord.js"
Cohesion: 0.19
Nodes (5): discord.js, InteractionHandler, safeFailureResponse, StatusCommand, createSilentLogger()

### Community 33 - "call.service.ts"
Cohesion: 0.29
Nodes (9): pino, botRoomPermissions, CreatedDiscordRoom, CreateDiscordRoomInput, buildInitialRoomName(), graphemes(), segmenter, temporaryRoomNameSchema (+1 more)

### Community 35 - "call.fixtures.ts"
Cohesion: 0.29
Nodes (8): createInput, fixture(), panel, rights, creator, deferred(), entry, room

### Community 36 - "enums.ts"
Cohesion: 0.29
Nodes (6): Task 1: Persist Voice Creator and Temporary Room State, $Enums, TemporaryRoom, VoiceCreator, RoomVisibility, TemporaryRoomStatus

### Community 37 - "call-panel.view.ts"
Cohesion: 0.48
Nodes (5): TemporaryRoom, buildCallPanel(), CallPanelInput, json(), room

### Community 40 - "prisma/client.ts"
Cohesion: 0.11
Nodes (10): $Enums, PrismaClient, VoiceCreator, CreateTemporaryRoomInput, PrismaTemporaryRoomRepository, TemporaryRoomTransitionError, trackedStatuses, fixture() (+2 more)

## Knowledge Gaps
- **3 isolated node(s):** `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 583 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `prismaNamespaceBrowser.ts` to `prismaNamespace.ts`, `package.json`, `prisma/client.ts`, `class.ts`, `TemporaryRoom.ts`, `VoiceCreator.ts`, `commonInputTypes.ts`?**
  _High betweenness centrality (0.162) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `SetupService` (e.g. with `Task 2: Add Voice Creator Repository and Setup Service` and `Task 3: Build the Private Setup Dashboard`) actually correct?**
  _`SetupService` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `prismaNamespace.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.01694915254237288 - nodes in this community are weakly interconnected._
- **Why does `InteractionRegistry` connect `InteractionRegistry` to `discord.js`, `application.test.ts`, `File Structure`, `Arquitetura do Charon`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `VoiceCreatorRepository` (e.g. with `Task 2: Add Voice Creator Repository and Setup Service` and `Task 6: Implement Temporary Room Lifecycle and Compensation`) actually correct?**
  _`VoiceCreatorRepository` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `register-commands.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12666666666666668 - nodes in this community are weakly interconnected._