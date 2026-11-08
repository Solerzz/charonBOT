# Graph Report - Charon - BOT  (2026-11-06)

## Corpus Check
- Corpus is ~10,542 words - fits in a single context window. You may not need a graph.

## Summary
- 360 nodes · 494 edges · 21 communities (16 shown, 5 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Generated Prisma Client Types
- Application Lifecycle Wiring
- Package Manifest and Dependencies
- Discord Interaction Registry
- CI Workflow Configuration
- Prisma Generated Client and Enums
- PrismaClient Runtime Class
- Env Config and Command Registration
- Project Documentation and Roadmap
- TypeScript Compiler Config
- Build tsconfig Output Config
- Startup Security and Config
- graphify Agent Rules
- Voice Rooms and Ownership
- Design Spec and Release Process
- Prisma Client Options Types
- Interaction Registry Docs
- Project Foundation Scripts
- Moderation by Vote
- Reputation System

## God Nodes (most connected - your core abstractions)
1. `discord.js` - 12 edges
2. `vitest` - 12 edges
3. `compilerOptions` - 11 edges
4. `createApplication()` - 10 edges
5. `PrismaClient` - 10 edges
6. `scripts` - 9 edges
7. `InteractionHandler` - 9 edges
8. `InteractionRegistry` - 9 edges
9. `AppConfig` - 8 edges
10. `DatabaseClient` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Changelog - Charon 0.1.0` --semantically_similar_to--> `Charon v0.1.0 Release Notes`  [INFERRED] [semantically similar]
  CHANGELOG.md → docs/releases/v0.1.0.md
- `Stage 1 Review Focus (fail-fast, redaction, idempotent shutdown)` --semantically_similar_to--> `Security Practices (fail-fast startup, log redaction, private errors)`  [INFERRED] [semantically similar]
  docs/superpowers/plans/2026-11-05-charon-stage-1-infrastructure.md → README.md
- `Security Practices (fail-fast startup, log redaction, private errors)` --semantically_similar_to--> `Security Requirements (server-side Zod validation, no credential logging)`  [INFERRED] [semantically similar]
  README.md → docs/superpowers/specs/2026-11-05-charon-v1-design.md
- `createSilentLogger()` --calls--> `createLogger()`  [EXTRACTED]
  tests/unit/core/discord/interaction-registry.test.ts → src/core/logger/logger.ts
- `captureLogger()` --calls--> `createLogger()`  [EXTRACTED]
  tests/unit/core/logger/logger.test.ts → src/core/logger/logger.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify Maintenance and Usage Workflow** — agents_graphify_command, agents_graphify_query, agents_graphify_update, agents_graph_json, agents_graph_report, agents_wiki_index [INFERRED 0.75]
- **Stage 1 Infrastructure Plan Tasks** — docs_superpowers_plans_2026_11_05_charon_stage_1_infrastructure_task_1_project_foundation, docs_superpowers_plans_2026_11_05_charon_stage_1_infrastructure_task_2_validated_configuration, docs_superpowers_plans_2026_11_05_charon_stage_1_infrastructure_task_3_structured_logger, docs_superpowers_plans_2026_11_05_charon_stage_1_infrastructure_task_4_prisma_adapter, docs_superpowers_plans_2026_11_05_charon_stage_1_infrastructure_task_5_discord_client_and_interaction_registry, docs_superpowers_plans_2026_11_05_charon_stage_1_infrastructure_task_6_application_lifecycle_and_status_command, docs_superpowers_plans_2026_11_05_charon_stage_1_infrastructure_task_7_ci_documentation_and_release_readiness [EXTRACTED 1.00]
- **Charon v1 Product Domains** — docs_superpowers_specs_2026_11_05_charon_v1_design_voice_creators, docs_superpowers_specs_2026_11_05_charon_v1_design_temporary_voice_rooms, docs_superpowers_specs_2026_11_05_charon_v1_design_room_ownership, docs_superpowers_specs_2026_11_05_charon_v1_design_moderation_by_vote, docs_superpowers_specs_2026_11_05_charon_v1_design_reputation_system [INFERRED 0.85]
- **Fail-fast Startup Safety Pattern** — readme_security_practices, docs_architecture_startup_flow, docs_superpowers_plans_2026_11_05_charon_stage_1_infrastructure_review_focus, docs_superpowers_plans_2026_11_05_charon_stage_1_infrastructure_task_2_validated_configuration, docs_superpowers_plans_2026_11_05_charon_stage_1_infrastructure_task_6_application_lifecycle_and_status_command [INFERRED 0.85]

## Communities (21 total, 5 thin omitted)

### Community 0 - "Generated Prisma Client Types"
Cohesion: 0.02
Nodes (99): AnyNull, Args, At, AtLeast, AtLoose, AtStrict, BatchPayload, Boolean (+91 more)

### Community 1 - "Application Lifecycle Wiring"
Cohesion: 0.08
Nodes (23): vitest, Application, ApplicationOverrides, createApplication(), DiscordClientPort, InteractionDispatcher, registerShutdownSignals(), SignalSource (+15 more)

### Community 2 - "Package Manifest and Dependencies"
Cohesion: 0.06
Nodes (39): dependencies, discord.js@14.28.1, dotenv@18.0.9, pg@8.23.1, pino@10.4.0, @prisma/adapter-pg@7.10.1, zod@4.6.7, devDependencies (+31 more)

### Community 3 - "Discord Interaction Registry"
Cohesion: 0.15
Nodes (7): discord.js, createDefaultDispatcher(), createDiscordClient(), InteractionHandler, InteractionRegistry, safeFailureResponse, StatusCommand

### Community 4 - "CI Workflow Configuration"
Cohesion: 0.11
Nodes (18): jobs, verify, name, on, pull_request, push, permissions, contents (+10 more)

### Community 5 - "Prisma Generated Client and Enums"
Cohesion: 0.12
Nodes (11): @prisma/client@7.10.1, @prisma/client, $Enums, $Enums, AnyNull, DbNull, Decimal, JsonNull (+3 more)

### Community 6 - "PrismaClient Runtime Class"
Cohesion: 0.11
Nodes (5): config, decodeBase64AsWasm(), LogOptions, PrismaClient, PrismaClientConstructor

### Community 7 - "Env Config and Command Registration"
Cohesion: 0.18
Nodes (9): commandDefinitions, CommandRegistrar, registerCommands(), AppConfig, environmentSchema, loadConfig(), postgresUrl, validEnvironment (+1 more)

### Community 8 - "Project Documentation and Roadmap"
Cohesion: 0.19
Nodes (10): PR Verification Checklist, Changelog - Charon 0.1.0, Arquitetura do Charon (architecture document), Planned Modules (setup, calls, ownership, moderation, reputation), Charon v0.1.0 Release Notes, Task 6: Application lifecycle and status command, Task 7: CI, documentation, and release readiness, Feature-First Module Structure (setup, calls, ownership, moderation, reputation) (+2 more)

### Community 9 - "TypeScript Compiler Config"
Cohesion: 0.15
Nodes (12): compilerOptions, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, module, moduleResolution, noUncheckedIndexedAccess, skipLibCheck (+4 more)

### Community 10 - "Build tsconfig Output Config"
Cohesion: 0.18
Nodes (10): ./tsconfig.json, compilerOptions, declaration, outDir, rootDir, sourceMap, types, exclude (+2 more)

### Community 11 - "Startup Security and Config"
Cohesion: 0.20
Nodes (6): Prisma 7 + Supabase PostgreSQL Adapter, Startup Initialization Flow, Task 2: Validated configuration, Task 3: Structured logger, Task 4: Prisma adapter, Environment Variable Configuration

### Community 12 - "graphify Agent Rules"
Cohesion: 0.33
Nodes (7): graphify-out/graph.json, graphify-out/GRAPH_REPORT.md, /graphify User Command, Graphify Knowledge Graph (graphify-out), graphify query / path / explain Commands, graphify update Command, graphify-out/wiki/index.md

### Community 13 - "Voice Rooms and Ownership"
Cohesion: 0.50
Nodes (4): v0.2.0 Scope - Voice Creators and Temporary Calls, Room Ownership and Claim Priority, Temporary Voice Rooms (join-to-create), Voice Creators

### Community 14 - "Design Spec and Release Process"
Cohesion: 0.50
Nodes (3): Charon Stage 1 Infrastructure Implementation Plan, superpowers subagent-driven-development / executing-plans skills, Charon v1 Design Spec

### Community 15 - "Prisma Client Options Types"
Cohesion: 0.67
Nodes (3): PrismaClientBaseOptions, PrismaClientOptionsWithAccelerateUrl, PrismaClientOptionsWithAdapter

## Knowledge Gaps
- **16 isolated node(s):** `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md`, `PR Verification Checklist`, `Environment Variable Configuration` (+11 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 221 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `Prisma Generated Client and Enums` to `Generated Prisma Client Types`, `Package Manifest and Dependencies`, `PrismaClient Runtime Class`?**
  _High betweenness centrality (0.136) - this node is a cross-community bridge._
- **What connects `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md` to the rest of the system?**
  _16 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Generated Prisma Client Types` be split into smaller, more focused modules?**
  _Cohesion score 0.02 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `Application Lifecycle Wiring` to `Package Manifest and Dependencies`, `Discord Interaction Registry`, `Env Config and Command Registration`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Should `Application Lifecycle Wiring` be split into smaller, more focused modules?**
  _Cohesion score 0.0782312925170068 - nodes in this community are weakly interconnected._
- **Why does `discord.js` connect `Discord Interaction Registry` to `Application Lifecycle Wiring`, `Package Manifest and Dependencies`, `Env Config and Command Registration`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Should `Package Manifest and Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06219512195121951 - nodes in this community are weakly interconnected._