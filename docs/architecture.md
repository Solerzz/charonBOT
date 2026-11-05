# Arquitetura do Charon

## Estilo

Charon é um monólito modular orientado a funcionalidades. O processo principal
compõe adaptadores externos no `application.ts`; módulos de negócio não criam
clientes Discord ou Prisma diretamente.

## Estrutura da Etapa 1

```text
src/
├── core/
│   ├── config/       # Validação e tipos de configuração
│   ├── database/     # Adapter Prisma/PostgreSQL
│   ├── discord/      # Cliente e roteamento de interações
│   └── logger/       # Logs JSON e redaction
├── generated/prisma/ # Client gerado pelo Prisma 7
├── modules/status/   # Primeiro módulo vertical
├── application.ts    # Composição e ciclo de vida
└── index.ts          # Entry point e sinais do processo
```

## Fluxo de inicialização

1. `.env` é carregado.
2. Zod valida todas as variáveis obrigatórias.
3. A conexão PostgreSQL é verificada.
4. O listener de interações é registrado.
5. O cliente faz login no Discord.

Se a validação ou o banco falhar, o login Discord não acontece.

## Banco de dados

Prisma 7 usa o generator `prisma-client` com saída explícita em
`src/generated/prisma`. O Prisma CLI lê `DIRECT_URL` em `prisma.config.ts`.
O processo do bot cria `PrismaPg` com `DATABASE_URL` e timeout de conexão de
cinco segundos.

O schema ainda não possui modelos de domínio. Eles entram nas etapas que
entregam as respectivas regras, evitando tabelas especulativas.

## Interações

Handlers implementam `InteractionHandler<T>`, são registrados explicitamente e
executados pelo `InteractionRegistry`. Falhas ficam contidas, são registradas
sem a mensagem potencialmente sensível e geram uma resposta efêmera segura.

## Próximos módulos

`setup`, `calls`, `ownership`, `moderation` e `reputation` serão adicionados em
releases independentes sem alterar o princípio de composição por portas.
