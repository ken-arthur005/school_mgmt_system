import { z } from 'zod';
import type { StaffRole } from './enums';

/**
 * Everything the API can be asked to do, named `<domain>.<verb>`. The API enforces these;
 * the web app only uses them to hide buttons.
 */
export const ACTIONS = [
  // Using the app at all: your own name, roles, home screen and photo.
  'profile.use',
  'students.read',
  'students.edit',
  'guardians.read',
  // Every guardian field, including names.
  'guardians.edit',
  // Contact details only (phones, email, address, occupation). Class teachers have this.
  'guardians.edit_contact',
  'medical_notes.read',
  'medical_notes.edit',
  // Linking guardians to students, including the main contact and WhatsApp consent.
  'guardians.link',
  // Photos of students and guardians.
  'photos.edit',
  'families.read',
  'families.manage',
  'staff.read',
  // Photos of other members of staff (everyone may change their own).
  'staff.photo',
  // Money. Kept coarse until fees and payments are built (Sprints 6–7).
  'fees.read',
  'fees.manage',
  'payments.read',
  'payments.record',
  'payments.reverse',
] as const;
export const actionSchema = z.enum(ACTIONS);
export type Action = z.infer<typeof actionSchema>;

const MONEY: readonly Action[] = [
  'fees.read',
  'fees.manage',
  'payments.read',
  'payments.record',
  'payments.reverse',
];

const STUDENT_RECORDS: readonly Action[] = [
  'students.read',
  'students.edit',
  'guardians.read',
  'guardians.edit',
  'guardians.edit_contact',
  'medical_notes.read',
];

/** What the school office does on top of reading and editing records. */
const OFFICE: readonly Action[] = [
  ...STUDENT_RECORDS,
  'medical_notes.edit',
  'guardians.link',
  'photos.edit',
  'families.read',
  'families.manage',
  'staff.read',
  'staff.photo',
];

/** The one place roles get their powers. */
export const PERMISSIONS: Readonly<Record<StaffRole, readonly Action[]>> = {
  owner: ['profile.use', ...OFFICE, ...MONEY],
  head: ['profile.use', ...OFFICE, ...MONEY],
  admin: ['profile.use', ...OFFICE],
  bursar: ['profile.use', 'students.read', 'guardians.read', 'families.read', ...MONEY],
  class_teacher: [
    'profile.use',
    'students.read',
    'guardians.read',
    'guardians.edit_contact',
    'medical_notes.read',
    'photos.edit',
  ],
  subject_teacher: ['profile.use', 'students.read'],
  housemaster: ['profile.use', 'students.read', 'guardians.read', 'medical_notes.read'],
  // Settings and user management arrive with the setup screens (Sprint 5).
  system_admin: ['profile.use'],
};

/**
 * Which students a role's permissions reach:
 * - `school`: every student in the school
 * - `form_classes`: classes this year where the user is form teacher
 * - `taught_classes`: classes this year where the user teaches a subject (`staff_assignments`)
 * - `boarders`: students boarding this year
 * A user with several roles gets the union, per action.
 */
export const ROLE_REACH = ['school', 'form_classes', 'taught_classes', 'boarders'] as const;
export type RoleReach = (typeof ROLE_REACH)[number];

export const REACH: Readonly<Record<StaffRole, RoleReach>> = {
  owner: 'school',
  head: 'school',
  admin: 'school',
  bursar: 'school',
  class_teacher: 'form_classes',
  subject_teacher: 'taught_classes',
  housemaster: 'boarders',
  system_admin: 'school',
};

/** True when at least one of the roles allows the action (ignoring which students it reaches). */
export function can(roles: readonly StaffRole[], action: Action): boolean {
  return roles.some((role) => PERMISSIONS[role].includes(action));
}

/** The distinct reaches that give these roles this action. Empty means "not allowed at all". */
export function reachFor(roles: readonly StaffRole[], action: Action): RoleReach[] {
  const reaches = roles
    .filter((role) => PERMISSIONS[role].includes(action))
    .map((role) => REACH[role]);
  return [...new Set(reaches)];
}
