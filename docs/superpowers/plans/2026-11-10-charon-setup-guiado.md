# Setup guiado do Charon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar canais de entrada pelo `/setup init`, somente após confirmação, e aplicar o limite padrão às novas calls sem alterar seus nomes automáticos ou painel.

**Architecture:** Reaproveitar os módulos setup/calls. Uma store transitória controla rascunhos privados e confirmações concorrentes; um serviço coordena criação Discord/persistência/compensação. VoiceCreator guarda o limite padrão, copiado para o canal e TemporaryRoom apenas ao criar uma nova call.

**Tech Stack:** TypeScript strict, Node.js >=20.19.0, Discord.js 14.28.1, Prisma 7.10.1, PostgreSQL 17, Zod, Vitest; nenhuma dependência nova.

**Spec:** `docs/superpowers/specs/2026-11-10-charon-setup-guiado-design.md` — aprovado pelo usuário. Ler ambos antes da execução.

## Global Constraints

- Manter TypeScript, Discord.js, Prisma/PostgreSQL e os componentes nativos do Discord.
- O administrador escolhe uma categoria existente e informa o nome do canal de entrada.
- Esse nome pertence **somente ao canal de entrada**, não às calls temporárias.
- O administrador define o limite inicial das calls geradas; o canal de entrada permanece sem limite.
- As calls continuam com nome automático baseado no jogo/nome de exibição.
- O dono altera a própria call pelo painel, sem alterar o modelo das próximas.
- A criação será guiada, com resumo e confirmação antes de criar o canal.
- Limite: inteiro de 0 a 99; **0 significa sem limite**. Nome de entrada: 1–100 caracteres após trim; calls: contrato atual de 11 grafemas.
- O canal de entrada e as calls inicialmente usam a mesma categoria escolhida. Alterar categoria das salas não move entrada/calls existentes.
- Rascunhos em memória, TTL de 10 minutos; reinício invalida rascunhos. Uma instância do bot; sem promessa de exactly-once entre reinícios.
- Permissões: Administrador ou Gerenciar Servidor + Gerenciar Canais para o usuário; não exigir Administrador do bot nem modificar cargos.
- Preservar RLS e ausência de políticas públicas. Migration nova/aditiva; nunca editar migrations publicadas.
- Não criar interface web, novos comandos globais, dependências novas, novo sistema de painéis ou um mecanismo genérico de workflows.
- Sem criar categorias automaticamente, templates de nomes, reorganizar salas ativas, reparo global de órfãos, hospedagem ou deploy automático.
- Nunca executar suítes destrutivas, grants de testes ou prepare-database no Supabase. TLS remoto continua verificado; credenciais somente no `.env` ignorado original, nunca em logs/commits/comandos impressos.
- A autorização anterior de migration não cobre a próxima. Qualquer nova aplicação remota exige destino/backup e autorização explícita separados.

## Review Focus

1. Timeout/5xx do POST pode ter criado o canal: uma chamada de transporte, resultado incerto sem ID e nenhuma repetição automática — Tarefa 3.
2. Confirmação simultânea, TTL durante criação e parada da aplicação: uma operação por revisão, sem evicção que libere duplicação ou fechamento prematuro do banco — Tarefas 2 e 4.
3. Commit SQL aplicado com resposta perdida, ou registro lógico excluído encontrado: consultar por ID sem esconder soft-delete e nunca apagar canal com persistência incerta — Tarefas 1 e 3.
4. Categoria privada e revogação de permissões entre formulário e confirmação: preservar overwrites e revalidar, sem ampliar acesso nem criar após perda de autorização — Tarefas 3 e 4.
5. Edição de padrão concorrente à entrada/reuso de sala: uma única leitura define a nova call; sala existente/ajustes do dono/modelo não são reescritos — Tarefa 5.

---

## Preparação de execução — antes da Tarefa 1

