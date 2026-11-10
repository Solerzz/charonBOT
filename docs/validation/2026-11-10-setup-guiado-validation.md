# Setup guiado — evidência local e validação pendente

## Estado e limites de autorização

Implementação validada **localmente**, sobre a base revisada `ac7f99c` da branch
`feature/setup-guiado`. Não significa feature ativa no Discord real. Nenhum login,
registro de comandos, chamada de rede Discord, migration Supabase, push, merge,
tag/release ou hospedagem foi executado nesta tarefa. Objetos Discord são fakes.
As novas integrações compõem serviços/gateways reais com Prisma real e REST fake;
unidades substituem as fronteiras SQL/REST conforme o caso.

O PostgreSQL 17.11 descartável já estava em execução e pertence ao controlador.
A tarefa o deixou em execução para revisão e possíveis verificações finais; o
controlador é responsável por pará-lo depois dessas revisões. Nenhum ambiente
remoto ou `.env` original foi carregado. O loader privado foi dot-sourced no
mesmo processo PowerShell de cada grupo de comandos locais, sem ler/imprimir seu
conteúdo, URLs ou senhas. `DOTENV_CONFIG_PATH` apontou para um caminho local
inexistente para impedir carregamento implícito de `.env` pelo Prisma CLI.

## TDD observado

Com ambos opt-ins em `false`:

```powershell
npm run test:run -- tests/unit/modules/calls/call.discord.test.ts tests/unit/modules/calls/call.repository.test.ts tests/unit/modules/calls/call.service.test.ts
```

1. **RED:** exit 1, **25 falhas / 67 aprovados**, três arquivos. Gateway/repositório
   ainda enviavam zero para 1/4/99; serviço omitia `userLimit`; limites inválidos ou
   ausentes não eram rejeitados. A propagação de default4 e snapshot também falharam.
2. **GREEN:** mesmo comando, exit 0, **92/92**. Implementação mínima: limite
   obrigatório, validação numérica e cópia do mesmo snapshot às duas fronteiras.
3. Cobertura de edição do dono acrescentada: quatro arquivos focados,
   **93/93**. Cobertura ampliada de calls + gateway de setup: **515/515** em 18
   arquivos, antes do gate final.

Uma execução intermediária das duas suites SQL teve **12 aprovados / 1 falha**:
o fake REST de rename não atualizava seu estado, embora o serviço real tivesse
persistido o nome. Corrigido somente o fake para refletir o argumento recebido;
nova execução foi **13/13**. Typecheck também identificou o caller antigo sem
limite e o tipo `parent` do fake; ambos foram corrigidos antes do gate final.

## Cobertura por requisito

| Requisito | Evidência automatizada local |
| --- | --- |
| Resumo/voltar/cancelar sem recursos antes de confirmar; contexto, revisão, TTL, ACK, recuperação de modal e falhas parciais | Suites existentes de `setup-drafts`, `setup-creation.interactions`, `setup-creation.service` e `setup.views`, incluídas na suíte comum completa. Não são observações do cliente Discord real. |
| Entrada ilimitada, padrão separado, nome independente | `setup-guided-database.test.ts`: para 0/1/4/99, serviço e gateway reais criam entrada via REST fake com `userLimit=0`; Prisma real salva o padrão e editar o padrão mantém entrada0. O fake inicia com limite77 para evitar uma asserção que passe por default fixo. |
| Nova call e primeiro persist CREATING usam mesmo limite 0/1/4/99, painel e snapshot | Unidades de gateway/repositório/serviço verificam payload inicial, capacidade, ausência de setLimit posterior e rejeição de -1/100/decimal/ausente sem HTTP/SQL. Integração compõe `CallService`, `DiscordCallGateway`, runtime e Prisma reais; atualização SQL 4→8 durante create mantém Discord/sala/painel4. |
| Dono, reuso, próximas calls, painel e compensação | `room-settings.service.test.ts` e `setup-calls-database.test.ts`: dono4→8 sem alterar default4/entrada0; redução para1 com três presentes sem expulsão; próxima call4; default99 não reseta sala renomeada/limit8 nem troca seu painel; próxima nova call99, histórico preservado. Unidades mantêm compensação vazia e retenção ocupada com default4. |
| Compatibilidade, faixa, RLS e limpeza | `setup-guided-database.test.ts` verifica migration aditiva sobre linha anterior, default0, CHECK/NOT NULL, restauração e preferência. Integrações de segurança/posse mantêm as seis tabelas protegidas e ausência de políticas. Fixtures novas usam UUIDs de domínio e IDs Discord sintéticos derivados de UUID, limpas por chave exata em `finally`; nunca por guild inteira/truncate/reset. |

