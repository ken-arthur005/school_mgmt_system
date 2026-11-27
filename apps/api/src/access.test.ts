import type { StaffRole } from '@school-mgmt/shared';
import { describe, expect, test } from 'vitest';
import { type AuthUser, studentReach } from './access';

const user = (roles: StaffRole[]): AuthUser => ({
  userId: 'u',
  schoolId: 's',
  roles,
  staffId: 'st',
  academicYearId: 'y',
  formClassIds: ['form-4a'],
  taughtClassIds: ['form-4a', 'math-5a'],
});

describe('studentReach', () => {
  test.each([
    { roles: ['head'], action: 'students.read', expected: { kind: 'all' } },
    { roles: ['bursar'], action: 'students.read', expected: { kind: 'all' } },
    { roles: ['admin', 'class_teacher'], action: 'students.read', expected: { kind: 'all' } },
    {
      roles: ['class_teacher'],
      action: 'students.read',
      expected: { kind: 'limited', academicYearId: 'y', classIds: ['form-4a'], boarders: false },
    },
    {
      roles: ['class_teacher', 'subject_teacher'],
      action: 'students.read',
      expected: {
        kind: 'limited',
        academicYearId: 'y',
        classIds: ['form-4a', 'math-5a'],
        boarders: false,
      },
    },
    {
      // Subject teaching doesn't reach guardians, so only the form class counts.
      roles: ['class_teacher', 'subject_teacher'],
      action: 'guardians.read',
      expected: { kind: 'limited', academicYearId: 'y', classIds: ['form-4a'], boarders: false },
    },
    {
      roles: ['housemaster'],
      action: 'medical_notes.read',
      expected: { kind: 'limited', academicYearId: 'y', classIds: [], boarders: true },
    },
    { roles: ['subject_teacher'], action: 'guardians.read', expected: null },
    { roles: ['class_teacher'], action: 'payments.record', expected: null },
    { roles: ['class_teacher'], action: 'students.edit', expected: null },
    { roles: ['system_admin'], action: 'students.read', expected: null },
    { roles: [], action: 'students.read', expected: null },
  ] satisfies { roles: StaffRole[]; action: Parameters<typeof studentReach>[1]; expected: unknown }[])(
    '$roles → $action',
    ({ roles, action, expected }) => {
      expect(studentReach(user(roles), action)).toEqual(expected);
    },
  );
});
