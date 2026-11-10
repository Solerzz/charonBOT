# Validação local — painel público, tranca e visibilidade

## Escopo e limites

Task 5; baseline da operação da Task 4 com instrumentação, antes de remover o fetch.
Somente fixtures e PostgreSQL local descartável. Nenhum Discord/Supabase real,
restart, registro de comandos, alteração de cargos, push, merge ou hospedagem.
Aceitação real e rollout: **PENDENTES de autorização separada**.

## Benchmark reproduzível de fronteiras (não é latência do Discord)

Fixture: `tests/unit/modules/calls/call.interactions.test.ts`, testes `benchmarks`.
Usa handler, coordenador/mutex, controles, acesso, gateway, painel e repositório
Prisma reais. Transportes DB e REST são spies com estado simulado. Duas pessoas
presentes; sala nova por amostra, painel rastreado; 3 amostras por ação (12 por fase).

Relógio monotônico virtual: ack 3 ms; espera real na fila do mutex com avanço
controlado de 7 ms; cada fronteira DB 2 ms; cada fronteira REST 5 ms.
Sem sleeps, rede, rate limits ou inferência de percentis. Os números abaixo são
iguais nas três amostras de cada ação; não representam estimativa de produção.

PowerShell (mesmo comando nas duas fases):

```powershell
$env:RUN_DATABASE_TESTS='false'
$env:RUN_DATABASE_SECURITY_TESTS='false'
$env:CALL_ACTION_BENCHMARK='true'
npm run test:run -- tests/unit/modules/calls/call.interactions.test.ts -t benchmarks --silent=false
```

### Antes — capturado com fetch ainda presente (2026-11-10, 17:57 e 17:59 local)

Etapas: `contagem / ms virtuais`, por amostra.

| Ação | n | Total ms | ack | queue | state | discord | persist | panel |
| --- | ---: | ---: | --- | --- | --- | --- | --- | --- |
| lock | 3 | 162 | 1 / 3 | 2 / 7 | 10 / 20 | 21 / 220 | 1 / 2 | 1 / 39 |
| visibility (ocultar) | 3 | 162 | 1 / 3 | 2 / 7 | 10 / 20 | 21 / 220 | 1 / 2 | 1 / 39 |
| rename-save | 3 | 138 | 1 / 3 | 2 / 7 | 8 / 16 | 17 / 185 | 1 / 2 | 1 / 39 |
| limit-save | 3 | 138 | 1 / 3 | 2 / 7 | 8 / 16 | 17 / 185 | 1 / 2 | 1 / 39 |

Contagens de **chamadas REST simuladas**, independentes das etapas, por amostra:

| Ação | canal fetch | membro fetch | bot fetch | role fetch | mutação sala | mensagem fetch | mensagem edit | Total REST | DB read/write |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| lock | 9 | 12 | 2 | 0 | 1 acesso | 1 | 1 | 26 | 10 / 1 |
| visibility | 9 | 12 | 2 | 0 | 1 acesso | 1 | 1 | 26 | 10 / 1 |
| rename-save | 7 | 10 | 2 | 0 | 1 nome | 1 | 1 | 22 | 8 / 1 |
| limit-save | 7 | 10 | 2 | 0 | 1 limite | 1 | 1 | 22 | 8 / 1 |

`discord` conta operações de gateway, não HTTP: snapshot inclui resolveMember
concorrentes também instrumentados. `panel` inclui gateway e leituras finais.
Não somar etapas para obter o total: elas são inclusivas/nested e podem se sobrepor.
`queue` mede somente até entrar no lock, excluindo a mutação.

### Depois

Capturado em 2026-11-10, 17:59 local; mesmas 3 amostras por ação, fixture e delays.

| Ação | n | Total ms | ack | queue | state | discord | persist | panel |
| --- | ---: | ---: | --- | --- | --- | --- | --- | --- |
| lock | 3 | 157 | 1 / 3 | 2 / 7 | 10 / 20 | 21 / 215 | 1 / 2 | 1 / 34 |
| visibility (ocultar) | 3 | 157 | 1 / 3 | 2 / 7 | 10 / 20 | 21 / 215 | 1 / 2 | 1 / 34 |
| rename-save | 3 | 133 | 1 / 3 | 2 / 7 | 8 / 16 | 17 / 180 | 1 / 2 | 1 / 34 |
| limit-save | 3 | 133 | 1 / 3 | 2 / 7 | 8 / 16 | 17 / 180 | 1 / 2 | 1 / 34 |

