# Moderação direta do dono — validação local v0.4.0

Data da execução: **2026-11-11**. O nome deste documento acompanha o plano
aprovado de 2026-11-10. Estado: implementação e validação **locais**, não rollout.

## Contrato entregue

- O painel público termina em **Assumir sala · Moderação** e não lista bloqueados.
  Só o dono atual, humano e presente, usa os controles. Origem, sala, guild,
  mensagem, epoch, continuidade e nonce atual são revalidados antes da intenção.
- Bloquear aceita membro fora da call, recusa dono/bots/administradores, remove
  autorização anterior e nega entrada na voz e envio no chat. Não oculta a sala:
  a visibilidade continua independente. Desbloquear não restaura autorização.
- A confirmação guarda seleção privada single-use, diferente do operationId de
  transferência. Selecionar, cancelar e paginar não alteram negócio. Transferência
  pendente permanece prioritária, com os prazos existentes de 5 s/300.000 ms.
- A área privada é reutilizada por 900.000 ms do handle nativo. Resultado ou erro
  parcial volta à mesma mensagem, drenando aposentadoria antiga. Novo fluxo,
  troca de dono/epoch ou expiração impedem rebind tardio; não há followUp de
  substituição nem replay do serviço após tentativa de mutação.
- Intenção/fence SQL precede REST. `MODERATION_INCOMPLETE` informa alteração
  salva e aplicação não confirmada, mantém quarentena e não promete rollback.
  Recuperação posterior é separada da tentativa incerta. Métricas usam apenas
  ações allowlisted, sem IDs de sala/alvo, seleções, listas, payloads ou tokens.

## Evidência composta

`tests/unit/modules/calls/call-moderation.interactions.test.ts` compõe handler,
runtime, coordenador, workspace, repositório Prisma real para leitura/stage e
delegates SQL/REST stateful. Não substitui o serviço de moderação por um mock.
Prova SQL → deny → uma desconexão → ausência/presença reconciliada → resultado na
mesma área. Cobre nonce A→B, cancelamento/página/novo fluxo, confirmação dupla,
A→B→A de dono, epoch/expiração, origens forjadas, idempotência na mesma epoch,
desbloqueio por blockId após saída do servidor e negação de autorizar/transferir
um bloqueado. Cobre também aposentadoria suspensa sem reter o coordenador,
falha incerta de delivery e resultado/erro tardio sem sobrescrever outro fluxo.
Resultado confirmado não é convertido em rebind de erro para uma epoch posterior;
um erro de stage/fence só admite a epoch original ou seu sucessor imediato, nunca
uma geração arbitrária depois de A→B→A.

`tests/integration/room-moderation-database.test.ts` acrescenta dois cenários com
handler/runtime/Prisma e PostgreSQL reais, mantendo apenas Discord/HTTP simulados:
sucesso confirmado e resposta HTTP incerta. No limite REST, uma leitura SQL
independente já vê bloqueio/epoch novos e autorização removida. O caso incerto
retém estado durável, quarentena e uma única requisição, sem falso sucesso.
As integrações existentes de finalização, fence de writer tardio, recuperação,
reinício/setup off, RLS e isolamento entre salas também passaram.

## Gates observados

| Gate | Resultado |
| --- | --- |
| Foco handler antigo + moderação + métricas | **123/123** |
| `npm run typecheck` | exit 0 |
| `npm run test:run -- --silent=false` | **1.494 passaram**, 71 opt-in ignorados; 52 arquivos passaram, 7 ignorados |
| `npm run build` | exit 0 |
| PostgreSQL local, integrações seriais | **71/71**, 7 arquivos |
| Prisma generate 7.10.1 guardado | exit 0; whitespace regenerado normalizado sem diff semântico |
| migrate deploy/status/deploy idempotente | **6 migrations**, schema atualizado; nenhum deploy aplicou migration pendente |
| RLS local | **7 tabelas protegidas**, incluindo `RoomMemberBlock` e `_prisma_migrations`; papéis API sem acesso às linhas |
| `git diff --check` | aprovado após normalização focal do whitespace gerado |

Suite comum executada com `RUN_DATABASE_TESTS=false`,
`RUN_DATABASE_SECURITY_TESTS=false` e `DOTENV_CONFIG_PATH` inexistente.
Os números históricos de 1.447 comuns/69 integrações não foram reutilizados
como evidência desta execução. Os logs informativos dos testes representam
cenários simulados, inclusive falhas tratadas, não incidentes reais.

Todos os comandos que envolvem Prisma/banco foram filhos deste launcher local:

```powershell
node --import tsx .superpowers/sdd/2026-11-10-charon-v0.4.0-moderacao-dono/local-postgres.mjs run node_modules/prisma/build/index.js generate
node --import tsx .superpowers/sdd/2026-11-10-charon-v0.4.0-moderacao-dono/local-postgres.mjs run node_modules/prisma/build/index.js migrate deploy
node --import tsx .superpowers/sdd/2026-11-10-charon-v0.4.0-moderacao-dono/local-postgres.mjs run --import tsx tests/integration/prepare-database.ts
node --import tsx .superpowers/sdd/2026-11-10-charon-v0.4.0-moderacao-dono/local-postgres.mjs run node_modules/vitest/vitest.mjs run tests/integration --maxWorkers=1
node --import tsx .superpowers/sdd/2026-11-10-charon-v0.4.0-moderacao-dono/local-postgres.mjs run node_modules/prisma/build/index.js migrate status
node --import tsx .superpowers/sdd/2026-11-10-charon-v0.4.0-moderacao-dono/local-postgres.mjs run node_modules/prisma/build/index.js migrate deploy
```

## Limites e rollout pendente

Discord não oferece desconexão condicional ao canal esperado: a checagem final
reduz, mas não elimina, a corrida antes do HTTP. Resposta incerta não é repetida
na mesma tentativa. Testes locais não certificam esse comportamento em servidor
real, aparência/mobile, latência, taxa de sucesso ou uma transação SQL+Discord
atômica. Não houve login/restart do bot, segunda instância nem aceite real.

O estado remoto conhecido do `charon-dev` continua sendo **somente as cinco
migrations anteriores**, aplicadas na etapa v0.3.0; não foi consultado nem
alterado nesta tarefa. A sexta migration e RLS da sétima tabela remota exigem
**nova autorização e backup privado novo**, conferência dos cinco checksums,
destino/processo/TLS/dados e validação independente. Nunca usar prepare local
no remoto. Reinício exige stop limpo da instância antiga antes da nova, sem
rodar a nova versão contra schema sem `RoomMemberBlock`.

O aceite Discord deve validar bloqueio presente/ausente, voz/chat/visibilidade,
desbloqueio sem autorização restaurada, proteções e desbloqueio corretivo,
sucessão, recuperação, setup off/on e expiração/rebind sem mensagens repetidas.
Push/PR/merge/tag/release continuam sem autorização. Votação não faz parte desta
entrega; reputação adiada e hospedagem para o final. `package.json` permanece
na versão anterior até a etapa autorizada correspondente.
