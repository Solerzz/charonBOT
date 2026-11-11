# Graph Report - feature-v0.4.0-moderacao-dono  (2026-11-11)

## Corpus Check
- 171 files · ~205,135 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .prisma 1)

## Summary
- 2244 nodes · 4992 edges · 103 communities (85 shown, 18 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 288 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f0dd86df`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Graphify Knowledge Graph (graphify-out)
- prismaNamespace.ts
- RoomMemberBlock.ts
- prismaNamespaceBrowser.ts
- package.json
- PrismaRoomStateRepository
- local-database
- Charon
- createRoomRuntime
- Charon v1 — Design
- compilerOptions
- compilerOptions
- TemporaryRoom.ts
- call.service.test.ts
- Charon — painel público, tranca e visibilidade independentes
- Charon v0.1.0 — Infraestrutura
- pull_request_template.md
- PrismaClientBaseOptions
- VoiceCreator.ts
- CallService
- commonInputTypes.ts
- Charon v0.2.0 — Setup e Join-to-Create
- class.ts
- TemporaryRoomDelegate
- VoiceCreatorDelegate
- room.runtime.ts
- RoomMemberBlockDelegate
- call-moderation.view.ts
- Supabase RLS Implementation Plan
- Prisma__TemporaryRoomClient
- Prisma__VoiceCreatorClient
- RoomAllowedMember.ts
- Charon — criação guiada de canais de entrada
- RoomPresence.ts
- discord.js
- PendingOwnershipTransfer.ts
- browser.ts
- Charon v0.3.0 — posse e controles
- createRoomRuntime
- DiscordRoomGateway
- prisma/client.ts
- PendingOwnershipTransferDelegate
- RoomAllowedMemberDelegate
- RoomPresenceDelegate
- Review Focus
- PrismaClient
- SetupDraftStore
- Charon v0.2.0 — Setup e join-to-create
- Retomar o Charon após formatar o computador
- Charon v0.3.0 Ownership and Room Controls Implementation Plan
- vitest
- setup.command.ts
- Charon v0.3.0 — posse e controles
- DiscordSetupGateway
- RoomActionError
- Prisma__PendingOwnershipTransferClient
- Prisma__RoomAllowedMemberClient
- Prisma__RoomPresenceClient
- SetupDiscordGateway
- CHANGELOG.md
- room.types.ts
- setup-creation.interactions.ts
- Changelog
- RoomActionError
- Arquitetura do Charon
- RoomModerationService
- RoomDiscordGateway
- Validação local v0.3.0
- File Structure
- PrismaVoiceCreatorRepository
- Charon v0.4.0 — remoção e bloqueio pelo dono
- RoomStateRepository
- room-moderation.transport.ts
- Setup guiado do Charon Implementation Plan
- call-workspace.test.ts
- setup.repository.ts
- Moderação direta do dono — Implementation Plan
- setup-creation.interactions.test.ts
- InteractionRegistry
- enums.ts
- index.ts
- Validação e rollout — painel público, tranca e visibilidade
- Setup guiado — evidência local e validação pendente
- call-controls.view.test.ts
- Prisma__RoomMemberBlockClient
- vitest
- scripts
- createLogger
- call.schemas.ts
- CallPrivateWorkspace
- application.rooms.test.ts
- CallInteractions
- call.interactions.ts
- @prisma/client
- Moderação direta do dono — validação local v0.4.0
- env.ts
- dotenv
- CallPanelPayload
- Abordagens consideradas
- Criação e ciclo de vida da sala
- Experiência administrativa
- Persistência

## God Nodes (most connected - your core abstractions)
1. `RoomDiscordGateway` - 85 edges
2. `RoomActionError` - 81 edges
3. `RoomActor` - 68 edges
4. `vitest` - 68 edges
5. `discord.js` - 63 edges
6. `createRoomRuntime()` - 54 edges
7. `RoomState` - 46 edges
8. `DiscordRoomGateway` - 44 edges
9. `createLogger()` - 43 edges
10. `PrismaRoomStateRepository` - 41 edges

## Surprising Connections (you probably didn't know these)
- `Task 7: Idempotent panel synchronization and setup toggle propagation` --references--> `SetupService`  [INFERRED]
  docs/superpowers/plans/2026-11-08-charon-v0.3.0-posse-controles.md → src/modules/setup/setup.service.ts
- `Autorrevisão do plano` --references--> `RoomAccessPolicy`  [INFERRED]
  docs/superpowers/plans/2026-11-10-charon-painel-publico-tranca-visibilidade.md → src/modules/calls/room.types.ts
- `Task 4: Conectar o painel público e eliminar respostas genéricas` --references--> `CallInteraction`  [INFERRED]
  docs/superpowers/plans/2026-11-10-charon-painel-publico-tranca-visibilidade.md → src/modules/calls/call.interactions.ts
- `Task 5: Private-room access and owner settings` --references--> `requireOwnedRoom()`  [INFERRED]
  docs/superpowers/plans/2026-11-08-charon-v0.3.0-posse-controles.md → src/modules/calls/room-context.ts
- `Validação, segurança e observabilidade` --references--> `customId()`  [INFERRED]
  docs/superpowers/specs/2026-11-05-charon-v0.2.0-setup-join-to-create-design.md → src/modules/calls/call-controls.view.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify Maintenance and Usage Workflow** — agents_graphify_command, agents_graphify_query, agents_graphify_update, agents_graph_json, agents_graph_report, agents_wiki_index [INFERRED 0.75]

## Communities (103 total, 18 thin omitted)

### Community 0 - "Graphify Knowledge Graph (graphify-out)"
Cohesion: 0.33
Nodes (7): graphify-out/graph.json, graphify-out/GRAPH_REPORT.md, /graphify User Command, Graphify Knowledge Graph (graphify-out), graphify query / path / explain Commands, graphify update Command, graphify-out/wiki/index.md

### Community 1 - "prismaNamespace.ts"
Cohesion: 0.02
Nodes (125): AnyNull, Args, At, AtLeast, AtLoose, AtStrict, BatchPayload, BigIntFieldRefInput (+117 more)

### Community 2 - "RoomMemberBlock.ts"
Cohesion: 0.02
Nodes (82): AggregateRoomMemberBlock, BigIntFieldUpdateOperationsInput, EnumRoomMemberBlockStateFieldUpdateOperationsInput, GetRoomMemberBlockAggregateType, GetRoomMemberBlockGroupByPayload, RoomMemberBlockAggregateArgs, RoomMemberBlockAvgAggregateInputType, RoomMemberBlockAvgAggregateOutputType (+74 more)

### Community 3 - "prismaNamespaceBrowser.ts"
Cohesion: 0.11
Nodes (16): AnyNull, DbNull, Decimal, JsonNull, ModelName, NullsOrder, NullTypes, PendingOwnershipTransferScalarFieldEnum (+8 more)

### Community 4 - "package.json"
Cohesion: 0.15
Nodes (16): devDependencies, tsx@4.23.15, @types/node@26.6.6, @types/pg@8.23.1, typescript@7.0.2, vitest@5.1.0, engines, node (+8 more)

### Community 5 - "PrismaRoomStateRepository"
Cohesion: 0.07
Nodes (22): Aceitação real e rollout — checklist original e estado posterior, Autorrevisão do plano, Global Constraints, Handoff, Mapa de arquivos e contratos, Painel público, tranca e visibilidade — Implementation Plan, Preparação e verificações comuns, Review Focus (+14 more)

### Community 6 - "local-database"
Cohesion: 0.06
Nodes (37): DATABASE_URL, DIRECT_URL, POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, RUN_DATABASE_SECURITY_TESTS, RUN_DATABASE_TESTS, jobs (+29 more)

### Community 7 - "Charon"
Cohesion: 0.25
Nodes (8): Charon, Comandos, Desenvolvimento, Instalação, Posse e controles da v0.3.0, Requisitos, Segurança, Variáveis de ambiente

### Community 8 - "createRoomRuntime"
Cohesion: 0.19
Nodes (12): allowedUnion(), assertSnapshot(), RoomAccessService, safePrevious(), sameAccess(), sameAuthority(), sameIds(), projectModerationAccess() (+4 more)

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
Nodes (129): AggregateTemporaryRoom, EnumRoomVisibilityFieldUpdateOperationsInput, EnumTemporaryRoomStatusFieldUpdateOperationsInput, GetTemporaryRoomAggregateType, GetTemporaryRoomGroupByPayload, NullableStringFieldUpdateOperationsInput, TemporaryRoom$allowedMembersArgs, TemporaryRoom$memberBlocksArgs (+121 more)

### Community 13 - "call.service.test.ts"
Cohesion: 0.15
Nodes (20): botRoomPermissions, CallMoveUnconfirmedError, CreatedDiscordRoom, discordFixture(), rights, createInput, panel, creator (+12 more)

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

### Community 19 - "CallService"
Cohesion: 0.07
Nodes (17): Task 7: Wire Setup and Voice Events into the Application, Task 5: Aplicar o padrão às novas calls e fechar verificação/documentação, Charon v0.2.0 — registro de validação, Discord real: verificações observadas, Limpeza e limites, PostgreSQL real: aprovado, Versão verificada, DiscordClientPort (+9 more)

### Community 20 - "commonInputTypes.ts"
Cohesion: 0.04
Nodes (47): BigIntFilter, BigIntWithAggregatesFilter, BoolFilter, BoolWithAggregatesFilter, DateTimeFilter, DateTimeNullableFilter, DateTimeNullableWithAggregatesFilter, DateTimeWithAggregatesFilter (+39 more)

### Community 21 - "Charon v0.2.0 — Setup e Join-to-Create"
Cohesion: 0.18
Nodes (10): Antiobjetivos, Charon v0.2.0 — Setup e Join-to-Create, Decisões do implementador, Decisões do usuário, Intento, Não objetivos, Objetivos, Painel da call (+2 more)

### Community 22 - "class.ts"
Cohesion: 0.22
Nodes (4): config, decodeBase64AsWasm(), LogOptions, PrismaClientConstructor

### Community 25 - "room.runtime.ts"
Cohesion: 0.19
Nodes (9): pino, PrismaClient, CallComponent, TransferDependencies, LockObservation, runtimes, roomModerationFixture(), fixture() (+1 more)

### Community 27 - "call-moderation.view.ts"
Cohesion: 0.27
Nodes (12): back(), buildModerationBlockedPage(), buildModerationBlockPrompt(), buildModerationConfirmation(), buildModerationHome(), buildModerationResult(), button(), member() (+4 more)

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

### Community 34 - "discord.js"
Cohesion: 0.09
Nodes (23): Calls: fluxo de eventos, Task 3: Criar entrada com permissões preservadas e compensação conservadora, discord.js, ApplicationOverrides, createApplication(), createDefaultVoiceDispatcher(), fetch(), hasRuntimeRepositories() (+15 more)

### Community 35 - "PendingOwnershipTransfer.ts"
Cohesion: 0.03
Nodes (73): AggregatePendingOwnershipTransfer, GetPendingOwnershipTransferAggregateType, GetPendingOwnershipTransferGroupByPayload, PendingOwnershipTransferAggregateArgs, PendingOwnershipTransferAvgAggregateInputType, PendingOwnershipTransferAvgAggregateOutputType, PendingOwnershipTransferAvgOrderByAggregateInput, PendingOwnershipTransferCountAggregateInputType (+65 more)

### Community 36 - "browser.ts"
Cohesion: 0.25
Nodes (7): $Enums, PendingOwnershipTransfer, RoomAllowedMember, RoomMemberBlock, RoomPresence, TemporaryRoom, VoiceCreator

### Community 37 - "Charon v0.3.0 — posse e controles"
Cohesion: 0.08
Nodes (24): 10. Ciclo de vida e falhas — propostas técnicas, 11. Verificação e limites operacionais, 12. Fora do escopo e liberdade de implementação, 1. Objetivo e contexto, 2. Origem das decisões, 3. Abordagens de interação, 4. Painel e controles, 5. Posse e elegibilidade (+16 more)

### Community 38 - "createRoomRuntime"
Cohesion: 0.14
Nodes (6): Task 3: Continuous presence and five-minute claim priority, RoomCoordinator, createRoomRuntime(), matchesGeneration(), matchesSnapshot(), OwnershipService

### Community 39 - "DiscordRoomGateway"
Cohesion: 0.16
Nodes (4): DiscordRoomGateway, hasCode(), RoomModerationTransport, RoomModerationTarget

### Community 40 - "prisma/client.ts"
Cohesion: 0.15
Nodes (7): CreateTemporaryRoomInput, invalidateControls, PrismaTemporaryRoomRepository, TemporaryRoomTransitionError, trackedStatuses, fixture(), invalidate

### Community 44 - "Review Focus"
Cohesion: 0.25
Nodes (7): Charon Stage 1 Infrastructure Implementation Plan, Global Constraints, Review Focus, Task 1: Project foundation, Task 3: Structured logger, Task 6: Application lifecycle and status command, Task 7: CI, documentation, and release readiness

### Community 46 - "SetupDraftStore"
Cohesion: 0.16
Nodes (14): contextOf(), requirePrivateAdministrator(), resultMessage(), SetupCreationInput, SetupCreationResult, SetupDraft, SetupDraftContext, SetupDraftRef (+6 more)

### Community 47 - "Charon v0.2.0 — Setup e join-to-create"
Cohesion: 0.33
Nodes (5): Banco e verificação local, Charon v0.2.0 — Setup e join-to-create, Entregas, Estado desta preparação, Limitações operacionais

### Community 48 - "Retomar o Charon após formatar o computador"
Cohesion: 0.33
Nodes (6): Antes de formatar: salvar fora do Git, De onde continuar, O que está salvo no GitHub, Recuperar o projeto, Retomar a validação da v0.3.0, Retomar o Charon após formatar o computador

### Community 49 - "Charon v0.3.0 Ownership and Room Controls Implementation Plan"
Cohesion: 0.10
Nodes (14): Baseline, isolation and test environment, Charon v0.3.0 Ownership and Room Controls Implementation Plan, File Structure, Global Constraints, Review Focus, Self-review and handoff, Task 1: Persist room-control state and prove database invariants, Task 2: Discord room adapter, shared guards and timer lifecycle (+6 more)

### Community 50 - "vitest"
Cohesion: 0.27
Nodes (12): CallInteraction, deferred(), runtimes, runtimeFixture(), roomSettingsFixture(), human(), OLDEST, OTHER (+4 more)

### Community 51 - "setup.command.ts"
Cohesion: 0.18
Nodes (8): Task 2: Validated configuration, commandDefinitions, CommandRegistrar, registerCommands(), AppConfig, LoggerOptions, setupCommandData, config

### Community 52 - "Charon v0.3.0 — posse e controles"
Cohesion: 0.40
Nodes (5): Banco local e CI (sem credenciais remotas), Charon v0.3.0 — posse e controles, Entrega implementada, Permissões e limites operacionais, Validação e limites do aceite humano

### Community 53 - "DiscordSetupGateway"
Cohesion: 0.20
Nodes (7): discordErrorCode(), DiscordSetupGateway, SetupChannelCreationError, SetupDiscordError, allPermissions, creationFixture(), fixture()

### Community 54 - "RoomActionError"
Cohesion: 0.26
Nodes (3): RoomActor, safe(), TransferService

### Community 58 - "SetupDiscordGateway"
Cohesion: 0.15
Nodes (7): SetupCreationService, ReadySetupDraft, SetupDiscordGateway, isGuildBased(), SetupInteractions, configuration, fixture()

### Community 59 - "CHANGELOG.md"
Cohesion: 0.29
Nodes (4): Evidência local, Mudanças, Pendências de rollout, v0.4.0 — moderação direta do dono (validada somente localmente)

### Community 60 - "room.types.ts"
Cohesion: 0.10
Nodes (16): Task 6: Compact panel B, private menu and strict component schemas, $Enums, RoomAllowedMember, RoomMemberBlock, RoomPresence, TemporaryRoom, VoiceCreator, CallPanelInput (+8 more)

### Community 61 - "setup-creation.interactions.ts"
Cohesion: 0.13
Nodes (30): SetupCategory, SetupVoiceChannel, voicePermissions, GuildBasedInteraction, SetupDiscordGatewayFactory, decodeSetupCustomId(), defaultUserLimitSchema, discordIdSchema (+22 more)

### Community 62 - "Changelog"
Cohesion: 0.22
Nodes (9): [0.1.0] - 2026-11-05, [0.2.0] - 2026-11-06, 0.3.0 — integrada e validada no servidor de testes em 2026-11-10, 0.4.0 — implementação e validação locais em 2026-11-11; rollout pendente, Added, Added, Changelog, Known limitations (+1 more)

### Community 63 - "RoomActionError"
Cohesion: 0.17
Nodes (15): Lock and permission contracts, Shared contracts — define once, reuse in later tasks, requireActiveRoom(), requireOwnedRoom(), Dependencies, sameRoomBlocks(), assertSnapshot(), Dependencies (+7 more)

### Community 65 - "Arquitetura do Charon"
Cohesion: 0.22
Nodes (9): Arquitetura do Charon, Banco de dados, Estilo, Estrutura na v0.3.0 (preparação local), Fluxo de inicialização, Interações, Painel B, posse e acesso, Setup (+1 more)

### Community 67 - "RoomDiscordGateway"
Cohesion: 0.18
Nodes (3): RoomControlsService, currentOwnedRoom(), RoomDiscordGateway

### Community 68 - "Validação local v0.3.0"
Cohesion: 0.18
Nodes (11): Aceite da revisão local — 2026-11-09, CI, segurança dos artefatos e limites, Fix round 1 — 2026-11-09, validação focada, Follow-up M2 — 2026-11-09, M2 — envelope da consulta inicial — 2026-11-09, Onda final combinada — 2026-11-09, RED → GREEN e caracterizações, Resultados observados (+3 more)

### Community 69 - "File Structure"
Cohesion: 0.16
Nodes (13): Calls module, Composition, registration, and documentation, File Structure, Persistence and shared utilities, Setup module, Task 4: Handle Setup Buttons, Selects, and Modals, Task 5: Build the Disabled Minimalist Call Panel, Task 6: Implement Temporary Room Lifecycle and Compensation (+5 more)

### Community 71 - "Charon v0.4.0 — remoção e bloqueio pelo dono"
Cohesion: 0.13
Nodes (14): 1. Objetivo e escopo, 2. Decisões do usuário e contexto preservado, 3. Abordagens consideradas, 4. Fluxo de interação — propostas técnicas sujeitas ao aceite do desenho, 5. Precedência e permissões efetivas, 6. Estado durável e consistência — escolhas técnicas do assistente, 7. Verificação necessária, 8. Entrega, limites e próximos passos (+6 more)

### Community 73 - "room-moderation.transport.ts"
Cohesion: 0.31
Nodes (4): createRoomModerationTransport(), NotInRoom, fixture(), transports

### Community 74 - "Setup guiado do Charon Implementation Plan"
Cohesion: 0.25
Nodes (7): Gate de verificação — apenas local, Global Constraints, Handoff, Preparação de execução — antes da Tarefa 1, Review Focus, Self-review do plano, Setup guiado do Charon Implementation Plan

### Community 75 - "call-workspace.test.ts"
Cohesion: 0.14
Nodes (15): ModerationSelection, CallWorkspaceDelivery, CallWorkspaceView, selectionUuid, Workspace, access, actor, confirmation() (+7 more)

### Community 76 - "setup.repository.ts"
Cohesion: 0.07
Nodes (25): Task 2: Add Voice Creator Repository and Setup Service, Task 3: Build the Private Setup Dashboard, Contratos compartilhados do novo fluxo, Mapa de arquivos e interfaces, Task 1: Persistir e editar o limite padrão sem alterar configurações antigas, Task 2: Rascunhos privados com revisão, TTL e confirmação única, Task 4: Conectar wizard e edição do padrão ao dashboard privado, createDefaultDispatcher() (+17 more)

### Community 77 - "Moderação direta do dono — Implementation Plan"
Cohesion: 0.12
Nodes (15): Autorrevisão do plano, Global Constraints, Handoff, Mapa de arquivos e contratos, Moderação direta do dono — Implementation Plan, Preparação e segurança da execução, Review Focus, Rollout real — não executar neste plano local (+7 more)

### Community 78 - "setup-creation.interactions.test.ts"
Cohesion: 0.14
Nodes (11): Task 8: Wire interactions, voice lifecycle and one shared room runtime, InteractionHandler, SetupCreationInteractions, SetupInteraction, context, fixture(), event(), review() (+3 more)

### Community 79 - "InteractionRegistry"
Cohesion: 0.22
Nodes (6): Task 5: Discord client and interaction registry, Charon v0.2.0 Setup and Join-to-Create Implementation Plan, Global Constraints, Review Focus, Arquitetura, InteractionRegistry

### Community 80 - "enums.ts"
Cohesion: 0.50
Nodes (4): Task 1: Persist Voice Creator and Temporary Room State, RoomMemberBlockState, RoomVisibility, TemporaryRoomStatus

### Community 81 - "index.ts"
Cohesion: 0.27
Nodes (4): Application, registerShutdownSignals(), loadConfig(), start()

### Community 82 - "Validação e rollout — painel público, tranca e visibilidade"
Cohesion: 0.18
Nodes (11): Aceitação humana — aprovada no escopo relatado, Antes — capturado com fetch ainda presente (2026-11-10, 17:57 e 17:59 local), Benchmark reproduzível de fronteiras (não é latência do Discord), Decisões registradas durante a execução, Depois, Escopo e limites, Gates locais — evidência histórica da Task 5, Integração Git e rollout autorizados — concluídos em 2026-11-10 (+3 more)

### Community 83 - "Setup guiado — evidência local e validação pendente"
Cohesion: 0.22
Nodes (8): Aceitação final após revisão independente, Cobertura por requisito, Discord real — PENDENTE, não executado, Estado e limites de autorização, Gate final observado, Limitações mantidas, Setup guiado — evidência local e validação pendente, TDD observado

### Community 84 - "call-controls.view.test.ts"
Cohesion: 0.25
Nodes (10): buildAccessPrompt(), buildLimitModal(), buildRenameModal(), buildTransferTargetPrompt(), customId(), memberSelect(), CallControlAction, actor (+2 more)

### Community 86 - "vitest"
Cohesion: 0.17
Nodes (13): vitest, actions, CallActionStage, CallTraceAction, markCallActionFailed(), recordCallStage(), runCallActionTrace(), Trace (+5 more)

### Community 87 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, commands:register, dev, prisma:generate, start, test, test:run (+1 more)

### Community 88 - "createLogger"
Cohesion: 0.17
Nodes (11): createLogger(), redactedPaths, sanitizeLogValue(), sensitiveKeys, Dependencies, RoomPanelService, RoomGuildResolver, captureLogger() (+3 more)

### Community 89 - "call.schemas.ts"
Cohesion: 0.22
Nodes (14): buildInitialRoomName(), callComponentSchema, callControlActionSchema, callLimitSubmissionSchema, callMemberSelectionSchema, callRenameSubmissionSchema, decodeCallComponent(), graphemes() (+6 more)

### Community 90 - "CallPrivateWorkspace"
Cohesion: 0.30
Nodes (6): Task 3: Criar uma área privada reutilizável e limitada à sessão, CallPrivateWorkspace, keyOf(), sameArea(), snapshotView(), validDelivery()

### Community 91 - "application.rooms.test.ts"
Cohesion: 0.17
Nodes (13): Task 4: Prisma adapter, pg, checkDatabase(), createPrismaClient(), DatabaseClient, disconnectDatabase(), disconnectedClients, assertDisposableDatabaseEnvironment() (+5 more)

### Community 92 - "CallInteractions"
Cohesion: 0.25
Nodes (7): buildTransferPrompt(), CallInteractions, id(), encodeCallComponent(), fixture(), fixture(), fixture()

### Community 93 - "call.interactions.ts"
Cohesion: 0.33
Nodes (7): acknowledgeCallAction(), CallAckMode, completeCallAction(), replyCallFailure(), Dependencies, failureMessage(), failure

### Community 94 - "@prisma/client"
Cohesion: 0.25
Nodes (8): dependencies, discord.js@14.28.1, pg@8.23.1, pino@10.4.0, @prisma/adapter-pg@7.10.1, @prisma/client@7.10.1, @prisma/adapter-pg, @prisma/client

### Community 95 - "Moderação direta do dono — validação local v0.4.0"
Cohesion: 0.29
Nodes (7): Contrato entregue, Correção restrita NB1 — 2026-11-11, Correções da revisão final, Evidência composta, Gates observados — onda I1–I4/M1 anterior a NB1, Limites e rollout pendente, Moderação direta do dono — validação local v0.4.0

### Community 96 - "env.ts"
Cohesion: 0.29
Nodes (5): zod@4.6.7, zod, environmentSchema, postgresUrl, validEnvironment

### Community 97 - "dotenv"
Cohesion: 0.40
Nodes (4): dotenv@18.0.9, prisma@7.10.1, dotenv, prisma

### Community 99 - "Abordagens consideradas"
Cohesion: 0.50
Nodes (4): 1. Painel administrativo persistente no canal, 2. Painel administrativo privado temporário — escolhida, 3. Assistente linear passo a passo, Abordagens consideradas

### Community 100 - "Criação e ciclo de vida da sala"
Cohesion: 0.50
Nodes (4): Compensação de falhas, Criação e ciclo de vida da sala, Evento de entrada, Saída e encerramento

### Community 101 - "Experiência administrativa"
Cohesion: 0.67
Nodes (3): Dashboard efêmero, Entrada e autorização, Experiência administrativa

### Community 102 - "Persistência"
Cohesion: 0.67
Nodes (3): Persistência, `TemporaryRoom`, `VoiceCreator`

## Knowledge Gaps
- **3 isolated node(s):** `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1314 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `@prisma/client` to `prismaNamespace.ts`, `RoomMemberBlock.ts`, `prismaNamespaceBrowser.ts`, `package.json`, `PendingOwnershipTransfer.ts`, `RoomPresence.ts`, `TemporaryRoom.ts`, `VoiceCreator.ts`, `commonInputTypes.ts`, `class.ts`, `room.types.ts`, `RoomAllowedMember.ts`?**
  _High betweenness centrality (0.187) - this node is a cross-community bridge._
- **What connects `./tsconfig.json`, `/graphify User Command`, `graphify-out/GRAPH_REPORT.md` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `prismaNamespace.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.015873015873015872 - nodes in this community are weakly interconnected._
- **Why does `Arquitetura do Charon` connect `Arquitetura do Charon` to `architecture.md`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Should `RoomMemberBlock.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.024096385542168676 - nodes in this community are weakly interconnected._
- **Why does `InteractionRegistry` connect `InteractionRegistry` to `Arquitetura do Charon`, `discord.js`, `setup.repository.ts`, `setup-creation.interactions.test.ts`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Should `prismaNamespaceBrowser.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._