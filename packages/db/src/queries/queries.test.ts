import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { Db } from '../client';
import { connectTestDb, seedLookup } from '../test/database';
import {
  countEnrolmentsByClass,
  countEnrolmentsByLevel,
  findSiblings,
  getClassList,
  getTermForDate,
  listClassTeachers,
  listFormTeachers,
  listGuardiansWithManyChildren,
  listLevelStudentsWithMainGuardian,
  listStudentsWithoutMainContact,
  listTeacherAssignments,
  searchStudents,
} from './index';

// The ten practice queries, run against the seeded demo school. Exact assertions use the
// hand-written fixture families (src/seed/fixtures.ts); counts come from the school plan.

const connection = connectTestDb();
const db: Db = connection.db;
const find = seedLookup(db);
let schoolId: string;
let currentYearId: string;

const fullNames = (rows: readonly { firstName: string; surname: string }[]) =>
  rows.map((row) => `${row.firstName} ${row.surname}`);

beforeAll(async () => {
  schoolId = await find.schoolId();
  currentYearId = await find.academicYearId('2026/2027');
});

afterAll(async () => {
  await connection.close();
});

describe('1. students in a level with their main guardian’s phone', () => {
  test('all of JHS 2, each with the main contact’s number', async () => {
    const rows = await listLevelStudentsWithMainGuardian(db, {
      schoolId,
      academicYearId: currentYearId,
      levelCode: 'JHS2',
    });

    expect(rows).toHaveLength(66);
    expect(new Set(rows.map((row) => row.className))).toEqual(new Set(['JHS 2']));
    const byName = new Map(rows.map((row) => [`${row.firstName} ${row.surname}`, row]));
    expect(byName.get('Ama Asamoah')).toMatchObject({
      guardianFirstName: 'Akosua',
      guardianPhone: '+233244000102',
    });
    expect(byName.get('Kofi Kuffour')).toMatchObject({ guardianPhone: '+233244000103' });
    // No main contact recorded, so the student is still listed, without a phone.
    expect(byName.get('Akua Dapaah')).toMatchObject({ guardianId: null, guardianPhone: null });
    expect(rows.filter((row) => row.guardianPhone === null)).toHaveLength(1);
  });
});

describe('2. class list', () => {
  test('Basic 4A, sorted by surname then first name', async () => {
    const classId = await find.classId(currentYearId, 'Basic 4A');
    const rows = await getClassList(db, { schoolId, classId });

    expect(rows).toHaveLength(35);
    expect(fullNames(rows)).toEqual(expect.arrayContaining(['Kwame Asamoah', 'Yaw Sakyi']));
    const sorted = [...rows].sort(
      (a, b) =>
        a.surname.localeCompare(b.surname, 'en') || a.firstName.localeCompare(b.firstName, 'en'),
    );
    expect(fullNames(rows)).toEqual(fullNames(sorted));
  });

  test('JHS 3 students all board', async () => {
    const classId = await find.classId(currentYearId, 'JHS 3');
    const rows = await getClassList(db, { schoolId, classId });
    expect(rows).toHaveLength(65);
    expect(rows.every((row) => row.isBoarder)).toBe(true);
  });
});

describe('3. enrolment counts', () => {
  test('per class this year: 24 classes, 917 students, boys + girls = total', async () => {
    const rows = await countEnrolmentsByClass(db, { schoolId, academicYearId: currentYearId });

    expect(rows).toHaveLength(24);
    expect(rows.reduce((sum, row) => sum + row.total, 0)).toBe(917);
    const byClass = new Map(rows.map((row) => [row.className, row.total]));
    expect(byClass.get('Creche')).toBe(20);
    expect(byClass.get('Basic 4A')).toBe(35);
    expect(byClass.get('JHS 2')).toBe(66);
    expect(rows.every((row) => row.boys + row.girls === row.total)).toBe(true);
    expect(rows[0]?.className).toBe('Creche');
    expect(rows.at(-1)?.className).toBe('JHS 3');
  });

  test('per level this year', async () => {
    const rows = await countEnrolmentsByLevel(db, { schoolId, academicYearId: currentYearId });

    expect(rows.map((row) => row.levelCode)).toEqual([
      'CRECHE',
      'N1',
      'N2',
      'KG1',
      'KG2',
      'B1',
      'B2',
      'B3',
      'B4',
      'B5',
      'B6',
      'JHS1',
      'JHS2',
      'JHS3',
    ]);
    const byLevel = new Map(rows.map((row) => [row.levelCode, row.total]));
    expect(byLevel.get('B4')).toBe(70);
    expect(byLevel.get('JHS3')).toBe(65);
  });

  test('last year’s classes are kept (history survives promotion)', async () => {
    const previousYearId = await find.academicYearId('2025/2026');
    const rows = await countEnrolmentsByClass(db, { schoolId, academicYearId: previousYearId });
    expect(rows).toHaveLength(24);
    expect(rows.every((row) => row.total > 0)).toBe(true);
    // Last year's JHS 3 all graduated, and still show on last year's roll.
    expect(rows.find((row) => row.className === 'JHS 3')?.total).toBeGreaterThanOrEqual(60);
  });
});

describe('4. siblings', () => {
  test('children sharing a guardian', async () => {
    const ama = await find.student('Ama', 'Asamoah');
    const rows = await findSiblings(db, { schoolId, studentId: ama.id });
    expect(fullNames(rows)).toEqual(['Kwame Asamoah', 'Yaa Asamoah']);
  });

  test.each([
    ['Akua', 'Dapaah'],
    ['Kojo', 'Boadu'],
  ])('an only child (%s %s) has none', async (firstName, surname) => {
    const student = await find.student(firstName, surname);
    expect(await findSiblings(db, { schoolId, studentId: student.id })).toEqual([]);
  });
});