- [x] Usuário revisou e escolheu execução com subagentes (opção 2): um implementador e um revisor por tarefa, mais revisão final.
- [x] `using-git-worktrees` confirmou worktree já isolado. Reutilizá-lo com branch nova `feature/setup-guiado` a partir de `origin/main` (árvore fonte idêntica), preservando os quatro arquivos graphify-out sujos e seus artefatos. Não criar worktree duplicado nem resetar/descartar/stagear mudanças anteriores por conveniência. Commitar somente desenho/plano como documentação aprovada antes da implementação.
- [x] Bot anterior identificado por PID/comando/runId e parado pelo seu stopFile; estado stopped e processo encerrado confirmados. Não matar todos os processos Node nem iniciar uma segunda instância.
- [ ] Executar `graphify query "<pergunta específica>"` antes da primeira exploração de código de cada implementador/revisor; usar o grafo e arquivos localizados por ele/imports. Incluir esta regra em todo prompt de subagente que explore código. Após mudanças de código, executar `graphify update .` e preservar seus artefatos esperados.
- [x] Baseline fresco com `RUN_DATABASE_TESTS=false`, `RUN_DATABASE_SECURITY_TESTS=false`: typecheck/build aprovados, 786 testes comuns passaram e 29 integrações ficaram desabilitadas como esperado. Sem credenciais remotas.

## Mapa de arquivos e interfaces

| Área | Arquivos | Responsabilidade |
| --- | --- | --- |
| Modelo | `prisma/schema.prisma`, nova migration `20261110010000_voice_creator_default_limit/migration.sql`, `src/generated/prisma/**` | Default persistido e cliente gerado; confirmar que o nome da nova migration está livre antes de criar. |
| Repositório | `src/modules/setup/setup.repository.ts`, `src/modules/setup/setup.service.ts` | Salvar/editar limite; consulta de recuperação incluindo soft-delete. |
| Criação | novos `src/modules/setup/setup-creation.types.ts`, `setup-drafts.ts`, `setup-creation.service.ts` | Tipos do fluxo, rascunhos, execução única e coordenação Discord/SQL. |
| Discord | `src/modules/setup/setup.discord.ts`, `src/core/discord/client.ts` | Criar/validar/remover somente canal conhecido; impedir retry de POST incerto. |
| Interações | novo `src/modules/setup/setup-creation.interactions.ts`; `setup.schemas.ts`, `setup.views.ts`, `setup.interactions.ts`, `src/application.ts` | Wizard privado, edição do padrão e ciclo de vida compartilhado. |
| Calls | `src/modules/calls/call.discord.ts`, `call.repository.ts`, `call.service.ts` | Mesmo limite no create Discord e CREATING SQL, sem reaplicar em reuso. |
| Evidência | testes abaixo, `docs/architecture.md`, novo `docs/validation/2026-11-10-setup-guiado-validation.md` | Regressões, integrações locais e checklist real sem alegar execução ainda não observada. |

### Contratos compartilhados do novo fluxo

Definir em `setup-creation.types.ts`; são específicos de setup, não framework:

```ts
interface SetupDraftContext {
  guildDiscordId: string; administratorDiscordId: string; messageDiscordId: string;
}
interface SetupDraftRef { id: string; revision: number }
interface SetupCreationInput { categoryDiscordId: string; name: string; defaultUserLimit: number }
type SetupCreationResult =
  | { status: 'created'; configuration: VoiceCreatorConfiguration }
  | { status: 'failed' | 'partial' | 'uncertain'; channelDiscordId?: string };
interface SetupDraft {
  id: string; revision: number; context: SetupDraftContext; expiresAt: number;
  status: 'editing' | 'review' | 'creating' | SetupCreationResult['status'];
  input: Partial<SetupCreationInput>; result?: SetupCreationResult;
}
type ReadySetupDraft = Omit<SetupDraft, 'input'> & { input: SetupCreationInput };
```

`VoiceCreatorConfiguration` é o tipo já exportado por `setup.repository.ts`.
Guardar/capturar cópias de dados para impedir que callers alterem o estado da store.
`failed` confirma ausência de criação útil após falha/compensação; `partial`
preserva canal conhecido sem configuração confirmada; `uncertain` representa
create sem ID ou persistência cuja existência não pôde ser confirmada.

### Task 1: Persistir e editar o limite padrão sem alterar configurações antigas

