# Retomar o Charon após formatar o computador

## O que está salvo no GitHub

- Repositório: <https://github.com/Solerzz/charonBOT>.
- `main` e tag `v0.2.0`: produto publicado, incluindo código, migration, testes,
  especificações, planos, documentação e grafo versionado da release.
- Branch `backup/pre-formatacao-2026-11-07`: checkpoint da release com este guia
  e o registro posterior de validação real.
- Branch `backup/grafo-local-pre-formatacao-2026-11-07`: snapshot das alterações
  locais do grafo da cópia principal, incluindo seus dois arquivos `.bak`.
  Essa branch parte do estado local antigo e serve somente para recuperar esses
  arquivos; não substitui `main` e não deve ser mesclada sem revisão.

Não é necessário preservar `.worktrees/` ou `node_modules/` para recuperar o
código. Os worktrees podem ser recriados pelo Git e dependências pelo npm.

## Antes de formatar: salvar fora do Git

**O `.env` não é versionado.** Guarde as credenciais em um gerenciador de senhas
ou backup criptografado separado. Não coloque esse arquivo em commits, issues,
prints públicos ou no chat.

Também não são parte do backup Git:

- senhas, tokens e credenciais de acesso ao GitHub/Figma/serviços;
- configurações locais do editor e ferramentas de agentes;
- binários, clusters descartáveis e scripts/logs da pasta temporária da sessão.

As evidências relevantes desses logs temporários foram resumidas em
[`validation/2026-11-07-v0.2.0-validation.md`](validation/2026-11-07-v0.2.0-validation.md),
sem credenciais ou conteúdo de mensagens de usuário.

## Recuperar o projeto

1. Instale Git e uma versão Node.js compatível com `engines` do `package.json`
   (mínimo atual: `20.19.0`).
2. Clone o repositório e selecione o checkpoint:

   ```powershell
   git clone https://github.com/Solerzz/charonBOT.git
   cd charonBOT
   git switch backup/pre-formatacao-2026-11-07
   npm ci
   npm run typecheck
   npm run test:run
   npm run build
   ```

   Para trabalhar apenas na release publicada, selecione `main` em vez do
   checkpoint. Os testes de banco serão ignorados enquanto não houver opt-in
   e um banco de testes preparado; isso não invalida o registro anterior.

3. Crie `.env` a partir de `.env.example` e restaure os valores privadamente.
   Além de `DISCORD_TOKEN` e `DISCORD_CLIENT_ID`, executar o bot exige
   `DATABASE_URL` e `DIRECT_URL` para um PostgreSQL confirmado.
4. Antes de aplicar migrations, confirme explicitamente o destino do banco.
   O banco temporário desta validação foi removido e suas URLs não são
   reutilizáveis. Não habilite testes destrutivos contra produção.
5. Registro de comandos e login do bot são ações remotas separadas; faça-os
   somente no servidor e ambiente desejados. A sessão anterior de teste está
   encerrada e seus recursos temporários foram removidos.

## De onde continuar

- `v0.1.0`: infraestrutura publicada.
- `v0.2.0`: setup e join-to-create publicados.
- Validação real PostgreSQL e caminhos Discord descritos no relatório: aprovados
  no escopo observado; testes humanos adicionais permanecem opcionais/pendentes.
- Visual escolhido: **Minimalista Monocromático**.
- `v0.3.0`: design/plano aprovados e implementação na branch local
  `feature-v0.3.0-posse-controles` (não assumir que foi enviada ao GitHub).
  Nove gates por tarefa aprovados; revisão da branch pendente com o controlador.
- Antes de continuar, confira o SHA e os arquivos presentes no checkout.
  Consulte [a validação v0.3.0](validation/2026-11-08-v0.3.0-validation.md):
  execução real em 2026-11-09, sem substituir a evidência v0.2.0 acima.

## Retomar a validação da v0.3.0

1. Execute `npm ci`, `npm run typecheck`, a suíte comum com os dois opt-ins
   explicitamente `false` e `npm run build` sem carregar `.env` remoto.
2. Para integração, provisione **outro** PostgreSQL 17 descartável, loopback,
   `charon_v030_test...`; injete URLs locais correspondentes no processo.
   Não reutilize os caminhos/senhas do cluster temporário desta sessão.
3. Siga o guard, geração, migrations e grants das
   [notas v0.3.0](releases/v0.3.0.md). Execute ambos os opt-ins `true`, com
   `npm run test:run -- tests/integration --maxWorkers=1` (reconciliação compartilha DB).
4. A migration nova é `prisma/migrations/20261108010000_room_ownership_state`.
   Não edite migrations antigas nem use reset; status e segundo deploy devem
   continuar funcionando depois da RLS em `_prisma_migrations`.
5. Peça autorização separada e confirme um servidor Discord de testes antes
   do checklist humano. Deploy Supabase, login, push/tag e hospedagem continuam
   pendentes; o bot não pode executar com múltiplos processos.
