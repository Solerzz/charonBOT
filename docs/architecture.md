# Arquitetura do Charon

## Estilo

Charon é um monólito modular orientado a funcionalidades. O processo principal
compõe adaptadores externos no `application.ts`; módulos de negócio não criam
clientes Discord ou Prisma diretamente.

## Estrutura na v0.3.0 (preparação local)

```text
src/
├── core/
│   ├── config/       # Validação e tipos de configuração
│   ├── database/     # Adapter Prisma/PostgreSQL
│   ├── discord/      # Cliente e roteamento de interações
│   └── logger/       # Logs JSON e redaction
├── generated/prisma/ # Client gerado pelo Prisma 7
├── modules/
│   ├── status/       # Diagnóstico privado
│   ├── setup/        # Configuração privada dos Voice Creators
│   ├── calls/        # Ciclo de vida, controles, acesso, painel e runtime
│   └── ownership/    # Prioridade, transferências e timers drenáveis
├── shared/           # Mutex por chave, local ao processo
├── application.ts    # Composição e ciclo de vida
└── index.ts          # Entry point e sinais do processo
```

## Fluxo de inicialização

1. `.env` é carregado.
2. Zod valida todas as variáveis obrigatórias.
3. A conexão PostgreSQL é verificada.
4. Os listeners de interações e `voiceStateUpdate` são registrados.
5. O cliente faz login no Discord; em ready, `RoomRuntime.start` reconcilia
   somente salas acompanhadas antes de liberar os despachos aceitos.

Se a validação ou o banco falhar, o login Discord não acontece.
Os intents são `Guilds` e `GuildVoiceStates`, sem `GuildPresences`.
O shutdown bloqueia novos despachos e fecha admissão de timers antes de aguardar
startup/despachos/callbacks, inclusive os esperando lock. Só depois destrói o
cliente Discord e desconecta o banco. Stop antes de ready interrompe essa espera.
Startup cancela transferências anteriores, invalida controles e reobserva presença
sem inventar sequência de entradas offline; não faz recuperação global de canais
não acompanhados. Fetch incerto não prova exclusão; ausência confirmada encerra
o registro. Prioridade futura elegível e marcador expirado são preservados.

## Banco de dados

Prisma 7 usa o generator `prisma-client` com saída explícita em
`src/generated/prisma`. O Prisma CLI lê `DIRECT_URL` em `prisma.config.ts`.
O processo do bot cria `PrismaPg` com `DATABASE_URL` e timeout de conexão de
cinco segundos.

`VoiceCreator` guarda UUID, servidor, canal de voz único, categoria de destino,
preferência `roomCommandsEnabled`, timestamps e `deletedAt`. A exclusão é lógica:
não remove o canal Discord nem as salas. Reconfigurar o mesmo canal no mesmo
servidor restaura a identidade, o histórico e a preferência, atualizando a
categoria; não sobrescreve uma configuração ativa ou de outro servidor.

`TemporaryRoom` guarda UUID, servidor, Voice Creator, canal único, proprietário
opcional, mensagem do painel opcional, nome, limite, visibilidade, timestamps e
estado `CREATING → ACTIVE → CLOSING → CLOSED`. A FK impede excluir fisicamente
um Voice Creator com histórico. Consultas de salas acompanhadas incluem
`CREATING`, `ACTIVE` e `CLOSING`, para não perder falhas de ativação/limpeza.
O encerramento mantém o registro e preenche `closedAt`.

`controlVersion` invalida menus antigos mesmo após dono A→B→A. `RoomPresence`
guarda entradas continuamente observadas; `RoomAllowedMember` guarda autorizados;
`PendingOwnershipTransfer` identifica cada operação por UUID, com prazo nulo até
entrega confirmada. Um índice parcial único impede dois registros acompanhados
com o mesmo dono/servidor (histórico `CLOSED` não bloqueia).