**Files:**
- Modify: `prisma/schema.prisma:22-35`, `src/modules/setup/setup.repository.ts`, `src/modules/setup/setup.service.ts`, `src/modules/setup/setup.schemas.ts`.
- Create: `prisma/migrations/20261110010000_voice_creator_default_limit/migration.sql`, `tests/integration/setup-guided-database.test.ts`.
- Test: `tests/unit/modules/setup/setup.schemas.test.ts`, `setup.repository.test.ts`, `setup.service.test.ts` no mesmo diretório de testes setup.
- Regenerate: `src/generated/prisma/**`; atualizar fixtures tipadas de setup command/interactions/views/service/repository e `tests/unit/modules/calls/call.fixtures.ts`, sem casts para esconder campos faltantes.

**Interfaces:**
- Consumes: `VoiceCreatorRepository`, `SetupService`, `assertDisposableDatabaseEnvironment()` existentes.
- Produces: `VoiceCreator.defaultUserLimit: number`; `CreateVoiceCreatorInput` preserva os três IDs obrigatórios e acrescenta `defaultUserLimit?: number`.
- Produces: `VoiceCreatorRepository.setDefaultUserLimit(id: string, limit: number): Promise<VoiceCreatorConfiguration>` e `findStoredByChannel(channelDiscordId: string): Promise<VoiceCreatorConfiguration | null>`; esta última inclui registros logicamente excluídos.
- Produces: `SetupService.setDefaultUserLimit(id: string, limit: number): Promise<VoiceCreatorConfiguration>`.
- Produces: `defaultUserLimitSchema` (number inteiro 0..99) e `setupDefaultLimitInputSchema` (string decimal canônica `0` ou `1..99`, trim, transform para number) em `setup.schemas.ts`.

- [ ] **Step 1: Escrever testes RED.** Em repositório, `create({...input,defaultUserLimit:4})` envia 4, criação sem campo usa 0; update afeta apenas ID ativo; `findStoredByChannel` retorna soft-delete. Em serviço/schema, entradas -1/100/1.5 são rejeitadas antes do repositório; strings vazias/`01`/`1e1`/`1.5` inválidas, `0`/`1`/`99` válidas. Restauração sem campo explícito preserva o padrão existente; com campo explícito, atualiza o padrão, preservando identidade/histórico/flag.

```ts
expect(setupDefaultLimitInputSchema.parse(' 4 ')).toBe(4);
expect(defaultUserLimitSchema.safeParse(100).success).toBe(false);
await service.setDefaultUserLimit(first.id, 4);
expect(repository.setDefaultUserLimit).toHaveBeenCalledExactlyOnceWith(first.id, 4);
expect(prisma.voiceCreator.findUnique).toHaveBeenCalledWith({
  where: { creatorChannelDiscordId: first.creatorChannelDiscordId },
});
```

- [ ] **Step 2: Executar RED.** `npm run test:run -- tests/unit/modules/setup/setup.schemas.test.ts tests/unit/modules/setup/setup.repository.test.ts tests/unit/modules/setup/setup.service.test.ts`. Esperado: falhas específicas de schemas/métodos/default ainda ausentes, não falhas de fixture inválida.
- [ ] **Step 3: Implementar o contrato.** Adicionar `defaultUserLimit Int @default(0)`; migration com um ALTER TABLE atômico que adiciona INTEGER NOT NULL DEFAULT 0 e CHECK nomeado `VoiceCreator_defaultUserLimit_check`, faixa 0..99. Nenhuma tabela/índice/política nova. Implementar query de recuperação `findUnique` por canal sem filtro de deletedAt, update condicional ativo e validação no serviço. Regenerar com `npm run prisma:generate`, usando URLs somente do banco local descartável se a configuração exigir env.
- [ ] **Step 4: Verificar GREEN e SQL local.** Repetir os testes RED e typecheck. No novo teste opt-in, chamar o guard antes de qualquer SQL: dentro de transação, criar schema UUID próprio + tabela mínima VoiceCreator com linha/RLS anteriores, executar a nova migration no `search_path` local, verificar linha preservada/default 0/RLS; usar SAVEPOINT para testar CHECK -1/100 e rollback final do schema. No banco completo local, deploy + roundtrip 0/4/99 e isolamento entre dois criadores. Rodar integrações conforme bloco local ao fim do plano; nunca no Supabase.
- [ ] **Step 5: Commit focal.** Stagear explicitamente os caminhos desta tarefa após conferir o diff, incluindo fixtures tipadas alteradas e cliente regenerado; `git commit -m "feat: persist voice creator default room limit"`. Registrar evidência RED/GREEN e revisão conforme método escolhido. Não usar `git add .` para incluir mudanças alheias.

