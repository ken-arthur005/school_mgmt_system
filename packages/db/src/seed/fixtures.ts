import type { Relationship, Sex } from '@school-mgmt/shared';

// Hand-written people with known names, so the practice-query tests can assert exact rows.
// Their surnames never appear in the generated name lists.

export const FIXTURE_STAFF = {
  /** Teaches Mathematics and Science in Basic 5A, 5B, 6A and 6B; form teacher of none. */
  kwesiAnan: { firstName: 'Kwesi', surname: 'Anan', sex: 'male', phone: '+233244000201' },
  /** Form teacher of Basic 4A; also a parent (Abena Darkwa, KG 2A). */
  kofiDarkwa: { firstName: 'Kofi', surname: 'Darkwa', sex: 'male', phone: '+233244000202' },
  /** Twi teacher (Basic 1 to JHS 3); also a parent (Yaw Sakyi, Basic 4A). */
  adwoaSakyi: { firstName: 'Adwoa', surname: 'Sakyi', sex: 'female', phone: '+233244000203' },
} as const satisfies Record<
  string,
  { firstName: string; surname: string; sex: Sex; phone: string }
>;

export type FixtureStaffKey = keyof typeof FIXTURE_STAFF;

export interface FixtureGuardian {
  firstName: string;
  surname: string;
  relationship: Relationship;
  phone: string;
  isMainContact: boolean;
  /** Set when this guardian is also a member of staff (and so has a login). */
  staff?: FixtureStaffKey;
}

export interface FixtureStudent {
  firstName: string;
  surname: string;
  sex: Sex;
  levelCode: string;
  stream: string | null;
}

export interface FixtureFamily {
  /** Set when the children belong to one family record (brothers and sisters). */
  familyName?: string;
  guardians: readonly FixtureGuardian[];
  students: readonly FixtureStudent[];
}

export const FIXTURE_FAMILIES = {
  /** Three children, two guardians: shows up in "guardians with 3+ children". */
  asamoah: {
    familyName: 'Asamoah family',
    guardians: [
      {
        firstName: 'Kwabena',
        surname: 'Asamoah',
        relationship: 'father',
        phone: '+233244000101',
        isMainContact: false,
      },
      {
        firstName: 'Akosua',
        surname: 'Asamoah',
        relationship: 'mother',
        phone: '+233244000102',
        isMainContact: true,
      },
    ],
    students: [
      { firstName: 'Ama', surname: 'Asamoah', sex: 'female', levelCode: 'JHS2', stream: null },
      { firstName: 'Kwame', surname: 'Asamoah', sex: 'male', levelCode: 'B4', stream: 'A' },
      { firstName: 'Yaa', surname: 'Asamoah', sex: 'female', levelCode: 'KG1', stream: 'B' },
    ],
  },
  kuffour: {
    familyName: 'Kuffour family',
    guardians: [
      {
        firstName: 'Abena',
        surname: 'Kuffour',
        relationship: 'mother',
        phone: '+233244000103',
        isMainContact: true,
      },
    ],
    students: [
      { firstName: 'Kofi', surname: 'Kuffour', sex: 'male', levelCode: 'JHS2', stream: null },
      { firstName: 'Esi', surname: 'Kuffour', sex: 'female', levelCode: 'B1', stream: 'A' },
    ],
  },
  /** Data-quality case: two guardians, but nobody marked as the main contact. */
  dapaah: {
    guardians: [
      {
        firstName: 'Kwaku',
        surname: 'Dapaah',
        relationship: 'father',
        phone: '+233244000104',
        isMainContact: false,
      },
      {
        firstName: 'Efua',
        surname: 'Dapaah',
        relationship: 'mother',
        phone: '+233244000105',
        isMainContact: false,
      },
    ],
    students: [
      { firstName: 'Akua', surname: 'Dapaah', sex: 'female', levelCode: 'JHS2', stream: null },
    ],
  },
  /** Data-quality case: no guardian recorded at all. */
  boadu: {
    guardians: [],
    students: [{ firstName: 'Kojo', surname: 'Boadu', sex: 'male', levelCode: 'B2', stream: 'B' }],
  },
  sakyi: {
    guardians: [
      {
        firstName: 'Adwoa',
        surname: 'Sakyi',
        relationship: 'mother',
        phone: FIXTURE_STAFF.adwoaSakyi.phone,
        isMainContact: true,
        staff: 'adwoaSakyi',
      },
    ],
    students: [{ firstName: 'Yaw', surname: 'Sakyi', sex: 'male', levelCode: 'B4', stream: 'A' }],
  },
  /** Comfort Wiredu also looks after Kobby Nkansah (see FIXTURE_WARDS). */
  wiredu: {
    familyName: 'Wiredu family',
    guardians: [
      {
        firstName: 'Comfort',
        surname: 'Wiredu',
        relationship: 'mother',
        phone: '+233244000106',
        isMainContact: true,
      },
    ],
    students: [
      { firstName: 'Nana', surname: 'Wiredu', sex: 'male', levelCode: 'B3', stream: 'A' },
      { firstName: 'Adjoa', surname: 'Wiredu', sex: 'female', levelCode: 'N2', stream: 'A' },
    ],
  },
  /** His father travelled; the main contact is a carer who is not family. */
  nkansah: {
    familyName: 'Nkansah family',
    guardians: [
      {
        firstName: 'Yaw',
        surname: 'Nkansah',
        relationship: 'father',
        phone: '+233244000107',
        isMainContact: false,
      },
    ],
    students: [
      { firstName: 'Kobby', surname: 'Nkansah', sex: 'male', levelCode: 'B3', stream: 'A' },
    ],
  },
  darkwa: {
    guardians: [
      {
        firstName: 'Kofi',
        surname: 'Darkwa',
        relationship: 'father',
        phone: FIXTURE_STAFF.kofiDarkwa.phone,
        isMainContact: true,
        staff: 'kofiDarkwa',
      },
    ],
    students: [
      { firstName: 'Abena', surname: 'Darkwa', sex: 'female', levelCode: 'KG2', stream: 'A' },
    ],
  },
} as const satisfies Record<string, FixtureFamily>;

/** A guardian looking after a child of another family: linked to them, but not their relation. */
export const FIXTURE_WARDS = [
  {
    guardianPhone: '+233244000106',
    student: { firstName: 'Kobby', surname: 'Nkansah' },
    relationship: 'guardian',
    isMainContact: true,
  },
] as const satisfies readonly {
  guardianPhone: string;
  student: { firstName: string; surname: string };
  relationship: Relationship;
  isMainContact: boolean;
}[];

export const FIXTURE_PHONES: readonly string[] = [
  ...Object.values(FIXTURE_STAFF).map((person) => person.phone),
  ...Object.values(FIXTURE_FAMILIES).flatMap((family) =>
    family.guardians.map((guardian: FixtureGuardian) => guardian.phone),
  ),
];
