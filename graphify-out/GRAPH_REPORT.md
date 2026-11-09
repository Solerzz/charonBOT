# Graph Report - charonBOT  (2026-11-08)

## Corpus Check
- 82 files · ~50,684 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: .example 1, (none) 1, .prisma 1)

## Summary
- 957 nodes · 1614 edges · 35 communities (31 shown, 4 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 101 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3e202d26`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Graphify Knowledge Graph (graphify-out)
- prismaNamespace.ts
- vitest
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
- File Structure
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
- Review Focus
- DiscordSetupGateway
- Supabase RLS Implementation Plan
- Prisma__TemporaryRoomClient
- Prisma__VoiceCreatorClient
- logger.ts
- discord.js
- prisma/client.ts
- enums.ts

## God Nodes (most connected - your core abstractions)
1. `vitest` - 29 edges
2. `discord.js` - 26 edges
3. `SetupService` - 22 edges
4. `DiscordCallGateway` - 20 edges
5. `VoiceCreatorRepository` - 19 edges
6. `CallService` - 18 edges
7. `TemporaryRoomDelegate` - 18 edges
8. `VoiceCreatorDelegate` - 18 edges
9. `DiscordSetupGateway` - 17 edges
10. `PrismaVoiceCreatorRepository` - 17 edges

## Surprising Connections (you probably didn't know these)
- `Global Constraints` --references--> `InteractionRegistry`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-v0.2.0-setup-join-to-create.md → src/core/discord/interactions/interaction-registry.ts
- `Arquitetura` --references--> `InteractionRegistry`  [INFERRED]
  docs/superpowers/specs/2026-11-05-charon-v0.2.0-setup-join-to-create-design.md → src/core/discord/interactions/interaction-registry.ts
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

## Communities (35 total, 4 thin omitted)

### Community 0 - "Graphify Knowledge Graph (graphify-out)"
Cohesion: 0.33
Nodes (7): graphify-out/graph.json, graphify-out/GRAPH_REPORT.md, /graphify User Command, Graphify Knowledge Graph (graphify-out), graphify query / path / explain Commands, graphify update Command, graphify-out/wiki/index.md

### Community 1 - "prismaNamespace.ts"
Cohesion: 0.02
Nodes (117): AnyNull, Args, At, AtLeast, AtLoose, AtStrict, BatchPayload, Boolean (+109 more)

### Community 2 - "vitest"
Cohesion: 0.22
Nodes (7): Task 4: Prisma adapter, vitest, checkDatabase(), createPrismaClient(), DatabaseClient, disconnectDatabase(), disconnectedClients

### Community 3 - "prismaNamespaceBrowser.ts"
Cohesion: 0.12
Nodes (14): @prisma/client@7.10.1, @prisma/client, AnyNull, DbNull, Decimal, JsonNull, ModelName, NullsOrder (+6 more)

### Community 4 - "package.json"
Cohesion: 0.06
Nodes (38): dependencies, discord.js@14.28.1, dotenv@18.0.9, pg@8.23.1, pino@10.4.0, @prisma/adapter-pg@7.10.1, zod@4.6.7, devDependencies (+30 more)

### Community 5 - "application.ts"
Cohesion: 0.18
Nodes (11): ApplicationOverrides, createApplication(), createDefaultDispatcher(), hasRuntimeRepositories(), InteractionDispatcher, createDiscordClient(), VoiceStateDispatcher, SetupCommand (+3 more)

### Community 6 - "steps"
Cohesion: 0.11
Nodes (18): jobs, verify, name, on, pull_request, push, permissions, contents (+10 more)

### Community 7 - "Arquitetura do Charon"
Cohesion: 0.06
Nodes (28): [0.1.0] - 2026-11-05, [0.2.0] - 2026-11-06, Added, Added, Changelog, Known limitations, [Unreleased], Arquitetura do Charon (+20 more)

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

### Community 13 - "File Structure"
Cohesion: 0.11
Nodes (14): Calls module, Charon v0.2.0 Setup and Join-to-Create Implementation Plan, Composition, registration, and documentation, File Structure, Global Constraints, Persistence and shared utilities, Review Focus, Setup module (+6 more)

### Community 14 - "setup.interactions.ts"
Cohesion: 0.06
Nodes (40): Task 2: Add Voice Creator Repository and Setup Service, Task 3: Build the Private Setup Dashboard, SetupCategory, SetupDiscordGateway, SetupVoiceChannel, voicePermissions, GuildBasedInteraction, isGuildBased() (+32 more)

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
Cohesion: 0.26
Nodes (5): commandDefinitions, CommandRegistrar, registerCommands(), setupCommandData, config

### Community 20 - "commonInputTypes.ts"
Cohesion: 0.05
Nodes (39): BoolFilter, BoolWithAggregatesFilter, DateTimeFilter, DateTimeNullableFilter, DateTimeNullableWithAggregatesFilter, DateTimeWithAggregatesFilter, EnumRoomVisibilityFilter, EnumRoomVisibilityWithAggregatesFilter (+31 more)

### Community 21 - "Charon v0.2.0 — Setup e Join-to-Create"
Cohesion: 0.08
Nodes (25): 1. Painel administrativo persistente no canal, 2. Painel administrativo privado temporário — escolhida, 3. Assistente linear passo a passo, Abordagens consideradas, Antiobjetivos, Arquitetura, Charon v0.2.0 — Setup e Join-to-Create, Compensação de falhas (+17 more)

### Community 22 - "vitest"
Cohesion: 0.06
Nodes (39): Calls: fluxo de eventos, pino, createDefaultVoiceDispatcher(), botRoomPermissions, CallDiscordError, CallDiscordGateway, CallMoveUnconfirmedError, CreatedDiscordRoom (+31 more)

### Community 25 - "application.ts"
Cohesion: 0.15
Nodes (9): Task 2: Validated configuration, Application, registerShutdownSignals(), SignalSource, environmentSchema, loadConfig(), postgresUrl, start() (+1 more)

### Community 26 - "Review Focus"
Cohesion: 0.25
Nodes (7): Charon Stage 1 Infrastructure Implementation Plan, Global Constraints, Review Focus, Task 1: Project foundation, Task 3: Structured logger, Task 6: Application lifecycle and status command, Task 7: CI, documentation, and release readiness

### Community 27 - "DiscordSetupGateway"
Cohesion: 0.12
Nodes (15): Antes de formatar: salvar fora do Git, De onde continuar, O que está salvo no GitHub, Recuperar o projeto, Retomar o Charon após formatar o computador, Charon v0.2.0 — registro de validação, Discord real: verificações observadas, Limpeza e limites (+7 more)

### Community 28 - "Supabase RLS Implementation Plan"
Cohesion: 0.29
Nodes (6): Approved scope and approaches, Global Constraints, Progress, Review Focus, Supabase RLS Implementation Plan, Task 1: Enable and verify RLS

### Community 31 - "logger.ts"
Cohesion: 0.21
Nodes (8): AppConfig, createLogger(), LoggerOptions, redactedPaths, sanitizeLogValue(), sensitiveKeys, createSilentLogger(), captureLogger()

### Community 32 - "discord.js"
Cohesion: 0.17
Nodes (6): Task 5: Discord client and interaction registry, discord.js, InteractionHandler, InteractionRegistry, safeFailureResponse, StatusCommand

### Community 34 - "prisma/client.ts"
Cohesion: 0.08
Nodes (13): $Enums, PrismaClient, TemporaryRoom, VoiceCreator, CreateTemporaryRoomInput, PrismaTemporaryRoomRepository, TemporaryRoomTransitionError, trackedStatuses (+5 more)

### Community 36 - "enums.ts"
Cohesion: 0.22
Nodes (7): Task 1: Persist Voice Creator and Temporary Room State, $Enums, TemporaryRoom, VoiceCreator, RoomVisibility, TemporaryRoomStatus, SetupCustomId

## Knowledge Gaps
- **3 isolated node(s):** `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 604 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `prismaNamespaceBrowser.ts` to `prismaNamespace.ts`, `prisma/client.ts`, `package.json`, `class.ts`, `TemporaryRoom.ts`, `VoiceCreator.ts`, `commonInputTypes.ts`?**
  _High betweenness centrality (0.158) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `SetupService` (e.g. with `Task 2: Add Voice Creator Repository and Setup Service` and `Task 3: Build the Private Setup Dashboard`) actually correct?**
  _`SetupService` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `prismaNamespace.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.01694915254237288 - nodes in this community are weakly interconnected._
- **Why does `InteractionRegistry` connect `discord.js` to `application.ts`, `Arquitetura do Charon`, `File Structure`, `Charon v0.2.0 — Setup e Join-to-Create`, `logger.ts`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `VoiceCreatorRepository` (e.g. with `Task 2: Add Voice Creator Repository and Setup Service` and `Task 6: Implement Temporary Room Lifecycle and Compensation`) actually correct?**
  _`VoiceCreatorRepository` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `prismaNamespaceBrowser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._