REST por amostra: fetch de mensagem **1 → 0**; edição via Message.edit **1 → 0**;
edição via MessageManager.edit **0 → 1**. Exatamente uma edição e **um fetch a
menos por painel**. Todos os demais spies REST e DB da tabela anterior mantiveram
as contagens. Total REST: lock/visibility **26 → 25**; rename/limit **22 → 21**.
Total agregado em cada fase: **288 → 276** fronteiras REST, **108 leituras DB e
12 escritas DB** inalteradas, **12 → 0 fetches de mensagem**, 12 edições em ambas.

A diferença virtual de 5 ms decorre EXCLUSIVAMENTE do delay fixo da fixture.
Não é uma redução fixa prometida para o Discord. Foram preservados fetch de canal,
fetch forçado de autoridade/permissões, leituras finais e CAS; nenhuma autorização
por cache nem outra otimização. 10008 permite substituição, 50013/erro incerto
não geram novo painel e 10003 continua indisponibilidade da sala.

As métricas usam AsyncLocalStorage, correlação UUID aleatória, ação da allowlist e
resultado `success|error`. O catch que entrega erro privado marca explicitamente
o trace como erro. Nenhum payload/ID de membro/nome/token/URL de exceção é logado
pelo trace; trabalho de timer após seu encerramento não altera o log final único.

## Gates locais — evidência histórica da Task 5

Executados em 2026-11-10. Ambiente comum com `RUN_DATABASE_TESTS=false` e
`RUN_DATABASE_SECURITY_TESTS=false`; nenhuma conexão remota.

| Gate | Resultado observado |
| --- | --- |
| `npm run typecheck` | exit 0 |
| `npm run test:run -- --silent=false` | 45 arquivos aprovados, 6 pulados; 1.237 testes aprovados, 45 pulados, 0 falhos |
| `npm run build` | exit 0 |
| `git diff --check` | exit 0, sem erro de whitespace; avisos CRLF preexistentes nos arquivos do grafo |
| Prisma generate local guardado | Prisma Client 7.10.1 gerado, exit 0; somente espaços gerados foram restaurados ao estado anterior |
| migrate deploy → prepare local | exit 0 em ambos; 5 migrations, nenhuma pendente; grants de teste somente locais preparados |
| Integração local serial | 6 arquivos, 45 testes aprovados, 0 pulados/falhos |
| migrate status → migrate deploy novamente | schema atualizado; nenhuma migration pendente, exit 0; idempotência confirmada |
| `graphify update .` | exit 0; 1.942 nós, 4.202 arestas, 83 comunidades |

Todas as operações Prisma e de integração usaram exclusivamente o launcher
`node --import tsx .superpowers/sdd/2026-11-10-charon-painel-publico-tranca-visibilidade/local-postgres.mjs run <node child args>`.
Filhos, nesta ordem: `node_modules/prisma/build/index.js generate`,
`node_modules/prisma/build/index.js migrate deploy`,
`--import tsx tests/integration/prepare-database.ts`,
`node_modules/vitest/vitest.mjs run tests/integration --maxWorkers=1`,
`node_modules/prisma/build/index.js migrate status` e
`node_modules/prisma/build/index.js migrate deploy`.

Na Task 5 a saída **não era pristine**: além dos traces JSON esperados, três testes de
`room-access.service.test.ts` emitem intencionalmente `Room mutation compensation failed`:
`keeps compensation uncertain when departure is recorded during its final SQL read`,
`retains uncertainty if a participant leaves during the compensating REST write` e
`blocks every new mutation until reconciliation confirms after uncertain restore`.
Eram cenários de compensação fail-closed existentes, não falhas do gate.
O ruído e a lacuna de assertions foram corrigidos na onda final abaixo (M2).

O grafo já estava dirty antes da Task 5 e foi atualizado sem descartar esse
trabalho. Avisos existentes: parser `tree_sitter_sql` ausente para 5 migrations;
dois testes sem símbolos AST; nomenclatura de comunidades requer atualização
semântica opcional. Nenhuma dependência/configuração foi instalada/alterada.
O Minor de retenção de IDs CLOSED, adiado na Task 5, foi corrigido na onda final
abaixo (M1). A simulação e estes gates não substituem a aceitação real abaixo.

