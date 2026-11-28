import {
  type Relationship,
  type Religion,
  type Sex,
  type StaffRole,
  uuidv7,
} from '@school-mgmt/shared';
import type * as schema from '../schema';
import {
  FIXTURE_FAMILIES,
  FIXTURE_PHONES,
  FIXTURE_STAFF,
  FIXTURE_WARDS,
  type FixtureFamily,
  type FixtureStudent,
} from './fixtures';
import {
  AREAS,
  DAGAABA_SURNAMES,
  FEMALE_FIRST_NAMES,
  MALE_FIRST_NAMES,
  MEDICAL_NOTES,
  OCCUPATIONS,
  PHONE_PREFIXES,
  SURNAMES,
} from './names';
import { Random } from './random';
import {
  CURRENT_YEAR,
  className,
  currentClassSize,
  GRADUATED_LAST_YEAR,
  LEVELS,
  type LevelPlan,
  PREVIOUS_YEAR,
  SEED_SCHOOL,
  SUBJECTS,
  subjectCodesFor,
  TRANSFERRED_LAST_YEAR,
  WITHDRAWN_LAST_YEAR,
  type YearPlan,
} from './school-plan';
import { formTeacherPostKey, STAFF_POSTS, teacherPostKey } from './staff-plan';

type Insert<T extends { $inferInsert: unknown }> = T['$inferInsert'];

export interface SeedData {
  school: Insert<typeof schema.schools>;
  systemUser: Insert<typeof schema.users>;
  users: Insert<typeof schema.users>[];
  userRoles: Insert<typeof schema.userRoles>[];
  staff: Insert<typeof schema.staff>[];
  academicYears: Insert<typeof schema.academicYears>[];
  terms: Insert<typeof schema.terms>[];
  levels: Insert<typeof schema.levels>[];
  subjects: Insert<typeof schema.subjects>[];
  classes: Insert<typeof schema.classes>[];
  classSubjects: Insert<typeof schema.classSubjects>[];
  staffAssignments: Insert<typeof schema.staffAssignments>[];
  families: Insert<typeof schema.families>[];
  students: Insert<typeof schema.students>[];
  studentMedicalNotes: Insert<typeof schema.studentMedicalNotes>[];
  guardians: Insert<typeof schema.guardians>[];
  studentGuardians: Insert<typeof schema.studentGuardians>[];
  enrolments: Insert<typeof schema.enrolments>[];
}

export const DEFAULT_SEED = 20_260_907;

const JHS3_INDEX = LEVELS.length - 1;
const BASIC1_INDEX = LEVELS.findIndex((level) => level.code === 'B1');
const OPT_IN_RECORDED_AT = new Date('2025-09-08T08:00:00Z');

type Outcome = 'continuing' | 'graduated' | 'withdrawn' | 'transferred';

interface StudentPlan {
  id: string;
  sex: Sex;
  firstName: string;
  surname: string;
  currentLevel: number | null;
  currentStream: string | null;
  previousLevel: number | null;
  previousStream: string | null;
  repeats: boolean;
  outcome: Outcome;
  admittedOn: string;
  fixture?: FixtureStudent;
}

function levelAt(index: number): LevelPlan {
  const level = LEVELS[index];
  if (level === undefined) {
    throw new Error(`No level at index ${index}`);
  }
  return level;
}

function lookup<K, V>(map: ReadonlyMap<K, V>, key: K, what: string): V {
  const value = map.get(key);
  if (value === undefined) {
    throw new Error(`Seed bug: no ${what} for ${String(key)}`);
  }
  return value;
}

/** Share of a class who joined the school this year. Creche is small, so most of Nursery 1 is new. */
function newAdmissionChance(level: LevelPlan): number {
  switch (level.code) {
    case 'N1':
      return 0.7;
    case 'KG1':
    case 'B1':
    case 'JHS1':
      return 0.12;
    default:
      return 0.05;
  }
}

function isoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function yearOf(plan: YearPlan): number {
  return Number(plan.startsOn.slice(0, 4));
}

