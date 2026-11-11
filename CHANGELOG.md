# Changelog

Todas as mudanças relevantes serão documentadas neste arquivo.

## [Unreleased]

### 0.4.0 — implementação e validação locais em 2026-11-11; rollout pendente

- Moderação privada do dono pela última linha **Assumir sala · Moderação**,
  confirmação single-use e reuso da mesma área após mutação/epoch novo.
  Bloquear remove autorização e impede voz/chat sem ocultar a sala; desbloquear
  não restaura autorização. Proteções de dono/bots/administradores e recuperação
  de intenções duráveis, sem replay da desconexão incerta na mesma tentativa.
- Gates locais: **1.494 testes comuns + 71 integrações PostgreSQL**, typecheck e
  build aprovados; **6 migrations / 7 tabelas RLS** no banco descartável local.
  Provas compostas handler/runtime/Prisma com Discord simulado, não aceite real.
- `charon-dev` continua no estado remoto conhecido de cinco migrations anteriores.
  Sexta migration/RLS da sétima tabela remota, backup novo, restart e aceitação
  Discord real pendem de nova autorização. Sem publicação ou bump de package.
  [Notas v0.4.0](docs/releases/v0.4.0.md) e
  [validação local](docs/validation/2026-11-10-moderacao-dono.md).

### 0.3.0 — integrada e validada no servidor de testes em 2026-11-10

- Painel público nativo com botões em linhas 3+3+1, nome mostrado uma vez e
  controles de gestão exclusivos do dono. Renomear mantém 11 grafemas; limite
  `0..99` sem expulsar participantes. Seleções de autorizados/transferência
  reutilizam uma área privada, sem confirmações genéricas repetidas.
- Tranca e visibilidade independentes: trancar não oculta; mostrar não destranca.
  Dono, autorizados e participantes atuais conservam acesso; a sala ocupada
  mantém os estados ao perder o dono e a sala vazia é encerrada.
- Transferência de 5 segundos após entrega privada confirmada, confirmação/
  desfazer pelo dono e execução por silêncio; reivindicação com prioridade de
  5 minutos, presença humana e unicidade de dono por servidor no PostgreSQL.
- Setup guiado e limite padrão de participantes por canal de entrada.
- Runtime compartilhado, cancelamento no reinício, reconciliação limitada de
  salas acompanhadas, drenagem de timers/despachos e toggle integral dos painéis.
- Quarentena de acesso também cobre transferência/reivindicação após SQL incerto;
  controles antigos são rejeitados sem reiniciar prazos. Métricas seguras por
  etapa e exatamente um fetch de mensagem eliminado por edição no benchmark
  simulado, sem reduzir verificações de autoridade ou prometer latência real.
- Cinco migrations aplicadas no `charon-dev`, incluindo
  `20261110010000_voice_creator_default_limit` e
  `20261110020000_room_lock_state`; novo backup privado e verificação independente
  de TLS, backfill, dados preservados e RLS backend-only nas seis tabelas.
- Gates finais registrados: **1.259 testes comuns + 45 integrações locais**,
  typecheck e build aprovados. [PR #5](https://github.com/Solerzz/charonBOT/pull/5)
  mesclado em `main` (`b67f475`), com CI aprovado antes e depois do merge.
- Bot iniciado localmente no servidor de testes; usuário aprovou o visual e
  todos os botões, sem erros nem mensagens repetidas. Isso não certifica toda a
  matriz multiusuário/mobile ou latência medida.

Evidências e limites: [notas v0.3.0](docs/releases/v0.3.0.md) e
[validação/rollout](docs/validation/2026-11-10-painel-publico-tranca-visibilidade.md).
Reputação adiada pelo usuário. Hospedagem permanente fica para o final;
esta atualização documental não cria tag nem GitHub Release.

## [0.2.0] - 2026-11-06

### Added

- `/setup init` com painel privado para selecionar canais de voz existentes como
  Voice Creators, configurar categoria, renomear, alternar preferência de comandos
  e remover configurações com confirmação.
- Modelos `VoiceCreator` e `TemporaryRoom`, exclusão lógica/restauração de
  configurações e histórico das salas encerradas.
- Join-to-create com salas públicas sem limite, nome de até 11 grafemas,
  reutilização da sala do proprietário e encerramento de salas vazias.
- Painel da call com proprietário e participantes; todos os controles futuros
  permanecem desabilitados, independentemente da preferência de comandos.
- Serialização local por membro/sala, compensação de falhas, acompanhamento por
  eventos de voz e shutdown que aguarda os despachos já aceitos.
- Teste PostgreSQL opt-in de round trip dos repositórios com limpeza restrita
  aos dados UUID do próprio teste.

### Known limitations

- Atividade é best effort a partir da presença disponível, sem intent
  privilegiado; o nome de exibição é o fallback.
- Preflight do bot é conservador e pode rejeitar permissões concedidas apenas
  por sobrescritas locais. Reconciliação na inicialização ainda não existe.
- Ownership avançado fica para `v0.3.0`; não há transferência ou reivindicação.
- Validação real do novo teste PostgreSQL e smoke test Discord não executados
  nesta preparação. Veja [as notas da versão](docs/releases/v0.2.0.md).

## [0.1.0] - 2026-11-05

### Added

- Fundação Node.js e TypeScript em strict mode.
- Configuração de ambiente validada com Zod.
- Logs estruturados e redaction de credenciais com Pino.
- Prisma 7 com adapter PostgreSQL e URLs separadas para runtime e CLI.
- Registro explícito de interações Discord.
- Comando `/status` com resposta privada.
- Shutdown idempotente para `SIGINT` e `SIGTERM`.
- Testes unitários, integração opt-in e pipeline de CI.