## Onda final consolidada — I1, M1 e M2 resolvidos localmente

Executada em 2026-11-10, sobre `bb5c7ec`. Nenhuma mudança de schema/SQL, prazos,
ordem de locks, RLS ou operação remota.

| Achado | Correção e regressão |
| --- | --- |
| I1: quarentena restrita a settings | Recuperação compartilhada de acesso, com hook no runtime, antes de criar/armar/efetivar transferência e claim; fence, projeção e publicação confirmados antes das validações finais/CAS. Atores/operações antigos são rejeitados após fence; falha na publicação mantém quarentena. |
| I1: caminhos seguros e prazo | Undo, descarte, revogação por saída e fechamento de sala vazia continuam disponíveis com fence indisponível. Confirmação suspensa na recuperação cruza o prazo original e falha; timeout usa o mesmo deadline de cinco segundos, sem rearmar/extender. |
| M1: memória terminal | CLOSED/ausência SQL confirmados aposentam Set e obrigação de settlement. Churn de 24 IDs, ausência e obrigações reais do runtime cobertos; ACTIVE/CREATING/CLOSING não são descartados por falha de recuperação. Fechamento só aposenta após resultado SQL terminal. |
| M2: console.error esperado | Spies locais com `finally` nos três testes; assertions exatas da mensagem e somente room/guild/channel, incluindo ausência de emissão no ramo read. Nenhum silenciamento global. |

`room-quarantine.test.ts` compõe runtime, handler, coordenador, timers, workspace,
acesso e serviços reais. Somente fronteiras SQL/REST são substituídas por registros
stateful de sala/operação/overwrites; a quarentena nasce de `toggleLock` real com
SQL indeterminado e fence indisponível, não de mock que presume essa proteção.
Os novos testes não se apresentam como falhas reais de transporte PostgreSQL/Discord.

TDD antes das fontes: foco inicial em `room-quarantine.test.ts` e
`room-access.service.test.ts` apresentou **13 falhos / 50 aprovados**: transferência
criada/armada na quarentena, CAS em confirm/timeout/claim, gerações antigas aceitas,
retenção CLOSED/ausente. Segundo RED de terminal/lifecycle: **3 falhos / 2 aprovados /
62 pulados**. GREEN focado dos três arquivos: **117/117**, sem stderr de compensação.

Gates completos desta onda, uma execução de cada gate antes do commit:

| Gate | Resultado novo observado |
| --- | --- |
| `RUN_DATABASE_TESTS=false`, `RUN_DATABASE_SECURITY_TESTS=false`; `npm run test:run -- --silent=false` | 46 arquivos aprovados, 6 pulados; **1.259 aprovados**, 45 pulados, 0 falhos (+22 sobre baseline). Só traces JSON esperados, sem os três console.error não capturados. |
| Launcher local guardado → `node_modules/vitest/vitest.mjs run tests/integration --maxWorkers=1` | 6 arquivos, **45/45**, 0 falhos/pulados; PostgreSQL local descartável exclusivamente. Não houve start/stop nem leitura/impressão de credenciais. |
| `npm run typecheck` / `npm run build` | exit 0 / exit 0 |
| `git diff --check` | exit 0; avisos CRLF preexistentes do grafo, sem erro de whitespace |
| `graphify update .` | exit 0; **1.947 nós, 4.245 arestas, 75 comunidades**. Quatro arquivos do grafo já dirty preservados e atualizados; não incluídos no commit cirúrgico. Parser SQL continua ausente, sem instalação/configuração. |

Autorrevisão: recuperação permanece sob o coordenador existente, antes das últimas
validações de presença/autoridade e CAS; não há lock novo nem transação SQL em REST.
As integrações de fence/row-lock existentes permanecem verdes. Aceitação, latência,
webhooks reais e rollout continuam **PENDENTES** no checklist seguinte.

## Revisão independente e gates finais do controlador

Produto final verificado no commit `5d4af1afce775e772d52940bde1a2eff2cc29f9f`,
na branch `feature/painel-publico-tranca-visibilidade`. Cinco gates independentes
por tarefa, correções com regressões e revisão whole-branch foram realizados.
Revisão final: I1, M1 e M2 **ADDRESSED**, nenhuma quebra nova ou observação fora do
escopo; **Ready to merge: Yes** no escopo do código local, não de produção.

