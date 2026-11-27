import { describe, expect, test } from 'vitest';
import { STAFF_ROLES, type StaffRole } from './enums';
import { ACTIONS, type Action, can, reachFor } from './permissions';

const MONEY_ACTIONS: readonly Action[] = [
  'fees.read',
  'fees.manage',
  'payments.read',
  'payments.record',
  'payments.reverse',
];

// The agreed matrix (docs/notes.md, Sprint 2), written out in full so a change to the map has to
// change this table too.
const ALLOWED: Readonly<Record<StaffRole, readonly Action[]>> = {
  owner: ACTIONS,
  head: ACTIONS,
  admin: [
    'students.read',
    'students.edit',
    'guardians.read',
    'guardians.edit',
    'guardians.edit_contact',
    'medical_notes.read',
  ],
  bursar: ['students.read', 'guardians.read', ...MONEY_ACTIONS],
  class_teacher: ['students.read', 'guardians.read', 'guardians.edit_contact', 'medical_notes.read'],
  subject_teacher: ['students.read'],
  housemaster: ['students.read', 'guardians.read', 'medical_notes.read'],
  system_admin: [],
};

const cases = STAFF_ROLES.flatMap((role) =>
  ACTIONS.map((action) => ({ role, action, allowed: ALLOWED[role].includes(action) })),
);

describe('can', () => {
  test.each(cases)('$role → $action: $allowed', ({ role, action, allowed }) => {
    expect(can([role], action)).toBe(allowed);
  });

  test.each(MONEY_ACTIONS)('teachers and housemasters can never %s', (action) => {
    expect(can(['class_teacher', 'subject_teacher', 'housemaster'], action)).toBe(false);
  });

  test('several roles combine', () => {
    expect(can(['subject_teacher'], 'guardians.read')).toBe(false);
    expect(can(['subject_teacher', 'class_teacher'], 'guardians.read')).toBe(true);
  });

  test('no roles, no access', () => {
    expect(ACTIONS.some((action) => can([], action))).toBe(false);
  });
});

describe('reachFor', () => {
  test.each([
    { roles: ['head'], action: 'students.read', reach: ['school'] },
    { roles: ['class_teacher'], action: 'students.read', reach: ['form_classes'] },
    {
      roles: ['class_teacher', 'subject_teacher'],
      action: 'students.read',
      reach: ['form_classes', 'taught_classes'],
    },
    { roles: ['class_teacher', 'subject_teacher'], action: 'guardians.read', reach: ['form_classes'] },
    { roles: ['housemaster'], action: 'medical_notes.read', reach: ['boarders'] },
    { roles: ['subject_teacher'], action: 'medical_notes.read', reach: [] },
    { roles: ['admin', 'class_teacher'], action: 'students.read', reach: ['school', 'form_classes'] },
    { roles: ['class_teacher'], action: 'payments.record', reach: [] },
  ] satisfies { roles: StaffRole[]; action: Action; reach: string[] }[])(
    '$roles → $action reaches $reach',
    ({ roles, action, reach }) => {
      expect(reachFor(roles, action)).toEqual(reach);
    },
  );
});
