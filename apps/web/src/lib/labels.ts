import type {
  EmploymentType,
  Relationship,
  Religion,
  Sex,
  StaffRole,
  StudentStatus,
} from '@school-mgmt/shared';

// The plain words shown for stored values.

export const SEX_LABELS: Record<Sex, string> = { male: 'Male', female: 'Female' };

export const STATUS_LABELS: Record<StudentStatus, string> = {
  active: 'In school',
  withdrawn: 'Withdrawn',
  graduated: 'Completed',
  transferred: 'Transferred',
};

export const RELIGION_LABELS: Record<Religion, string> = {
  christian: 'Christian',
  muslim: 'Muslim',
  traditional: 'Traditional',
  other: 'Other',
  prefer_not_to_say: 'Prefer not to say',
};

export const RELATIONSHIP_LABELS: Record<Relationship, string> = {
  mother: 'Mother',
  father: 'Father',
  grandmother: 'Grandmother',
  grandfather: 'Grandfather',
  aunt: 'Aunt',
  uncle: 'Uncle',
  sibling: 'Brother or sister',
  guardian: 'Guardian',
  other: 'Other',
};

export const ROLE_LABELS: Record<StaffRole, string> = {
  owner: 'Proprietress',
  head: 'Head teacher',
  admin: 'Front office',
  bursar: 'Bursar',
  class_teacher: 'Class teacher',
  subject_teacher: 'Subject teacher',
  housemaster: 'Housemaster',
  system_admin: 'System administrator',
};

export const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
};

export const fullName = (person: {
  firstName: string;
  otherNames?: string | null;
  surname: string;
}): string =>
  [person.firstName, person.otherNames, person.surname].filter((part) => part).join(' ');
