import { describe, expect, test } from 'vitest';
import { generateSeedData } from './generate';

// Pure checks on the generated data (no database). The database tests cover the rest.

const data = generateSeedData();

describe('generateSeedData', () => {
  test('is deterministic: the same seed gives the same people', () => {
    const again = generateSeedData();
    const names = (d: typeof data) =>
      d.students.map((s) => `${s.firstName} ${s.surname} ${s.dateOfBirth}`);
    expect(names(again)).toEqual(names(data));
  });

  test('a different seed gives a different school', () => {
    const other = generateSeedData(1);
    expect(other.students.map((s) => s.firstName)).not.toEqual(
      data.students.map((s) => s.firstName),
    );
  });

  test('917 students on this year’s roll, plus last year’s leavers', () => {
    expect(data.students.filter((s) => s.status === 'active')).toHaveLength(917);
    expect(data.students.filter((s) => s.status === 'graduated')).toHaveLength(60);
  });

  test('54 staff: 50 full-time, 4 part-time', () => {
    expect(data.staff).toHaveLength(54);
    expect(data.staff.filter((s) => s.employmentType === 'part_time')).toHaveLength(4);
  });

  test('admission numbers are unique and follow the temporary YYYY/NNNN format', () => {
    const numbers = data.students.map((s) => s.admissionNumber);
    expect(new Set(numbers).size).toBe(numbers.length);
    expect(numbers.every((n) => /^\d{4}\/\d{4}$/.test(n))).toBe(true);
  });

  test('every guardian has a unique +233 phone', () => {
    const phones = data.guardians.map((g) => g.primaryPhone);
    expect(phones.every((p) => /^\+233\d{9}$/.test(p))).toBe(true);
    expect(new Set(phones).size).toBe(phones.length);
  });

  test('every generated student has exactly one main contact', () => {
    const fixtureCases = new Set(['Akua Dapaah', 'Kojo Boadu']);
    const mainContacts = new Map<string, number>();
    for (const link of data.studentGuardians) {
      if (link.isMainContact) {
        mainContacts.set(link.studentId, (mainContacts.get(link.studentId) ?? 0) + 1);
      }
    }
    for (const student of data.students) {
      const expected = fixtureCases.has(`${student.firstName} ${student.surname}`) ? undefined : 1;
      expect(mainContacts.get(student.id ?? '')).toBe(expected);
    }
  });

  test('Ghanaian language is chosen from Basic 1, never before', () => {
    const levelOfClass = new Map(data.classes.map((c) => [c.id, c.levelId]));
    const codeOfLevel = new Map(data.levels.map((l) => [l.id, l.code]));
    const early = new Set(['CRECHE', 'N1', 'N2', 'KG1', 'KG2']);
    for (const enrolment of data.enrolments) {
      const code = codeOfLevel.get(levelOfClass.get(enrolment.classId) ?? '');
      expect(enrolment.ghanaianLanguageSubjectId === null).toBe(early.has(code ?? ''));
    }
  });
});