## Gate final observado

| Comando | Resultado |
| --- | --- |
| `npm run prisma:generate` | Exit 0; Prisma Client **7.10.1**. Dois espaços finais conhecidos em comentários de `VoiceCreator.ts` normalizados com patch; resultado sem alteração semântica ou diff líquido do cliente gerado. |
| `npx --no-install prisma migrate deploy` | Exit 0; **4 migrations**, nenhuma pendente. Executado somente após guard local. |
| `node --import tsx tests/integration/prepare-database.ts` | Exit 0; `Local database test grants prepared`, após guard. |
| `npm run test:run -- tests/integration --maxWorkers=1` | Exit 0; **5 arquivos / 41 testes aprovados**, zero falhas e zero skips, ambos opt-ins `true`. |
| `npx --no-install prisma migrate status` | Exit 0; **4 migrations**, `Database schema is up to date!`. |
| Segundo `npx --no-install prisma migrate deploy` | Exit 0; `No pending migrations to apply.` |
| `npm run typecheck` | Exit 0 após código final. |
| `npm run test:run` | Exit 0; **42 arquivos aprovados / 5 pulados; 1067 testes aprovados / 41 pulados**, zero falhas. Ambos opt-ins `false`; skips são somente integrações sem opt-in. |
| `npm run build` | Exit 0. |
| `git diff --check` | Exit 0 após normalização estreita dos comentários gerados. |
| `graphify update .` | Exit 0; **1825 nós / 3818 arestas / 75 comunidades**, AST-only. Sem instalação de dependências. |

O grupo local de preparação executado foi:

```powershell
. 'C:/Users/Usuario/AppData/Local/Temp/opencode/charon-v030-pg/load-env.ps1'
$env:DOTENV_CONFIG_PATH='C:/Users/Usuario/AppData/Local/Temp/opencode/charon-v030-pg/no-dotenv-local-gate'
$env:RUN_DATABASE_TESTS='false'
$env:RUN_DATABASE_SECURITY_TESTS='false'
node --import tsx --input-type=module -e "import { assertDisposableDatabaseEnvironment as guard } from './tests/integration/database-test-utils.ts'; guard();"
npm run prisma:generate
node --import tsx --input-type=module -e "import { assertDisposableDatabaseEnvironment as guard } from './tests/integration/database-test-utils.ts'; guard();"
npx --no-install prisma migrate deploy
node --import tsx --input-type=module -e "import { assertDisposableDatabaseEnvironment as guard } from './tests/integration/database-test-utils.ts'; guard();"
node --import tsx tests/integration/prepare-database.ts
```

O grupo local final recarregou o mesmo loader no próprio processo e repetiu o guard
antes da suíte, status e segundo deploy:

```powershell
$env:RUN_DATABASE_TESTS='true'
$env:RUN_DATABASE_SECURITY_TESTS='true'
npm run test:run -- tests/integration --maxWorkers=1
npx --no-install prisma migrate status
npx --no-install prisma migrate deploy
```

Nos grupos executados, cada etapa CLI foi seguida de
`if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }` antes de continuar. Os próprios
testes/prepare também executam `assertDisposableDatabaseEnvironment` antes de SQL.
A suíte comum completa foi executada **uma vez após o código final**, depois do
gate SQL, sem replays completos intermediários, conforme instrução do controlador:

