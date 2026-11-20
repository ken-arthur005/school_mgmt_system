# packages/shared — contracts and helpers used everywhere

Read the root `CLAUDE.md` first. Anything both the web app and the API (or worker) need lives here.

## Structure
```
src/
├─ schemas/<domain>.ts    # zod schemas for API inputs/outputs and forms (students, fees, payments…)
├─ enums.ts               # roles, payment methods, attendance statuses, message channels… (zod enums)
├─ permissions.ts         # role → allowed actions map + can(user, action) helper
├─ jobs.ts                # pg-boss job names + payload schemas
├─ money.ts               # formatGhs, parseGhsToPesewas, applyDiscount, allocation helpers
├─ phone.ts               # normalizeGhanaPhone (E.164), formatGhanaPhone
├─ dates.ts               # formatDate (DD/MM/YYYY), school-day helpers in Africa/Accra
├─ ids.ts                 # UUIDv7 generator
└─ index.ts
```

## Rules
- **No runtime dependencies on Node-only or browser-only APIs.** This package runs in the browser,
  the API and the worker.
- **zod is the single source of truth** for shapes: export the schema and the inferred type
  (`export type Payment = z.infer<typeof paymentSchema>`). Never hand-write a duplicate type.
- **Money helpers** work in integer pesewas only. `formatGhs(125000)` → `GHS 1,250.00`.
  `parseGhsToPesewas('1,250.5')` → `125050`; invalid input throws a typed error. Rounding rule:
  round half up to the pesewa, in one place.
- **Phone helpers** accept common Ghana formats (`024…`, `+233 24…`, `23324…`) and return E.164
  or a typed error.
- **Permissions:** actions are named `<domain>.<verb>` (e.g. `payments.record`, `payments.reverse`,
  `scores.enter`, `report_cards.publish`). The map is the one place roles are defined. The API
  enforces it; the web uses it only to hide UI.
- Everything here is pure and has unit tests (table-driven for money, phone and permissions).
- Changing an exported schema is a contract change: update the API, web and worker in the same change.
