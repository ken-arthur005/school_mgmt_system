# apps/api — Fastify API

Read the root `CLAUDE.md` first. This file adds rules for the API only.

## What it is
The single gatekeeper. Every write from devices, every permission check, all business rules,
webhooks (Paystack, WhatsApp), and the AI assistant's tools live here.

## Structure
```
src/
├─ app.ts                 # builds the Fastify instance (used by server.ts and tests)
├─ server.ts              # starts the server
├─ env.ts                 # zod-validated env; fail fast
├─ plugins/               # auth (verify Supabase JWT), permissions, error handler, rate limit, sentry
├─ modules/<domain>/      # setup, students, guardians, enrolments, fees, payments, receipts,
│  │                      # attendance, scores, report-cards, messaging, dashboard, imports, audit,
│  │                      # sync, webhooks, assistant
│  ├─ routes.ts           # HTTP layer only: parse, authorise, call service, shape response
│  ├─ service.ts          # business rules (pure where possible, transactions here)
│  ├─ repo.ts             # Drizzle queries, always scoped by school_id (+ teacher scopes)
│  └─ *.test.ts
└─ modules/assistant/
   ├─ tools/              # one file per tool: description, zod input, permission check, handler
   ├─ run.ts              # tool-use loop with iteration cap and logging
   └─ guardian.ts         # WhatsApp guardian identity + scoping
```

## Rules
- **Routes are thin.** Sign-in and permission check (`plugins/auth.ts`, from the route's
  `config.permission`) → validation (zod type provider) → service → response. No business logic
  in route handlers.
- **Every route declares its permission** in `config: { permission: 'domain.verb' }` (or a list,
  where any one is enough), or `config: { public: true }` for routes like `/health`. The app throws
  at startup if a route has neither. Every route is covered by role-access tests
  (`src/modules/access-matrix.test.ts`).
- **Scoping:** every repo query filters by `school_id`; teacher-facing queries also filter by
  `staff_assignments`. Never accept `school_id` from the client; take it from the authenticated user.
- **Transactions** for any multi-row write (billing, payment + allocations, imports, promotions).
- **Idempotency:** writes coming from devices carry client UUIDs; re-sending the same id must not
  duplicate anything. Paystack references are unique.
- **`/sync/upload`:** authenticate the PowerSync JWT → check each op against the allow-list of
  (table, op, role) → route to the domain service → return per-op results. Reject unknown tables/ops.
- **Webhooks:** verify signatures first using the raw request body (Paystack `x-paystack-signature`
  HMAC-SHA512; WhatsApp `X-Hub-Signature-256` with the app secret). Respond quickly; enqueue
  heavy work to pg-boss.
- **Paystack:** after a valid webhook, call verify-transaction, check amount/currency, then record
  the payment idempotently.
- **Errors:** `{ error: { code, message, details? } }`, correct status codes, plain-English messages,
  no stack traces to clients.
- **Logging:** pino structured logs with ids only; never names, phones, medical notes or tokens.
- **Slow work** (PDFs, bulk messages, report generation) is enqueued for the worker, not done inline.
- **Assistant tools:** read-only by default; write-type tools return a proposed action that needs
  explicit confirmation. Each tool re-checks permissions with the caller context. Results are compact
  and minimal. Model IDs come from env.

## Tests
- Use `app.inject()` for endpoint tests against a test database seeded with fixtures.
- For every endpoint: success, validation error, and access for each role (expect 403 where denied).
- Money and grading services: table-driven unit tests.
