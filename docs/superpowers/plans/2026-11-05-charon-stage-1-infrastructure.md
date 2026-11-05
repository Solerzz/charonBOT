# Charon Stage 1 Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a tested Discord bot foundation with validated configuration, JSON logging, Prisma connectivity, interaction dispatch, `/status`, CI, and release documentation.

**Architecture:** Build the shared core of a feature-first modular monolith. Discord and Prisma are adapters composed by an application lifecycle; no temporary-room business rules are implemented in this stage.

**Tech Stack:** Node.js 20+, TypeScript strict, Discord.js v14, Prisma, PostgreSQL/Supabase, Zod, Pino, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-05-charon-v1-design.md`

## Global Constraints

- Use Node.js 20+ and TypeScript strict mode.
- Use Discord.js v14.
- Use matching Prisma and `@prisma/client` versions.
- Emit structured JSON logs with secret redaction.
- Do not add temporary-room business rules in this stage.
- Run tests, typecheck, and build before every completion claim.
- Run `graphify update .` before closing the stage.

## Review Focus

- Invalid or missing environment values must stop startup before Discord login.
- Database connection failures must not leak credentials and must stop startup.
- Handler exceptions must not terminate the process and should produce a safe response when possible.
- Repeated shutdown signals must close Discord and Prisma only once.
- Logs must redact tokens, passwords, and database URLs.

---

### Task 1: Project foundation

**Files:**
- Create: `package.json`, `package-lock.json`, `tsconfig.json`, `vitest.config.ts`, `.env.example`
- Create: `src/index.ts`
- Test: `tests/unit/bootstrap.test.ts`

**Interfaces:**
- Produces scripts `build`, `typecheck`, `test`, `test:run`, `dev`, and `start`.

- [ ] Write a bootstrap smoke test that imports `src/index.ts` without external side effects under test.
- [ ] Run it and verify RED because the project entry point does not exist.
- [ ] Add the minimal Node/TypeScript/Vitest foundation and entry point.
- [ ] Run `npm test -- --run`, `npm run typecheck`, and `npm run build` and verify GREEN.
- [ ] Commit: `chore: initialize charon typescript project`.

### Task 2: Validated configuration

**Files:**
- Create: `src/core/config/env.ts`
- Test: `tests/unit/core/config/env.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces `loadConfig(env: NodeJS.ProcessEnv): AppConfig`.
- `AppConfig` includes node environment, Discord token/client ID, database pooled/direct URLs, and log level.

- [ ] Write tests for valid values, missing token, invalid URLs, and invalid enums.
- [ ] Run the focused tests and verify RED because `loadConfig` is missing.
- [ ] Implement the minimal Zod schema without echoing secret values in errors.
- [ ] Run focused and full suites and verify GREEN.
- [ ] Commit: `feat: validate runtime configuration`.

### Task 3: Structured logger

**Files:**
- Create: `src/core/logger/logger.ts`
- Test: `tests/unit/core/logger/logger.test.ts`

**Interfaces:**
- Produces `createLogger(options: LoggerOptions): Logger`.

- [ ] Write tests for JSON fields and redaction of tokens/passwords/database URLs.
- [ ] Run focused tests and verify RED because `createLogger` is missing.
- [ ] Implement a minimal Pino logger with redaction.
- [ ] Run focused and full suites and verify GREEN.
- [ ] Commit: `feat: add structured application logger`.

### Task 4: Prisma adapter

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/core/database/prisma.ts`
- Test: `tests/unit/core/database/prisma.test.ts`
- Test: `tests/integration/database-connection.test.ts`

**Interfaces:**
- Produces `createPrismaClient`, `checkDatabase`, and `disconnectDatabase`.

- [ ] Verify current official Prisma/Supabase pooled and direct connection guidance.
- [ ] Write tests for client creation, sanitized connection failure, and idempotent disconnect.
- [ ] Run focused tests and verify RED.
- [ ] Implement the adapter and opt-in integration test guarded by `RUN_DATABASE_TESTS=true`.
- [ ] Run focused and full suites and verify GREEN.
- [ ] Commit: `feat: configure prisma postgres connection`.

### Task 5: Discord client and interaction registry

**Files:**
- Create: `src/core/discord/client.ts`
- Create: `src/core/discord/interactions/interaction-handler.ts`
- Create: `src/core/discord/interactions/interaction-registry.ts`
- Test: `tests/unit/core/discord/interaction-registry.test.ts`

**Interfaces:**
- Produces `InteractionHandler<T>`, `InteractionRegistry.register`, and `InteractionRegistry.dispatch`.

- [ ] Write tests for one-handler dispatch, no matching handler, and safe exception handling.
- [ ] Run focused tests and verify RED.
- [ ] Implement a client with minimal intents and an explicit interaction registry.
- [ ] Run focused and full suites and verify GREEN.
- [ ] Commit: `feat: add discord interaction registry`.

### Task 6: Application lifecycle and status command

**Files:**
- Create: `src/application.ts`
- Create: `src/modules/status/status.command.ts`
- Create: `scripts/register-commands.ts`
- Test: `tests/unit/application.test.ts`
- Test: `tests/unit/modules/status/status.command.test.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Produces `createApplication(config: AppConfig): Application` with idempotent `start` and `stop`.

- [ ] Write tests for startup ordering, database failure, idempotent shutdown, and `/status` response.
- [ ] Run focused tests and verify RED.
- [ ] Implement lifecycle composition, signal handling, and explicit status-command registration.
- [ ] Run focused and full suites and verify GREEN.
- [ ] Commit: `feat: bootstrap discord application lifecycle`.

### Task 7: CI, documentation, and release readiness

**Files:**
- Create: `README.md`, `CHANGELOG.md`, `docs/architecture.md`
- Create: `.github/pull_request_template.md`, `.github/workflows/ci.yml`

**Interfaces:**
- Produces documented setup and CI gates for later stages.

- [ ] Document installation, environment variables, Supabase connection strategy, and architecture.
- [ ] Add CI steps for install, typecheck, test, and build.
- [ ] Run the exact CI commands locally and verify GREEN.
- [ ] Run `graphify update .` and inspect graph health.
- [ ] Commit: `docs: document stage one infrastructure`.
- [ ] Prepare PR checklist and `v0.1.0` release notes; do not push, merge, or publish without approval.
