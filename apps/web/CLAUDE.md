# apps/web — staff app (React + Vite PWA)

Read the root `CLAUDE.md` first. This file adds rules for the web app only.

## What it is
The single installable app for every staff role (owner, head, admin, bursar, teachers,
housemaster, system admin). Guardians do NOT use this app; they use WhatsApp.
It must work offline: reads come from PowerSync's local SQLite, writes go to the upload queue.

## Structure
```
src/
├─ routes/                # TanStack Router file-based routes (typed params, e.g. students/$studentId)
├─ features/<domain>/     # students, fees, payments, attendance, scores, messaging, dashboard, setup, imports
│  ├─ components/
│  ├─ hooks/              # PowerSync queries (useQuery) and mutations for this domain
│  └─ copy.ts             # plain-English UI strings for this feature
├─ components/ui/         # shadcn/ui components (ours to edit)
├─ components/            # shared app components (AppShell, RoleHome, SyncStatus, SearchBar, PrintLayout)
├─ lib/powersync/         # client schema, database instance, backend connector (fetchCredentials, uploadData)
├─ lib/api.ts             # typed fetch client for online-only endpoints (TanStack Query)
├─ lib/auth/              # Supabase auth session, device PIN lock
└─ env.ts                 # zod-validated VITE_* env
e2e/                      # Playwright tests
```

## Rules
- **Reads:** use PowerSync local queries for data that should work offline. Use TanStack Query
  only for online-only calls (Paystack checkout, assistant, imports, report generation).
- **Writes:** write to the local PowerSync database with client-generated UUIDv7 ids; the
  connector's `uploadData` sends them to the API's `/sync/upload`. Never call Supabase table
  APIs directly for writes.
- **Online-only screens** must detect offline state and show a clear message, not an error.
- **Always show sync state** with the shared `SyncStatus` component.
- **Forms:** react-hook-form + zodResolver with schemas from `@school-mgmt/shared`. Disable submit while
  saving; prevent double submission.
- **Permissions:** use `can(user, action)` from `@school-mgmt/shared` to show or hide UI. This is
  cosmetic only: the API enforces.
- **Role home screens:** each role lands on its own home with 3–4 big task buttons; rare actions go
  behind a "More" menu.
- **Formatting:** always `formatGhs`, `formatDate` (DD/MM/YYYY), `formatGhanaPhone` from shared.
  Never format money by hand.
- **Mobile-first:** design at 360 px first; tap targets ≥ 44 px; test the desktop layout for office roles.
- **Print:** list and document screens have a print layout (CSS `@media print`) or a PDF from the API.
- **Accessibility:** labelled inputs, visible focus, sufficient contrast, keyboard navigable.
- **Performance:** route-level code splitting; avoid heavy libraries; keep the initial bundle small.
- **PWA:** vite-plugin-pwa with prompt-to-update. Never cache API responses with personal data in the
  service worker; PowerSync handles data.
- **No secrets in `VITE_*` variables.**
- **On sign-out:** disconnect and clear the local PowerSync database.

## Tests
- Component/hook logic: Vitest + Testing Library.
- Key flows: Playwright in `e2e/` at a 360 px viewport and a desktop viewport.