describe('5. guardians with 3 or more children in school', () => {
  test('includes both Asamoah parents, excludes a parent of two', async () => {
    const rows = await listGuardiansWithManyChildren(db, { schoolId, minChildren: 3 });

    expect(rows.every((row) => row.childCount >= 3)).toBe(true);
    const names = fullNames(rows);
    expect(names).toEqual(expect.arrayContaining(['Kwabena Asamoah', 'Akosua Asamoah']));
    expect(names).not.toContain('Abena Kuffour');
    expect(
      rows.find((row) => row.firstName === 'Akosua' && row.surname === 'Asamoah')?.childCount,
    ).toBe(3);
  });
});

describe('6. students without a main contact', () => {
  test('exactly the two fixture data-quality cases', async () => {
    const rows = await listStudentsWithoutMainContact(db, { schoolId });
    expect(fullNames(rows)).toEqual(['Kojo Boadu', 'Akua Dapaah']);
  });
});

describe('7. form teachers and who teaches a class', () => {
  test('every class this year has a form teacher', async () => {
    const rows = await listFormTeachers(db, { schoolId, academicYearId: currentYearId });

    expect(rows).toHaveLength(24);
    expect(rows.every((row) => row.staffId !== null)).toBe(true);
    const basic4a = rows.find((row) => row.className === 'Basic 4A');
    expect(basic4a).toMatchObject({ firstName: 'Kofi', surname: 'Darkwa' });
  });

  test('Basic 4A: the form teacher teaches most subjects; specialists take the languages', async () => {
    const classId = await find.classId(currentYearId, 'Basic 4A');
    const rows = await listClassTeachers(db, { schoolId, classId });

    const darkwa = rows.filter((row) => row.surname === 'Darkwa');
    expect(darkwa.map((row) => row.subjectCode).sort()).toEqual(
      ['CA', 'COMP', 'ENG', 'HIST', 'MATH', 'OWOP', 'PE', 'RME', 'SCI'].sort(),
    );
    expect(darkwa.every((row) => row.isFormTeacher)).toBe(true);

    const sakyi = rows.filter((row) => row.surname === 'Sakyi');
    expect(sakyi).toEqual([expect.objectContaining({ subjectCode: 'TWI', isFormTeacher: false })]);
    expect(rows.map((row) => row.subjectCode).sort()).toEqual(
      ['CA', 'COMP', 'DAG', 'ENG', 'FRE', 'HIST', 'MATH', 'OWOP', 'PE', 'RME', 'SCI', 'TWI'].sort(),
    );
  });
});

describe('8. a teacher’s classes and subjects', () => {
  test('Kwesi Anan teaches Maths and Science in Basic 5 and 6, and is nobody’s form teacher', async () => {
    const staffId = await find.staffId('Kwesi', 'Anan');
    const rows = await listTeacherAssignments(db, {
      schoolId,
      staffId,
      academicYearId: currentYearId,
    });

    expect(rows.map((row) => `${row.className} ${row.subjectCode}`)).toEqual([
      'Basic 5A MATH',
      'Basic 5A SCI',
      'Basic 5B MATH',
      'Basic 5B SCI',
      'Basic 6A MATH',
      'Basic 6A SCI',
      'Basic 6B MATH',
      'Basic 6B SCI',
    ]);
    expect(rows.some((row) => row.isFormTeacher)).toBe(false);
  });
});

describe('9. search', () => {
  test.each([
    ['surname', 'asamoah', ['Ama Asamoah', 'Kwame Asamoah', 'Yaa Asamoah']],
    ['first name and surname', 'ama asamoah', ['Ama Asamoah']],
    ['guardian phone', '+233244000101', ['Ama Asamoah', 'Kwame Asamoah', 'Yaa Asamoah']],
    ['blank', '   ', []],
    ['LIKE wildcards are literal', '%', []],
  ])('by %s', async (_label, term, expected) => {
    const rows = await searchStudents(db, { schoolId, term });
    expect(fullNames(rows).sort()).toEqual([...expected].sort());
  });

  test('by admission number', async () => {
    const kofi = await find.student('Kofi', 'Kuffour');
    const rows = await searchStudents(db, { schoolId, term: kofi.admissionNumber });
    expect(fullNames(rows)).toEqual(['Kofi Kuffour']);
  });
});

describe('10. term for a date', () => {
  test.each([
    ['2026-11-26', { academicYearName: '2026/2027', termNumber: 1, inMidTermBreak: false }],
    ['2026-09-07', { academicYearName: '2026/2027', termNumber: 1, inMidTermBreak: false }],
    ['2026-10-23', { academicYearName: '2026/2027', termNumber: 1, inMidTermBreak: true }],
    ['2027-07-23', { academicYearName: '2026/2027', termNumber: 3, inMidTermBreak: false }],
    ['2026-03-10', { academicYearName: '2025/2026', termNumber: 2, inMidTermBreak: false }],
  ])('%s', async (date, expected) => {
    expect(await getTermForDate(db, { schoolId, date })).toMatchObject(expected);
  });

  test.each(['2026-12-25', '2026-08-15'])('%s is in the holidays', async (date) => {
    expect(await getTermForDate(db, { schoolId, date })).toBeNull();
  });
});