Migrations anteriores são imutáveis. A nova migration é
`prisma/migrations/20261108010000_room_ownership_state/migration.sql`, após
`20261108000000_enable_backend_table_rls`. As seis tabelas, incluindo histórico
de migrations, usam RLS sem políticas públicas: backend apenas; Data API Supabase
já estava desabilitada. Startup/testes não aplicam DDL automaticamente. As três
migrations foram verificadas em PostgreSQL local; deploy remoto segue pendente
de autorização. Procedimento em [v0.3.0](releases/v0.3.0.md).

## Interações

Handlers implementam `InteractionHandler<T>`, são registrados explicitamente e
executados pelo `InteractionRegistry`. Falhas ficam contidas, são registradas
sem a mensagem potencialmente sensível e geram uma resposta efêmera segura.

### Setup

`/setup init` abre um dashboard efêmero no servidor. Administrador ou a combinação
Gerenciar Servidor + Gerenciar Canais é exigida novamente nas ações. Botões,
seletores e modais validam payload, servidor, configuração e permissões antes
de mutações. Adicionar seleciona um canal de voz **já existente**, depois uma
categoria; não cria o Voice Creator no Discord. É possível mudar a categoria,
renomear o canal, alternar a preferência de comandos e confirmar a remoção.

O preflight do bot é conservador: exige Gerenciar Canais, Mover Membros,
Gerenciar Cargos e
Conectar no servidor, além de acesso/envio no contexto do painel. Também
verifica permissões efetivas no canal de voz e na categoria selecionados.
Permissões concedidas somente por sobrescritas locais podem não bastar.

### Calls: fluxo de eventos

1. `VoiceStateHandler` transforma o evento em dados validados; bots não geram
   novas salas e eventos sem mudança de canal não fazem trabalho de ciclo de vida.
2. `CallService` e serviços de controles/posse compartilham `RoomRuntime` e seu
   `RoomCoordinator` (membro→sala), timers e repositório. As leituras de ocupação
   usam o cache atual, sem criar domínio de locks concorrente.
3. Entrar em um Voice Creator reutiliza uma sala ainda acompanhada do mesmo
   proprietário no servidor, quando possível; caso contrário, cria um canal
   público sem limite na categoria configurada e persiste `CREATING`.
4. O bot move o membro, sincroniza o painel se habilitado e marca `ACTIVE`.
   O nome inicial usa atividade `Playing` disponível na presença, ou nome de
   exibição, limitado a 11 grafemas. Atividade é best effort: não há busca de
   presença nem intent privilegiado; não há renomeação automática posterior.
5. Entradas/saídas revalidam presença, transferência, acesso e painel. Se o
   proprietário sair e a sala continuar ocupada, fica sem dono com prioridade
   para reivindicação, sem transferência automática por saída.
6. Sala vazia passa a `CLOSING`; a ocupação é revalidada antes de remover o
   canal. Somente após remoção confirmada (ou canal já ausente), fica `CLOSED`.

O canal temporário recebe permissões públicas explícitas, sem copiar negações
específicas de papéis/membros da categoria. O bot valida suas permissões antes
e depois da criação. Privacidade posterior é projeção explícita, não herança.

Falhas de movimento tentam compensar apenas salas confirmadamente vazias;
salas ocupadas não são removidas. Movimento reconhecido pelo Discord mas não
confirmado no cache mantém o registro para eventos posteriores. Falhas de
painel não destroem a sala; falhas de ativação/limpeza preservam estados
acompanhados e geram logs com operação/IDs e nome do erro, sem mensagem sensível.
A recuperação de falhas incertas depende de novos eventos/sincronização e da
reconciliação limitada de startup; não existe reparo global de órfãos. Canal cuja
persistência e remoção falham pode exigir intervenção pelos IDs em log. Índice SQL
protege unicidade do dono, mas mutex/timers não coordenam múltiplos processos:
esta versão exige **uma única instância do bot**.

