# packages/db — schema, migrations, seed

Read the root `CLAUDE.md` first (especially §7 Data model and §8 Money rules).

## What it is
The Drizzle ORM schema for PostgreSQL (Supabase), SQL migrations, SQL triggers (audit log),
views (e.g. student balances), the seed script and the shared DB client.

## Structure
```
src/
├─ schema/core.ts         # schools, users and the shared columns helper (baseColumns, oneOf, ghanaPhone)
├─ schema/<area>.ts       # setup, people, assignments, enrolment, audit (later: money, attendance, …)
├─ schema/index.ts        # re-exports all tables
├─ client.ts              # createDb(url): Drizzle + postgres.js; TLS for any non-local host
├─ env.ts                 # zod-validated APP_ENV / DATABASE_URL; assertNotProduction()
├─ maintenance.ts         # runMigrations, dropEverything, TABLE_NAMES, AUDITED_TABLES
├─ queries/               # reusable read queries, each taking (db, { schoolId, … }) + tests
├─ seed/                  # deterministic fake school (Creche–JHS 3, two years, guardians, siblings, staff)
│  └─ fixtures.ts         # hand-written families/staff with known names that the tests assert on
├─ scripts/               # db:migrate, db:seed, db:reset entry points
└─ test/                  # test DB helpers + vitest global setup (reset + seed once per run)
migrations/               # drizzle-kit output + hand-written SQL; committed; never edited after being applied
drizzle.config.ts         # only for `drizzle-kit generate` (no DB connection needed)
vitest.config.ts
```

Triggers, row-level security and other SQL Drizzle can't express live in **custom migrations**
(`pnpm exec drizzle-kit generate --custom --name=<what>`), e.g. `0001_triggers_and_rls.sql`.
Design decisions and documented exceptions: `docs/decisions/0001-data-model.md`.

## Rules
- Every table: `id uuid` (UUIDv7), `school_id`, `created_at`, `updated_at`, `created_by`,
  `archived_at` (nullable) unless there's a documented reason not to.
- `snake_case` names, plural tables, `<entity>_id` foreign keys with explicit `ON DELETE` behaviour
  (usually `RESTRICT`; we archive instead of deleting).
- Money: `<name>_pesewas integer not null`, CHECK constraints for non-negative amounts.
  Charges, payments, allocations and reversals are append-only: no app-level UPDATE/DELETE.
  Consider DB-level protection (triggers or revoked privileges) for these tables.
- Use constraints generously: NOT NULL, UNIQUE (e.g. one charge per student + term + fee item;
  one attendance record per session + student), CHECK, FK.
- Add indexes for every foreign key used in joins and for common filters (school_id + term_id, etc.).
- `audit_log` is written only by the `audit_row_change()` trigger and is append-only (UPDATE, DELETE and
  TRUNCATE are rejected). It captures table, row id, operation, old and new values, actor and device
  (from `app.user_id` / `app.device_id`, set per transaction with `set_config(..., true)`) and timestamp.
- **Every new table's migration must:** add the `set_updated_at` trigger, enable RLS (no policies) and
  revoke `anon` / `authenticated` grants, and add `audit_row_change` if it holds money, results or
  student records (then add it to `AUDITED_TABLES` in `maintenance.ts`). Copy the pattern in
  `0001_triggers_and_rls.sql`.
- Text enums: build the column and its CHECK from the value tuple in `@school-mgmt/shared`
  (e.g. `text('sex', { enum: SEXES })` + `check(..., oneOf(t.sex, SEXES))`), so zod and the DB agree.
- IDs default to `uuidv7()` from `@school-mgmt/shared` but callers (devices) may supply their own.
- **Migrations:** change the schema in TypeScript → `pnpm db:generate` → review the SQL → apply with
  `pnpm db:migrate`. Never edit an applied migration; write a new one. Destructive changes (drop/rename)
  need explicit approval and a data migration plan.
- **Seed:** deterministic (fixed random seed), realistic Ghanaian names and +233 phone numbers,
  covers edge cases (siblings, guardian with several children, students with arrears, scholarships).
  The seed must refuse to run when `APP_ENV=production`. It runs in one transaction and switches the
  audit triggers off only inside it. When you need an exact test assertion, add a fixture in
  `seed/fixtures.ts` (with a surname the generator never uses) rather than relying on generated names.
- **Tests** run against the local Docker DB (`pnpm db:test:up`, `TEST_DATABASE_URL`); the global setup
  resets and seeds it and refuses any non-localhost URL. Tests that write use `inRollback()`.
  CI runs the same Postgres version as a service container; keep `docker-compose.yml`, `ci.yml` and
  the Supabase project on the same major version.
- Keep PowerSync sync rules (`infra/powersync/`) in step with schema changes to synced tables.