export function generateSeedData(seed: number = DEFAULT_SEED): SeedData {
  const random = new Random(seed);
  const schoolId = uuidv7();
  const systemUserId = uuidv7();
  const base = { schoolId, createdBy: systemUserId };

  const usedPhones = new Set(FIXTURE_PHONES);
  const newPhone = (): string => {
    for (;;) {
      const phone = `+233${random.pick(PHONE_PREFIXES)}${random.digits(7)}`;
      if (!usedPhones.has(phone)) {
        usedPhones.add(phone);
        return phone;
      }
    }
  };
  const firstNameFor = (sex: Sex): string =>
    random.pick(sex === 'male' ? MALE_FIRST_NAMES : FEMALE_FIRST_NAMES);
  const randomSex = (): Sex => (random.chance(0.5) ? 'male' : 'female');
  const emailFor = (firstName: string, surname: string, domain: string): string =>
    `${firstName}.${surname}${random.int(1, 99)}@${domain}`
      .toLowerCase()
      .replace(/[^a-z0-9.@-]/g, '');

  // --- Setup ---------------------------------------------------------------------------------

  const levels = LEVELS.map((level, index) => ({
    id: uuidv7(),
    ...base,
    code: level.code,
    name: level.name,
    stage: level.stage,
    sortOrder: index + 1,
  }));
  const levelIdByCode = new Map(levels.map((row) => [row.code, row.id]));

  const subjects = SUBJECTS.map((subject) => ({
    id: uuidv7(),
    ...base,
    code: subject.code,
    name: subject.name,
    electiveGroup: subject.electiveGroup ?? null,
  }));
  const subjectIdByCode = new Map(subjects.map((row) => [row.code, row.id]));

  const years = [PREVIOUS_YEAR, CURRENT_YEAR];
  const academicYears = years.map((year) => ({
    id: uuidv7(),
    ...base,
    name: year.name,
    startsOn: year.startsOn,
    endsOn: year.endsOn,
  }));
  const yearIdByName = new Map(academicYears.map((row) => [row.name, row.id]));
  const terms = years.flatMap((year) =>
    year.terms.map((term) => ({
      id: uuidv7(),
      ...base,
      academicYearId: lookup(yearIdByName, year.name, 'academic year'),
      ...term,
    })),
  );

  // --- Staff, logins and roles ---------------------------------------------------------------

  const users: Insert<typeof schema.users>[] = [];
  const userRoles: Insert<typeof schema.userRoles>[] = [];
  const staff: Insert<typeof schema.staff>[] = [];
  const staffIdByPost = new Map<string, string>();
  const userIdByPost = new Map<string, string>();
  const userIdByFixture = new Map<string, string>();

  for (const post of STAFF_POSTS) {
    const fixture = post.fixture === undefined ? undefined : FIXTURE_STAFF[post.fixture];
    const sex = fixture?.sex ?? post.sex ?? randomSex();
    const firstName = fixture?.firstName ?? firstNameFor(sex);
    const surname = fixture?.surname ?? random.pick(SURNAMES);
    const userId = post.hasLogin ? uuidv7() : null;
    if (userId !== null) {
      users.push({ id: userId, ...base, displayName: `${firstName} ${surname}` });
      userIdByPost.set(post.key, userId);
      if (post.fixture !== undefined) {
        userIdByFixture.set(post.fixture, userId);
      }
      for (const role of post.roles) {
        userRoles.push({ ...base, userId, role });
      }
    }
    const staffId = uuidv7();
    staffIdByPost.set(post.key, staffId);
    staff.push({
      id: staffId,
      ...base,
      surname,
      firstName,
      otherNames: null,
      jobTitle: post.jobTitle,
      employmentType: post.employmentType,
      phone: fixture?.phone ?? newPhone(),
      email: post.hasLogin ? emailFor(firstName, surname, 'staff.example.com') : null,
      startedOn: `${random.int(2008, 2025)}-09-01`,
      userId,
    });
  }

  const developerUserId = uuidv7();
  users.push({ id: developerUserId, ...base, displayName: 'Developer' });
  userRoles.push({ ...base, userId: developerUserId, role: 'system_admin' });

  // --- Classes, subjects taught and who teaches them -----------------------------------------

  const classes: Insert<typeof schema.classes>[] = [];
  const classSubjects: Insert<typeof schema.classSubjects>[] = [];
  const staffAssignments: Insert<typeof schema.staffAssignments>[] = [];
  const classIdByKey = new Map<string, string>();
  const classKey = (year: YearPlan, levelIndex: number, stream: string | null): string =>
    `${year.name}|${levelIndex}|${stream ?? ''}`;
  const formTeacherPosts = new Set<string>();
  const subjectTeacherPosts = new Set<string>();

  for (const year of years) {
    const academicYearId = lookup(yearIdByName, year.name, 'academic year');
    LEVELS.forEach((level, levelIndex) => {
      for (const stream of level.streams) {
        const classId = uuidv7();
        const formPost = formTeacherPostKey(level, stream);
        classIdByKey.set(classKey(year, levelIndex, stream), classId);
        classes.push({
          id: classId,
          ...base,
          academicYearId,
          levelId: lookup(levelIdByCode, level.code, 'level'),
          stream,
          name: className(level, stream),
          formTeacherStaffId: lookup(staffIdByPost, formPost, 'staff post'),
        });
        if (year === CURRENT_YEAR) {
          formTeacherPosts.add(formPost);
        }
        for (const code of subjectCodesFor(level)) {
          const subjectId = lookup(subjectIdByCode, code, 'subject');
          const teacherPost = teacherPostKey(level, stream, code);
          classSubjects.push({ ...base, classId, subjectId });
          staffAssignments.push({
            ...base,
            staffId: lookup(staffIdByPost, teacherPost, 'staff post'),
            classId,
            subjectId,
          });
          if (year === CURRENT_YEAR && teacherPost !== formPost) {
            subjectTeacherPosts.add(teacherPost);
          }
        }
      }
    });
  }

  // Teaching roles follow this year's timetable.
  for (const [postKey, userId] of userIdByPost) {
    const teachingRoles: StaffRole[] = [];
    if (formTeacherPosts.has(postKey)) teachingRoles.push('class_teacher');
    if (subjectTeacherPosts.has(postKey)) teachingRoles.push('subject_teacher');
    for (const role of teachingRoles) {
      userRoles.push({ ...base, userId, role });
    }
  }

  // --- Students: who is where this year and last year -----------------------------------------

  const pickStream = (level: LevelPlan, preferred: string | null): string | null => {
    if (level.streams.length === 1) return level.streams[0] ?? null;
    if (preferred !== null && random.chance(0.85)) return preferred;
    return random.pick(level.streams);
  };
  const admittedOnFor = (year: number): string =>
    year === yearOf(CURRENT_YEAR)
      ? CURRENT_YEAR.startsOn
      : year === yearOf(PREVIOUS_YEAR)
        ? PREVIOUS_YEAR.startsOn
        : `${year}-09-${String(random.int(1, 12)).padStart(2, '0')}`;

  const planCurrent = (
    levelIndex: number,
    stream: string | null,
    fixture?: FixtureStudent,
  ): StudentPlan => {
    const isNew =
      levelIndex === 0 ||
      (fixture === undefined && random.chance(newAdmissionChance(levelAt(levelIndex))));
    const repeats = !isNew && fixture === undefined && random.chance(0.01);
    const previousLevel = isNew ? null : repeats ? levelIndex : levelIndex - 1;
    const admittedYear =
      previousLevel === null
        ? yearOf(CURRENT_YEAR)
        : yearOf(PREVIOUS_YEAR) - random.int(0, Math.min(previousLevel, 6));
    const sex = fixture?.sex ?? randomSex();
    return {
      id: uuidv7(),
      sex,
      firstName: fixture?.firstName ?? firstNameFor(sex),
      surname: fixture?.surname ?? '',
      currentLevel: levelIndex,
      currentStream: stream,
      previousLevel,
      previousStream: previousLevel === null ? null : pickStream(levelAt(previousLevel), stream),
      repeats,
      outcome: 'continuing',
      admittedOn: admittedOnFor(admittedYear),
      ...(fixture === undefined ? {} : { fixture }),
    };
  };

  const planLeaver = (
    previousLevel: number,
    outcome: Exclude<Outcome, 'continuing'>,
  ): StudentPlan => {
    const sex = randomSex();
    return {
      id: uuidv7(),
      sex,
      firstName: firstNameFor(sex),
      surname: '',
      currentLevel: null,
      currentStream: null,
      previousLevel,
      previousStream: pickStream(levelAt(previousLevel), null),
      repeats: false,
      outcome,
      admittedOn: admittedOnFor(yearOf(PREVIOUS_YEAR) - random.int(0, Math.min(previousLevel, 6))),
    };
  };

  const fixtureFamilies: readonly FixtureFamily[] = Object.values(FIXTURE_FAMILIES);
  const fixturePlans = new Map<FixtureFamily, StudentPlan[]>(
    fixtureFamilies.map((family) => [family, []]),
  );
  const generatedPlans: StudentPlan[] = [];

  LEVELS.forEach((level, levelIndex) => {
    for (const stream of level.streams) {
      let placed = 0;
      for (const family of fixtureFamilies) {
        for (const student of family.students) {
          if (student.levelCode === level.code && student.stream === stream) {
            lookup(fixturePlans, family, 'fixture family').push(
              planCurrent(levelIndex, stream, student),
            );
            placed += 1;
          }
        }
      }
      for (let i = placed; i < currentClassSize(level); i += 1) {
        generatedPlans.push(planCurrent(levelIndex, stream));
      }
    }
  });
  for (let i = 0; i < GRADUATED_LAST_YEAR; i += 1) {
    generatedPlans.push(planLeaver(JHS3_INDEX, 'graduated'));
  }
  for (let i = 0; i < WITHDRAWN_LAST_YEAR; i += 1) {
    generatedPlans.push(planLeaver(random.int(1, JHS3_INDEX), 'withdrawn'));
  }
  for (let i = 0; i < TRANSFERRED_LAST_YEAR; i += 1) {
    generatedPlans.push(planLeaver(random.int(1, JHS3_INDEX), 'transferred'));
  }

  // --- Families: guardians, links and language choice -----------------------------------------

  const guardians: Insert<typeof schema.guardians>[] = [];
  const studentGuardians: Insert<typeof schema.studentGuardians>[] = [];
  const religionByStudent = new Map<string, Religion | null>();
  const languageByStudent = new Map<string, 'TWI' | 'DAG'>();
  const families: Insert<typeof schema.families>[] = [];
  const familyIdByStudent = new Map<string, string>();
  const guardianIdByPhone = new Map<string, string>();

  const addFamily = (name: string, children: readonly StudentPlan[]): void => {
    const id = uuidv7();
    families.push({ id, ...base, name });
    for (const child of children) {
      familyIdByStudent.set(child.id, id);
    }
  };

  const addGuardian = (input: {
    firstName: string;
    surname: string;
    phone?: string;
    userId?: string;
  }): string => {
    const id = uuidv7();
    const primaryPhone = input.phone ?? newPhone();
    guardians.push({
      id,
      ...base,
      surname: input.surname,
      firstName: input.firstName,
      otherNames: null,
      primaryPhone,
      secondaryPhone: input.phone === undefined && random.chance(0.3) ? newPhone() : null,
      whatsappPhone: input.phone !== undefined || random.chance(0.9) ? primaryPhone : newPhone(),
      email: random.chance(0.25) ? emailFor(input.firstName, input.surname, 'example.com') : null,
      occupation: random.pick(OCCUPATIONS),
      address: `${random.pick(AREAS)}, Accra`,
      digitalAddress: random.chance(0.4) ? `GA-${random.int(100, 999)}-${random.digits(4)}` : null,
      userId: input.userId ?? null,
    });
    return id;
  };

  const link = (
    studentId: string,
    guardianId: string,
    relationship: Relationship,
    isMainContact: boolean,
    optedIn: boolean,
  ): void => {
    studentGuardians.push({
      ...base,
      studentId,
      guardianId,
      relationship,
      isMainContact,
      whatsappOptIn: optedIn,
      whatsappOptInAt: optedIn ? OPT_IN_RECORDED_AT : null,
    });
  };

  const familyTraits = (
    surname: string,
  ): { religion: Religion | null; language: 'TWI' | 'DAG' } => {
    const dagaaba = (DAGAABA_SURNAMES as readonly string[]).includes(surname);
    return {
      religion: random.weighted<Religion | null>([
        ['christian', 70],
        ['muslim', 20],
        ['traditional', 3],
        ['other', 2],
        ['prefer_not_to_say', 2],
        [null, 3],
      ]),
      language: random.chance(dagaaba ? 0.8 : 0.1) ? 'DAG' : 'TWI',
    };
  };

  // Fixture families.
  for (const family of fixtureFamilies) {
    const children = lookup(fixturePlans, family, 'fixture family');
    const traits = familyTraits(children[0]?.surname ?? '');
    for (const child of children) {
      religionByStudent.set(child.id, traits.religion);
      languageByStudent.set(child.id, traits.language);
    }
    if (family.familyName !== undefined) {
      addFamily(family.familyName, children);
    }
    for (const guardian of family.guardians) {
      const guardianId = addGuardian({
        firstName: guardian.firstName,
        surname: guardian.surname,
        phone: guardian.phone,
        ...(guardian.staff === undefined
          ? {}
          : { userId: lookup(userIdByFixture, guardian.staff, 'fixture user') }),
      });
      guardianIdByPhone.set(guardian.phone, guardianId);
      for (const child of children) {
        link(child.id, guardianId, guardian.relationship, guardian.isMainContact, true);
      }
    }
  }
  const fixtureChildren = [...fixturePlans.values()].flat();
  for (const ward of FIXTURE_WARDS) {
    const child = fixtureChildren.find(
      (plan) =>
        plan.fixture?.firstName === ward.student.firstName &&
        plan.fixture.surname === ward.student.surname,
    );
    if (child === undefined) {
      throw new Error(`Seed bug: no ward called ${ward.student.firstName}`);
    }
    const guardianId = lookup(guardianIdByPhone, ward.guardianPhone, 'ward guardian');
    link(child.id, guardianId, ward.relationship, ward.isMainContact, true);
  }

  // Generated families of 1–4 children, with 1–2 guardians.
  const queue = random.shuffle(generatedPlans);
  while (queue.length > 0) {
    const size = random.weighted([
      [1, 62],
      [2, 24],
      [3, 10],
      [4, 4],
    ]);
    const children = queue.splice(0, size);
    const familySurname = random.chance(0.12)
      ? random.pick(DAGAABA_SURNAMES)
      : random.pick(SURNAMES);
    const traits = familyTraits(familySurname);
    for (const child of children) {
      child.surname = random.chance(0.9) ? familySurname : random.pick(SURNAMES);
      religionByStudent.set(child.id, traits.religion);
      languageByStudent.set(child.id, traits.language);
    }
    if (children.length > 1) {
      addFamily(`${familySurname} family`, children);
    }

    const makeup = random.weighted<readonly Relationship[]>([
      [['mother', 'father'], 55],
      [['mother'], 25],
      [['father'], 10],
      [['grandmother'], 5],
      [['aunt'], 3],
      [['uncle'], 2],
    ]);
    const mainRelationship = makeup[0];
    for (const relationship of makeup) {
      const sex: Sex = ['father', 'grandfather', 'uncle'].includes(relationship)
        ? 'male'
        : 'female';
      const keepsFamilyName = relationship === 'father' || random.chance(0.5);
      const guardianId = addGuardian({
        firstName: firstNameFor(sex),
        surname: keepsFamilyName ? familySurname : random.pick(SURNAMES),
      });
      const optedIn = random.chance(0.85);
      for (const child of children) {
        link(child.id, guardianId, relationship, relationship === mainRelationship, optedIn);
      }
    }
  }

  // --- Student rows, admission numbers, medical notes and enrolments --------------------------

  const allPlans = [...[...fixturePlans.values()].flat(), ...generatedPlans];
  const admissionOrder = [...allPlans].sort((a, b) => a.admittedOn.localeCompare(b.admittedOn));
  const admissionNumberById = new Map<string, string>();
  const seqByYear = new Map<string, number>();
  for (const plan of admissionOrder) {
    const year = plan.admittedOn.slice(0, 4);
    const seq = (seqByYear.get(year) ?? 0) + 1;
    seqByYear.set(year, seq);
    admissionNumberById.set(plan.id, `${year}/${String(seq).padStart(4, '0')}`);
  }

  const students: Insert<typeof schema.students>[] = [];
  const studentMedicalNotes: Insert<typeof schema.studentMedicalNotes>[] = [];
  const enrolments: Insert<typeof schema.enrolments>[] = [];

  const languageSubjectFor = (studentId: string, levelIndex: number): string | null =>
    levelIndex >= BASIC1_INDEX
      ? lookup(subjectIdByCode, lookup(languageByStudent, studentId, 'language'), 'subject')
      : null;

  for (const plan of allPlans) {
    // Age is pinned to the level the child is in (a repeater is a year older).
    const [ageYear, ageLevel] =
      plan.currentLevel === null
        ? [yearOf(PREVIOUS_YEAR), plan.previousLevel ?? 0]
        : [yearOf(CURRENT_YEAR), plan.currentLevel];
    const age = levelAt(ageLevel).age + (plan.repeats ? 1 : 0);
    const dateOfBirth = isoDate(Date.UTC(ageYear - age, 8, 1) - random.int(1, 365) * 86_400_000);
    const status =
      plan.outcome === 'continuing'
        ? 'active'
        : plan.outcome === 'graduated'
          ? 'graduated'
          : plan.outcome;

    students.push({
      id: plan.id,
      ...base,
      admissionNumber: lookup(admissionNumberById, plan.id, 'admission number'),
      surname: plan.surname,
      firstName: plan.firstName,
      otherNames: random.chance(0.4) ? firstNameFor(plan.sex) : null,
      sex: plan.sex,
      dateOfBirth,
      admittedOn: plan.admittedOn,
      status,
      photoPath: null,
      ghanaCardNumber: random.chance(0.3) ? `GHA-${random.digits(9)}-${random.digits(1)}` : null,
      nhisNumber: random.chance(0.6) ? random.digits(8) : null,
      religion: religionByStudent.get(plan.id) ?? null,
      familyId: familyIdByStudent.get(plan.id) ?? null,
    });

    if (plan.fixture === undefined && random.chance(0.05)) {
      studentMedicalNotes.push({ ...base, studentId: plan.id, note: random.pick(MEDICAL_NOTES) });
    }

    if (plan.previousLevel !== null) {
      const leftOn =
        plan.outcome === 'graduated'
          ? PREVIOUS_YEAR.endsOn
          : plan.outcome === 'withdrawn' || plan.outcome === 'transferred'
            ? isoDate(Date.UTC(2025, 9, 1) + random.int(0, 270) * 86_400_000)
            : null;
      enrolments.push({
        ...base,
        studentId: plan.id,
        classId: lookup(
          classIdByKey,
          classKey(PREVIOUS_YEAR, plan.previousLevel, plan.previousStream),
          'class',
        ),
        academicYearId: lookup(yearIdByName, PREVIOUS_YEAR.name, 'academic year'),
        enrolledOn:
          plan.admittedOn > PREVIOUS_YEAR.startsOn ? plan.admittedOn : PREVIOUS_YEAR.startsOn,
        leftOn,
        status: plan.outcome === 'continuing' ? 'completed' : plan.outcome,
        isBoarder: plan.previousLevel === JHS3_INDEX,
        ghanaianLanguageSubjectId: languageSubjectFor(plan.id, plan.previousLevel),
      });
    }

    if (plan.currentLevel !== null) {
      enrolments.push({
        ...base,
        studentId: plan.id,
        classId: lookup(
          classIdByKey,
          classKey(CURRENT_YEAR, plan.currentLevel, plan.currentStream),
          'class',
        ),
        academicYearId: lookup(yearIdByName, CURRENT_YEAR.name, 'academic year'),
        enrolledOn: CURRENT_YEAR.startsOn,
        leftOn: null,
        status: 'active',
        isBoarder: plan.currentLevel === JHS3_INDEX,
        ghanaianLanguageSubjectId: languageSubjectFor(plan.id, plan.currentLevel),
      });
    }
  }

  return {
    school: {
      id: schoolId,
      name: SEED_SCHOOL.name,
      shortName: SEED_SCHOOL.shortName,
      createdBy: null,
    },
    systemUser: {
      id: systemUserId,
      schoolId,
      displayName: 'System',
      isSystem: true,
      createdBy: null,
    },
    users,
    userRoles,
    staff,
    academicYears,
    terms,
    levels,
    subjects,
    classes,
    classSubjects,
    staffAssignments,
    families,
    students,
    studentMedicalNotes,
    guardians,
    studentGuardians,
    enrolments,
  };
}
