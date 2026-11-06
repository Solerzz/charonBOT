# Arquitetura do Charon

## Estilo

Charon é um monólito modular orientado a funcionalidades. O processo principal
compõe adaptadores externos no `application.ts`; módulos de negócio não criam
clientes Discord ou Prisma diretamente.

## Estrutura na v0.2.0

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
│   └── calls/        # Eventos de voz, salas temporárias e painel
├── shared/           # Mutex por chave, local ao processo
├── application.ts    # Composição e ciclo de vida
└── index.ts          # Entry point e sinais do processo
```

## Fluxo de inicialização

1. `.env` é carregado.
2. Zod valida todas as variáveis obrigatórias.
3. A conexão PostgreSQL é verificada.
4. Os listeners de interações e `voiceStateUpdate` são registrados.
5. O cliente faz login no Discord.

Se a validação ou o banco falhar, o login Discord não acontece.
Os intents são `Guilds` e `GuildVoiceStates`, sem `GuildPresences`.
O shutdown bloqueia novos despachos, aguarda os já aceitos e só então destrói
o cliente Discord e desconecta o banco. Não há reconciliação de salas na
inicialização.

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

A migration SQL está em
`prisma/migrations/20261105000000_v0_2_setup_join_to_create/migration.sql`.
Ela não é aplicada pelo startup ou pelos testes. Aplicação/validação em banco
exige uma etapa operacional explícita; não foi executada nesta preparação.

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

O preflight do bot é conservador: exige Gerenciar Canais, Mover Membros e
Conectar no servidor, além de acesso/envio no contexto do painel. Também
verifica permissões efetivas no canal de voz e na categoria selecionados.
Permissões concedidas somente por sobrescritas locais podem não bastar.

### Calls: fluxo de eventos

1. `VoiceStateHandler` transforma o evento em dados validados; bots não geram
   novas salas e eventos sem mudança de canal não fazem trabalho de ciclo de vida.
2. `CallService` serializa por servidor/membro e por sala com um `KeyedMutex`
   compartilhado pelo dispatcher. As leituras de ocupação usam o cache atual.
3. Entrar em um Voice Creator reutiliza uma sala ainda acompanhada do mesmo
   proprietário no servidor, quando possível; caso contrário, cria um canal
   público sem limite na categoria configurada e persiste `CREATING`.
4. O bot move o membro, tenta enviar o painel até duas vezes e marca `ACTIVE`.
   O nome inicial usa atividade `Playing` disponível na presença, ou nome de
   exibição, limitado a 11 grafemas. Atividade é best effort: não há busca de
   presença nem intent privilegiado; não há renomeação automática posterior.
5. Entradas/saídas atualizam o painel existente. Se o proprietário sair e a
   sala continuar ocupada, o proprietário fica nulo, sem transferência.
6. Sala vazia passa a `CLOSING`; a ocupação é revalidada antes de remover o
   canal. Somente após remoção confirmada (ou canal já ausente), fica `CLOSED`.

O canal temporário recebe permissões públicas explícitas, sem copiar negações
específicas de papéis/membros da categoria. O bot valida suas permissões antes
e depois da criação. Logo, isto não oferece salas privadas por herança.

Falhas de movimento tentam compensar apenas salas confirmadamente vazias;
salas ocupadas não são removidas. Movimento reconhecido pelo Discord mas não
confirmado no cache mantém o registro para eventos posteriores. Falhas de
painel não destroem a sala; falhas de ativação/limpeza preservam estados
acompanhados e geram logs com operação/IDs e nome do erro, sem mensagem sensível.
A recuperação é **baseada em novos eventos**, não um job de retry, nem uma
varredura no startup. Canal órfão cuja persistência e remoção falham fica apenas
com o identificador em log e pode exigir intervenção manual. Mutex não coordena
múltiplos processos; esta versão não oferece garantia distribuída de unicidade
de sala por proprietário.

### Painel e evolução

O painel informa sala, proprietário (ou ausência), participantes e visibilidade
pública. Renomear, alterar limite, privatizar, assumir sala e moderação estão
todos desabilitados. `roomCommandsEnabled` é apenas uma preferência persistida:
não habilita esses controles na `v0.2.0`.

Ownership avançado (reivindicação/transferência) fica para `v0.3.0`.
`moderation` e `reputation` continuam fora desta versão. A reconciliação de
startup também está adiada, sem implementação ou prazo garantido aqui.

## Verificação

Testes unitários exercitam portas com doubles; os dois testes de integração
usam o guard existente `RUN_DATABASE_TESTS=true`. O novo round trip usa os
adaptadores Prisma reais para dois Voice Creators no mesmo servidor e uma sala,
incluindo atualização de categoria/comandos, exclusão lógica e restauração.
Ele limpa em `finally` somente seus canais/servidor UUID prealocados, salas antes
das configurações, e desconecta mesmo se a limpeza falhar. Não faz truncate,
limpeza global ou migration automática.

As URLs vêm do ambiente do processo; Vitest não carrega `.env` automaticamente
nesta configuração. Não habilite o guard com URLs de produção ou de um banco
remoto/compartilhado. O guard é um opt-in, não uma prova de segurança do destino.
Sem banco local descartável confirmado, mantenha os testes pulados.
Veja [as notas da v0.2.0](releases/v0.2.0.md) para comandos e limites da validação.
