import { uuidv7 } from '@school-mgmt/shared';
import { and, eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { Db, Tx } from '../client';
import { TABLE_NAMES } from '../maintenance';
import { connectTestDb, inRollback, seedLookup } from '../test/database';
import {
  auditLog,
  classes,
  enrolments,
  guardians,
  staffAssignments,
  studentGuardians,
  subjects,
  users,
} from './index';

// The database itself refuses bad data and keeps history, whatever the app does.
// Every test runs in a rolled-back transaction, so the seed is never changed.

const connection = connectTestDb();
const db: Db = connection.db;
const find = seedLookup(db);
let schoolId: string;
let systemUserId: string;

beforeAll(async () => {
  schoolId = await find.schoolId();
  const [system] = await db.select({ id: users.id }).from(users).where(eq(users.isSystem, true));
  if (system === undefined) throw new Error('Seed has no system user');
  systemUserId = system.id;
});

afterAll(async () => {
  await connection.close();
});

async function mainGuardianOf(tx: Tx, firstName: string, surname: string) {
  const student = await find.student(firstName, surname);
  const [row] = await tx
    .select({ guardian: guardians })
    .from(studentGuardians)
    .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
    .where(
      and(eq(studentGuardians.studentId, student.id), eq(studentGuardians.isMainContact, true)),
    );
  if (row === undefined) throw new Error('No main guardian');
  return { student, guardian: row.guardian };
}

/** Postgres error details sit on the driver error, which Drizzle wraps as `cause`. */
const violates = (constraint: string) => ({ cause: { constraint_name: constraint } });

describe('audit trail', () => {
  test('a guardian phone change is recorded with old value, new value, actor and device', async () => {
    await inRollback(db, async (tx) => {
      const { guardian } = await mainGuardianOf(tx, 'Ama', 'Asamoah');
      const deviceId = uuidv7();
      await tx.execute(sql`select set_config('app.user_id', ${systemUserId}, true)`);
      await tx.execute(sql`select set_config('app.device_id', ${deviceId}, true)`);

      await tx
        .update(guardians)
        .set({ primaryPhone: '+233209999999' })
        .where(eq(guardians.id, guardian.id));

      const entries = await tx.select().from(auditLog).where(eq(auditLog.rowId, guardian.id));
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        schoolId,
        tableName: 'guardians',
        operation: 'UPDATE',
        oldData: { primary_phone: '+233244000102' },
        newData: { primary_phone: '+233209999999' },
        actorUserId: systemUserId,
        deviceId,
      });
    });
  });

  test('an update that changes nothing is not recorded', async () => {
    await inRollback(db, async (tx) => {
      const { guardian } = await mainGuardianOf(tx, 'Ama', 'Asamoah');
      await tx
        .update(guardians)
        .set({ primaryPhone: guardian.primaryPhone })
        .where(eq(guardians.id, guardian.id));
      expect(await tx.select().from(auditLog).where(eq(auditLog.rowId, guardian.id))).toEqual([]);
    });
  });

  test('updated_at moves on every change', async () => {
    await inRollback(db, async (tx) => {
      const { guardian } = await mainGuardianOf(tx, 'Ama', 'Asamoah');
      // now() is fixed for a transaction, so compare with the seeded value.
      const [updated] = await tx
        .update(guardians)
        .set({ occupation: 'Nurse' })
        .where(eq(guardians.id, guardian.id))
        .returning({ updatedAt: guardians.updatedAt });
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(guardian.updatedAt.getTime());
    });
  });

  test.each(['UPDATE', 'DELETE'])('audit_log refuses %s', async (operation) => {
    await inRollback(db, async (tx) => {
      const { guardian } = await mainGuardianOf(tx, 'Ama', 'Asamoah');
      await tx.update(guardians).set({ occupation: 'Banker' }).where(eq(guardians.id, guardian.id));
      const change =
        operation === 'UPDATE'
          ? tx
              .update(auditLog)
              .set({ tableName: 'tampered' })
              .where(eq(auditLog.rowId, guardian.id))
          : tx.delete(auditLog).where(eq(auditLog.rowId, guardian.id));
      // insufficient_privilege, raised by reject_audit_log_change().
      await expect(change).rejects.toMatchObject({ cause: { code: '42501' } });
    });
  });
});

