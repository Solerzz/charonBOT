# Graph Report - feature-etapa-1-infraestrutura  (2026-11-06)

## Corpus Check
- 73 files · ~43,822 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .prisma 1)

## Summary
- 911 nodes · 1468 edges · 41 communities (36 shown, 5 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 93 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7a59922b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Graphify Knowledge Graph (graphify-out)
- prismaNamespace.ts
- discord.js
- prismaNamespaceBrowser.ts
- package.json
- DiscordSetupGateway
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
- vitest
- TemporaryRoomDelegate
- VoiceCreatorDelegate
- application.ts
- application.test.ts
- call.fixtures.ts
- DiscordCallGateway
- Prisma__TemporaryRoomClient
- Prisma__VoiceCreatorClient
- InteractionRegistry
- env.ts
- interaction-registry.test.ts
- File Structure
- register-commands.ts
- .execute
- setup.command.test.ts
- enums.ts
- setup.interactions.test.ts
- InteractionRegistry

## God Nodes (most connected - your core abstractions)
1. `vitest` - 26 edges
2. `discord.js` - 24 edges
3. `SetupService` - 20 edges
4. `VoiceCreatorRepository` - 19 edges
5. `TemporaryRoomDelegate` - 18 edges
6. `VoiceCreatorDelegate` - 18 edges
7. `CallDiscordGateway` - 16 edges
8. `DiscordCallGateway` - 16 edges
9. `VoiceCreatorConfiguration` - 16 edges
10. `SetupDiscordError` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Interações` --references--> `InteractionRegistry`  [INFERRED]
  docs/architecture.md → src/core/discord/interactions/interaction-registry.ts
- `Global Constraints` --references--> `InteractionRegistry`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-v0.2.0-setup-join-to-create.md → src/core/discord/interactions/interaction-registry.ts
- `Arquitetura` --references--> `InteractionRegistry`  [INFERRED]
  docs/superpowers/specs/2026-11-05-charon-v0.2.0-setup-join-to-create-design.md → src/core/discord/interactions/interaction-registry.ts
- `Task 4: Handle Setup Buttons, Selects, and Modals` --references--> `SetupService`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-v0.2.0-setup-join-to-create.md → src/modules/setup/setup.service.ts
- `Task 6: Implement Temporary Room Lifecycle and Compensation` --references--> `VoiceCreatorRepository`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-v0.2.0-setup-join-to-create.md → src/modules/setup/setup.repository.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify Maintenance and Usage Workflow** — agents_graphify_command, agents_graphify_query, agents_graphify_update, agents_graph_json, agents_graph_report, agents_wiki_index [INFERRED 0.75]

## Communities (41 total, 5 thin omitted)

### Community 0 - "Graphify Knowledge Graph (graphify-out)"
Cohesion: 0.33
Nodes (7): graphify-out/graph.json, graphify-out/GRAPH_REPORT.md, /graphify User Command, Graphify Knowledge Graph (graphify-out), graphify query / path / explain Commands, graphify update Command, graphify-out/wiki/index.md

### Community 1 - "prismaNamespace.ts"
Cohesion: 0.02
Nodes (117): AnyNull, Args, At, AtLeast, AtLoose, AtStrict, BatchPayload, Boolean (+109 more)

### Community 2 - "discord.js"
Cohesion: 0.24
Nodes (4): discord.js, InteractionHandler, safeFailureResponse, StatusCommand

### Community 3 - "prismaNamespaceBrowser.ts"
Cohesion: 0.12
Nodes (14): @prisma/client@7.10.1, @prisma/client, AnyNull, DbNull, Decimal, JsonNull, ModelName, NullsOrder (+6 more)

### Community 4 - "package.json"
Cohesion: 0.06
Nodes (38): dependencies, discord.js@14.28.1, dotenv@18.0.9, pg@8.23.1, pino@10.4.0, @prisma/adapter-pg@7.10.1, zod@4.6.7, devDependencies (+30 more)

### Community 5 - "DiscordSetupGateway"
Cohesion: 0.29
Nodes (4): discordErrorCode(), DiscordSetupGateway, allPermissions, fixture()

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
Cohesion: 0.17
Nodes (20): SetupCategory, SetupVoiceChannel, voicePermissions, GuildBasedInteraction, VoiceCreatorConfiguration, decodeSetupCustomId(), discordIdSchema, encodeSetupCustomId() (+12 more)

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
Cohesion: 0.16
Nodes (6): Task 2: Add Voice Creator Repository and Setup Service, CreateVoiceCreatorInput, VoiceCreatorNotFoundError, VoiceCreatorRepository, SetupChannelGateway, configuration

### Community 20 - "commonInputTypes.ts"
Cohesion: 0.05
Nodes (39): BoolFilter, BoolWithAggregatesFilter, DateTimeFilter, DateTimeNullableFilter, DateTimeNullableWithAggregatesFilter, DateTimeWithAggregatesFilter, EnumRoomVisibilityFilter, EnumRoomVisibilityWithAggregatesFilter (+31 more)

### Community 21 - "Charon v0.2.0 — Setup e Join-to-Create"
Cohesion: 0.08
Nodes (25): 1. Painel administrativo persistente no canal, 2. Painel administrativo privado temporário — escolhida, 3. Assistente linear passo a passo, Abordagens consideradas, Antiobjetivos, Arquitetura, Charon v0.2.0 — Setup e Join-to-Create, Compensação de falhas (+17 more)

### Community 22 - "vitest"
Cohesion: 0.10
Nodes (19): botRoomPermissions, CallDiscordGateway, CallMoveUnconfirmedError, CreatedDiscordRoom, CreateDiscordRoomInput, buildCallPanel(), TemporaryRoomRecord, TemporaryRoomRepository (+11 more)

### Community 25 - "application.ts"
Cohesion: 0.26
Nodes (6): Application, createApplication(), createDefaultDispatcher(), registerShutdownSignals(), SignalSource, start()

### Community 26 - "application.test.ts"
Cohesion: 0.18
Nodes (4): Task 7: Wire Setup and Voice Events into the Application, DiscordClientPort, InteractionDispatcher, config

### Community 27 - "call.fixtures.ts"
Cohesion: 0.05
Nodes (32): Task 4: Prisma adapter, ApplicationOverrides, checkDatabase(), createPrismaClient(), DatabaseClient, disconnectDatabase(), disconnectedClients, $Enums (+24 more)

### Community 28 - "DiscordCallGateway"
Cohesion: 0.31
Nodes (3): CallDiscordError, DiscordCallGateway, isUnknownChannel()

### Community 31 - "InteractionRegistry"
Cohesion: 0.25
Nodes (7): Charon Stage 1 Infrastructure Implementation Plan, Global Constraints, Review Focus, Task 1: Project foundation, Task 3: Structured logger, Task 6: Application lifecycle and status command, Task 7: CI, documentation, and release readiness

### Community 32 - "env.ts"
Cohesion: 0.19
Nodes (11): Task 2: Validated configuration, pino, AppConfig, environmentSchema, loadConfig(), postgresUrl, LoggerOptions, redactedPaths (+3 more)

### Community 33 - "interaction-registry.test.ts"
Cohesion: 0.22
Nodes (5): vitest, createDiscordClient(), createLogger(), createSilentLogger(), captureLogger()

### Community 34 - "File Structure"
Cohesion: 0.14
Nodes (13): Calls module, Charon v0.2.0 Setup and Join-to-Create Implementation Plan, Composition, registration, and documentation, File Structure, Global Constraints, Persistence and shared utilities, Review Focus, Setup module (+5 more)

### Community 35 - "register-commands.ts"
Cohesion: 0.27
Nodes (4): commandDefinitions, CommandRegistrar, registerCommands(), config

### Community 36 - ".execute"
Cohesion: 0.24
Nodes (4): SetupDiscordError, SetupDiscordGateway, isGuildBased(), SetupInteractions

### Community 37 - "setup.command.test.ts"
Cohesion: 0.19
Nodes (6): SetupCommand, setupCommandData, SetupService, botPermissions, configuration, fixture()

### Community 38 - "enums.ts"
Cohesion: 0.29
Nodes (6): Task 1: Persist Voice Creator and Temporary Room State, $Enums, TemporaryRoom, VoiceCreator, RoomVisibility, TemporaryRoomStatus

### Community 39 - "setup.interactions.test.ts"
Cohesion: 0.18
Nodes (7): SetupDiscordGatewayFactory, SetupInteraction, VoiceCreatorAlreadyConfiguredError, first, fixture(), Kind, second

## Knowledge Gaps
- **3 isolated node(s):** `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 582 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `prismaNamespaceBrowser.ts` to `prismaNamespace.ts`, `package.json`, `class.ts`, `TemporaryRoom.ts`, `VoiceCreator.ts`, `commonInputTypes.ts`, `call.fixtures.ts`?**
  _High betweenness centrality (0.195) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `SetupService` (e.g. with `Task 2: Add Voice Creator Repository and Setup Service` and `Task 3: Build the Private Setup Dashboard`) actually correct?**
  _`SetupService` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `prismaNamespace.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.01694915254237288 - nodes in this community are weakly interconnected._
- **Why does `InteractionRegistry` connect `InteractionRegistry` to `interaction-registry.test.ts`, `File Structure`, `discord.js`, `Arquitetura do Charon`, `Charon v0.2.0 — Setup e Join-to-Create`, `application.ts`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `VoiceCreatorRepository` (e.g. with `Task 2: Add Voice Creator Repository and Setup Service` and `Task 6: Implement Temporary Room Lifecycle and Compensation`) actually correct?**
  _`VoiceCreatorRepository` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `prismaNamespaceBrowser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._