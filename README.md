# Charon

Charon é um bot Discord modular para criação e gerenciamento de canais de voz
temporários. A `v0.3.0` está implementada nesta branch, em preparação de release
(não publicada/deployada): setup, join-to-create, painel B, posse e controles
privados. Veja [as notas](docs/releases/v0.3.0.md) e a
[validação local de 2026-11-09](docs/validation/2026-11-08-v0.3.0-validation.md).

## Requisitos

- Node.js `20.19.0` ou superior
- npm
- Aplicação criada no Discord Developer Portal
- PostgreSQL (17 nos testes locais); Supabase somente no ambiente confirmado

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
- Mutações de integração exigem `RUN_DATABASE_TESTS=true` e URLs correspondentes
  de banco descartável loopback com nome `charon_v030_test...`.
- RLS tem opt-in separado: `RUN_DATABASE_SECURITY_TESTS=true`. Ambos ficam
  `false` na suíte comum; a CI de banco habilita ambos, sem secrets remotos.

## Posse e controles da v0.3.0

- Painel B público abre ações efêmeras do dono: nome (11 grafemas), limite
  `0`/ilimitado ou `1..99`, privacidade, autorizados e transferência.
- Transferência exige humanos presentes; após publicação privada confirmada,
  são 5.000 ms para o dono confirmar/desfazer. Silêncio transfere, sem aceite
  do destinatário. Cada membro pode possuir só uma sala acompanhada por servidor.
- Sem dono, o humano elegível mais antigo tem prioridade exclusiva de
  300.000 ms; depois qualquer humano elegível presente pode reivindicar.
- Setup off remove o painel inteiro, invalida menus e cancela transferências;
  privacidade, presença e prioridade continuam. On restaura o painel.

O bot precisa de **Gerenciar Cargos** para sobrescritas, além de Gerenciar
Canais, Mover Membros e acesso operacional. **Administrador ignora negações de
acesso privado**: o bot não consegue ocultar a sala desses membros. A implantação
é de **um processo**; reiniciar cancela transferências pendentes e invalida menus,
sem reconstruir cronologia offline. Smoke Discord ainda pendente de autorização.

## Desenvolvimento

O projeto usa GitHub Flow. Cada etapa é implementada em uma branch `feature/*`,
revisada em PR antes de eventual publicação com tag semântica. Esta preparação
não cria tag, push ou deploy. Consulte
[`docs/architecture.md`](docs/architecture.md) para os limites dos módulos.