describe('constraints', () => {
  test('a guardian phone must be in +233 form', async () => {
    await inRollback(db, async (tx) => {
      const { guardian } = await mainGuardianOf(tx, 'Ama', 'Asamoah');
      await expect(
        tx
          .update(guardians)
          .set({ primaryPhone: '0244000102' })
          .where(eq(guardians.id, guardian.id)),
      ).rejects.toMatchObject(violates('guardians_primary_phone_format'));
    });
  });

  test('a student has at most one main contact', async () => {
    await inRollback(db, async (tx) => {
      const student = await find.student('Ama', 'Asamoah');
      await expect(
        tx
          .update(studentGuardians)
          .set({ isMainContact: true })
          .where(eq(studentGuardians.studentId, student.id)),
      ).rejects.toMatchObject(violates('student_guardians_one_main_contact'));
    });
  });

  test('a teacher can only be given a subject the class takes', async () => {
    await inRollback(db, async (tx) => {
      const yearId = await find.academicYearId('2026/2027');
      const basic1a = await find.classId(yearId, 'Basic 1A');
      const [french] = await tx.select().from(subjects).where(eq(subjects.code, 'FRE'));
      const staffId = await find.staffId('Kwesi', 'Anan');
      await expect(
        tx.insert(staffAssignments).values({
          schoolId,
          createdBy: systemUserId,
          staffId,
          classId: basic1a,
          subjectId: french?.id ?? '',
        }),
      ).rejects.toMatchObject(violates('staff_assignments_class_subject_fk'));
    });
  });

  test('an enrolment’s class must belong to the same academic year', async () => {
    await inRollback(db, async (tx) => {
      const ama = await find.student('Ama', 'Asamoah');
      const previousYearId = await find.academicYearId('2025/2026');
      const currentYearId = await find.academicYearId('2026/2027');
      const lastYearsClass = await find.classId(previousYearId, 'JHS 2');
      await expect(
        tx
          .update(enrolments)
          .set({ classId: lastYearsClass })
          .where(
            and(eq(enrolments.studentId, ama.id), eq(enrolments.academicYearId, currentYearId)),
          ),
      ).rejects.toMatchObject(violates('enrolments_class_year_fk'));
    });
  });

  test('a level has one class per stream per year', async () => {
    await inRollback(db, async (tx) => {
      const yearId = await find.academicYearId('2026/2027');
      const [jhs2] = await tx
        .select()
        .from(classes)
        .where(and(eq(classes.academicYearId, yearId), eq(classes.name, 'JHS 2')));
      if (jhs2 === undefined) throw new Error('No JHS 2');
      await expect(
        tx.insert(classes).values({
          schoolId,
          createdBy: systemUserId,
          academicYearId: yearId,
          levelId: jhs2.levelId,
          stream: null,
          name: 'JHS 2 (copy)',
        }),
      ).rejects.toMatchObject(violates('classes_year_level_stream_key'));
    });
  });
});

describe('Supabase Data API lockout', () => {
  test('row-level security is on for every table', async () => {
    const rows = await db.execute<{ relname: string; relrowsecurity: boolean }>(sql`
      select relname, relrowsecurity from pg_class
      where relnamespace = 'public'::regnamespace and relkind = 'r'
    `);
    const security = new Map(rows.map((row) => [row.relname, row.relrowsecurity]));
    for (const table of TABLE_NAMES) {
      expect({ table, rls: security.get(table) }).toEqual({ table, rls: true });
    }
  });
});

describe('no actor, no change', () => {
  test('an audited change without app.user_id is refused', async () => {
    await inRollback(
      db,
      async (tx) => {
        const { guardian } = await mainGuardianOf(tx, 'Ama', 'Asamoah');
        const change = tx
          .update(guardians)
          .set({ occupation: 'Trader' })
          .where(eq(guardians.id, guardian.id));
        // insufficient_privilege, raised by audit_row_change().
        await expect(change).rejects.toMatchObject({ cause: { code: '42501' } });
      },
      { actor: null },
    );
  });

  test('a table without an audit trigger is not affected', async () => {
    await inRollback(
      db,
      async (tx) => {
        const [subject] = await tx.select().from(subjects).limit(1);
        if (subject === undefined) throw new Error('No subjects');
        await tx.update(subjects).set({ name: 'Renamed' }).where(eq(subjects.id, subject.id));
      },
      { actor: null },
    );
  });
});
