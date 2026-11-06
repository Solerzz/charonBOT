# Charon

Charon é um bot Discord modular para criação e gerenciamento de canais de voz
temporários. A versão `v0.1.0` entrega somente a fundação técnica: configuração,
logs, Prisma, ciclo de vida do cliente Discord e o comando `/status`.

## Requisitos

- Node.js `20.19.0` ou superior
- npm
- Aplicação criada no Discord Developer Portal
- Projeto PostgreSQL no Supabase

## Instalação

```bash
npm install
copy .env.example .env
npm run prisma:generate
npm run build
```

Preencha `.env` localmente. Nunca envie esse arquivo ao Git.

## Variáveis de ambiente

| Variável | Uso |
|---|---|
| `NODE_ENV` | `development`, `test` ou `production` |
| `LOG_LEVEL` | Nível do Pino, como `info` ou `debug` |
| `DISCORD_TOKEN` | Token privado do bot |
| `DISCORD_CLIENT_ID` | ID da aplicação Discord |
| `DATABASE_URL` | Conexão PostgreSQL usada pelo bot em runtime |
| `DIRECT_URL` | Conexão usada pelo Prisma CLI e migrations |

Para um servidor persistente, prefira o **Session pooler** do Supabase em
`DATABASE_URL`. Use conexão direta quando houver IPv6 disponível ou o Session
pooler em `DIRECT_URL` para migrations. Em ambientes autoescaláveis, o
Transaction pooler usa a porta `6543` e `?pgbouncer=true`.

## Comandos

```bash
npm run dev                # Executa o bot em desenvolvimento
npm run commands:register  # Registra os slash commands globais
npm run prisma:generate    # Atualiza o Prisma Client gerado
npm run typecheck          # Valida os tipos
npm run test:run           # Executa os testes uma vez
npm run build              # Compila para dist/
npm start                  # Executa o build
```

O registro global de comandos do Discord pode levar algum tempo para aparecer.

## Segurança

- O startup falha antes do login quando a configuração ou o banco são inválidos.
- Logs são JSON e ocultam campos conhecidos de token, senha e URL do banco.
- Erros enviados ao Discord são privados e não incluem detalhes internos.
- A integração real com banco só roda quando `RUN_DATABASE_TESTS=true`.

## Desenvolvimento

O projeto usa GitHub Flow. Cada etapa é implementada em uma branch `feature/*`,
revisada em PR e publicada com tag semântica. Consulte
[`docs/architecture.md`](docs/architecture.md) para os limites dos módulos.
