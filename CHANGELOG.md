# Changelog

Todas as mudanças relevantes serão documentadas neste arquivo.

## [Unreleased]

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
