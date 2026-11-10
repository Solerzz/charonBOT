# Graph Report - feature-v0.3.0-posse-controles  (2026-11-10)

## Corpus Check
- 141 files · ~139,279 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .prisma 1)

## Summary
- 1826 nodes · 3822 edges · 78 communities (64 shown, 14 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 249 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `71f10fd3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Graphify Knowledge Graph (graphify-out)
- prismaNamespace.ts
- RoomActionError
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
- ownership-database.test.ts
- vitest
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
- DiscordCallGateway
- Supabase RLS Implementation Plan
- Prisma__TemporaryRoomClient
- Prisma__VoiceCreatorClient
- RoomAllowedMember.ts
- Charon — criação guiada de canais de entrada
- RoomPresence.ts
- application.ts
- PendingOwnershipTransfer.ts
- enums.ts
- Charon v0.3.0 — posse e controles
- CallService
- call.interactions.ts
- SetupDiscordGateway
- PendingOwnershipTransferDelegate
- RoomAllowedMemberDelegate
- RoomPresenceDelegate
- setup.interactions.ts
- prisma/client.ts
- setup-drafts.ts
- prisma.ts
- Retomar o Charon após formatar o computador
- Setup guiado do Charon Implementation Plan
- RoomDiscordGateway
- @prisma/client
- SetupService
- DiscordSetupGateway
- call.discord.ts
- Prisma__PendingOwnershipTransferClient
- Prisma__RoomAllowedMemberClient
- Prisma__RoomPresenceClient
- RoomActor
- VoiceCreatorConfiguration
- discord.js
- ownership.fixtures.ts
- Changelog
- Charon v0.2.0 — Setup e join-to-create
- Arquitetura do Charon
- Charon v0.3.0 — posse e controles
- Charon v0.2.0 — registro de validação
- Validação local v0.3.0
- Setup guiado — evidência local e validação pendente
- createRoomRuntime
- createDefaultDispatcher
- DiscordClientPort
- createLogger
- PrismaVoiceCreatorRepository
- enums.ts
- Charon v0.3.0 Ownership and Room Controls Implementation Plan
- fixture

## God Nodes (most connected - your core abstractions)
1. `RoomActionError` - 59 edges
2. `RoomDiscordGateway` - 58 edges
3. `vitest` - 55 edges
4. `discord.js` - 44 edges
5. `DiscordRoomGateway` - 39 edges
6. `createRoomRuntime()` - 38 edges
7. `DiscordCallGateway` - 35 edges
8. `RoomStateRepository` - 33 edges
9. `RoomActor` - 33 edges
10. `createLogger()` - 33 edges

## Surprising Connections (you probably didn't know these)
- `Gate final observado` --references--> `assertDisposableDatabaseEnvironment()`  [INFERRED]
  docs/validation/2026-11-10-setup-guiado-validation.md → tests/integration/database-test-utils.ts
- `Task 7: Idempotent panel synchronization and setup toggle propagation` --references--> `SetupService`  [INFERRED]
  docs/superpowers/plans/2026-11-08-charon-v0.3.0-posse-controles.md → src/modules/setup/setup.service.ts
- `Global Constraints` --references--> `InteractionRegistry`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-v0.2.0-setup-join-to-create.md → src/core/discord/interactions/interaction-registry.ts
- `Arquitetura` --references--> `InteractionRegistry`  [INFERRED]
  docs/superpowers/specs/2026-11-05-charon-v0.2.0-setup-join-to-create-design.md → src/core/discord/interactions/interaction-registry.ts
- `Task 5: Private-room access and owner settings` --references--> `requireOwnedRoom()`  [INFERRED]
  docs/superpowers/plans/2026-11-08-charon-v0.3.0-posse-controles.md → src/modules/calls/room-context.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify Maintenance and Usage Workflow** — agents_graphify_command, agents_graphify_query, agents_graphify_update, agents_graph_json, agents_graph_report, agents_wiki_index [INFERRED 0.75]

## Communities (78 total, 14 thin omitted)

### Community 0 - "Graphify Knowledge Graph (graphify-out)"
Cohesion: 0.33
Nodes (7): graphify-out/graph.json, graphify-out/GRAPH_REPORT.md, /graphify User Command, Graphify Knowledge Graph (graphify-out), graphify query / path / explain Commands, graphify update Command, graphify-out/wiki/index.md

### Community 1 - "prismaNamespace.ts"
Cohesion: 0.02
Nodes (120): AnyNull, Args, At, AtLeast, AtLoose, AtStrict, BatchPayload, Boolean (+112 more)

### Community 2 - "RoomActionError"
Cohesion: 0.30
Nodes (9): allowedUnion(), assertSnapshot(), RoomAccessService, Dependencies, commitRoomMutation(), currentOwnedRoom(), safeRoomAction(), RoomActionError (+1 more)

### Community 3 - "prismaNamespaceBrowser.ts"
Cohesion: 0.12
Nodes (15): AnyNull, DbNull, Decimal, JsonNull, ModelName, NullsOrder, NullTypes, PendingOwnershipTransferScalarFieldEnum (+7 more)

### Community 4 - "package.json"
Cohesion: 0.06
Nodes (40): dependencies, discord.js@14.28.1, dotenv@18.0.9, pg@8.23.1, pino@10.4.0, @prisma/adapter-pg@7.10.1, @prisma/client@7.10.1, zod@4.6.7 (+32 more)

### Community 5 - "RoomStateRepository"
Cohesion: 0.08
Nodes (5): Lock and permission contracts, Shared contracts — define once, reuse in later tasks, TemporaryRoomRecord, RoomStateRepository, RoomSettingsPatch

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

### Community 13 - "ownership-database.test.ts"
Cohesion: 0.11
Nodes (22): Task 2: Discord room adapter, shared guards and timer lifecycle, Dependencies, requireActiveRoom(), requireOwnedRoom(), Departure, OwnershipAttempt, Overwrite, Dependencies (+14 more)

### Community 14 - "vitest"
Cohesion: 0.19
Nodes (13): vitest, KeyedMutex, discordFixture(), rights, createInput, panel, creator, deferred() (+5 more)

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
Cohesion: 0.19
Nodes (3): CallPanelPayload, DiscordRoomGateway, hasCode()

### Community 20 - "commonInputTypes.ts"
Cohesion: 0.05
Nodes (39): BoolFilter, BoolWithAggregatesFilter, DateTimeFilter, DateTimeNullableFilter, DateTimeNullableWithAggregatesFilter, DateTimeWithAggregatesFilter, EnumRoomVisibilityFilter, EnumRoomVisibilityWithAggregatesFilter (+31 more)

### Community 21 - "Charon v0.2.0 — Setup e Join-to-Create"
Cohesion: 0.08
Nodes (25): 1. Painel administrativo persistente no canal, 2. Painel administrativo privado temporário — escolhida, 3. Assistente linear passo a passo, Abordagens consideradas, Antiobjetivos, Arquitetura, Charon v0.2.0 — Setup e Join-to-Create, Compensação de falhas (+17 more)

### Community 22 - "application.ts"
Cohesion: 0.15
Nodes (11): Task 7: Wire Setup and Voice Events into the Application, pino, ApplicationOverrides, createDefaultVoiceDispatcher(), InteractionDispatcher, SignalSource, VoiceStateDispatcher, VoiceStateHandler (+3 more)

### Community 25 - "createRoomRuntime"
Cohesion: 0.12
Nodes (7): activeWhere(), available(), ownerChange(), PrismaRoomStateRepository, uniqueError(), fixture(), pending

### Community 26 - "Review Focus"
Cohesion: 0.14
Nodes (13): Charon Stage 1 Infrastructure Implementation Plan, Global Constraints, Review Focus, Task 1: Project foundation, Task 2: Validated configuration, Task 3: Structured logger, Task 6: Application lifecycle and status command, Task 7: CI, documentation, and release readiness (+5 more)

### Community 27 - "DiscordCallGateway"
Cohesion: 0.14
Nodes (3): CallDiscordError, DiscordCallGateway, isUnknownChannel()

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

### Community 34 - "application.ts"
Cohesion: 0.22
Nodes (7): Application, registerShutdownSignals(), environmentSchema, loadConfig(), postgresUrl, start(), validEnvironment

### Community 35 - "PendingOwnershipTransfer.ts"
Cohesion: 0.03
Nodes (73): AggregatePendingOwnershipTransfer, GetPendingOwnershipTransferAggregateType, GetPendingOwnershipTransferGroupByPayload, PendingOwnershipTransferAggregateArgs, PendingOwnershipTransferAvgAggregateInputType, PendingOwnershipTransferAvgAggregateOutputType, PendingOwnershipTransferAvgOrderByAggregateInput, PendingOwnershipTransferCountAggregateInputType (+65 more)

### Community 36 - "enums.ts"
Cohesion: 0.29
Nodes (6): $Enums, PendingOwnershipTransfer, RoomAllowedMember, RoomPresence, TemporaryRoom, VoiceCreator

### Community 37 - "Charon v0.3.0 — posse e controles"
Cohesion: 0.08
Nodes (24): 10. Ciclo de vida e falhas — propostas técnicas, 11. Verificação e limites operacionais, 12. Fora do escopo e liberdade de implementação, 1. Objetivo e contexto, 2. Origem das decisões, 3. Abordagens de interação, 4. Painel e controles, 5. Posse e elegibilidade (+16 more)

### Community 38 - "CallService"
Cohesion: 0.16
Nodes (10): Calls: fluxo de eventos, Interações, Painel B, posse e acesso, Setup, Task 6: Implement Temporary Room Lifecycle and Compensation, CallDiscordGateway, TemporaryRoomRepository, VoiceTransition (+2 more)

### Community 39 - "call.interactions.ts"
Cohesion: 0.06
Nodes (48): Calls module, Charon v0.2.0 Setup and Join-to-Create Implementation Plan, Composition, registration, and documentation, File Structure, Global Constraints, Persistence and shared utilities, Review Focus, Setup module (+40 more)

### Community 40 - "SetupDiscordGateway"
Cohesion: 0.17
Nodes (5): SetupCreationService, ReadySetupDraft, SetupDiscordGateway, isGuildBased(), fixture()

### Community 44 - "setup.interactions.ts"
Cohesion: 0.11
Nodes (27): Task 2: Add Voice Creator Repository and Setup Service, SetupCategory, voicePermissions, GuildBasedInteraction, SetupDiscordGatewayFactory, VoiceCreatorAlreadyConfiguredError, VoiceCreatorNotFoundError, decodeSetupCustomId() (+19 more)

### Community 45 - "prisma/client.ts"
Cohesion: 0.09
Nodes (13): $Enums, PrismaClient, RoomAllowedMember, RoomPresence, VoiceCreator, invalidateControls, PrismaTemporaryRoomRepository, TemporaryRoomTransitionError (+5 more)

### Community 46 - "setup-drafts.ts"
Cohesion: 0.14
Nodes (16): contextOf(), requirePrivateAdministrator(), resultMessage(), SetupCreationInteractions, SetupCreationInput, SetupCreationResult, SetupDraft, SetupDraftContext (+8 more)

### Community 47 - "prisma.ts"
Cohesion: 0.17
Nodes (11): Task 4: Prisma adapter, checkDatabase(), createPrismaClient(), DatabaseClient, disconnectDatabase(), disconnectedClients, assertDisposableDatabaseEnvironment(), fixture() (+3 more)

### Community 48 - "Retomar o Charon após formatar o computador"
Cohesion: 0.33
Nodes (6): Antes de formatar: salvar fora do Git, De onde continuar, O que está salvo no GitHub, Recuperar o projeto, Retomar a validação da v0.3.0, Retomar o Charon após formatar o computador

### Community 49 - "Setup guiado do Charon Implementation Plan"
Cohesion: 0.25
Nodes (7): Gate de verificação — apenas local, Global Constraints, Handoff, Preparação de execução — antes da Tarefa 1, Review Focus, Self-review do plano, Setup guiado do Charon Implementation Plan

### Community 50 - "RoomDiscordGateway"
Cohesion: 0.13
Nodes (7): Task 3: Continuous presence and five-minute claim priority, RoomControlsService, RoomDiscordGateway, matchesGeneration(), matchesSnapshot(), OwnershipService, settingsRuntime()

### Community 51 - "@prisma/client"
Cohesion: 0.22
Nodes (4): config, decodeBase64AsWasm(), LogOptions, PrismaClientConstructor

### Community 52 - "SetupService"
Cohesion: 0.08
Nodes (19): Task 3: Build the Private Setup Dashboard, Contratos compartilhados do novo fluxo, Mapa de arquivos e interfaces, Task 1: Persistir e editar o limite padrão sem alterar configurações antigas, Task 2: Rascunhos privados com revisão, TTL e confirmação única, Task 3: Criar entrada com permissões preservadas e compensação conservadora, Task 4: Conectar wizard e edição do padrão ao dashboard privado, SetupChannelCreationError (+11 more)

### Community 53 - "DiscordSetupGateway"
Cohesion: 0.23
Nodes (6): discordErrorCode(), DiscordSetupGateway, SetupDiscordError, allPermissions, creationFixture(), fixture()

### Community 54 - "call.discord.ts"
Cohesion: 0.16
Nodes (14): Task 5: Aplicar o padrão às novas calls e fechar verificação/documentação, botRoomPermissions, CallMoveUnconfirmedError, CreatedDiscordRoom, CreateDiscordRoomInput, CreateTemporaryRoomInput, lifecycleFixture(), departure (+6 more)

### Community 58 - "RoomActor"
Cohesion: 0.26
Nodes (4): PendingOwnershipTransfer, RoomActor, safe(), TransferService

### Community 59 - "VoiceCreatorConfiguration"
Cohesion: 0.28
Nodes (11): SetupVoiceChannel, encodeSetupCreationCustomId(), buildSetupCreationCategory(), buildSetupCreationReview(), buildSetupDashboard(), formatDefaultLimit(), SetupDashboardInput, SetupDashboardPayload (+3 more)

### Community 60 - "discord.js"
Cohesion: 0.14
Nodes (9): discord.js, commandDefinitions, CommandRegistrar, registerCommands(), InteractionHandler, safeFailureResponse, setupCommandData, StatusCommand (+1 more)

### Community 61 - "ownership.fixtures.ts"
Cohesion: 0.32
Nodes (10): CallInteraction, fixture(), roomSettingsFixture(), human(), OLDEST, OTHER, OWNER, ownershipFixture() (+2 more)

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

### Community 69 - "Setup guiado — evidência local e validação pendente"
Cohesion: 0.25
Nodes (7): Cobertura por requisito, Discord real — PENDENTE, não executado, Estado e limites de autorização, Gate final observado, Limitações mantidas, Setup guiado — evidência local e validação pendente, TDD observado

### Community 71 - "createDefaultDispatcher"
Cohesion: 0.24
Nodes (5): Task 5: Discord client and interaction registry, Task 8: Wire interactions, voice lifecycle and one shared room runtime, createDefaultDispatcher(), InteractionRegistry, CallInteractions

### Community 73 - "createLogger"
Cohesion: 0.14
Nodes (12): createApplication(), fetch(), hasRuntimeRepositories(), createDiscordClient(), createLogger(), config, fixture(), sqlSpy() (+4 more)

### Community 74 - "PrismaVoiceCreatorRepository"
Cohesion: 0.23
Nodes (3): isPrismaErrorWithCode(), PrismaVoiceCreatorRepository, runtimeFixture()

### Community 75 - "enums.ts"
Cohesion: 0.67
Nodes (3): Task 1: Persist Voice Creator and Temporary Room State, RoomVisibility, TemporaryRoomStatus

### Community 76 - "Charon v0.3.0 Ownership and Room Controls Implementation Plan"
Cohesion: 0.17
Nodes (11): Baseline, isolation and test environment, Charon v0.3.0 Ownership and Room Controls Implementation Plan, File Structure, Global Constraints, Review Focus, Self-review and handoff, Task 1: Persist room-control state and prove database invariants, Task 4: Five-second transfer with confirmation, undo and automatic completion (+3 more)

### Community 78 - "fixture"
Cohesion: 0.70
Nodes (5): fixture(), event(), review(), start(), json()

## Knowledge Gaps
- **3 isolated node(s):** `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1082 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `package.json` to `prismaNamespace.ts`, `RoomPresence.ts`, `prismaNamespaceBrowser.ts`, `PendingOwnershipTransfer.ts`, `TemporaryRoom.ts`, `prisma/client.ts`, `VoiceCreator.ts`, `@prisma/client`, `commonInputTypes.ts`, `RoomAllowedMember.ts`?**
  _High betweenness centrality (0.171) - this node is a cross-community bridge._
- **What connects `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `prismaNamespace.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.01652892561983471 - nodes in this community are weakly interconnected._
- **Why does `InteractionRegistry` connect `createDefaultDispatcher` to `CallService`, `call.interactions.ts`, `createLogger`, `Charon v0.2.0 — Setup e Join-to-Create`, `application.ts`, `discord.js`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Should `prismaNamespaceBrowser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Why does `Arquitetura do Charon` connect `Arquitetura do Charon` to `architecture.md`, `CallService`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.058693244739756366 - nodes in this community are weakly interconnected._