# Graph Report - feature-v0.3.0-posse-controles  (2026-11-10)

## Corpus Check
- 134 files · ~127,134 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .prisma 1)

## Summary
- 1768 nodes · 3532 edges · 79 communities (64 shown, 15 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 223 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3872b646`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Graphify Knowledge Graph (graphify-out)
- prismaNamespace.ts
- RoomActor
- prismaNamespaceBrowser.ts
- package.json
- RoomStateRepository
- local-database
- Charon
- class.ts
- Charon v1 — Design
- compilerOptions
- compilerOptions
- TemporaryRoom.ts
- createRoomRuntime
- File Structure
- Charon v0.1.0 — Infraestrutura
- pull_request_template.md
- PrismaClientBaseOptions
- VoiceCreator.ts
- DiscordRoomGateway
- commonInputTypes.ts
- Charon v0.2.0 — Setup e Join-to-Create
- application.ts
- TemporaryRoomDelegate
- VoiceCreatorDelegate
- createRoomRuntime
- Review Focus
- DiscordSetupGateway
- Supabase RLS Implementation Plan
- Prisma__TemporaryRoomClient
- Prisma__VoiceCreatorClient
- RoomAllowedMember.ts
- Charon — criação guiada de canais de entrada
- RoomPresence.ts
- OwnershipService
- PendingOwnershipTransfer.ts
- enums.ts
- Charon v0.3.0 — posse e controles
- .handleVoiceTransition
- call.interactions.ts
- discord.js
- PendingOwnershipTransferDelegate
- RoomAllowedMemberDelegate
- RoomPresenceDelegate
- setup.interactions.ts
- RoomActionError
- setup-drafts.ts
- prisma.ts
- Retomar o Charon após formatar o computador
- Setup guiado do Charon Implementation Plan
- prisma/client.ts
- @prisma/client
- SetupService
- DiscordSetupGateway
- ownership-database.test.ts
- Prisma__PendingOwnershipTransferClient
- Prisma__RoomAllowedMemberClient
- Prisma__RoomPresenceClient
- DiscordRoomGateway
- vitest
- setup.command.ts
- createLogger
- Changelog
- Charon v0.2.0 — Setup e join-to-create
- Arquitetura do Charon
- Charon v0.3.0 — posse e controles
- Charon v0.2.0 — registro de validação
- Validação local v0.3.0
- setup.repository.ts
- enums.ts
- ownership.fixtures.ts
- Charon v0.3.0 Ownership and Room Controls Implementation Plan
- application.test.ts
- PrismaVoiceCreatorRepository
- RoomActionError
- call.discord.ts
- VoiceCreatorConfiguration
- KeyedMutex

## God Nodes (most connected - your core abstractions)
1. `RoomActionError` - 59 edges
2. `RoomDiscordGateway` - 58 edges
3. `vitest` - 51 edges
4. `discord.js` - 41 edges
5. `DiscordRoomGateway` - 39 edges
6. `createRoomRuntime()` - 36 edges
7. `DiscordCallGateway` - 34 edges
8. `RoomActor` - 33 edges
9. `RoomStateRepository` - 33 edges
10. `TransferService` - 31 edges

## Surprising Connections (you probably didn't know these)
- `Task 7: Idempotent panel synchronization and setup toggle propagation` --references--> `SetupService`  [INFERRED]
  docs/superpowers/plans/2026-11-08-charon-v0.3.0-posse-controles.md → src/modules/setup/setup.service.ts
- `Global Constraints` --references--> `InteractionRegistry`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-v0.2.0-setup-join-to-create.md → src/core/discord/interactions/interaction-registry.ts
- `Arquitetura` --references--> `InteractionRegistry`  [INFERRED]
  docs/superpowers/specs/2026-11-05-charon-v0.2.0-setup-join-to-create-design.md → src/core/discord/interactions/interaction-registry.ts
- `Contratos compartilhados do novo fluxo` --references--> `VoiceCreatorConfiguration`  [INFERRED]
  docs/superpowers/plans/2026-11-10-charon-setup-guiado.md → src/modules/setup/setup.repository.ts
- `Validação, segurança e observabilidade` --references--> `customId()`  [INFERRED]
  docs/superpowers/specs/2026-11-05-charon-v0.2.0-setup-join-to-create-design.md → src/modules/calls/call-controls.view.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify Maintenance and Usage Workflow** — agents_graphify_command, agents_graphify_query, agents_graphify_update, agents_graph_json, agents_graph_report, agents_wiki_index [INFERRED 0.75]

## Communities (79 total, 15 thin omitted)

### Community 0 - "Graphify Knowledge Graph (graphify-out)"
Cohesion: 0.33
Nodes (7): graphify-out/graph.json, graphify-out/GRAPH_REPORT.md, /graphify User Command, Graphify Knowledge Graph (graphify-out), graphify query / path / explain Commands, graphify update Command, graphify-out/wiki/index.md

### Community 1 - "prismaNamespace.ts"
Cohesion: 0.02
Nodes (120): AnyNull, Args, At, AtLeast, AtLoose, AtStrict, BatchPayload, Boolean (+112 more)

### Community 2 - "RoomActor"
Cohesion: 0.33
Nodes (4): PendingOwnershipTransfer, RoomActor, safe(), TransferService

### Community 3 - "prismaNamespaceBrowser.ts"
Cohesion: 0.12
Nodes (15): AnyNull, DbNull, Decimal, JsonNull, ModelName, NullsOrder, NullTypes, PendingOwnershipTransferScalarFieldEnum (+7 more)

### Community 4 - "package.json"
Cohesion: 0.06
Nodes (40): dependencies, discord.js@14.28.1, dotenv@18.0.9, pg@8.23.1, pino@10.4.0, @prisma/adapter-pg@7.10.1, @prisma/client@7.10.1, zod@4.6.7 (+32 more)

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
Nodes (118): AggregateTemporaryRoom, EnumRoomVisibilityFieldUpdateOperationsInput, EnumTemporaryRoomStatusFieldUpdateOperationsInput, GetTemporaryRoomAggregateType, GetTemporaryRoomGroupByPayload, NullableStringFieldUpdateOperationsInput, TemporaryRoom$allowedMembersArgs, TemporaryRoom$pendingTransferArgs (+110 more)

### Community 13 - "createRoomRuntime"
Cohesion: 0.14
Nodes (3): RoomCoordinator, createRoomRuntime(), transferRuntime()

### Community 14 - "File Structure"
Cohesion: 0.17
Nodes (11): Calls module, Charon v0.2.0 Setup and Join-to-Create Implementation Plan, Composition, registration, and documentation, File Structure, Global Constraints, Persistence and shared utilities, Review Focus, Setup module (+3 more)

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
Cohesion: 0.02
Nodes (81): AggregateVoiceCreator, BoolFieldUpdateOperationsInput, DateTimeFieldUpdateOperationsInput, GetVoiceCreatorAggregateType, GetVoiceCreatorGroupByPayload, IntFieldUpdateOperationsInput, NullableDateTimeFieldUpdateOperationsInput, StringFieldUpdateOperationsInput (+73 more)

### Community 19 - "DiscordRoomGateway"
Cohesion: 0.13
Nodes (3): CallDiscordError, DiscordCallGateway, isUnknownChannel()

### Community 20 - "commonInputTypes.ts"
Cohesion: 0.05
Nodes (39): BoolFilter, BoolWithAggregatesFilter, DateTimeFilter, DateTimeNullableFilter, DateTimeNullableWithAggregatesFilter, DateTimeWithAggregatesFilter, EnumRoomVisibilityFilter, EnumRoomVisibilityWithAggregatesFilter (+31 more)

### Community 21 - "Charon v0.2.0 — Setup e Join-to-Create"
Cohesion: 0.08
Nodes (25): 1. Painel administrativo persistente no canal, 2. Painel administrativo privado temporário — escolhida, 3. Assistente linear passo a passo, Abordagens consideradas, Antiobjetivos, Arquitetura, Charon v0.2.0 — Setup e Join-to-Create, Compensação de falhas (+17 more)

### Community 22 - "application.ts"
Cohesion: 0.16
Nodes (13): Task 7: Wire Setup and Voice Events into the Application, ApplicationOverrides, createApplication(), createDefaultVoiceDispatcher(), DiscordClientPort, fetch(), hasRuntimeRepositories(), waitForDiscordReady() (+5 more)

### Community 25 - "createRoomRuntime"
Cohesion: 0.11
Nodes (6): TemporaryRoomRecord, activeWhere(), available(), PrismaRoomStateRepository, uniqueError(), fixture()

### Community 26 - "Review Focus"
Cohesion: 0.16
Nodes (10): Charon Stage 1 Infrastructure Implementation Plan, Global Constraints, Review Focus, Task 1: Project foundation, Task 3: Structured logger, Task 5: Discord client and interaction registry, Task 6: Application lifecycle and status command, Task 7: CI, documentation, and release readiness (+2 more)

### Community 27 - "DiscordSetupGateway"
Cohesion: 0.23
Nodes (4): SetupDiscordGateway, isGuildBased(), SetupInteractions, fixture()

### Community 28 - "Supabase RLS Implementation Plan"
Cohesion: 0.25
Nodes (7): Approved scope and approaches, Global Constraints, Progress, Re-run the read-only security test, Review Focus, Supabase RLS Implementation Plan, Task 1: Enable and verify RLS

### Community 31 - "RoomAllowedMember.ts"
Cohesion: 0.03
Nodes (74): AggregateRoomAllowedMember, GetRoomAllowedMemberAggregateType, GetRoomAllowedMemberGroupByPayload, RoomAllowedMemberAggregateArgs, RoomAllowedMemberCountAggregateInputType, RoomAllowedMemberCountAggregateOutputType, RoomAllowedMemberCountArgs, RoomAllowedMemberCountOrderByAggregateInput (+66 more)

### Community 32 - "Charon — criação guiada de canais de entrada"
Cohesion: 0.15
Nodes (12): 10. Operação e aprovação, 11. Referências e liberdade do implementador, 1. Intenção e decisões do usuário, 2. Abordagens consideradas, 3. Escopo e limites, 4. Fluxo administrativo, 5. Rascunhos, autorização e interações antigas, 6. Criação do canal e falhas parciais (+4 more)

### Community 33 - "RoomPresence.ts"
Cohesion: 0.03
Nodes (74): AggregateRoomPresence, GetRoomPresenceAggregateType, GetRoomPresenceGroupByPayload, RoomPresenceAggregateArgs, RoomPresenceCountAggregateInputType, RoomPresenceCountAggregateOutputType, RoomPresenceCountArgs, RoomPresenceCountOrderByAggregateInput (+66 more)

### Community 34 - "OwnershipService"
Cohesion: 0.35
Nodes (4): Task 3: Continuous presence and five-minute claim priority, matchesGeneration(), matchesSnapshot(), OwnershipService

### Community 35 - "PendingOwnershipTransfer.ts"
Cohesion: 0.03
Nodes (73): AggregatePendingOwnershipTransfer, GetPendingOwnershipTransferAggregateType, GetPendingOwnershipTransferGroupByPayload, PendingOwnershipTransferAggregateArgs, PendingOwnershipTransferAvgAggregateInputType, PendingOwnershipTransferAvgAggregateOutputType, PendingOwnershipTransferAvgOrderByAggregateInput, PendingOwnershipTransferCountAggregateInputType (+65 more)

### Community 36 - "enums.ts"
Cohesion: 0.29
Nodes (6): $Enums, PendingOwnershipTransfer, RoomAllowedMember, RoomPresence, TemporaryRoom, VoiceCreator

### Community 37 - "Charon v0.3.0 — posse e controles"
Cohesion: 0.08
Nodes (24): 10. Ciclo de vida e falhas — propostas técnicas, 11. Verificação e limites operacionais, 12. Fora do escopo e liberdade de implementação, 1. Objetivo e contexto, 2. Origem das decisões, 3. Abordagens de interação, 4. Painel e controles, 5. Posse e elegibilidade (+16 more)

### Community 38 - ".handleVoiceTransition"
Cohesion: 0.17
Nodes (10): Calls: fluxo de eventos, Interações, Painel B, posse e acesso, Setup, Task 6: Implement Temporary Room Lifecycle and Compensation, CallDiscordGateway, TemporaryRoomRepository, VoiceTransition (+2 more)

### Community 39 - "call.interactions.ts"
Cohesion: 0.08
Nodes (41): Task 5: Build the Disabled Minimalist Call Panel, Task 6: Compact panel B, private menu and strict component schemas, TemporaryRoom, buildAccessPrompt(), buildLimitModal(), buildOwnerMenu(), buildRenameModal(), buildTransferPrompt() (+33 more)

### Community 40 - "discord.js"
Cohesion: 0.14
Nodes (10): discord.js, InteractionHandler, safeFailureResponse, SetupCommand, setupCommandData, StatusCommand, createSilentLogger(), botPermissions (+2 more)

### Community 44 - "setup.interactions.ts"
Cohesion: 0.24
Nodes (14): SetupCategory, voicePermissions, GuildBasedInteraction, decodeSetupCustomId(), defaultUserLimitSchema, discordIdSchema, encodeSetupCustomId(), setupChannelNameSchema (+6 more)

### Community 45 - "RoomActionError"
Cohesion: 0.17
Nodes (19): assertSnapshot(), requireActiveRoom(), requireOwnedRoom(), Dependencies, Departure, OwnershipAttempt, commitRoomMutation(), currentOwnedRoom() (+11 more)

### Community 46 - "setup-drafts.ts"
Cohesion: 0.20
Nodes (12): ReadySetupDraft, SetupCreationInput, SetupCreationResult, SetupDraft, SetupDraftContext, SetupDraftRef, DraftEntry, SetupDraftError (+4 more)

### Community 47 - "prisma.ts"
Cohesion: 0.17
Nodes (10): Task 4: Prisma adapter, checkDatabase(), createPrismaClient(), DatabaseClient, disconnectDatabase(), disconnectedClients, assertDisposableDatabaseEnvironment(), fixture() (+2 more)

### Community 48 - "Retomar o Charon após formatar o computador"
Cohesion: 0.33
Nodes (6): Antes de formatar: salvar fora do Git, De onde continuar, O que está salvo no GitHub, Recuperar o projeto, Retomar a validação da v0.3.0, Retomar o Charon após formatar o computador

### Community 49 - "Setup guiado do Charon Implementation Plan"
Cohesion: 0.25
Nodes (7): Gate de verificação — apenas local, Global Constraints, Handoff, Preparação de execução — antes da Tarefa 1, Review Focus, Self-review do plano, Setup guiado do Charon Implementation Plan

### Community 50 - "prisma/client.ts"
Cohesion: 0.11
Nodes (10): $Enums, PrismaClient, RoomAllowedMember, RoomPresence, invalidateControls, PrismaTemporaryRoomRepository, TemporaryRoomTransitionError, trackedStatuses (+2 more)

### Community 51 - "@prisma/client"
Cohesion: 0.22
Nodes (4): config, decodeBase64AsWasm(), LogOptions, PrismaClientConstructor

### Community 52 - "SetupService"
Cohesion: 0.10
Nodes (11): Contratos compartilhados do novo fluxo, Mapa de arquivos e interfaces, Task 1: Persistir e editar o limite padrão sem alterar configurações antigas, Task 2: Rascunhos privados com revisão, TTL e confirmação única, Task 3: Criar entrada com permissões preservadas e compensação conservadora, Task 4: Conectar wizard e edição do padrão ao dashboard privado, CreateVoiceCreatorInput, VoiceCreatorRepository (+3 more)

### Community 53 - "DiscordSetupGateway"
Cohesion: 0.27
Nodes (5): discordErrorCode(), DiscordSetupGateway, SetupDiscordError, allPermissions, fixture()

### Community 54 - "ownership-database.test.ts"
Cohesion: 0.15
Nodes (12): RoomAccessService, RoomControlsService, Overwrite, Dependencies, RoomChanged, RoomGuildResolver, OwnershipDependencies, PriorityGeneration (+4 more)

### Community 59 - "vitest"
Cohesion: 0.18
Nodes (13): vitest, config, discordFixture(), rights, createInput, panel, creator, entry (+5 more)

### Community 60 - "setup.command.ts"
Cohesion: 0.13
Nodes (12): Task 2: Validated configuration, commandDefinitions, CommandRegistrar, registerCommands(), AppConfig, environmentSchema, loadConfig(), postgresUrl (+4 more)

### Community 61 - "createLogger"
Cohesion: 0.18
Nodes (13): createLogger(), redactedPaths, sanitizeLogValue(), sensitiveKeys, captureLogger(), lifecycleFixture(), departure, fixture() (+5 more)

### Community 62 - "Changelog"
Cohesion: 0.25
Nodes (8): [0.1.0] - 2026-11-05, [0.2.0] - 2026-11-06, 0.3.0 — preparação local em 2026-11-09 (não publicada), Added, Added, Changelog, Known limitations, [Unreleased]

### Community 63 - "Charon v0.2.0 — Setup e join-to-create"
Cohesion: 0.40
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
Cohesion: 0.18
Nodes (11): Aceite da revisão local — 2026-11-09, CI, segurança dos artefatos e limites, Fix round 1 — 2026-11-09, validação focada, Follow-up M2 — 2026-11-09, M2 — envelope da consulta inicial — 2026-11-09, Onda final combinada — 2026-11-09, RED → GREEN e caracterizações, Resultados observados (+3 more)

### Community 69 - "setup.repository.ts"
Cohesion: 0.14
Nodes (11): Task 2: Add Voice Creator Repository and Setup Service, VoiceCreator, SetupDiscordGatewayFactory, SetupInteraction, VoiceCreatorAlreadyConfiguredError, VoiceCreatorNotFoundError, first, Kind (+3 more)

### Community 70 - "enums.ts"
Cohesion: 0.67
Nodes (3): Task 1: Persist Voice Creator and Temporary Room State, RoomVisibility, TemporaryRoomStatus

### Community 71 - "ownership.fixtures.ts"
Cohesion: 0.32
Nodes (9): CallInteraction, deferred(), human(), OLDEST, OTHER, OWNER, ownershipFixture(), ROOM_ID (+1 more)

### Community 72 - "Charon v0.3.0 Ownership and Room Controls Implementation Plan"
Cohesion: 0.12
Nodes (15): Baseline, isolation and test environment, Charon v0.3.0 Ownership and Room Controls Implementation Plan, File Structure, Global Constraints, Lock and permission contracts, Review Focus, Self-review and handoff, Shared contracts — define once, reuse in later tasks (+7 more)

### Community 73 - "application.test.ts"
Cohesion: 0.16
Nodes (7): Application, InteractionDispatcher, registerShutdownSignals(), SignalSource, config, dependencies(), shutdownFixture()

### Community 74 - "PrismaVoiceCreatorRepository"
Cohesion: 0.23
Nodes (3): isPrismaErrorWithCode(), PrismaVoiceCreatorRepository, runtimeFixture()

### Community 75 - "RoomActionError"
Cohesion: 0.17
Nodes (3): allowedUnion(), RoomPanelService, RoomDiscordGateway

### Community 76 - "call.discord.ts"
Cohesion: 0.23
Nodes (8): Task 5: Aplicar o padrão às novas calls e fechar verificação/documentação, pino, botRoomPermissions, CallMoveUnconfirmedError, CreatedDiscordRoom, CreateDiscordRoomInput, CreateTemporaryRoomInput, voiceTransitionSchema

### Community 77 - "VoiceCreatorConfiguration"
Cohesion: 0.31
Nodes (8): SetupVoiceChannel, VoiceCreatorConfiguration, buildSetupDashboard(), SetupDashboardInput, SetupDashboardPayload, first, json(), second

## Knowledge Gaps
- **3 isolated node(s):** `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1072 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `package.json` to `prismaNamespace.ts`, `RoomPresence.ts`, `prismaNamespaceBrowser.ts`, `PendingOwnershipTransfer.ts`, `TemporaryRoom.ts`, `prisma/client.ts`, `@prisma/client`, `commonInputTypes.ts`, `VoiceCreator.ts`, `RoomAllowedMember.ts`?**
  _High betweenness centrality (0.182) - this node is a cross-community bridge._
- **What connects `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `prismaNamespace.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.01652892561983471 - nodes in this community are weakly interconnected._
- **Why does `InteractionRegistry` connect `Review Focus` to `.handleVoiceTransition`, `discord.js`, `application.test.ts`, `File Structure`, `Charon v0.2.0 — Setup e Join-to-Create`, `application.ts`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Should `prismaNamespaceBrowser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.058693244739756366 - nodes in this community are weakly interconnected._
- **Should `RoomStateRepository` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._