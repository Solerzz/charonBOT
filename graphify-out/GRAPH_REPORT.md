# Graph Report - feature-v0.3.0-posse-controles  (2026-11-10)

## Corpus Check
- 153 files · ~165,083 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .prisma 1)

## Summary
- 1950 nodes · 4253 edges · 76 communities (64 shown, 12 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 268 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5d4af1af`
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
- setup-calls-database.test.ts
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
- DiscordRoomGateway
- commonInputTypes.ts
- Charon v0.2.0 — Setup e Join-to-Create
- class.ts
- TemporaryRoomDelegate
- VoiceCreatorDelegate
- enums.ts
- setup-creation.interactions.ts
- call-workspace.test.ts
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
- room-state.repository.ts
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
- devDependencies
- discord.js
- scripts
- Changelog
- Charon v0.2.0 — Setup e join-to-create
- Arquitetura do Charon
- Charon v0.3.0 — posse e controles
- Charon v0.2.0 — registro de validação
- Validação local v0.3.0
- Setup guiado — evidência local e validação pendente
- room.runtime.ts
- Setup guiado do Charon Implementation Plan
- SetupDiscordGateway
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
- `Task 7: Idempotent panel synchronization and setup toggle propagation` --references--> `SetupService`  [INFERRED]
  docs/superpowers/plans/2026-11-08-charon-v0.3.0-posse-controles.md → src/modules/setup/setup.service.ts
- `Global Constraints` --references--> `InteractionRegistry`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-v0.2.0-setup-join-to-create.md → src/core/discord/interactions/interaction-registry.ts
- `Task 3: Structured logger` --references--> `createLogger()`  [INFERRED]
  docs/superpowers/plans/2026-11-05-charon-stage-1-infrastructure.md → src/core/logger/logger.ts
- `Task 5: Private-room access and owner settings` --references--> `requireOwnedRoom()`  [INFERRED]
  docs/superpowers/plans/2026-11-08-charon-v0.3.0-posse-controles.md → src/modules/calls/room-context.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify Maintenance and Usage Workflow** — agents_graphify_command, agents_graphify_query, agents_graphify_update, agents_graph_json, agents_graph_report, agents_wiki_index [INFERRED 0.75]

## Communities (76 total, 12 thin omitted)

### Community 0 - "Graphify Knowledge Graph (graphify-out)"
Cohesion: 0.33
Nodes (7): graphify-out/graph.json, graphify-out/GRAPH_REPORT.md, /graphify User Command, Graphify Knowledge Graph (graphify-out), graphify query / path / explain Commands, graphify update Command, graphify-out/wiki/index.md

### Community 1 - "prismaNamespace.ts"
Cohesion: 0.02
Nodes (120): AnyNull, Args, At, AtLeast, AtLoose, AtStrict, BatchPayload, Boolean (+112 more)

### Community 2 - "OwnershipTimers"
Cohesion: 0.10
Nodes (15): Baseline, isolation and test environment, Charon v0.3.0 Ownership and Room Controls Implementation Plan, File Structure, Global Constraints, Review Focus, Self-review and handoff, Task 1: Persist room-control state and prove database invariants, Task 2: Discord room adapter, shared guards and timer lifecycle (+7 more)

### Community 3 - "prismaNamespaceBrowser.ts"
Cohesion: 0.12
Nodes (15): AnyNull, DbNull, Decimal, JsonNull, ModelName, NullsOrder, NullTypes, PendingOwnershipTransferScalarFieldEnum (+7 more)

### Community 4 - "package.json"
Cohesion: 0.12
Nodes (19): dependencies, discord.js@14.28.1, dotenv@18.0.9, pino@10.4.0, @prisma/adapter-pg@7.10.1, @prisma/client@7.10.1, zod@4.6.7, prisma@7.10.1 (+11 more)

### Community 5 - "PrismaRoomStateRepository"
Cohesion: 0.07
Nodes (12): Lock and permission contracts, Shared contracts — define once, reuse in later tasks, PendingOwnershipTransfer, measureCallStage(), TemporaryRoomRecord, activeWhere(), available(), ownerChange() (+4 more)

### Community 6 - "local-database"
Cohesion: 0.06
Nodes (37): DATABASE_URL, DIRECT_URL, POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, RUN_DATABASE_SECURITY_TESTS, RUN_DATABASE_TESTS, jobs (+29 more)

### Community 7 - "Charon"
Cohesion: 0.25
Nodes (8): Charon, Comandos, Desenvolvimento, Instalação, Posse e controles da v0.3.0, Requisitos, Segurança, Variáveis de ambiente

### Community 8 - "setup-calls-database.test.ts"
Cohesion: 0.10
Nodes (24): Task 4: Prisma adapter, pg@8.23.1, pg, checkDatabase(), createPrismaClient(), DatabaseClient, disconnectDatabase(), disconnectedClients (+16 more)

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
Cohesion: 0.24
Nodes (15): encodeCallComponent(), settingsRuntime(), deferred(), fixture(), fixture(), runtimes, runtimeFixture(), roomSettingsFixture() (+7 more)

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

### Community 19 - "DiscordRoomGateway"
Cohesion: 0.10
Nodes (6): CallDiscordError, DiscordCallGateway, isUnknownChannel(), DiscordRoomGateway, hasCode(), RoomActionError

### Community 20 - "commonInputTypes.ts"
Cohesion: 0.05
Nodes (39): BoolFilter, BoolWithAggregatesFilter, DateTimeFilter, DateTimeNullableFilter, DateTimeNullableWithAggregatesFilter, DateTimeWithAggregatesFilter, EnumRoomVisibilityFilter, EnumRoomVisibilityWithAggregatesFilter (+31 more)

### Community 21 - "Charon v0.2.0 — Setup e Join-to-Create"
Cohesion: 0.08
Nodes (24): 1. Painel administrativo persistente no canal, 2. Painel administrativo privado temporário — escolhida, 3. Assistente linear passo a passo, Abordagens consideradas, Antiobjetivos, Charon v0.2.0 — Setup e Join-to-Create, Compensação de falhas, Criação e ciclo de vida da sala (+16 more)

### Community 22 - "class.ts"
Cohesion: 0.22
Nodes (4): config, decodeBase64AsWasm(), LogOptions, PrismaClientConstructor

### Community 25 - "enums.ts"
Cohesion: 0.67
Nodes (3): Task 1: Persist Voice Creator and Temporary Room State, RoomVisibility, TemporaryRoomStatus

### Community 26 - "setup-creation.interactions.ts"
Cohesion: 0.12
Nodes (32): SetupCategory, SetupChannelCreationError, SetupVoiceChannel, voicePermissions, GuildBasedInteraction, SetupDiscordGatewayFactory, SetupInteraction, decodeSetupCustomId() (+24 more)

### Community 27 - "call-workspace.test.ts"
Cohesion: 0.16
Nodes (14): Aceitação real e rollout — pendentes de autorização separada, Global Constraints, Handoff, Mapa de arquivos e contratos, Painel público, tranca e visibilidade — Implementation Plan, Preparação e verificações comuns, Review Focus, Task 2: Aplicar os quatro estados de acesso com segurança (+6 more)

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
Cohesion: 0.07
Nodes (24): Task 5: Discord client and interaction registry, Task 7: Wire Setup and Voice Events into the Application, Arquitetura, ApplicationOverrides, createApplication(), createDefaultDispatcher(), createDefaultVoiceDispatcher(), DiscordClientPort (+16 more)

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
Cohesion: 0.09
Nodes (16): Calls: fluxo de eventos, Interações, Painel B, posse e acesso, Setup, Task 6: Implement Temporary Room Lifecycle and Compensation, Task 5: Aplicar o padrão às novas calls e fechar verificação/documentação, CallDiscordGateway, CreateDiscordRoomInput (+8 more)

### Community 39 - "vitest"
Cohesion: 0.17
Nodes (17): vitest, CallMoveUnconfirmedError, rights, createInput, panel, creator, entry, lifecycleFixture() (+9 more)

### Community 40 - "room-state.repository.ts"
Cohesion: 0.12
Nodes (12): $Enums, RoomAllowedMember, RoomPresence, VoiceCreator, CreateTemporaryRoomInput, invalidateControls, trackedStatuses, ConfiguredRoom (+4 more)

### Community 44 - "setup.interactions.ts"
Cohesion: 0.08
Nodes (22): Task 2: Add Voice Creator Repository and Setup Service, Task 3: Build the Private Setup Dashboard, Contratos compartilhados do novo fluxo, Mapa de arquivos e interfaces, Task 1: Persistir e editar o limite padrão sem alterar configurações antigas, Task 2: Rascunhos privados com revisão, TTL e confirmação única, Task 3: Criar entrada com permissões preservadas e compensação conservadora, Task 4: Conectar wizard e edição do padrão ao dashboard privado (+14 more)

### Community 46 - "setup-creation.interactions.ts"
Cohesion: 0.16
Nodes (14): contextOf(), requirePrivateAdministrator(), resultMessage(), SetupCreationInput, SetupCreationResult, SetupDraft, SetupDraftContext, SetupDraftRef (+6 more)

### Community 47 - "env.ts"
Cohesion: 0.17
Nodes (8): Task 2: Validated configuration, Application, registerShutdownSignals(), environmentSchema, loadConfig(), postgresUrl, start(), validEnvironment

### Community 48 - "Retomar o Charon após formatar o computador"
Cohesion: 0.33
Nodes (6): Antes de formatar: salvar fora do Git, De onde continuar, O que está salvo no GitHub, Recuperar o projeto, Retomar a validação da v0.3.0, Retomar o Charon após formatar o computador

### Community 49 - "createLogger"
Cohesion: 0.25
Nodes (7): Charon Stage 1 Infrastructure Implementation Plan, Global Constraints, Review Focus, Task 1: Project foundation, Task 3: Structured logger, Task 6: Application lifecycle and status command, Task 7: CI, documentation, and release readiness

### Community 50 - "RoomDiscordGateway"
Cohesion: 0.05
Nodes (35): Task 3: Continuous presence and five-minute claim priority, Autorrevisão do plano, Task 1: Persistir tranca sem alterar a privacidade existente, recordCallStage(), allowedUnion(), assertSnapshot(), RoomAccessService, safePrevious() (+27 more)

### Community 51 - "PrismaVoiceCreatorRepository"
Cohesion: 0.18
Nodes (3): isPrismaErrorWithCode(), PrismaVoiceCreatorRepository, VoiceCreatorAlreadyConfiguredError

### Community 52 - "call.schemas.ts"
Cohesion: 0.21
Nodes (14): buildInitialRoomName(), CallComponent, callComponentSchema, callControlActionSchema, callLimitSubmissionSchema, callMemberSelectionSchema, callRenameSubmissionSchema, decodeCallComponent() (+6 more)

### Community 53 - "DiscordSetupGateway"
Cohesion: 0.23
Nodes (6): discordErrorCode(), DiscordSetupGateway, SetupDiscordError, allPermissions, creationFixture(), fixture()

### Community 54 - "register-commands.ts"
Cohesion: 0.22
Nodes (7): commandDefinitions, CommandRegistrar, registerCommands(), AppConfig, LoggerOptions, setupCommandData, config

### Community 58 - "File Structure"
Cohesion: 0.18
Nodes (10): Calls module, Charon v0.2.0 Setup and Join-to-Create Implementation Plan, Composition, registration, and documentation, File Structure, Global Constraints, Persistence and shared utilities, Review Focus, Setup module (+2 more)

### Community 59 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, tsx@4.23.15, @types/node@26.6.6, @types/pg@8.23.1, typescript@7.0.2, vitest@5.1.0, tsx, @types/node (+2 more)

### Community 60 - "discord.js"
Cohesion: 0.10
Nodes (25): Task 5: Build the Disabled Minimalist Call Panel, Task 6: Compact panel B, private menu and strict component schemas, discord.js, TemporaryRoom, botRoomPermissions, CreatedDiscordRoom, buildCallPanel(), CallPanelInput (+17 more)

### Community 61 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, commands:register, dev, prisma:generate, start, test, test:run (+1 more)

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
Cohesion: 0.22
Nodes (8): Aceitação final após revisão independente, Cobertura por requisito, Discord real — PENDENTE, não executado, Estado e limites de autorização, Gate final observado, Limitações mantidas, Setup guiado — evidência local e validação pendente, TDD observado

### Community 70 - "room.runtime.ts"
Cohesion: 0.13
Nodes (15): pino, actions, CallActionStage, CallTraceAction, markCallActionFailed(), runCallActionTrace(), Trace, traces (+7 more)

### Community 74 - "Setup guiado do Charon Implementation Plan"
Cohesion: 0.25
Nodes (7): Gate de verificação — apenas local, Global Constraints, Handoff, Preparação de execução — antes da Tarefa 1, Review Focus, Self-review do plano, Setup guiado do Charon Implementation Plan

### Community 76 - "SetupDiscordGateway"
Cohesion: 0.14
Nodes (8): SetupCreationService, ReadySetupDraft, SetupDiscordGateway, isGuildBased(), SetupInteractions, configuration, fixture(), fixture()

### Community 78 - "setup-creation.interactions.test.ts"
Cohesion: 0.25
Nodes (7): context, fixture(), event(), review(), start(), json(), stores

### Community 80 - "call.interactions.ts"
Cohesion: 0.12
Nodes (21): buildAccessPrompt(), buildLimitModal(), buildRenameModal(), buildTransferPrompt(), buildTransferTargetPrompt(), customId(), memberSelect(), acknowledgeCallAction() (+13 more)

### Community 82 - "Validação local — painel público, tranca e visibilidade"
Cohesion: 0.18
Nodes (10): Aceitação real e rollout — PENDENTES de autorização separada, Antes — capturado com fetch ainda presente (2026-11-10, 17:57 e 17:59 local), Benchmark reproduzível de fronteiras (não é latência do Discord), Decisões registradas durante a execução, Depois, Escopo e limites, Gates locais — evidência histórica da Task 5, Onda final consolidada — I1, M1 e M2 resolvidos localmente (+2 more)

## Knowledge Gaps
- **3 isolated node(s):** `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1127 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `package.json` to `prismaNamespace.ts`, `RoomPresence.ts`, `prismaNamespaceBrowser.ts`, `PendingOwnershipTransfer.ts`, `room-state.repository.ts`, `TemporaryRoom.ts`, `VoiceCreator.ts`, `commonInputTypes.ts`, `class.ts`, `RoomAllowedMember.ts`?**
  _High betweenness centrality (0.154) - this node is a cross-community bridge._
- **What connects `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `prismaNamespace.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.01652892561983471 - nodes in this community are weakly interconnected._
- **Why does `InteractionRegistry` connect `application.ts` to `File Structure`, `CallService`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Should `OwnershipTimers` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Why does `DiscordSetupGateway` connect `DiscordSetupGateway` to `application.ts`, `Charon v0.2.0 — registro de validação`, `setup-calls-database.test.ts`, `setup.interactions.ts`, `SetupDiscordGateway`, `setup-creation.interactions.ts`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Should `prismaNamespaceBrowser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._