```powershell
$env:RUN_DATABASE_TESTS='false'
$env:RUN_DATABASE_SECURITY_TESTS='false'
npm run typecheck
npm run test:run
npm run build
git diff --check
```

Vitest exibiu apenas sugestões de isolamento/performance; nenhum teste falhou no
gate final. Graphify avisou sobre quatro SQLs sem parser instalado, dois arquivos
de teste sem símbolos e documentos sem extração semântica; essas limitações não
foram tratadas como cobertura. SQL não foi executado no Supabase. RLS/políticas não foram alterados
pela tarefa 5. Atualização do grafo e revisão final da branch são registradas no
relatório da tarefa; revisão independente da branch inteira cabe ao controlador,
antes de qualquer proposta de merge.

## Discord real — PENDENTE, não executado

1. **Wizard e cancelamento:** abrir dashboard privado, escolher categoria, validar
   resumo (nome da entrada, nome automático, default e entrada ilimitada), voltar,
   fechar/reabrir modal e cancelar sem criar canal/configuração. Medir ACK/modal
   real e validar permissões revogadas entre etapas.
2. **Criação e entrada:** confirmar uma única criação; verificar canal sob categoria
   existente, restrições efetivas e entrada sem limite, sem exigir Admin do bot.
   Entrar e verificar nome automático independente e capacidade 0/1/4/99.
3. **Painel do dono:** verificar painel B público/menu privado retidos; editar4→8,
   reduzir abaixo da ocupação com mais participantes sem expulsão; confirmar que
   default4 e entrada0 não mudaram e a próxima call ainda nasce4.
4. **Reuso/modelo/falhas:** renomear/limitar sala, editar default e reentrar sem
   reset ou novo painel; nova criação deve usar novo default. Inspecionar casos
   reais parciais/incertos sem retry e sem remover canais ocupados.
5. **Gate operacional:** obter nova autorização explícita para destino/backup e
   migration Supabase e para nova sessão real; conferir processo antigo e manter
   uma instância. Sem essa autorização, não iniciar bot nem publicar release.

## Limitações mantidas

Rascunhos são locais ao processo, não retomam após restart; crash pode deixar
entrada sem configuração. Não existe exactly-once entre reinícios, coordenação
multi-instância ou reparo global de órfãos. Discord fake + PostgreSQL local não
comprovam transporte, aparência, permissões efetivas ou experiência com múltiplos
participantes no Discord real. AST-only do graphify é navegação parcial, não prova
de renderização, schema SQL ou autorização remota.

## Aceitação final após revisão independente

Código final revisado: `e771cfb382aa88cfa523215d0e917ec110e4bedc`.
As cinco tarefas passaram por revisão de conformidade e qualidade. A revisão
final encontrou uma corrida de apresentação entre a atualização após abrir o
modal e a confirmação exibida após submeter o formulário. A correção ordena
atualizações da mesma mensagem após o ACK, sem atrasar a resposta inicial.

O teste de sobreposição reproduziu a falha antes da correção; testes adicionais
cobrem ACK atrasado, Cancelar/Voltar, resultado salvo, falha de atualização e
encerramento da aplicação. A mutação que remove a espera na fila volta a falhar.
Após restaurar a ordenação, **341 testes focados**, typecheck e build passaram.
A revisão específica da correção confirmou o achado resolvido, sem nova quebra,
e atualizou o parecer do código para **aprovado**, sem achados abertos.

O controlador repetiu o gate sobre esse mesmo código final: **1078 testes comuns
aprovados** (41 integrações puladas somente nessa execução sem opt-in), **41/41
integrações PostgreSQL locais aprovadas** na execução serial com opt-ins e guard,
typecheck, build e verificação de whitespace aprovados. Os números 1067 da seção
anterior são a evidência histórica da tarefa 5 antes desses onze testes novos.

Essa aceitação é de código e testes locais. O checklist Discord real e a nova
migration Supabase continuam pendentes de autorização separada. Nenhum push,
merge, release, deploy ou nova sessão do bot é autorizado por este registro.