O controlador executou novamente estes comandos em 2026-11-10, 18:38 local,
**após** a scoped re-review; não são apenas resultados herdados dos implementadores:

| Gate independente | Resultado observado |
| --- | --- |
| Opt-ins de banco false; `npm run test:run -- --silent=false` | **1.259 testes aprovados**, 45 integrações puladas intencionalmente; 46 arquivos aprovados, 6 pulados, zero falhos; exit 0 |
| Launcher local guardado → Vitest `tests/integration --maxWorkers=1` | **45/45 aprovados**, 6 arquivos, zero falhos/pulados; exit 0 |
| `npm run typecheck` / `npm run build` | exit 0 / exit 0 |
| Launcher local guardado → Prisma migrate status / deploy | Cinco migrations locais atualizadas; nenhuma pendente; novo deploy sem alteração, exit 0 |
| `git diff --check` | exit 0; somente avisos preexistentes de normalização dos arquivos do grafo |

Os traces JSON de teste são esperados; os três erros de compensação estão
capturados e afirmados. Nenhum teste iniciou bot ou acessou Discord/Supabase real.
O PostgreSQL descartável próprio é desligado limpo ao encerrar a validação; seus
dados privados ficam preservados para eventual reprodução. O worktree, histórico
e relatórios locais são preservados enquanto a integração da branch é decidida.

### Decisões registradas durante a execução

1. Reutilizar o worktree já isolado e criar a branch a partir do main mesclado,
   preservando o grafo dirty. Custo se inadequado: isolamento por diretório não é
   adicional; nenhum trabalho existente foi descartado.
2. Usar o modelo padrão disponível para os papéis, sem trocar de provedor/chave
   ou contratar recursos extras. Custo: limite de uso pode interromper um dispatch;
   a única tentativa bloqueada não alterou arquivos antes da retomada.
3. Revisores somente leem o produto e escrevem o próprio relatório local.
   Custo: correções precisam voltar ao implementador e passar por nova revisão.
4. Fazer commit local após testes/autorrevisão e revisar o diff commitado antes
   da tarefa seguinte. Custo: correções ficam em commits adicionais, sem publicação.
5. Ampliar cirurgicamente o contrato de persistência para cercar SQL indeterminado
   pela geração existente. Custo: após falha indeterminada, controles/transferência
   antigos podem ser invalidados e exigir novo clique; nunca abrir a sala por fallback.
6. Corrigir os dois Minor confirmados na única onda final, junto do I1.
   Custo: testes/revisão adicionais; sem novas funcionalidades ou infraestrutura.

Artefatos de auditoria desta execução permanecem no workspace ignorado
`.superpowers/sdd/2026-11-10-charon-painel-publico-tranca-visibilidade/`, incluindo
ledger, relatórios, pacotes de diff e revisão final. Nenhuma limpeza de diretório
de usuário ou worktree foi realizada.

## Aceitação real e rollout — PENDENTES de autorização separada

1. Confirmar destino/processo, backup privado e autorização para a quinta migration
   no Supabase; conferir histórico/checksums e aplicar somente a nova migration.
   Verificar backfill/default/NOT NULL/RLS/dados/TLS independentemente. Nunca usar
   prepare/grants/testes de escrita remotos.
2. Autorizar restart local; parar pelo stopFile existente e confirmar PID/comando
   e encerramento antes de iniciar outra instância. Nunca executar `isLocked`
   contra banco não migrado. Comandos somente no servidor de teste; globais zero.
3. Conferir painel real desktop/celular, linhas, nome único, labels e ausência de
   “pensando”/sucessos repetidos; modais, erro privado, reuso/expiração da área
   privada e limitação nativa de modal sem origem.
4. Testar as quatro combinações com membro comum, participante e autorizado;
   saída/próximo dono/sala vazia/setup on-off e manutenção dos estados. Incluir
   membro comum sem bypass Administrator; não modificar cargos automaticamente.
5. Coletar amostras/durações reais e rate limits, distinguindo reconhecimento,
   conclusão e painel. Hospedagem permanece fora do escopo, reservada ao fim.
