# Project notes

Running notes that carry across sprints: decisions made in discussion, conventions that aren't
obvious from the code, and things later sprints will need. Rules live in `CLAUDE.md`; longer
reasoning lives in `docs/decisions/`. Update this file as decisions happen, not only at sprint end.

## Carried forward / open items

- **Admission number format:** not decided. The seed uses a temporary `YYYY/NNNN`.
- **2FA** for `owner`, `head`, `bursar`, `admin`, `system_admin`: deferred to Sprint 10.
- **Device id:** `app.device_id` stays empty until the `devices` table arrives (Sprint 4).
- **Boarders** are `enrolments.is_boarder` in the current year (the seed sets it for JHS 3).
  Housemasters see these students. Houses and beds come in Phase 4.
- **Creating, archiving and linking** students/guardians: not built yet. Linking guardians and
  siblings comes in Sprint 3; creating students comes with import (Sprint 5).
- **Money permissions are coarse** (`fees.read`, `fees.manage`, `payments.read`,
  `payments.record`, `payments.reverse`; owner, head and bursar only). Split them in Sprints 6–7,
  e.g. who reverses payments and who approves discounts (still an open question in CLAUDE.md).
- **Student fields not editable through PATCH /students:** admission number (server-assigned),
  status (changes with enrolment: promotion/withdrawal flows), `admitted_on`, photo (Sprint 3).
- **Medical notes:** read-only in Sprint 2 (inside student detail). Adding/editing comes with the
  Sprint 3 profile screen.

## Sprint 0: Toolkit and first deploy

- API on Render (Docker, Frankfurt), web as a Cloudflare Worker serving static files. Steps in
  `docs/runbooks/deploy.md`.
- Routes that need no sign-in are marked with `config: { public: true }` (e.g. `/health`).
- CI (`.github/workflows/ci.yml`) runs format check, typecheck, lint, test and build on every PR,
  with a throwaway Postgres 17 for the database tests.

## Sprint 1: Data model

- Decisions and exceptions to the standard columns: `docs/decisions/0001-data-model.md`.
- **Audit actor:** triggers read `app.user_id` / `app.device_id`, set per transaction with
  `set_config(..., true)`. `audit_log` is append-only.
- **System user:** one per school (`users.is_system`). The actor for seeds and background jobs.
- **Data API lockout:** RLS on with no policies, `anon`/`authenticated` have no grants. Every new
  table's migration must do the same.
- **Tests:** database tests use the local Docker Postgres (`pnpm db:test:up`, `TEST_DATABASE_URL`,
  must be localhost). Helpers in `packages/db/src/test/database.ts`: `connectTestDb`,
  `inRollback`, `seedLookup`.
- **Seed fixtures** (`packages/db/src/seed/fixtures.ts`) are hand-written people with known names
  for exact-row tests, e.g. Kofi Darkwa = form teacher of Basic 4A; Kwesi Anan = teaches Maths and
  Science in Basic 5–6, form teacher of none.
- Form teacher is `classes.form_teacher_staff_id`; who teaches what is `staff_assignments`.

## Sprint 2: Secure API

Decisions from the planning discussion:

- **Logins:** email or phone + password (Supabase Auth). Accounts are created by an admin, already
  confirmed (no SMS needed). In dev a script creates one login per role; it refuses production.
- **Token check:** verified locally against Supabase's JWKS with `jose`. Tests sign their own
  tokens with a local key; CI never calls Supabase.
- **Out of scope = 403, not 404.** Shows the record exists, but the user can't see it. Money
  routes are 403 for teachers.
- **Current academic year** = the latest year whose `starts_on` ≤ today in `Africa/Accra`. During
  the holiday gap, last year's classes stay visible.
- **Teacher scope comes from the data**; roles stay in `user_roles`:
  - `class_teacher`: read + edit in classes where they're form teacher (current year).
  - `subject_teacher`: read only, in classes from their `staff_assignments` (current year).
  - A role with no matching classes sees nothing.
- **Class teachers edit contact details only** (guardian phone, WhatsApp, email, address,
  occupation…). Not admission number, date of birth, status, class or names.
- **Who can do what:**

  | Role | Students | Guardians | Medical notes | Money |
  | --- | --- | --- | --- | --- |
  | owner, head | read + edit all | read + edit all | read | yes |
  | admin | read + edit all | read + edit all | read | no |
  | bursar | read all | read all | no | yes |
  | class_teacher | read form class | read + edit contact details of form class's guardians | form class | no |
  | subject_teacher | read taught classes | no | no | no |
  | housemaster | read boarders | read boarders' guardians | boarders | no |
  | system_admin | no | no | no | no |

- **Money actions** are in the permissions map already, even though no money routes exist yet.
- **Search:** case-insensitive name and admission number, plus guardian phone in any common Ghana
  format. No `pg_trgm`.
- **Lists** show active students by default, with a filter for the rest.
- **Edits:** last write wins; the old value is in `audit_log`.
- **No actor, no write:** the database refuses audited changes when `app.user_id` isn't set.
  Seeds and jobs use the System user.

Decided while building:

- **Class teachers edit no student fields**, only guardians' contact details. They may edit a
  guardian linked to their class even if that guardian also has a child in another class.
- **A guardian's children list** only shows the children the caller may see.
- **Archived student → 409** (`archived`) on edit. Archived guardians are treated as not found.
- **A valid Supabase login with no linked `users` row → 403** ("not linked to a staff account"),
  not 401, because signing in again won't help. The System user can never sign in.

How it works (things later sprints build on):

- **Permissions:** `packages/shared/src/permissions.ts`. `PERMISSIONS` = role → actions;
  `REACH` = role → which students its actions reach (`school`, `form_classes`, `taught_classes`,
  `boarders`). A user with several roles gets the union, per action.
- **Every route declares `config: { permission }`** (or `public: true`). The app throws at
  startup if a route has neither. `permission` can be a list: any one is enough, and the service
  decides what each allows (see `PATCH /guardians/:id`).
- **Request flow:** `plugins/auth.ts` checks the token (401), loads the user, roles, current
  year and teacher classes, then checks the route's permission (403). Services then check reach
  with `studentReach(user, action)` from `apps/api/src/access.ts`: unknown id → 404, out of
  reach → 403.
- **Writes** go through `withActor(db, { userId }, tx => …)` from `@school-mgmt/db`.
- **`now` is injectable** in `buildApp(env, { db, jwks, now })`; tests fix it to 15/10/2026.
- **Tests:** API tests have their own database, `school_mgmt_test_api`, on the
  `TEST_DATABASE_URL` server, so they can run in parallel with the db tests. Test helpers for
  other packages come from `@school-mgmt/db/testing`. `inRollback` acts as the System user unless
  told `{ actor: null }`. API test tokens are signed with a local key; `sub` = `users.id`.
- **Dev logins:** `pnpm auth:dev-logins` (needs `SUPABASE_SECRET_KEY` and `DEV_LOGIN_PASSWORD`
  in `apps/api/.env`). Re-run after every `pnpm db:reset`: it relinks by email.
- **Deploy:** the API now needs `DATABASE_URL` and `SUPABASE_URL` on Render. The Docker image
  bundles our workspace packages into `dist`, so any npm package they import (drizzle-orm,
  postgres, libphonenumber-js, zod) must also be a direct dependency of `apps/api`.
