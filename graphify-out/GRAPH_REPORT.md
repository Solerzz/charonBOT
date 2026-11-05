# Graph Report - feature-etapa-1-infraestrutura  (2026-11-05)

## Corpus Check
- 41 files · ~9,617 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .prisma 1)

## Summary
- 373 nodes · 514 edges · 18 communities
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `51f98983`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Graphify Knowledge Graph (graphify-out)
- prismaNamespace.ts
- application.ts
- class.ts
- package.json
- register-commands.ts
- steps
- Arquitetura do Charon
- prisma.ts
- Charon v1 — Design
- compilerOptions
- compilerOptions
- scripts
- Review Focus
- Changelog
- Charon v0.1.0 — Infraestrutura
- pull_request_template.md
- PrismaClientBaseOptions

## God Nodes (most connected - your core abstractions)
1. `Charon v1 — Design` - 13 edges
2. `discord.js` - 12 edges
3. `vitest` - 12 edges
4. `compilerOptions` - 11 edges
5. `createApplication()` - 10 edges
6. `InteractionRegistry` - 10 edges
7. `PrismaClient` - 10 edges
8. `scripts` - 9 edges
9. `AppConfig` - 9 edges
10. `InteractionHandler` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Interações` --references--> `InteractionRegistry`  [INFERRED]
  docs/architecture.md → src/core/discord/interactions/interaction-registry.ts
- `Task 3: Structured logger` --references--> `createLogger()`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-stage-1-infrastructure.md → src/core/logger/logger.ts
- `Task 2: Validated configuration` --references--> `AppConfig`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-stage-1-infrastructure.md → src/core/config/env.ts
- `Task 2: Validated configuration` --references--> `loadConfig()`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-stage-1-infrastructure.md → src/core/config/env.ts
- `Task 4: Prisma adapter` --references--> `createPrismaClient()`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-stage-1-infrastructure.md → src/core/database/prisma.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify Maintenance and Usage Workflow** — agents_graphify_command, agents_graphify_query, agents_graphify_update, agents_graph_json, agents_graph_report, agents_wiki_index [INFERRED 0.75]

## Communities (18 total, 0 thin omitted)

### Community 0 - "Graphify Knowledge Graph (graphify-out)"
Cohesion: 0.33
Nodes (7): graphify-out/graph.json, graphify-out/GRAPH_REPORT.md, /graphify User Command, Graphify Knowledge Graph (graphify-out), graphify query / path / explain Commands, graphify update Command, graphify-out/wiki/index.md

### Community 1 - "prismaNamespace.ts"
Cohesion: 0.02
Nodes (99): AnyNull, Args, At, AtLeast, AtLoose, AtStrict, BatchPayload, Boolean (+91 more)

### Community 2 - "application.ts"
Cohesion: 0.08
Nodes (19): Task 5: Discord client and interaction registry, discord.js, pino, createDefaultDispatcher(), DiscordClientPort, InteractionDispatcher, SignalSource, AppConfig (+11 more)

### Community 3 - "class.ts"
Cohesion: 0.06
Nodes (16): @prisma/client@7.10.1, @prisma/client, $Enums, $Enums, config, decodeBase64AsWasm(), LogOptions, PrismaClient (+8 more)

### Community 4 - "package.json"
Cohesion: 0.09
Nodes (29): dependencies, discord.js@14.28.1, dotenv@18.0.9, pg@8.23.1, pino@10.4.0, @prisma/adapter-pg@7.10.1, zod@4.6.7, devDependencies (+21 more)

### Community 5 - "register-commands.ts"
Cohesion: 0.11
Nodes (13): Task 2: Validated configuration, vitest, commandDefinitions, CommandRegistrar, registerCommands(), Application, registerShutdownSignals(), environmentSchema (+5 more)

### Community 6 - "steps"
Cohesion: 0.11
Nodes (18): jobs, verify, name, on, pull_request, push, permissions, contents (+10 more)

### Community 7 - "Arquitetura do Charon"
Cohesion: 0.12
Nodes (14): Arquitetura do Charon, Banco de dados, Estilo, Estrutura da Etapa 1, Fluxo de inicialização, Interações, Próximos módulos, Charon (+6 more)

### Community 8 - "prisma.ts"
Cohesion: 0.25
Nodes (9): Task 4: Prisma adapter, ApplicationOverrides, createApplication(), checkDatabase(), createPrismaClient(), DatabaseClient, disconnectDatabase(), disconnectedClients (+1 more)

### Community 9 - "Charon v1 — Design"
Cohesion: 0.14
Nodes (13): Administrative setup, Architecture, Charon v1 — Design, Intent, Non-goals for v1, Ownership, Persistence and recovery, Releases (+5 more)

### Community 10 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, module, moduleResolution, noUncheckedIndexedAccess, skipLibCheck (+4 more)

### Community 11 - "compilerOptions"
Cohesion: 0.18
Nodes (10): ./tsconfig.json, compilerOptions, declaration, outDir, rootDir, sourceMap, types, exclude (+2 more)

### Community 12 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, commands:register, dev, prisma:generate, start, test, test:run (+1 more)

### Community 13 - "Review Focus"
Cohesion: 0.25
Nodes (7): Charon Stage 1 Infrastructure Implementation Plan, Global Constraints, Review Focus, Task 1: Project foundation, Task 3: Structured logger, Task 6: Application lifecycle and status command, Task 7: CI, documentation, and release readiness

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

## Knowledge Gaps
- **3 isolated node(s):** `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 237 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `class.ts` to `prismaNamespace.ts`, `package.json`?**
  _High betweenness centrality (0.131) - this node is a cross-community bridge._
- **What connects `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `prismaNamespace.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.02 - nodes in this community are weakly interconnected._
- **Why does `InteractionRegistry` connect `application.ts` to `Arquitetura do Charon`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Should `application.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08325624421831637 - nodes in this community are weakly interconnected._
- **Why does `Interações` connect `Arquitetura do Charon` to `application.ts`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Should `class.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06006006006006006 - nodes in this community are weakly interconnected._