### Task 2: Rascunhos privados com revisão, TTL e confirmação única

**Files:**
- Create: `src/modules/setup/setup-creation.types.ts`, `src/modules/setup/setup-drafts.ts`, `tests/unit/modules/setup/setup-drafts.test.ts`.

**Interfaces:**
- Consumes: tipos compartilhados acima e schemas da Tarefa 1.
- Produces: `SetupDraftStore` com constructor opcional `{ now?: () => number; createId?: () => string }` para testes determinísticos.
- Métodos: `begin(context): SetupDraft`, `get(ref, context): SetupDraft`, `selectCategory(ref, context, categoryDiscordId): SetupDraft`, `review(ref, context, values: Pick<SetupCreationInput,'name'|'defaultUserLimit'>): ReadySetupDraft`, `back(ref, context): SetupDraft`, `cancel(ref, context): void`.
- Confirmação: `confirm(ref, context, action: (draft: ReadySetupDraft) => Promise<SetupCreationResult>): Promise<SetupCreationResult>`; encerramento: `dispose(): Promise<void>`.
- Exportar `SetupDraftError`; métodos validam identidade completa, revisão e status antes de alterar estado.

- [ ] **Step 1: Escrever testes RED.** Dois confirms concorrentes chamam action uma vez e retornam o mesmo resultado; depois do resultado, o botão original apenas reapresenta esse resultado. `back`/`selectCategory`/`review` incrementam revisão e invalidam referências antigas. Contextos diferentes (cada campo separadamente), cancelado, expirado aos 600000ms, confirmação sem dados completos e alterações enquanto creating são rejeitados sem chamar action.

```ts
const work = vi.fn(async () => ({ status: 'failed' } as const));
const result = await Promise.all([
  store.confirm(ref, context, work), store.confirm(ref, context, work),
]);
expect(work).toHaveBeenCalledTimes(1);
expect(result).toEqual([{status:'failed'}, {status:'failed'}]);
```

- [ ] **Step 2: Executar RED.** `npm run test:run -- tests/unit/modules/setup/setup-drafts.test.ts`; esperado: módulo/store ainda ausentes.
- [ ] **Step 3: Implementar store.** Map local à aplicação, IDs UUID opacos, validação em todos os métodos, timer TTL com `unref` e cancelamento. Marcar creating e guardar promise sincronamente, antes de aguardar action; resultado terminal não libera nova execução/edição. Rejeição inesperada de action vira uncertain sem expor mensagem. Não remover operação em voo na expiração: terminar/drenar antes de retirar; nunca ressuscitar um draft expirado. `dispose` fecha admissão, limpa timers, aguarda promises em voo e libera estado. Cancelar toca somente memória.
- [ ] **Step 4: Verificar GREEN.** Mesmo comando; acrescentar deferred/fake-timers para TTL durante criação, await de dispose, nenhuma nova entrada após dispose, descarte de drafts ociosos, cópia defensiva e resultado partial/uncertain sem retry. Nenhum banco/Discord real.
- [ ] **Step 5: Commit focal.** `git commit -m "feat: add scoped setup creation drafts"` após stage explícito dos três arquivos.

### Task 3: Criar entrada com permissões preservadas e compensação conservadora

**Files:**
- Create: `src/modules/setup/setup-creation.service.ts`, `tests/unit/modules/setup/setup-creation.service.test.ts`, `tests/unit/core/discord/client.test.ts` (se já houver teste equivalente, estendê-lo em vez de duplicar).
- Modify: `src/modules/setup/setup.discord.ts`, `src/core/discord/client.ts`.
- Test: `tests/unit/modules/setup/setup.discord.test.ts`.

