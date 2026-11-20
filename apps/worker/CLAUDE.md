# apps/worker — background jobs (pg-boss)

Read the root `CLAUDE.md` first. This file adds rules for the worker only.

## What it is
A long-running Node process that consumes pg-boss jobs from Postgres: sending WhatsApp/SMS,
building PDFs (receipts, report cards, lists), scheduled fee reminders, nightly exports.

## Structure
```
src/
├─ index.ts               # starts pg-boss, registers handlers and schedules
├─ env.ts                 # zod-validated env; fail fast
├─ jobs/<job-name>.ts     # one handler per job; payload validated with a zod schema from shared
├─ schedules.ts           # cron schedules (Africa/Accra time), e.g. weekly reminders
├─ messaging/
│  ├─ send-message.ts     # the single sendMessage() entry point
│  ├─ channels.ts         # WhatsApp-first, SMS fallback logic
│  └─ adapters/           # whatsapp-cloud.ts, sms-<provider>.ts (one file per provider)
└─ pdf/                   # @react-pdf/renderer documents: receipt.tsx, report-card.tsx, class-list.tsx
```

## Rules
- **Job names and payload schemas live in `@school-mgmt/shared`** so the API (which enqueues) and the
  worker (which consumes) agree.
- **Handlers are idempotent.** A job may run more than once (at-least-once delivery). Use a
  natural key (e.g. message id, payment id) to avoid double-sending or double-generating.
- **Retries:** configure retry limit with exponential backoff per job type; failed jobs go to a
  dead-letter queue and are reported to Sentry.
- **Messaging safety:** respect `MESSAGING_MODE` (`dry_run` default outside production, `sandbox`
  only sends to `MESSAGING_TEST_ALLOWLIST`, `live` only when `APP_ENV=production`).
- **WhatsApp:** approved templates only for business-initiated messages; only to guardians with
  `whatsapp_opt_in`. Record status and cost on `message_recipients`.
- **SMS fallback** when WhatsApp is unavailable or fails, per the channel rules.
- **PDFs:** generated from the same data the screens show; amounts via `formatGhs`. Upload to
  Supabase Storage and store the path; large batches (e.g. all report cards) are processed in chunks.
- **Schedules** are defined in code in `schedules.ts`, with times in Africa/Accra.
- **Logging:** ids only; never message bodies with personal data or phone numbers in logs.

## Tests
- Unit-test channel selection, template parameter building and idempotency.
- Adapters are tested against mocked HTTP; never call real providers in tests.
