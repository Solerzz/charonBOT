# Graph Report - feature-etapa-1-infraestrutura  (2026-11-06)

## Corpus Check
- 60 files · ~34,749 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .prisma 1)

## Summary
- 799 nodes · 1101 edges · 34 communities (29 shown, 5 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 52 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `175ad4ad`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Graphify Knowledge Graph (graphify-out)
- prismaNamespace.ts
- discord.js
- class.ts
- package.json
- setup.discord.ts
- steps
- Arquitetura do Charon
- class.ts
- Charon v1 — Design
- compilerOptions
- compilerOptions
- TemporaryRoom.ts
- InteractionRegistry
- Changelog
- Charon v0.1.0 — Infraestrutura
- pull_request_template.md
- PrismaClientBaseOptions
- VoiceCreator.ts
- setup.repository.ts
- commonInputTypes.ts
- Charon v0.2.0 — Setup e Join-to-Create
- File Structure
- TemporaryRoomDelegate
- VoiceCreatorDelegate
- env.ts
- application.test.ts
- vitest
- register-commands.ts
- Prisma__TemporaryRoomClient
- Prisma__VoiceCreatorClient
- Review Focus
- logger.ts
- enums.ts

## God Nodes (most connected - your core abstractions)
1. `vitest` - 19 edges
2. `TemporaryRoomDelegate` - 18 edges
3. `VoiceCreatorDelegate` - 18 edges
4. `discord.js` - 18 edges
5. `SetupService` - 16 edges
6. `VoiceCreatorRepository` - 15 edges
7. `Charon v0.2.0 — Setup e Join-to-Create` - 15 edges
8. `DiscordSetupGateway` - 14 edges
9. `PrismaVoiceCreatorRepository` - 13 edges
10. `VoiceCreatorConfiguration` - 13 edges

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

## Communities (34 total, 5 thin omitted)

### Community 0 - "Graphify Knowledge Graph (graphify-out)"
Cohesion: 0.33
Nodes (7): graphify-out/graph.json, graphify-out/GRAPH_REPORT.md, /graphify User Command, Graphify Knowledge Graph (graphify-out), graphify query / path / explain Commands, graphify update Command, graphify-out/wiki/index.md

### Community 1 - "prismaNamespace.ts"
Cohesion: 0.02
Nodes (117): AnyNull, Args, At, AtLeast, AtLoose, AtStrict, BatchPayload, Boolean (+109 more)

### Community 2 - "discord.js"
Cohesion: 0.24
Nodes (4): discord.js, InteractionHandler, safeFailureResponse, StatusCommand

### Community 3 - "class.ts"
Cohesion: 0.11
Nodes (15): $Enums, TemporaryRoom, VoiceCreator, AnyNull, DbNull, Decimal, JsonNull, ModelName (+7 more)

### Community 4 - "package.json"
Cohesion: 0.06
Nodes (40): dependencies, discord.js@14.28.1, dotenv@18.0.9, pg@8.23.1, pino@10.4.0, @prisma/adapter-pg@7.10.1, @prisma/client@7.10.1, zod@4.6.7 (+32 more)

### Community 5 - "setup.discord.ts"
Cohesion: 0.09
Nodes (24): discordErrorCode(), DiscordSetupGateway, SetupCategory, SetupDiscordError, SetupDiscordGateway, SetupVoiceChannel, voicePermissions, decodeSetupCustomId() (+16 more)

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

### Community 19 - "setup.repository.ts"
Cohesion: 0.05
Nodes (30): Task 4: Prisma adapter, Task 2: Add Voice Creator Repository and Setup Service, Task 3: Build the Private Setup Dashboard, vitest, ApplicationOverrides, checkDatabase(), createPrismaClient(), DatabaseClient (+22 more)

### Community 20 - "commonInputTypes.ts"
Cohesion: 0.05
Nodes (39): BoolFilter, BoolWithAggregatesFilter, DateTimeFilter, DateTimeNullableFilter, DateTimeNullableWithAggregatesFilter, DateTimeWithAggregatesFilter, EnumRoomVisibilityFilter, EnumRoomVisibilityWithAggregatesFilter (+31 more)

### Community 21 - "Charon v0.2.0 — Setup e Join-to-Create"
Cohesion: 0.08
Nodes (25): 1. Painel administrativo persistente no canal, 2. Painel administrativo privado temporário — escolhida, 3. Assistente linear passo a passo, Abordagens consideradas, Antiobjetivos, Arquitetura, Charon v0.2.0 — Setup e Join-to-Create, Compensação de falhas (+17 more)

### Community 22 - "File Structure"
Cohesion: 0.09
Nodes (20): Calls module, Charon v0.2.0 Setup and Join-to-Create Implementation Plan, Composition, registration, and documentation, File Structure, Global Constraints, Persistence and shared utilities, Review Focus, Setup module (+12 more)

### Community 25 - "env.ts"
Cohesion: 0.17
Nodes (8): Task 2: Validated configuration, Application, registerShutdownSignals(), environmentSchema, loadConfig(), postgresUrl, start(), validEnvironment

### Community 26 - "application.test.ts"
Cohesion: 0.23
Nodes (6): createApplication(), createDefaultDispatcher(), InteractionDispatcher, SignalSource, createDiscordClient(), config

### Community 27 - "vitest"
Cohesion: 0.36
Nodes (3): createLogger(), createSilentLogger(), captureLogger()

### Community 28 - "register-commands.ts"
Cohesion: 0.27
Nodes (4): commandDefinitions, CommandRegistrar, registerCommands(), config

### Community 31 - "Review Focus"
Cohesion: 0.25
Nodes (7): Charon Stage 1 Infrastructure Implementation Plan, Global Constraints, Review Focus, Task 1: Project foundation, Task 3: Structured logger, Task 6: Application lifecycle and status command, Task 7: CI, documentation, and release readiness

### Community 32 - "logger.ts"
Cohesion: 0.33
Nodes (6): pino, AppConfig, LoggerOptions, redactedPaths, sanitizeLogValue(), sensitiveKeys

### Community 33 - "enums.ts"
Cohesion: 0.50
Nodes (4): Task 1: Persist Voice Creator and Temporary Room State, RoomVisibility, TemporaryRoomStatus, SetupCustomId

## Knowledge Gaps
- **3 isolated node(s):** `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 561 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `package.json` to `prismaNamespace.ts`, `class.ts`, `class.ts`, `TemporaryRoom.ts`, `VoiceCreator.ts`, `setup.repository.ts`, `commonInputTypes.ts`?**
  _High betweenness centrality (0.230) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `SetupService` (e.g. with `Task 2: Add Voice Creator Repository and Setup Service` and `Task 3: Build the Private Setup Dashboard`) actually correct?**
  _`SetupService` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `prismaNamespace.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.01694915254237288 - nodes in this community are weakly interconnected._
- **Why does `InteractionRegistry` connect `InteractionRegistry` to `discord.js`, `Arquitetura do Charon`, `Charon v0.2.0 — Setup e Join-to-Create`, `File Structure`, `application.test.ts`, `vitest`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Should `class.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Why does `discord.js` connect `discord.js` to `package.json`, `setup.discord.ts`, `setup.repository.ts`, `application.test.ts`, `vitest`, `register-commands.ts`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._