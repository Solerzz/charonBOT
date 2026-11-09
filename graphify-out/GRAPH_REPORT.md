# Graph Report - feature-v0.3.0-posse-controles  (2026-11-09)

## Corpus Check
- 127 files · ~109,695 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .prisma 1)

## Summary
- 1667 nodes · 3293 edges · 69 communities (56 shown, 13 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 198 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e00e6519`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Graphify Knowledge Graph (graphify-out)
- prismaNamespace.ts
- prisma.ts
- prismaNamespaceBrowser.ts
- package.json
- DiscordClientPort
- local-database
- Charon
- class.ts
- Charon v1 — Design
- compilerOptions
- compilerOptions
- TemporaryRoom.ts
- setup.interactions.test.ts
- File Structure
- Charon v0.1.0 — Infraestrutura
- pull_request_template.md
- PrismaClientBaseOptions
- VoiceCreator.ts
- setup.command.ts
- commonInputTypes.ts
- Charon v0.2.0 — Setup e Join-to-Create
- RoomActionError
- TemporaryRoomDelegate
- VoiceCreatorDelegate
- RoomStateRepository
- Review Focus
- DiscordSetupGateway
- Supabase RLS Implementation Plan
- Prisma__TemporaryRoomClient
- Prisma__VoiceCreatorClient
- RoomAllowedMember.ts
- RoomStateRepository
- RoomPresence.ts
- RoomDiscordGateway
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
- interaction-registry.test.ts
- DiscordCallGateway
- Retomar o Charon após formatar o computador
- RoomActor
- PrismaVoiceCreatorRepository
- @prisma/client
- SetupService
- ownership.service.ts
- ownership-database.test.ts
- Prisma__PendingOwnershipTransferClient
- Prisma__RoomAllowedMemberClient
- Prisma__RoomPresenceClient
- InteractionHandler
- vitest
- setup.command.ts
- buildSetupDashboard
- Changelog
- Charon v0.2.0 — Setup e join-to-create
- Arquitetura do Charon
- Charon v0.3.0 — posse e controles
- Charon v0.2.0 — registro de validação
- Validação local v0.3.0

## God Nodes (most connected - your core abstractions)
1. `RoomDiscordGateway` - 58 edges
2. `RoomActionError` - 57 edges
3. `vitest` - 49 edges
4. `discord.js` - 41 edges
5. `DiscordRoomGateway` - 39 edges
6. `DiscordCallGateway` - 34 edges
7. `RoomStateRepository` - 33 edges
8. `RoomActor` - 33 edges
9. `PrismaRoomStateRepository` - 31 edges
10. `TransferService` - 27 edges

## Surprising Connections (you probably didn't know these)
- `Global Constraints` --references--> `InteractionRegistry`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-v0.2.0-setup-join-to-create.md → src/core/discord/interactions/interaction-registry.ts
- `Arquitetura` --references--> `InteractionRegistry`  [INFERRED]
  docs/superpowers/specs/2026-11-05-charon-v0.2.0-setup-join-to-create-design.md → src/core/discord/interactions/interaction-registry.ts
- `Verificação` --references--> `assertDisposableDatabaseEnvironment()`  [INFERRED]
  docs/architecture.md → tests/integration/database-test-utils.ts
- `Task 5: Private-room access and owner settings` --references--> `requireOwnedRoom()`  [INFERRED]
  docs/superpowers/plans/2026-11-08-charon-v0.3.0-posse-controles.md → src/modules/calls/room-context.ts
- `Task 3: Structured logger` --references--> `createLogger()`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-stage-1-infrastructure.md → src/core/logger/logger.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify Maintenance and Usage Workflow** — agents_graphify_command, agents_graphify_query, agents_graphify_update, agents_graph_json, agents_graph_report, agents_wiki_index [INFERRED 0.75]

## Communities (69 total, 13 thin omitted)

### Community 0 - "Graphify Knowledge Graph (graphify-out)"
Cohesion: 0.33
Nodes (7): graphify-out/graph.json, graphify-out/GRAPH_REPORT.md, /graphify User Command, Graphify Knowledge Graph (graphify-out), graphify query / path / explain Commands, graphify update Command, graphify-out/wiki/index.md

### Community 1 - "prismaNamespace.ts"
Cohesion: 0.02
Nodes (120): AnyNull, Args, At, AtLeast, AtLoose, AtStrict, BatchPayload, Boolean (+112 more)

### Community 2 - "prisma.ts"
Cohesion: 0.18
Nodes (10): Task 4: Prisma adapter, checkDatabase(), createPrismaClient(), DatabaseClient, disconnectDatabase(), disconnectedClients, assertDisposableDatabaseEnvironment(), fixture() (+2 more)

### Community 3 - "prismaNamespaceBrowser.ts"
Cohesion: 0.12
Nodes (15): AnyNull, DbNull, Decimal, JsonNull, ModelName, NullsOrder, NullTypes, PendingOwnershipTransferScalarFieldEnum (+7 more)

### Community 4 - "package.json"
Cohesion: 0.06
Nodes (39): dependencies, discord.js@14.28.1, dotenv@18.0.9, pg@8.23.1, pino@10.4.0, @prisma/adapter-pg@7.10.1, @prisma/client@7.10.1, zod@4.6.7 (+31 more)

### Community 6 - "local-database"
Cohesion: 0.06
Nodes (37): DATABASE_URL, DIRECT_URL, POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, RUN_DATABASE_SECURITY_TESTS, RUN_DATABASE_TESTS, jobs (+29 more)

### Community 7 - "Charon"
Cohesion: 0.25
Nodes (8): Charon, Comandos, Desenvolvimento, Instalação, Posse e controles da v0.3.0, Requisitos, Segurança, Variáveis de ambiente

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

### Community 14 - "File Structure"
Cohesion: 0.13
Nodes (13): Calls module, Charon v0.2.0 Setup and Join-to-Create Implementation Plan, Composition, registration, and documentation, File Structure, Global Constraints, Persistence and shared utilities, Review Focus, Setup module (+5 more)

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
Cohesion: 0.21
Nodes (10): Task 2: Validated configuration, AppConfig, environmentSchema, loadConfig(), postgresUrl, LoggerOptions, redactedPaths, sanitizeLogValue() (+2 more)

### Community 20 - "commonInputTypes.ts"
Cohesion: 0.05
Nodes (39): BoolFilter, BoolWithAggregatesFilter, DateTimeFilter, DateTimeNullableFilter, DateTimeNullableWithAggregatesFilter, DateTimeWithAggregatesFilter, EnumRoomVisibilityFilter, EnumRoomVisibilityWithAggregatesFilter (+31 more)

### Community 21 - "Charon v0.2.0 — Setup e Join-to-Create"
Cohesion: 0.07
Nodes (37): 1. Painel administrativo persistente no canal, 2. Painel administrativo privado temporário — escolhida, 3. Assistente linear passo a passo, Abordagens consideradas, Antiobjetivos, Arquitetura, Charon v0.2.0 — Setup e Join-to-Create, Compensação de falhas (+29 more)

### Community 22 - "RoomActionError"
Cohesion: 0.25
Nodes (11): RoomVisibility, allowedUnion(), assertSnapshot(), RoomAccessService, Dependencies, commitRoomMutation(), currentOwnedRoom(), safeRoomAction() (+3 more)

### Community 25 - "RoomStateRepository"
Cohesion: 0.07
Nodes (14): PrismaClient, CreateTemporaryRoomInput, invalidateControls, PrismaTemporaryRoomRepository, TemporaryRoomRecord, TemporaryRoomTransitionError, trackedStatuses, activeWhere() (+6 more)

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

### Community 32 - "RoomStateRepository"
Cohesion: 0.09
Nodes (3): Shared contracts — define once, reuse in later tasks, RoomStateRepository, RoomSettingsPatch

### Community 33 - "RoomPresence.ts"
Cohesion: 0.03
Nodes (74): AggregateRoomPresence, GetRoomPresenceAggregateType, GetRoomPresenceGroupByPayload, RoomPresenceAggregateArgs, RoomPresenceCountAggregateInputType, RoomPresenceCountAggregateOutputType, RoomPresenceCountArgs, RoomPresenceCountOrderByAggregateInput (+66 more)

### Community 34 - "RoomDiscordGateway"
Cohesion: 0.19
Nodes (4): RoomControlsService, RoomPanelService, createRoomRuntime(), RoomDiscordGateway

### Community 35 - "PendingOwnershipTransfer.ts"
Cohesion: 0.03
Nodes (73): AggregatePendingOwnershipTransfer, GetPendingOwnershipTransferAggregateType, GetPendingOwnershipTransferGroupByPayload, PendingOwnershipTransferAggregateArgs, PendingOwnershipTransferAvgAggregateInputType, PendingOwnershipTransferAvgAggregateOutputType, PendingOwnershipTransferAvgOrderByAggregateInput, PendingOwnershipTransferCountAggregateInputType (+65 more)

### Community 36 - "enums.ts"
Cohesion: 0.22
Nodes (7): $Enums, PendingOwnershipTransfer, RoomAllowedMember, RoomPresence, TemporaryRoom, VoiceCreator, TemporaryRoomStatus

### Community 37 - "Charon v0.3.0 — posse e controles"
Cohesion: 0.08
Nodes (24): 10. Ciclo de vida e falhas — propostas técnicas, 11. Verificação e limites operacionais, 12. Fora do escopo e liberdade de implementação, 1. Objetivo e contexto, 2. Origem das decisões, 3. Abordagens de interação, 4. Painel e controles, 5. Posse e elegibilidade (+16 more)

### Community 38 - "call.schemas.ts"
Cohesion: 0.07
Nodes (38): Calls: fluxo de eventos, Interações, Painel B, posse e acesso, Setup, Task 6: Implement Temporary Room Lifecycle and Compensation, Baseline, isolation and test environment, Charon v0.3.0 Ownership and Room Controls Implementation Plan, File Structure (+30 more)

### Community 39 - "application.ts"
Cohesion: 0.20
Nodes (5): dotenv, Application, registerShutdownSignals(), SignalSource, start()

### Community 40 - "application.test.ts"
Cohesion: 0.15
Nodes (17): Task 7: Wire Setup and Voice Events into the Application, pino, ApplicationOverrides, createApplication(), createDefaultDispatcher(), createDefaultVoiceDispatcher(), fetch(), hasRuntimeRepositories() (+9 more)

### Community 44 - "setup.interactions.ts"
Cohesion: 0.23
Nodes (14): SetupCategory, SetupVoiceChannel, voicePermissions, GuildBasedInteraction, decodeSetupCustomId(), discordIdSchema, encodeSetupCustomId(), setupChannelNameSchema (+6 more)

### Community 45 - ".execute"
Cohesion: 0.27
Nodes (3): SetupDiscordGateway, isGuildBased(), SetupChannelGateway

### Community 46 - "interaction-registry.test.ts"
Cohesion: 0.19
Nodes (4): Task 5: Discord client and interaction registry, createDiscordClient(), InteractionRegistry, createSilentLogger()

### Community 47 - "DiscordCallGateway"
Cohesion: 0.09
Nodes (5): CallDiscordError, DiscordCallGateway, isUnknownChannel(), DiscordRoomGateway, hasCode()

### Community 48 - "Retomar o Charon após formatar o computador"
Cohesion: 0.33
Nodes (6): Antes de formatar: salvar fora do Git, De onde continuar, O que está salvo no GitHub, Recuperar o projeto, Retomar a validação da v0.3.0, Retomar o Charon após formatar o computador

### Community 49 - "RoomActor"
Cohesion: 0.32
Nodes (4): PendingOwnershipTransfer, RoomActor, safe(), TransferService

### Community 50 - "PrismaVoiceCreatorRepository"
Cohesion: 0.15
Nodes (8): Task 2: Add Voice Creator Repository and Setup Service, VoiceCreator, isPrismaErrorWithCode(), PrismaVoiceCreatorRepository, VoiceCreatorAlreadyConfiguredError, VoiceCreatorNotFoundError, firstCreator, secondCreator

### Community 51 - "@prisma/client"
Cohesion: 0.22
Nodes (4): config, decodeBase64AsWasm(), LogOptions, PrismaClientConstructor

### Community 52 - "SetupService"
Cohesion: 0.11
Nodes (10): Task 7: Idempotent panel synchronization and setup toggle propagation, CreateVoiceCreatorInput, VoiceCreatorConfiguration, VoiceCreatorRepository, SetupService, botPermissions, configuration, fixture() (+2 more)

### Community 53 - "ownership.service.ts"
Cohesion: 0.21
Nodes (9): Task 3: Continuous presence and five-minute claim priority, requireActiveRoom(), requireOwnedRoom(), RoomSnapshot, matchesGeneration(), matchesSnapshot(), OwnershipDependencies, OwnershipService (+1 more)

### Community 54 - "ownership-database.test.ts"
Cohesion: 0.13
Nodes (17): Lock and permission contracts, CallInteraction, Dependencies, RoomCoordinator, Overwrite, Dependencies, ConfiguredRoom, trackedStatuses (+9 more)

### Community 58 - "InteractionHandler"
Cohesion: 0.17
Nodes (4): Task 8: Wire interactions, voice lifecycle and one shared room runtime, InteractionHandler, CallInteractions, StatusCommand

### Community 59 - "vitest"
Cohesion: 0.07
Nodes (54): Task 5: Build the Disabled Minimalist Call Panel, discord.js, vitest, createLogger(), $Enums, RoomAllowedMember, RoomPresence, TemporaryRoom (+46 more)

### Community 60 - "setup.command.ts"
Cohesion: 0.26
Nodes (5): commandDefinitions, CommandRegistrar, registerCommands(), setupCommandData, config

### Community 61 - "buildSetupDashboard"
Cohesion: 0.50
Nodes (4): buildSetupDashboard(), first, json(), second

### Community 62 - "Changelog"
Cohesion: 0.25
Nodes (8): [0.1.0] - 2026-11-05, [0.2.0] - 2026-11-06, 0.3.0 — preparação local em 2026-11-09 (não publicada), Added, Added, Changelog, Known limitations, [Unreleased]

### Community 63 - "Charon v0.2.0 — Setup e join-to-create"
Cohesion: 0.29
Nodes (5): Banco e verificação local, Charon v0.2.0 — Setup e join-to-create, Entregas, Estado desta preparação, Limitações operacionais

### Community 65 - "Arquitetura do Charon"
Cohesion: 0.33
Nodes (6): Arquitetura do Charon, Banco de dados, Estilo, Estrutura na v0.3.0 (preparação local), Fluxo de inicialização, Verificação

### Community 66 - "Charon v0.3.0 — posse e controles"
Cohesion: 0.40
Nodes (5): Banco local e CI (sem credenciais remotas), Charon v0.3.0 — posse e controles, Entrega implementada, Permissões e limites operacionais, Validação e checklist humano

### Community 67 - "Charon v0.2.0 — registro de validação"
Cohesion: 0.40
Nodes (5): Charon v0.2.0 — registro de validação, Discord real: verificações observadas, Limpeza e limites, PostgreSQL real: aprovado, Versão verificada

### Community 68 - "Validação local v0.3.0"
Cohesion: 0.50
Nodes (4): CI, segurança dos artefatos e limites, RED → GREEN e caracterizações, Resultados observados, Validação local v0.3.0

## Knowledge Gaps
- **3 isolated node(s):** `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1026 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `package.json` to `prismaNamespace.ts`, `RoomPresence.ts`, `prismaNamespaceBrowser.ts`, `PendingOwnershipTransfer.ts`, `TemporaryRoom.ts`, `VoiceCreator.ts`, `@prisma/client`, `commonInputTypes.ts`, `vitest`, `RoomAllowedMember.ts`?**
  _High betweenness centrality (0.182) - this node is a cross-community bridge._
- **What connects `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `prismaNamespace.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.01652892561983471 - nodes in this community are weakly interconnected._
- **Why does `InteractionRegistry` connect `interaction-registry.test.ts` to `call.schemas.ts`, `application.test.ts`, `File Structure`, `Charon v0.2.0 — Setup e Join-to-Create`, `InteractionHandler`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Should `prismaNamespaceBrowser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Why does `VoiceCreatorDelegate` connect `VoiceCreatorDelegate` to `VoiceCreator.ts`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05807200929152149 - nodes in this community are weakly interconnected._