### Painel B, posse e acesso

Painel B usa componentes Discord nativos; abre menu efêmero do dono. IDs não
são autorização: ações revalidam servidor/canal/sala/versão, preferência, dono e
presença humana. Renomear normaliza até 11 grafemas; limite é `0`/ilimitado ou
`1..99`, sem expulsar presentes. Modal é resposta inicial, sem defer prévio;
latência real contra o prazo de três segundos do Discord ainda exige smoke.

Transferência prepara UUID, publica prompt privado e só então arma 5.000 ms.
Somente dono confirma/desfaz; não há aceite do destinatário. Ambos devem estar
presentes/elegíveis. Operações antigas nunca completam uma nova. Falha de entrega
não agenda transferência invisível. Na falha de storage ao expirar, retry a cada
1 s enquanto o processo vive é **somente cancelamento pelo UUID original**;
não estende prazo nem repete commit incerto. Outage persistente não garante
transferência, logs são sanitizados e startup cancela sobras.

Sem dono, humano presente elegível mais antigo recebe 300.000 ms exclusivos;
após prazo qualquer elegível presente pode assumir. Saída do candidato antes do
prazo recalcula prioridade; depois preserva o marcador aberto. Setup off/on
incrementa versão/cancela transferências em transação, depois sincroniza sob lock,
reassociando o timer de prioridade à nova versão sem reiniciar candidato/prazo.
Off remove mensagem inteira; privacidade/presença/prioridade continuam. On
reutiliza/recria painel com CAS. Exclusão lógica do creator oculta setup, não
apaga preferência/salas existentes. Falha de sync não desfaz flag já persistida.

Sala privada permite dono, humanos presentes e allowlist; saída não autorizada
revoga acesso. Allowlist persiste em transferência e toggles público/privado;
acesso operacional do bot é preservado. **Administrador ignora negações**.
Discord e SQL não são uma transação: compensação restaura nome anterior exato
(inclusive externo) e sobrescritas preservando o bot. Se compensação falhar,
erro seguro/IDs exigem intervenção, sem fallback público silencioso. Mutações
externas concorrentes repetidas, respostas incertas, falha ao remover painel
duplicado e órfãos não têm reparo automático garantido.

`moderation` e `reputation` continuam fora desta versão. O rascunho Figma não é
entregável nem prova visual; JSON/componentes nativos são a referência efetiva.

## Verificação

Suíte comum: ambos opt-ins `false`. Integração mutante: `RUN_DATABASE_TESTS=true`,
com `assertDisposableDatabaseEnvironment` antes das mutações; exige URLs
correspondentes com credenciais e alvo loopback `charon_v030_test...`, query
ausente ou `?schema=public`. RLS read-only tem flag separada
`RUN_DATABASE_SECURITY_TESTS=true`. Não carregar `.env` remoto para estes testes.
Fixtures UUID são limpas em `finally`, sem reset/truncate/limpeza global.

CI mantém job comum sem serviço e adiciona PostgreSQL 17 separado, porta loopback,
credenciais efêmeras locais, geração/migrate deploy/grants guardados e ambos
opt-ins. Integrações rodam `--maxWorkers=1`: startup reconcilia todos os registros
acompanhados do DB compartilhado. Status e segundo deploy comprovam acesso do
backend ao histórico sob RLS. Não há secrets Supabase/Discord no job.

[Validação v0.3.0](validation/2026-11-08-v0.3.0-validation.md): 711 comuns
aprovados, 29 pulados no modo comum; 29/29 integrações locais aprovadas. Execução
GitHub hospedada e smoke Discord não foram realizados. Grafo AST-only é parcial
(SQL/schema/testes sem símbolos/docs sem indexação semântica), não prova de SQL
ou renderização. Registro [v0.2.0](validation/2026-11-07-v0.2.0-validation.md)
permanece histórico, sem reescrita.
