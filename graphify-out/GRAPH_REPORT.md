# Graph Report - feature-etapa-1-infraestrutura  (2026-11-06)

## Corpus Check
- 62 files · ~37,997 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .prisma 1)

## Summary
- 820 nodes · 1192 edges · 40 communities (35 shown, 5 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 64 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a554f844`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Graphify Knowledge Graph (graphify-out)
- prismaNamespace.ts
- discord.js
- class.ts
- package.json
- .execute
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
- SetupService
- commonInputTypes.ts
- Charon v0.2.0 — Setup e Join-to-Create
- call.schemas.ts
- TemporaryRoomDelegate
- VoiceCreatorDelegate
- application.ts
- vitest
- setup.repository.ts
- register-commands.ts
- Prisma__TemporaryRoomClient
- Prisma__VoiceCreatorClient
- InteractionRegistry
- env.ts
- enums.ts
- prisma.ts
- File Structure
- Task 2: Add Voice Creator Repository and Setup Service
- PrismaVoiceCreatorRepository
- VoiceCreatorConfiguration
- setup.interactions.test.ts

## God Nodes (most connected - your core abstractions)
1. `SetupService` - 20 edges
2. `discord.js` - 20 edges
3. `vitest` - 20 edges
4. `TemporaryRoomDelegate` - 18 edges
5. `VoiceCreatorDelegate` - 18 edges
6. `VoiceCreatorRepository` - 16 edges
7. `VoiceCreatorConfiguration` - 16 edges
8. `SetupDiscordError` - 15 edges
9. `Charon v0.2.0 — Setup e Join-to-Create` - 15 edges
10. `DiscordSetupGateway` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Interações` --references--> `InteractionRegistry`  [INFERRED]
  docs/architecture.md → src/core/discord/interactions/interaction-registry.ts
- `Global Constraints` --references--> `InteractionRegistry`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-v0.2.0-setup-join-to-create.md → src/core/discord/interactions/interaction-registry.ts
- `Task 4: Handle Setup Buttons, Selects, and Modals` --references--> `SetupService`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-v0.2.0-setup-join-to-create.md → src/modules/setup/setup.service.ts
- `Arquitetura` --references--> `InteractionRegistry`  [INFERRED]
  docs/superpowers/specs/2026-11-05-charon-v0.2.0-setup-join-to-create-design.md → src/core/discord/interactions/interaction-registry.ts
- `Task 2: Add Voice Creator Repository and Setup Service` --references--> `PrismaVoiceCreatorRepository`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-v0.2.0-setup-join-to-create.md → src/modules/setup/setup.repository.ts

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

### Community 2 - "discord.js"
Cohesion: 0.21
Nodes (4): discord.js, InteractionHandler, safeFailureResponse, StatusCommand

### Community 3 - "class.ts"
Cohesion: 0.14
Nodes (12): AnyNull, DbNull, Decimal, JsonNull, ModelName, NullsOrder, NullTypes, QueryMode (+4 more)

### Community 4 - "package.json"
Cohesion: 0.06
Nodes (41): dependencies, discord.js@14.28.1, dotenv@18.0.9, pg@8.23.1, pino@10.4.0, @prisma/adapter-pg@7.10.1, @prisma/client@7.10.1, zod@4.6.7 (+33 more)

### Community 5 - ".execute"
Cohesion: 0.13
Nodes (9): discordErrorCode(), DiscordSetupGateway, SetupDiscordError, SetupDiscordGateway, isGuildBased(), SetupInteractions, allPermissions, fixture() (+1 more)

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
Cohesion: 0.26
Nodes (12): SetupCategory, voicePermissions, GuildBasedInteraction, decodeSetupCustomId(), discordIdSchema, encodeSetupCustomId(), setupChannelNameSchema, SetupCustomId (+4 more)

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

### Community 19 - "SetupService"
Cohesion: 0.14
Nodes (8): Task 6: Implement Temporary Room Lifecycle and Compensation, SetupCommand, setupCommandData, VoiceCreatorRepository, SetupService, botPermissions, configuration, fixture()

### Community 20 - "commonInputTypes.ts"
Cohesion: 0.05
Nodes (39): BoolFilter, BoolWithAggregatesFilter, DateTimeFilter, DateTimeNullableFilter, DateTimeNullableWithAggregatesFilter, DateTimeWithAggregatesFilter, EnumRoomVisibilityFilter, EnumRoomVisibilityWithAggregatesFilter (+31 more)

### Community 21 - "Charon v0.2.0 — Setup e Join-to-Create"
Cohesion: 0.08
Nodes (24): 1. Painel administrativo persistente no canal, 2. Painel administrativo privado temporário — escolhida, 3. Assistente linear passo a passo, Abordagens consideradas, Antiobjetivos, Charon v0.2.0 — Setup e Join-to-Create, Compensação de falhas, Criação e ciclo de vida da sala (+16 more)

### Community 22 - "call.schemas.ts"
Cohesion: 0.22
Nodes (8): Task 7: Wire Setup and Voice Events into the Application, DiscordClientPort, buildInitialRoomName(), graphemes(), segmenter, temporaryRoomNameSchema, VoiceTransition, voiceTransitionSchema

### Community 25 - "application.ts"
Cohesion: 0.23
Nodes (7): Application, createApplication(), createDefaultDispatcher(), registerShutdownSignals(), SignalSource, createDiscordClient(), start()

### Community 26 - "vitest"
Cohesion: 0.18
Nodes (7): Task 3: Structured logger, vitest, InteractionDispatcher, createLogger(), config, createSilentLogger(), captureLogger()

### Community 27 - "setup.repository.ts"
Cohesion: 0.18
Nodes (7): $Enums, PrismaClient, TemporaryRoom, VoiceCreator, VoiceCreatorAlreadyConfiguredError, firstCreator, secondCreator

### Community 28 - "register-commands.ts"
Cohesion: 0.27
Nodes (4): commandDefinitions, CommandRegistrar, registerCommands(), config

### Community 31 - "InteractionRegistry"
Cohesion: 0.16
Nodes (9): Charon Stage 1 Infrastructure Implementation Plan, Global Constraints, Review Focus, Task 1: Project foundation, Task 5: Discord client and interaction registry, Task 6: Application lifecycle and status command, Task 7: CI, documentation, and release readiness, Arquitetura (+1 more)

### Community 32 - "env.ts"
Cohesion: 0.21
Nodes (10): Task 2: Validated configuration, AppConfig, environmentSchema, loadConfig(), postgresUrl, LoggerOptions, redactedPaths, sanitizeLogValue() (+2 more)

### Community 33 - "enums.ts"
Cohesion: 0.29
Nodes (6): Task 1: Persist Voice Creator and Temporary Room State, $Enums, TemporaryRoom, VoiceCreator, RoomVisibility, TemporaryRoomStatus

### Community 34 - "prisma.ts"
Cohesion: 0.27
Nodes (7): Task 4: Prisma adapter, ApplicationOverrides, checkDatabase(), createPrismaClient(), DatabaseClient, disconnectDatabase(), disconnectedClients

### Community 35 - "File Structure"
Cohesion: 0.15
Nodes (12): Calls module, Charon v0.2.0 Setup and Join-to-Create Implementation Plan, Composition, registration, and documentation, File Structure, Global Constraints, Persistence and shared utilities, Review Focus, Setup module (+4 more)

### Community 36 - "Task 2: Add Voice Creator Repository and Setup Service"
Cohesion: 0.21
Nodes (5): Task 2: Add Voice Creator Repository and Setup Service, CreateVoiceCreatorInput, VoiceCreatorNotFoundError, SetupChannelGateway, configuration

### Community 38 - "VoiceCreatorConfiguration"
Cohesion: 0.31
Nodes (8): SetupVoiceChannel, VoiceCreatorConfiguration, buildSetupDashboard(), SetupDashboardInput, SetupDashboardPayload, first, json(), second

### Community 39 - "setup.interactions.test.ts"
Cohesion: 0.25
Nodes (5): SetupDiscordGatewayFactory, SetupInteraction, first, Kind, second

## Knowledge Gaps
- **3 isolated node(s):** `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 565 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `package.json` to `prismaNamespace.ts`, `class.ts`, `class.ts`, `TemporaryRoom.ts`, `VoiceCreator.ts`, `commonInputTypes.ts`, `setup.repository.ts`?**
  _High betweenness centrality (0.221) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `SetupService` (e.g. with `Task 2: Add Voice Creator Repository and Setup Service` and `Task 3: Build the Private Setup Dashboard`) actually correct?**
  _`SetupService` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `prismaNamespace.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.01694915254237288 - nodes in this community are weakly interconnected._
- **Why does `InteractionRegistry` connect `InteractionRegistry` to `application.ts`, `discord.js`, `File Structure`, `Arquitetura do Charon`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Should `class.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Why does `discord.js` connect `discord.js` to `package.json`, `.execute`, `VoiceCreatorConfiguration`, `setup.interactions.test.ts`, `setup.interactions.ts`, `SetupService`, `application.ts`, `vitest`, `register-commands.ts`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._