**Interfaces:**
- Consumes: `ReadySetupDraft`, `SetupCreationResult`, `VoiceCreatorRepository` da Tarefa 1.
- Produces: `SetupCreationService(repository: VoiceCreatorRepository, logger: Logger)` e `create(draft: ReadySetupDraft, gateway: SetupDiscordGateway): Promise<SetupCreationResult>`.
- Gateway: acrescentar `createVoiceCreator(input: { categoryDiscordId: string; name: string }): Promise<SetupVoiceChannel>` e `deleteCreatedVoiceCreatorIfEmpty(channelDiscordId: string): Promise<boolean>`; false preserva canal ocupado/sem comprovação de remoção.
- Exportar `SetupChannelCreationError` com `certainty: 'rejected'|'unknown'|'created'` e `channelDiscordId?: string`. Pós-validação falha com certainty created + ID conhecido. Erros não expõem resposta HTTP/credenciais.

- [ ] **Step 1: Escrever testes RED de gateway/serviço.** Entrada nasce GuildVoice, parent escolhido, nome trim e userLimit 0; copiar overwrites do pai sem acrescentar allows para everyone nem apagar denies existentes. Pós-flight confere guild/tipo/permissões. Categoria removida/tipo errado/sem permissão falha antes do create. Em sucesso, repository.create recebe IDs do draft/canal e defaultUserLimit 4, mantendo o canal de entrada 0.
- [ ] **Step 2: Executar RED.** `npm run test:run -- tests/unit/modules/setup/setup.discord.test.ts tests/unit/modules/setup/setup-creation.service.test.ts tests/unit/core/discord/client.test.ts`; esperado: novos métodos ausentes e transporte ainda com retries 3.
- [ ] **Step 3: Implementar fronteiras seguras.** No `createDiscordClient()`, configurar `rest: { retries: 0 }` para impedir retries de timeout/5xx do POST compartilhado. Não criar cliente REST paralelo ou alterar a opção global dinamicamente. A fila/rate-limit do Discord.js permanece; falhas transitórias passam às rotinas conservadoras existentes. Esse ajuste inclui REST do bot inteiro por ser a configuração do cliente compartilhado; adicionar teste de regressão para tornar a escolha explícita.

  Evidência de planejamento: a documentação de [RESTOptions.retries](https://discord.js.org/docs/packages/discord.js/14.26.2/RESTOptions:Interface) define retries para 500/timeouts; inspeção sem rede da versão instalada 14.28.1 confirmou padrão 3 e opção explícita 0. Não confundir retries de erro incerto com a fila normal de rate-limit.
- [ ] **Step 4: Implementar serviço e classificação.** Revalidar categoria/permissões via gateway; criar uma vez; persistir uma vez; retornar created. Se create tiver rejeição HTTP definitiva, failed; transporte/5xx sem ID, uncertain sem compensação por nome. Se ID conhecido e persistência falhar, consultar `findStoredByChannel`: configuração ativa correspondente confirma created; registro incompatível/excluído ou leitura falha preserva canal como uncertain. Somente null confirmado permite delete do ID conhecido, com revalidação fresca de ocupação junto ao delete. Remoção confirmada => failed; canal preservado => partial. Falha pós-flight com ID conhecido usa a mesma compensação segura. Nada de transação SQL envolvendo HTTP ou log de nome/formulário.
- [ ] **Step 5: Verificar GREEN e perdas de resposta.** Adicionar testes de persistência aplicada com resposta perdida, row soft-deleted, leitura SQL incerta, canal ocupado na última checagem, falha no delete, ID estrangeiro e ausência de ID. Verificar create uma vez e nenhum delete em resultados incertos. Usar transporte HTTP stub (nunca rede) para resposta 500 e timeout: `client.rest.options.retries === 0`, uma chamada a makeRequest. Classificar 403 como rejected e 500/timeout como unknown; preservar ID em pós-flight. Rodar comandos do Step 2 e regressões de lifecycle de calls para garantir que erros continuam conservadores.
- [ ] **Step 6: Commit focal.** `git commit -m "feat: safely create configured voice entry channels"` com somente arquivos desta tarefa e artefatos graphify gerados após update.

### Task 4: Conectar wizard e edição do padrão ao dashboard privado

**Files:**
- Create: `src/modules/setup/setup-creation.interactions.ts`, `tests/unit/modules/setup/setup-creation.interactions.test.ts`.
- Modify: `src/modules/setup/setup.schemas.ts`, `setup.views.ts`, `setup.interactions.ts`, `src/application.ts`.
- Test: `tests/unit/modules/setup/setup.schemas.test.ts`, `setup.views.test.ts`, `setup.interactions.test.ts`, `setup.command.test.ts`; `tests/unit/application.test.ts`, `tests/unit/application.rooms.test.ts`.

**Interfaces:**
- Consumes: store/serviço/gateway das Tarefas 1–3 e `SetupService` atual.
- Produces: `SetupCreationInteractions(drafts: SetupDraftStore, creation: SetupCreationService, gatewayFactory: SetupDiscordGatewayFactory)`, implementando `InteractionHandler<SetupInteraction>`.
- Produces: schema/encoder estritos `setupCreationCustomIdSchema`, `encodeSetupCreationCustomId` no setup.schemas: `setup:v2:create:start`, ou `setup:v2:create:<category|form|back|cancel|confirm>:<UUID>:<revision>`; revisão inteiro seguro não negativo, custom ID <=100.
- Produces: `buildSetupCreationCategory(draft: SetupDraft): SetupDashboardPayload` e `buildSetupCreationReview(draft: ReadySetupDraft): SetupDashboardPayload` em setup.views.
- `createDefaultDispatcher(logger,database,runtime,drafts?: SetupDraftStore)` preserva os três parâmetros anteriores e registra o novo handler; a aplicação passa a store que possui e encerra.

- [ ] **Step 1: Escrever testes RED de fluxo.** Dashboard substitui o seletor de voz por botão "Criar canal de entrada" e mostra limite padrão; start cria draft preso a guild/user/message; category abre modal imediatamente, antes de qualquer dependência externa; form valida/ack antes de leituras e exibe resumo. Cancel/Voltar não criam canal/configuração. Confirm envia dados validados do estado, não texto do embed. Todo payload permite menções com `{parse:[]}` e permanece privado.
- [ ] **Step 2: Executar RED.** `npm run test:run -- tests/unit/modules/setup/setup-creation.interactions.test.ts tests/unit/modules/setup/setup.views.test.ts tests/unit/modules/setup/setup.interactions.test.ts tests/unit/modules/setup/setup.schemas.test.ts`; esperado: handler/fluxo/default-limit ainda ausentes.
- [ ] **Step 3: Implementar interações.** Novo namespace v2:create separado do v1 de edição; rejeitar namespace malformado em segurança. Modal com campos `name` e `default-limit` (valor sugerido 0), título "Criar canal de entrada". Resumo mostra nome/categoria/limite de calls/entrada ilimitada/nome automático; botões Confirmar criação, Voltar, Cancelar. Revalidar permissões do usuário/contexto privado em cada evento antes de usar a store; após defer de confirmação, chamar `assertCanConfigure(contextChannelId)` antes do confirm/service. Conferir binding e revisão novamente na execução única se houve await. Categoria é revalidada no serviço imediatamente antes de criar.
- [ ] **Step 4: Integrar edição e ciclo de vida.** Novo action v1 `default-limit` reaproveita distinção botão/modal de rename; modal inicial sem I/O, submissão reconhecida antes de consultar/revalidar configuração da guild, `SetupService.setDefaultUserLimit`, refresh. Manter rename/category/toggle/delete existentes e paginação. Retirar mutação dos antigos add/add-category: responder "Abra /setup init novamente". Remover o rótulo incorreto de comandos "disponíveis em versões futuras" ao mostrar o painel já existente. Criar uma store por aplicação e passá-la ao dispatcher; `closeResources` aguarda `drafts.dispose()` antes de desconectar banco. Não registrar slash commands nem mudar definições globais.
- [ ] **Step 5: Verificar GREEN e ataques/regressões.** Testar guild/user/message/revisão forjados, componente público, modal sem mensagem, expiração/reinício, botões antigos add, dupla confirmação e estado terminal. Revogar permissão do admin/bot entre etapas e remover categoria => nenhum create. Assegurar modal mostrado mesmo com gateway/repositório nunca resolvendo. EditReply falha depois de created => resposta segura sem novos botões de criação e replay sem criar. Confirmar parada drena criação antes de DB disconnect; todos os drafts/timers terminam. Testar edição de default não altera salas/canal de entrada/flag e preserva recuperação de categoria ausente. Rodar também suites application e setup.command.
- [ ] **Step 6: Commit focal.** `git commit -m "feat: guide administrators through voice creator setup"` após stage explícito e graphify update.

### Task 5: Aplicar o padrão às novas calls e fechar verificação/documentação

**Files:**
- Modify: `src/modules/calls/call.discord.ts`, `call.repository.ts`, `call.service.ts`.
- Test: `tests/unit/modules/calls/call.discord.test.ts`, `call.repository.test.ts`, `call.service.test.ts`, `call.fixtures.ts`, `call.discord.fixtures.ts`, `room-lifecycle.fixtures.ts`, `room-settings.service.test.ts`.
- Extend: `tests/integration/setup-guided-database.test.ts`, `tests/integration/setup-calls-database.test.ts`, fixtures de `tests/integration/ownership-database.test.ts` se tipagem exigir.
- Modify: `docs/architecture.md`; Create: `docs/validation/2026-11-10-setup-guiado-validation.md`.

**Interfaces:**
- Consumes: `VoiceCreator.defaultUserLimit`, schema numérico da Tarefa 1, repositórios/runtime atuais.
- Produces: `CreateDiscordRoomInput` e `CreateTemporaryRoomInput` com `userLimit: number` obrigatório; `createTemporaryChannel(input)` e `createCreating(input)` mantêm retornos existentes. Atualizar todos os callers/fixtures tipados com 0 explícito onde preservam o comportamento anterior, sem defaults silenciosos em produção.
- `CallService.handleVoiceTransition` usa o mesmo snapshot de creator para nome/destino/limite da nova call e mantém o ramo de reutilização antes do create.

- [ ] **Step 1: Escrever testes RED de propagação/isolamento.** Para 0/1/4/99, gateway e repository recebem o mesmo userLimit e o painel mostra a capacidade correspondente. Nome continua Game/displayName, não o nome da entrada; canal criador permanece 0. Sala existente com limite alterado pelo dono não recebe novo limite/nome ao reutilizar. Editar padrão afeta somente próxima criação.

```ts
expect(f.gateway.createTemporaryChannel).toHaveBeenCalledWith({
  categoryDiscordId: creator.categoryDiscordId, name: 'Game', userLimit: 4,
});
expect(f.rooms.createCreating).toHaveBeenCalledWith(expect.objectContaining({ userLimit: 4 }));
expect(f.records.get(room.id)?.userLimit).toBe(4);
```

- [ ] **Step 2: Executar RED.** `npm run test:run -- tests/unit/modules/calls/call.discord.test.ts tests/unit/modules/calls/call.repository.test.ts tests/unit/modules/calls/call.service.test.ts`; esperado: zeros fixos e inputs antigos não satisfazem os novos testes.
- [ ] **Step 3: Implementar mínimos.** Validar número antes de mutações; incluir userLimit no único POST de create e no primeiro persist CREATING. Não chamar setLimit posteriormente para aplicar padrão. Não modificar nome automático, projeção pública de permissões das calls, protocolos de compensação ou reuso. Atualizar fakes para armazenar userLimit do input em vez de mascarar a propagação com defaults fixos.
- [ ] **Step 4: Verificar GREEN e casos de fronteira.** Testar -1/100/decimal rejeitados sem HTTP/SQL, snapshot consistente se admin altera padrão enquanto create aguarda, painel inicial correto, rollback/limpeza de sala vazia mantendo as garantias atuais. Em room-settings testar dono mudar 4→8 sem alterar default4/entrada0, reduzir sem expulsar presentes e nova call ainda nascer4. Integração local conecta gateway fake ao Prisma real para comprovar default/canal/TemporaryRoom e edição futura isolada, com fixtures UUID e limpeza exata.
- [ ] **Step 5: Atualizar documentação sem fabricar resultados.** Arquitetura descreve wizard/default/permissões/falhas e deixa explícita a limitação de crash/órfãos. Registro de validação separa testes locais observados do checklist Discord pendente; incluir cancelamento sem recursos, resumo, criar entrada ilimitada, call com limite, painel do dono, próxima call preservando default e reuso sem reset. Migração Supabase e nova sessão real ficam bloqueadas até nova autorização; não publicar release/tag/deploy automaticamente.
- [ ] **Step 6: Executar o gate completo abaixo e commit focal.** `git commit -m "feat: initialize temporary calls from creator limits"`; registrar counts e comandos realmente executados. Efetuar revisão de branch inteira pelo método escolhido antes de propor merge; não mergear/pushar/migrar remotamente sem pedido correspondente.

## Gate de verificação — apenas local

O banco descartável já conhecido usa ferramentas portáteis e loader privado
descritos em `.superpowers/sdd/2026-11-08-charon-v0.3.0-posse-controles/postgres-setup-report.md`
no worktree anterior. Se não estiver disponível no novo worktree, ler o original
pelo caminho explícito; não usar o `.env` remoto como substituto.

1. **Comuns:** configurar no processo ambos flags false; `npm run typecheck`,
   `npm run test:run`, `npm run build`, `git diff --check`. Exigir exit0 e zero falhas;
   skips de integração são esperados somente nesta rodada sem opt-in.
2. **Banco local:** iniciar somente o cluster descartável existente se necessário;
   carregar seu `load-env.ps1` privado. Rodar o guard de destino e cliente gerado:
   `node --import tsx --input-type=module -e "import { assertDisposableDatabaseEnvironment as guard } from './tests/integration/database-test-utils.ts'; guard();"`
   e `npm run prisma:generate`. Parar se qualquer comando falhar.
3. **Deploy exclusivamente local:** repetir guard; `npx --no-install prisma migrate deploy`;
   `node --import tsx tests/integration/prepare-database.ts` (este último proíbe remoto).
   Configurar no processo `RUN_DATABASE_TESTS=true` e `RUN_DATABASE_SECURITY_TESTS=true`;
   `npm run test:run -- tests/integration --maxWorkers=1`. Esperado: todas as suites
   de integração executadas, zero falhas; nenhum fixture fora das chaves do teste.
4. **Histórico/geração:** repetir guard, `npx --no-install prisma migrate status` e
   segundo `migrate deploy` sem pendências; desativar flags, repetir typecheck/test/build
   e `graphify update .`. A alteração de default não muda as seis tabelas protegidas
   pelo teste RLS nem cria políticas.
5. **Revisão/evidência:** registrar cobertura por requisito, resultados RED/GREEN,
   limitações e casos manuais pendentes; revisar diff inteiro incluindo migração e
   cliente gerado. Parar cluster local após evidência, se foi iniciado pela tarefa.
   Não executar nenhum destes testes mutantes no Supabase.

## Self-review do plano

- Seções 1–4 do desenho: contratos/fluxo/padrões nas Tarefas 1, 4 e 5.
- Seções 5–6: rascunhos/autorização/ACK/retry/compensação nas Tarefas 2–4.
- Seções 7–8: migration compatível e cópia inicial sem reset nas Tarefas 1 e 5.
- Seções 9–11: testes reais versus locais, limites de autorização, isolamento e documentação na preparação/gate/Tarefa 5.
- As cinco linhas Review Focus têm testes explícitos nas tarefas proprietárias.
- Tipos/nomes de store, resultado, limite e portas são definidos antes do consumo;
  não reutilizar `name` de entrada para nome de call e não confundir `defaultUserLimit`
  (modelo) com `userLimit` (sala).
- Sem implementação embutida no plano: corpos, layouts internos de helpers e divisão
  de fakes ficam ao implementador dentro dos contratos/testes. Nenhum requisito sem tarefa identificado.

## Handoff

O usuário aprovou a execução e escolheu **subagentes por tarefa**, com revisão a
cada etapa e revisão final da branch inteira. Executar sequencialmente; não
implementar duas tarefas simultaneamente nem publicar alterações remotas.
