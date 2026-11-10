# Graph Report - feature-v0.3.0-posse-controles  (2026-11-10)

## Corpus Check
- 153 files · ~165,979 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .prisma 1)

## Summary
- 1951 nodes · 4256 edges · 81 communities (65 shown, 16 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 268 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c9fbc5c4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Graphify Knowledge Graph (graphify-out)
- prismaNamespace.ts
- OwnershipTimers
- prismaNamespaceBrowser.ts
- package.json
- PrismaRoomStateRepository
- local-database
- Charon
- prisma.ts
- Charon v1 — Design
- compilerOptions
- compilerOptions
- TemporaryRoom.ts
- call.fixtures.ts
- Charon — painel público, tranca e visibilidade independentes
- Charon v0.1.0 — Infraestrutura
- pull_request_template.md
- PrismaClientBaseOptions
- VoiceCreator.ts
- DiscordCallGateway
- commonInputTypes.ts
- Charon v0.2.0 — Setup e Join-to-Create
- class.ts
- TemporaryRoomDelegate
- VoiceCreatorDelegate
- createRoomRuntime
- setup-creation.interactions.ts
- Painel público, tranca e visibilidade — Implementation Plan
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
- vitest
- prisma/client.ts
- PendingOwnershipTransferDelegate
- RoomAllowedMemberDelegate
- RoomPresenceDelegate
- setup.interactions.ts
- PrismaClient
- setup-creation.interactions.ts
- env.ts
- Retomar o Charon após formatar o computador
- createLogger
- RoomDiscordGateway
- PrismaVoiceCreatorRepository
- call.schemas.ts
- DiscordSetupGateway
- register-commands.ts
- Prisma__PendingOwnershipTransferClient
- Prisma__RoomAllowedMemberClient
- Prisma__RoomPresenceClient
- File Structure
- DiscordRoomGateway
- RoomActionError
- setup.schemas.ts
- Changelog
- Charon v0.2.0 — Setup e join-to-create
- Arquitetura do Charon
- Charon v0.3.0 — posse e controles
- Charon v0.2.0 — registro de validação
- Validação local v0.3.0
- Setup guiado — evidência local e validação pendente
- call-action.metrics.ts
- createApplication
- Calls: fluxo de eventos
- DiscordClientPort
- Setup guiado do Charon Implementation Plan
- RoomPanelService
- SetupDiscordGateway
- Task 5: Aplicar o padrão às novas calls e fechar verificação/documentação
- setup-creation.interactions.test.ts
- call.interactions.ts
- Validação local — painel público, tranca e visibilidade

## God Nodes (most connected - your core abstractions)
1. `RoomDiscordGateway` - 68 edges
2. `RoomActionError` - 65 edges
3. `vitest` - 60 edges
4. `discord.js` - 50 edges
5. `RoomActor` - 47 edges
6. `createRoomRuntime()` - 45 edges
7. `createLogger()` - 40 edges
8. `DiscordRoomGateway` - 38 edges
9. `RoomState` - 38 edges
10. `DiscordCallGateway` - 34 edges

## Surprising Connections (you probably didn't know these)
- `Task 4: Conectar o painel público e eliminar respostas genéricas` --references--> `CallInteraction`  [INFERRED]
  docs/superpowers/plans/2026-11-10-charon-painel-publico-tranca-visibilidade.md → src/modules/calls/call.interactions.ts
- `Autorrevisão do plano` --references--> `RoomAccessPolicy`  [INFERRED]
  docs/superpowers/plans/2026-11-10-charon-painel-publico-tranca-visibilidade.md → src/modules/calls/room.types.ts
- `Task 7: Idempotent panel synchronization and setup toggle propagation` --references--> `SetupService`  [INFERRED]
  docs/superpowers/plans/2026-11-08-charon-v0.3.0-posse-controles.md → src/modules/setup/setup.service.ts
- `Global Constraints` --references--> `InteractionRegistry`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-v0.2.0-setup-join-to-create.md → src/core/discord/interactions/interaction-registry.ts
- `Arquitetura` --references--> `InteractionRegistry`  [INFERRED]
  docs/superpowers/specs/2026-11-05-charon-v0.2.0-setup-join-to-create-design.md → src/core/discord/interactions/interaction-registry.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify Maintenance and Usage Workflow** — agents_graphify_command, agents_graphify_query, agents_graphify_update, agents_graph_json, agents_graph_report, agents_wiki_index [INFERRED 0.75]

## Communities (81 total, 16 thin omitted)

### Community 0 - "Graphify Knowledge Graph (graphify-out)"
Cohesion: 0.33
Nodes (7): graphify-out/graph.json, graphify-out/GRAPH_REPORT.md, /graphify User Command, Graphify Knowledge Graph (graphify-out), graphify query / path / explain Commands, graphify update Command, graphify-out/wiki/index.md

### Community 1 - "prismaNamespace.ts"
Cohesion: 0.02
Nodes (120): AnyNull, Args, At, AtLeast, AtLoose, AtStrict, BatchPayload, Boolean (+112 more)

### Community 2 - "OwnershipTimers"
Cohesion: 0.13
Nodes (14): Baseline, isolation and test environment, Charon v0.3.0 Ownership and Room Controls Implementation Plan, File Structure, Global Constraints, Review Focus, Self-review and handoff, Task 1: Persist room-control state and prove database invariants, Task 2: Discord room adapter, shared guards and timer lifecycle (+6 more)

### Community 3 - "prismaNamespaceBrowser.ts"
Cohesion: 0.12
Nodes (15): AnyNull, DbNull, Decimal, JsonNull, ModelName, NullsOrder, NullTypes, PendingOwnershipTransferScalarFieldEnum (+7 more)

### Community 4 - "package.json"
Cohesion: 0.06
Nodes (39): dependencies, discord.js@14.28.1, dotenv@18.0.9, pg@8.23.1, pino@10.4.0, @prisma/adapter-pg@7.10.1, @prisma/client@7.10.1, zod@4.6.7 (+31 more)

### Community 5 - "PrismaRoomStateRepository"
Cohesion: 0.07
Nodes (10): PendingOwnershipTransfer, measureCallStage(), TemporaryRoomRecord, activeWhere(), available(), ownerChange(), PrismaRoomStateRepository, RoomStateRepository (+2 more)

### Community 6 - "local-database"
Cohesion: 0.06
Nodes (37): DATABASE_URL, DIRECT_URL, POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, RUN_DATABASE_SECURITY_TESTS, RUN_DATABASE_TESTS, jobs (+29 more)

### Community 7 - "Charon"
Cohesion: 0.25
Nodes (8): Charon, Comandos, Desenvolvimento, Instalação, Posse e controles da v0.3.0, Requisitos, Segurança, Variáveis de ambiente

### Community 8 - "prisma.ts"
Cohesion: 0.27
Nodes (7): Task 4: Prisma adapter, checkDatabase(), createPrismaClient(), DatabaseClient, disconnectDatabase(), disconnectedClients, cleanup()

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

### Community 13 - "call.fixtures.ts"
Cohesion: 0.26
Nodes (14): encodeCallComponent(), settingsRuntime(), deferred(), fixture(), fixture(), runtimes, roomSettingsFixture(), human() (+6 more)

### Community 14 - "Charon — painel público, tranca e visibilidade independentes"
Cohesion: 0.08
Nodes (23): 10. Limites operacionais e fora de escopo, 1. Objetivo e origem, 2. Abordagens consideradas, 3. Interface aprovada e limites nativos, 4. Respostas sem poluição de chat, 5. Matriz de acesso, 6. Estado persistido e compatibilidade, 7. Consistência, posse e ciclo de vida (+15 more)

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

### Community 19 - "DiscordCallGateway"
Cohesion: 0.13
Nodes (3): CallDiscordError, DiscordCallGateway, isUnknownChannel()

### Community 20 - "commonInputTypes.ts"
Cohesion: 0.05
Nodes (39): BoolFilter, BoolWithAggregatesFilter, DateTimeFilter, DateTimeNullableFilter, DateTimeNullableWithAggregatesFilter, DateTimeWithAggregatesFilter, EnumRoomVisibilityFilter, EnumRoomVisibilityWithAggregatesFilter (+31 more)

### Community 21 - "Charon v0.2.0 — Setup e Join-to-Create"
Cohesion: 0.08
Nodes (25): 1. Painel administrativo persistente no canal, 2. Painel administrativo privado temporário — escolhida, 3. Assistente linear passo a passo, Abordagens consideradas, Antiobjetivos, Arquitetura, Charon v0.2.0 — Setup e Join-to-Create, Compensação de falhas (+17 more)

### Community 22 - "class.ts"
Cohesion: 0.22
Nodes (4): config, decodeBase64AsWasm(), LogOptions, PrismaClientConstructor

### Community 25 - "createRoomRuntime"
Cohesion: 0.11
Nodes (8): Lock and permission contracts, Shared contracts — define once, reuse in later tasks, recordCallStage(), RoomCoordinator, createRoomRuntime(), OwnershipTimers, KeyedMutex, transferRuntime()

### Community 26 - "setup-creation.interactions.ts"
Cohesion: 0.23
Nodes (14): contextOf(), SetupVoiceChannel, GuildBasedInteraction, encodeSetupCreationCustomId(), encodeSetupCustomId(), buildSetupCreationCategory(), buildSetupCreationReview(), buildSetupDashboard() (+6 more)

### Community 27 - "Painel público, tranca e visibilidade — Implementation Plan"
Cohesion: 0.15
Nodes (12): Aceitação real e rollout — checklist original e estado posterior, Autorrevisão do plano, Global Constraints, Handoff, Mapa de arquivos e contratos, Painel público, tranca e visibilidade — Implementation Plan, Preparação e verificações comuns, Review Focus (+4 more)

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
Cohesion: 0.10
Nodes (19): Task 5: Discord client and interaction registry, Task 7: Wire Setup and Voice Events into the Application, discord.js, ApplicationOverrides, createDefaultDispatcher(), createDefaultVoiceDispatcher(), InteractionDispatcher, registerShutdownSignals() (+11 more)

### Community 35 - "PendingOwnershipTransfer.ts"
Cohesion: 0.03
Nodes (73): AggregatePendingOwnershipTransfer, GetPendingOwnershipTransferAggregateType, GetPendingOwnershipTransferGroupByPayload, PendingOwnershipTransferAggregateArgs, PendingOwnershipTransferAvgAggregateInputType, PendingOwnershipTransferAvgAggregateOutputType, PendingOwnershipTransferAvgOrderByAggregateInput, PendingOwnershipTransferCountAggregateInputType (+65 more)

### Community 36 - "enums.ts"
Cohesion: 0.20
Nodes (9): Task 1: Persist Voice Creator and Temporary Room State, $Enums, PendingOwnershipTransfer, RoomAllowedMember, RoomPresence, TemporaryRoom, VoiceCreator, RoomVisibility (+1 more)

### Community 37 - "Charon v0.3.0 — posse e controles"
Cohesion: 0.08
Nodes (24): 10. Ciclo de vida e falhas — propostas técnicas, 11. Verificação e limites operacionais, 12. Fora do escopo e liberdade de implementação, 1. Objetivo e contexto, 2. Origem das decisões, 3. Abordagens de interação, 4. Painel e controles, 5. Posse e elegibilidade (+16 more)

### Community 38 - "CallService"
Cohesion: 0.22
Nodes (5): Task 6: Implement Temporary Room Lifecycle and Compensation, CallDiscordGateway, TemporaryRoomRepository, VoiceTransition, CallService

### Community 39 - "vitest"
Cohesion: 0.11
Nodes (28): vitest, fetch(), createLogger(), redactedPaths, sanitizeLogValue(), sensitiveKeys, callsFixture(), config (+20 more)

### Community 40 - "prisma/client.ts"
Cohesion: 0.09
Nodes (13): $Enums, PrismaClient, RoomAllowedMember, RoomPresence, VoiceCreator, invalidateControls, PrismaTemporaryRoomRepository, TemporaryRoomTransitionError (+5 more)

### Community 44 - "setup.interactions.ts"
Cohesion: 0.08
Nodes (26): Task 2: Add Voice Creator Repository and Setup Service, Task 3: Build the Private Setup Dashboard, Contratos compartilhados do novo fluxo, Mapa de arquivos e interfaces, Task 1: Persistir e editar o limite padrão sem alterar configurações antigas, Task 2: Rascunhos privados com revisão, TTL e confirmação única, Task 3: Criar entrada com permissões preservadas e compensação conservadora, Task 4: Conectar wizard e edição do padrão ao dashboard privado (+18 more)

### Community 46 - "setup-creation.interactions.ts"
Cohesion: 0.17
Nodes (13): requirePrivateAdministrator(), resultMessage(), SetupCreationInput, SetupCreationResult, SetupDraft, SetupDraftContext, SetupDraftRef, DraftEntry (+5 more)

### Community 47 - "env.ts"
Cohesion: 0.18
Nodes (6): Application, environmentSchema, loadConfig(), postgresUrl, start(), validEnvironment

### Community 48 - "Retomar o Charon após formatar o computador"
Cohesion: 0.33
Nodes (6): Antes de formatar: salvar fora do Git, De onde continuar, O que está salvo no GitHub, Recuperar o projeto, Retomar a validação da v0.3.0, Retomar o Charon após formatar o computador

### Community 49 - "createLogger"
Cohesion: 0.25
Nodes (7): Charon Stage 1 Infrastructure Implementation Plan, Global Constraints, Review Focus, Task 1: Project foundation, Task 3: Structured logger, Task 6: Application lifecycle and status command, Task 7: CI, documentation, and release readiness

### Community 50 - "RoomDiscordGateway"
Cohesion: 0.08
Nodes (19): Task 3: Continuous presence and five-minute claim priority, allowedUnion(), assertSnapshot(), RoomAccessService, safePrevious(), sameAccess(), sameAuthority(), sameIds() (+11 more)

### Community 52 - "call.schemas.ts"
Cohesion: 0.17
Nodes (16): pino, botRoomPermissions, CallMoveUnconfirmedError, CreatedDiscordRoom, buildInitialRoomName(), CallComponent, callControlActionSchema, callLimitSubmissionSchema (+8 more)

### Community 53 - "DiscordSetupGateway"
Cohesion: 0.20
Nodes (7): discordErrorCode(), DiscordSetupGateway, SetupChannelCreationError, SetupDiscordError, allPermissions, creationFixture(), fixture()

### Community 54 - "register-commands.ts"
Cohesion: 0.20
Nodes (8): Task 2: Validated configuration, commandDefinitions, CommandRegistrar, registerCommands(), AppConfig, LoggerOptions, setupCommandData, config

### Community 58 - "File Structure"
Cohesion: 0.18
Nodes (10): Calls module, Charon v0.2.0 Setup and Join-to-Create Implementation Plan, Composition, registration, and documentation, File Structure, Global Constraints, Persistence and shared utilities, Review Focus, Setup module (+2 more)

### Community 60 - "RoomActionError"
Cohesion: 0.16
Nodes (23): requireActiveRoom(), requireOwnedRoom(), Dependencies, Departure, OwnershipAttempt, Overwrite, commitRoomMutation(), Dependencies (+15 more)

### Community 61 - "setup.schemas.ts"
Cohesion: 0.21
Nodes (12): zod, decodeSetupCustomId(), defaultUserLimitSchema, SetupCreationAction, setupCreationActionSchema, SetupCreationCustomId, setupCreationCustomIdSchema, setupCustomIdSchema (+4 more)

### Community 62 - "Changelog"
Cohesion: 0.25
Nodes (8): [0.1.0] - 2026-11-05, [0.2.0] - 2026-11-06, 0.3.0 — integrada e validada no servidor de testes em 2026-11-10, Added, Added, Changelog, Known limitations, [Unreleased]

### Community 63 - "Charon v0.2.0 — Setup e join-to-create"
Cohesion: 0.40
Nodes (5): Banco e verificação local, Charon v0.2.0 — Setup e join-to-create, Entregas, Estado desta preparação, Limitações operacionais

### Community 65 - "Arquitetura do Charon"
Cohesion: 0.33
Nodes (6): Arquitetura do Charon, Banco de dados, Estilo, Estrutura na v0.3.0 (preparação local), Fluxo de inicialização, Verificação

### Community 66 - "Charon v0.3.0 — posse e controles"
Cohesion: 0.40
Nodes (5): Banco local e CI (sem credenciais remotas), Charon v0.3.0 — posse e controles, Entrega implementada, Permissões e limites operacionais, Validação e limites do aceite humano

### Community 67 - "Charon v0.2.0 — registro de validação"
Cohesion: 0.40
Nodes (5): Charon v0.2.0 — registro de validação, Discord real: verificações observadas, Limpeza e limites, PostgreSQL real: aprovado, Versão verificada

### Community 68 - "Validação local v0.3.0"
Cohesion: 0.18
Nodes (11): Aceite da revisão local — 2026-11-09, CI, segurança dos artefatos e limites, Fix round 1 — 2026-11-09, validação focada, Follow-up M2 — 2026-11-09, M2 — envelope da consulta inicial — 2026-11-09, Onda final combinada — 2026-11-09, RED → GREEN e caracterizações, Resultados observados (+3 more)

### Community 69 - "Setup guiado — evidência local e validação pendente"
Cohesion: 0.22
Nodes (8): Aceitação final após revisão independente, Cobertura por requisito, Discord real — PENDENTE, não executado, Estado e limites de autorização, Gate final observado, Limitações mantidas, Setup guiado — evidência local e validação pendente, TDD observado

### Community 70 - "call-action.metrics.ts"
Cohesion: 0.16
Nodes (10): actions, CallActionStage, CallTraceAction, markCallActionFailed(), runCallActionTrace(), Trace, traces, assertDisposableDatabaseEnvironment() (+2 more)

### Community 71 - "createApplication"
Cohesion: 0.29
Nodes (6): createApplication(), hasRuntimeRepositories(), fixture(), sqlSpy(), dependencies(), shutdownFixture()

### Community 72 - "Calls: fluxo de eventos"
Cohesion: 0.33
Nodes (5): Calls: fluxo de eventos, Interações, Painel B, posse e acesso, Setup, RoomRuntime

### Community 74 - "Setup guiado do Charon Implementation Plan"
Cohesion: 0.25
Nodes (7): Gate de verificação — apenas local, Global Constraints, Handoff, Preparação de execução — antes da Tarefa 1, Review Focus, Self-review do plano, Setup guiado do Charon Implementation Plan

### Community 76 - "SetupDiscordGateway"
Cohesion: 0.13
Nodes (10): Task 4: Handle Setup Buttons, Selects, and Modals, SetupCreationService, ReadySetupDraft, SetupDiscordGateway, isGuildBased(), SetupInteractions, SetupCustomId, configuration (+2 more)

### Community 77 - "Task 5: Aplicar o padrão às novas calls e fechar verificação/documentação"
Cohesion: 0.67
Nodes (3): Task 5: Aplicar o padrão às novas calls e fechar verificação/documentação, CreateDiscordRoomInput, CreateTemporaryRoomInput

### Community 78 - "setup-creation.interactions.test.ts"
Cohesion: 0.17
Nodes (9): SetupDiscordGatewayFactory, SetupInteraction, context, fixture(), event(), review(), start(), json() (+1 more)

### Community 80 - "call.interactions.ts"
Cohesion: 0.06
Nodes (42): Task 3: Criar uma área privada reutilizável e limitada à sessão, TemporaryRoom, buildAccessPrompt(), buildLimitModal(), buildRenameModal(), buildTransferPrompt(), buildTransferTargetPrompt(), customId() (+34 more)

### Community 82 - "Validação local — painel público, tranca e visibilidade"
Cohesion: 0.18
Nodes (11): Aceitação humana — aprovada no escopo relatado, Antes — capturado com fetch ainda presente (2026-11-10, 17:57 e 17:59 local), Benchmark reproduzível de fronteiras (não é latência do Discord), Decisões registradas durante a execução, Depois, Escopo e limites, Gates locais — evidência histórica da Task 5, Integração Git e rollout autorizados — concluídos em 2026-11-10 (+3 more)

## Knowledge Gaps
- **3 isolated node(s):** `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1127 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `package.json` to `prismaNamespace.ts`, `RoomPresence.ts`, `prismaNamespaceBrowser.ts`, `PendingOwnershipTransfer.ts`, `prisma/client.ts`, `TemporaryRoom.ts`, `VoiceCreator.ts`, `commonInputTypes.ts`, `class.ts`, `RoomAllowedMember.ts`?**
  _High betweenness centrality (0.154) - this node is a cross-community bridge._
- **What connects `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `prismaNamespace.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.01652892561983471 - nodes in this community are weakly interconnected._
- **Why does `Arquitetura do Charon` connect `Arquitetura do Charon` to `architecture.md`, `Calls: fluxo de eventos`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Should `OwnershipTimers` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Why does `InteractionRegistry` connect `application.ts` to `Calls: fluxo de eventos`, `File Structure`, `Charon v0.2.0 — Setup e Join-to-Create`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Should `prismaNamespaceBrowser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._