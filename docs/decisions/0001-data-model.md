# 0001: Core data model (Sprint 1)

Status: accepted, Sprint 1.

## Context

The first tables cover the school's structure, people and enrolment. A few school-specific rules
shaped them, and some standard conventions have deliberate exceptions. This note records both so
later sprints don't undo them by accident.

## Decisions

**Levels and classes.** Fourteen levels: Creche, Nursery 1–2, KG 1–2, Basic 1–6, JHS 1–3.
Nursery 1 to Basic 6 have streams A and B; Creche and each JHS level are one class. A class
belongs to one academic year (`Basic 4A` in 2025/2026 is a different row from `Basic 4A` in
2026/2027), so promotion never rewrites history.

**Who teaches what vs. who runs the class.** These are two different things:

- `staff_assignments` has one row per (teacher, class, subject). A class teacher who teaches
  everything has a row per subject. A specialist (e.g. Maths and Science in Basic 5–6) has rows
  in several classes. A composite foreign key to `class_subjects` stops anyone being assigned a
  subject the class doesn't take.
- `classes.form_teacher_staff_id` is the one teacher in charge of the class's affairs. A teacher
  may be form teacher of several classes.

The `class_teacher` / `subject_teacher` roles in `user_roles` follow from these: form teachers
get `class_teacher`, and anyone teaching outside their own form class gets `subject_teacher`.
Sprint 2 decides whether the API derives these automatically.

**Ghanaian language.** Twi and Dagaare are separate subjects in the `ghanaian_language`
elective group. Each student's choice is stored per year on `enrolments`
(`ghanaian_language_subject_id`), from Basic 1, so a change of choice keeps last year's record.

**Enrolment status.** `active` this year; at year end `completed`, `graduated` (JHS 3),
`withdrawn` or `transferred`. A class's roll counts active, completed and graduated enrolments.
`enrolments.academic_year_id` repeats the class's year, so "one enrolment per student per year"
is a constraint. A composite foreign key keeps the two consistent.

**Audit.** `audit_row_change()` writes `audit_log` on every insert, update and delete of student
records, guardians, links, enrolments, classes, staff, assignments, users and roles. The actor and
device come from `app.user_id` / `app.device_id`, which the API sets per transaction with
`set_config(..., true)`. `audit_log` is append-only (a trigger rejects UPDATE, DELETE and
TRUNCATE). The dev seed switches the audit triggers off inside its own transaction only.

**Supabase Data API lockout.** RLS is enabled with no policies on every table, and `anon` /
`authenticated` lose all grants. Our API connects as the table owner, which RLS doesn't apply to.
Every new table needs the same treatment in its migration.

## Exceptions to the standard columns

- `schools` has no `school_id` (it _is_ the tenant). Its `created_by` is nullable because the
  school row exists before its first user.
- `users.created_by` is nullable only for the per-school System user (CHECK constraint).
- `audit_log` uses a bigint identity id instead of UUIDv7 (before Postgres 18, triggers can't
  make UUIDv7s, and a sequence gives a strict order) and has no `updated_at`, `created_by` or
  `archived_at`, because rows are never changed.

## Not decided yet

- The school's admission number format. The seed uses a temporary `YYYY/NNNN`.
- Whether writes without `app.user_id` should be refused rather than audited with no actor.
  Sprint 2 sets it on every API transaction.
