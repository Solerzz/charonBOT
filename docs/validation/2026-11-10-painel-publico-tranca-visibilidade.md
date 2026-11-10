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

## Gates locais

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

A saída **não é pristine**: além dos traces JSON esperados, três testes de
`room-access.service.test.ts` emitem intencionalmente `Room mutation compensation failed`:
`keeps compensation uncertain when departure is recorded during its final SQL read`,
`retains uncertainty if a participant leaves during the compensating REST write` e
`blocks every new mutation until reconciliation confirms after uncertain restore`.
São cenários de compensação fail-closed existentes, não falhas do gate.

O grafo já estava dirty antes da Task 5 e foi atualizado sem descartar esse
trabalho. Avisos existentes: parser `tree_sitter_sql` ausente para 5 migrations;
dois testes sem símbolos AST; nomenclatura de comunidades requer atualização
semântica opcional. Nenhuma dependência/configuração foi instalada/alterada.
Minor anterior adiado: Set de incerteza de salas CLOSED retém IDs; não alterado
pela Task 5. A simulação e estes gates não substituem a aceitação real abaixo.

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
