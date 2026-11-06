# Graph Report - feature-etapa-1-infraestrutura  (2026-11-06)

## Corpus Check
- 54 files · ~31,189 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .prisma 1)

## Summary
- 757 nodes · 988 edges · 32 communities (27 shown, 5 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 48 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b05f575a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Graphify Knowledge Graph (graphify-out)
- prismaNamespace.ts
- discord.js
- class.ts
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
- Changelog
- Charon v0.1.0 — Infraestrutura
- pull_request_template.md
- PrismaClientBaseOptions
- VoiceCreator.ts
- setup.repository.ts
- commonInputTypes.ts
- Charon v0.2.0 — Setup e Join-to-Create
- setup.schemas.ts
- TemporaryRoomDelegate
- VoiceCreatorDelegate
- env.ts
- application.test.ts
- vitest
- register-commands.ts
- Prisma__TemporaryRoomClient
- Prisma__VoiceCreatorClient
- Charon Stage 1 Infrastructure Implementation Plan

## God Nodes (most connected - your core abstractions)
1. `TemporaryRoomDelegate` - 18 edges
2. `VoiceCreatorDelegate` - 18 edges
3. `vitest` - 16 edges
4. `Charon v0.2.0 — Setup e Join-to-Create` - 15 edges
5. `VoiceCreatorRepository` - 14 edges
6. `PrismaVoiceCreatorRepository` - 13 edges
7. `File Structure` - 13 edges
8. `Charon v1 — Design` - 13 edges
9. `PrismaClient` - 12 edges
10. `SetupService` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Global Constraints` --references--> `InteractionRegistry`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-v0.2.0-setup-join-to-create.md → src/core/discord/interactions/interaction-registry.ts
- `Arquitetura` --references--> `InteractionRegistry`  [INFERRED]
  docs/superpowers/specs/2026-11-05-charon-v0.2.0-setup-join-to-create-design.md → src/core/discord/interactions/interaction-registry.ts
- `Interações` --references--> `InteractionRegistry`  [INFERRED]
  docs/architecture.md → src/core/discord/interactions/interaction-registry.ts
- `Task 3: Structured logger` --references--> `createLogger()`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-stage-1-infrastructure.md → src/core/logger/logger.ts
- `Task 6: Implement Temporary Room Lifecycle and Compensation` --references--> `VoiceCreatorRepository`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-v0.2.0-setup-join-to-create.md → src/modules/setup/setup.repository.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify Maintenance and Usage Workflow** — agents_graphify_command, agents_graphify_query, agents_graphify_update, agents_graph_json, agents_graph_report, agents_wiki_index [INFERRED 0.75]

## Communities (32 total, 5 thin omitted)

### Community 0 - "Graphify Knowledge Graph (graphify-out)"
Cohesion: 0.33
Nodes (7): graphify-out/graph.json, graphify-out/GRAPH_REPORT.md, /graphify User Command, Graphify Knowledge Graph (graphify-out), graphify query / path / explain Commands, graphify update Command, graphify-out/wiki/index.md

### Community 1 - "prismaNamespace.ts"
Cohesion: 0.02
Nodes (117): AnyNull, Args, At, AtLeast, AtLoose, AtStrict, BatchPayload, Boolean (+109 more)

### Community 2 - "discord.js"
Cohesion: 0.22
Nodes (5): discord.js, pino, InteractionHandler, safeFailureResponse, StatusCommand

### Community 3 - "class.ts"
Cohesion: 0.11
Nodes (15): $Enums, TemporaryRoom, VoiceCreator, AnyNull, DbNull, Decimal, JsonNull, ModelName (+7 more)

### Community 4 - "package.json"
Cohesion: 0.05
Nodes (40): dependencies, discord.js@14.28.1, dotenv@18.0.9, pg@8.23.1, pino@10.4.0, @prisma/adapter-pg@7.10.1, @prisma/client@7.10.1, devDependencies (+32 more)

### Community 5 - "application.ts"
Cohesion: 0.27
Nodes (9): Task 4: Prisma adapter, ApplicationOverrides, createApplication(), checkDatabase(), createPrismaClient(), DatabaseClient, disconnectDatabase(), disconnectedClients (+1 more)

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

### Community 13 - "InteractionRegistry"
Cohesion: 0.21
Nodes (8): Review Focus, Task 1: Project foundation, Task 3: Structured logger, Task 5: Discord client and interaction registry, Task 6: Application lifecycle and status command, Task 7: CI, documentation, and release readiness, createDefaultDispatcher(), InteractionRegistry

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
Cohesion: 0.06
Nodes (27): Calls module, Charon v0.2.0 Setup and Join-to-Create Implementation Plan, Composition, registration, and documentation, File Structure, Global Constraints, Persistence and shared utilities, Review Focus, Setup module (+19 more)

### Community 20 - "commonInputTypes.ts"
Cohesion: 0.05
Nodes (43): Task 1: Persist Voice Creator and Temporary Room State, BoolFilter, BoolWithAggregatesFilter, DateTimeFilter, DateTimeNullableFilter, DateTimeNullableWithAggregatesFilter, DateTimeWithAggregatesFilter, EnumRoomVisibilityFilter (+35 more)

### Community 21 - "Charon v0.2.0 — Setup e Join-to-Create"
Cohesion: 0.08
Nodes (25): 1. Painel administrativo persistente no canal, 2. Painel administrativo privado temporário — escolhida, 3. Assistente linear passo a passo, Abordagens consideradas, Antiobjetivos, Arquitetura, Charon v0.2.0 — Setup e Join-to-Create, Compensação de falhas (+17 more)

### Community 22 - "setup.schemas.ts"
Cohesion: 0.13
Nodes (17): Task 7: Wire Setup and Voice Events into the Application, zod@4.6.7, zod, DiscordClientPort, buildInitialRoomName(), graphemes(), segmenter, temporaryRoomNameSchema (+9 more)

### Community 25 - "env.ts"
Cohesion: 0.18
Nodes (8): Task 2: Validated configuration, Application, registerShutdownSignals(), environmentSchema, loadConfig(), postgresUrl, start(), validEnvironment

### Community 26 - "application.test.ts"
Cohesion: 0.16
Nodes (8): InteractionDispatcher, SignalSource, AppConfig, LoggerOptions, redactedPaths, sanitizeLogValue(), sensitiveKeys, config

### Community 27 - "vitest"
Cohesion: 0.24
Nodes (5): vitest, createDiscordClient(), createLogger(), createSilentLogger(), captureLogger()

### Community 28 - "register-commands.ts"
Cohesion: 0.27
Nodes (4): commandDefinitions, CommandRegistrar, registerCommands(), config

## Knowledge Gaps
- **3 isolated node(s):** `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 547 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `package.json` to `prismaNamespace.ts`, `class.ts`, `class.ts`, `TemporaryRoom.ts`, `VoiceCreator.ts`, `commonInputTypes.ts`?**
  _High betweenness centrality (0.222) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `VoiceCreatorRepository` (e.g. with `Task 2: Add Voice Creator Repository and Setup Service` and `Task 6: Implement Temporary Room Lifecycle and Compensation`) actually correct?**
  _`VoiceCreatorRepository` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `prismaNamespace.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.01694915254237288 - nodes in this community are weakly interconnected._
- **Why does `InteractionRegistry` connect `InteractionRegistry` to `discord.js`, `application.ts`, `Arquitetura do Charon`, `setup.repository.ts`, `Charon v0.2.0 — Setup e Join-to-Create`, `vitest`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Should `class.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `vitest` to `discord.js`, `package.json`, `application.ts`, `setup.repository.ts`, `setup.schemas.ts`, `env.ts`, `application.test.ts`, `register-commands.ts`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._