# Supabase RLS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Block Data API roles from reading Charon tables while preserving the current backend connection.

**Architecture:** Apply a new Prisma migration enabling RLS on the two application tables and Prisma's migration history. Add no public policies and do not force RLS on the backend owner. Keep the Data API disabled.

**Tech Stack:** PostgreSQL 17, Prisma 7.10.1, pg, Vitest 5.1.0.

**Spec:** Approved scope below, explicitly authorized by the user on 2026-11-08.

## Approved scope and approaches

Data API disabled alone prevents web requests but leaves unsafe defaults if re-enabled. The user chose additional database-level RLS, without public access policies:

```sql
ALTER TABLE public."VoiceCreator" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TemporaryRoom" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
```

No role changes, ownership changes, FORCE RLS, bot startup, or v0.3.0 functionality are included. A least-privilege runtime role remains a separate production-readiness decision.

## Global Constraints

- Target only approved development project `charon-dev` (`wpdlpdnrqcnzqsugbwqm`).
- Preserve the previously published migration and unrelated local graph changes.
- Keep credentials and the local CA certificate out of Git and tool output.
- Never enable the existing data-changing database test suite against Supabase.
- Use the Prisma migration history, not duplicate ad hoc SQL deployment.

## Review Focus

- All three named tables must enforce RLS, including migration history.
- Both `anon` and `authenticated` must see no migration records despite existing SELECT grants.
- The backend must retain access; migration history contains real rows for a non-vacuous check.
- The new security test must be opt-in and execute only a read-only transaction.
- Re-running Prisma migration status/deploy must remain possible after protecting its history.

## Task 1: Enable and verify RLS

**Files:**
- Create: `tests/integration/database-rls.test.ts` — opt-in, read-only security regression.
- Create: `prisma/migrations/20261108000000_enable_backend_table_rls/migration.sql` — only the approved three statements.

**Interfaces:** Existing DATABASE_URL connection, `pg.Client`, Prisma migrate deploy/status. New test-only opt-in: `RUN_DATABASE_SECURITY_TESTS=true`; does not load `.env` itself.

- [x] Write a real database test requiring RLS/no public policies on all three tables, readable migration rows as backend, and zero visible rows as each API role.
- [x] Run only that test against the approved development database; RED confirmed for all three `protected=false` results. Keep `RUN_DATABASE_TESTS=false`.
- [x] Add the new three-statement migration, without modifying the old migration.
- [x] Deploy through Prisma and confirm migration status. Both commands and a repeated idempotent deploy exited zero.
- [x] Repeat the read-only security test; GREEN against both API roles and all three tables. The actual application Prisma client still reads both model tables.
- [x] Run typecheck, the default test suite with both opt-ins off, build, and `git diff --check`. Default suite: 312 passed, three skipped; real security test passed separately.
- [x] Update the knowledge graph with AST-only extraction and review the scoped diff. Pre-existing graph changes preserved.

## Progress

Plan/spec reflects the exact SQL already approved in the conversation. Implementation is inline in the restored backup branch; no merges, pushes, or commits are authorized by this plan.

- Real database history confirmed both migrations applied without rollback; all three tables report `rls_enabled=true`.
- Security Advisor reports only the expected informational notice `rls_enabled_no_policy`. No public policies is deliberate, not a missing allow rule.
- Independent read-only review found no Critical/Important issues. Minor deferred: guard rollback after a failed connect/BEGIN so cleanup cannot mask the original error in the opt-in test; this affects diagnostics, not database protection or bot behavior.
- Graph update produced 957 nodes/1614 edges. Existing limitation remains: SQL extraction lacks `tree_sitter_sql`; new human documentation needs semantic extraction if desired. No LLM or API credits were used for this graph update.

## Re-run the read-only security test

After confirming the target in the local ignored `.env`, use a terminal without printing its credentials:

```powershell
$env:RUN_DATABASE_TESTS = 'false'
$env:RUN_DATABASE_SECURITY_TESTS = 'true'
try {
  node --env-file=.env node_modules/vitest/vitest.mjs run tests/integration/database-rls.test.ts
} finally {
  $env:RUN_DATABASE_SECURITY_TESTS = 'false'
}
```

The existing database tests can change data and remain disabled for this remote project.
