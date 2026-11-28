import type { StaffRole } from '@school-mgmt/shared';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { bearer, lookup, signToken, startTestApp, type TestContext } from '../test/helpers';

// Every endpoint × every role. The people are seed fixtures:
// - class_teacher: Kofi Darkwa, form teacher of Basic 4A
// - subject_teacher: Kwesi Anan, teaches Maths and Science in Basic 5–6 only
// - housemaster: sees boarders (JHS 3) only
// The target student is Kwame Asamoah (Basic 4A, not a boarder); the target guardian is his
// mother, Akosua Asamoah. Changes to links, families and notes are made to Nana Wiredu (Basic 3A)
// and Akua Dapaah, whom no other API test relies on. Every write here can be repeated: calls run
// in the order listed, once per role.

type Who = StaffRole;
const WHO: readonly Who[] = [
  'owner',
  'head',
  'admin',
  'bursar',
  'class_teacher',
  'subject_teacher',
  'housemaster',
  'system_admin',
];

let ctx: TestContext;
const tokens = new Map<Who, string>();
let kwameId: string;
let akosuaId: string;
let amaId: string;
let nanaId: string;
let akuaId: string;
let abenaKuffourId: string;
let kofiStaffId: string;
let asamoahFamilyId: string;

const NEW_NOTE_ID = '0190a0a0-0000-7000-8000-00000000a001';
const NEW_LINK_ID = '0190a0a0-0000-7000-8000-00000000a002';
const NEW_FAMILY_ID = '0190a0a0-0000-7000-8000-00000000a003';
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

beforeAll(async () => {
  ctx = await startTestApp();
  const find = lookup(ctx.db);
  const userIds: Record<Who, string> = {
    owner: await find.userWithOnlyRole('owner'),
    head: await find.userWithOnlyRole('head'),
    admin: await find.userWithOnlyRole('admin'),
    bursar: await find.userWithOnlyRole('bursar'),
    class_teacher: await find.staffUser('Kofi', 'Darkwa'),
    subject_teacher: await find.staffUser('Kwesi', 'Anan'),
    housemaster: await find.userWithOnlyRole('housemaster'),
    system_admin: await find.userWithOnlyRole('system_admin'),
  };
  for (const who of WHO) {
    tokens.set(who, await signToken(userIds[who]));
  }
  kwameId = await find.student('Kwame', 'Asamoah');
  akosuaId = await find.guardian('Akosua', 'Asamoah');
  amaId = await find.student('Ama', 'Asamoah');
  nanaId = await find.student('Nana', 'Wiredu');
  akuaId = await find.student('Akua', 'Dapaah');
  abenaKuffourId = await find.guardian('Abena', 'Kuffour');
  kofiStaffId = await find.staff('Kofi', 'Darkwa');
  asamoahFamilyId = await find.family('Asamoah family');
});

afterAll(async () => {
  await ctx.close();
});

interface Endpoint {
  name: string;
  method: 'GET' | 'POST' | 'PATCH' | 'PUT';
  url: () => string;
  /** A function when it needs ids that are only known once the tests have started. */
  body?: Record<string, unknown> | (() => Record<string, unknown>);
  /** Sent as a JPEG file instead of JSON. */
  photo?: true;
  allowed: readonly Who[];
  /** Roles that pass the permission check but have nothing to act on. */
  notFound?: readonly Who[];
}

function payload(endpoint: Endpoint) {
  if (endpoint.photo) return { payload: JPEG, headers: { 'content-type': 'image/jpeg' } };
  const { body } = endpoint;
  if (body === undefined) return { headers: {} };
  return { payload: typeof body === 'function' ? body() : body, headers: {} };
}

const SCHOOL_WIDE_READERS: readonly Who[] = ['owner', 'head', 'admin', 'bursar'];
const EDITORS: readonly Who[] = ['owner', 'head', 'admin'];

const PHOTO_EDITORS: readonly Who[] = [...EDITORS, 'class_teacher'];
/** The system admin login has no staff record, so it has no photo of its own to change. */
const NO_STAFF_RECORD: readonly Who[] = ['system_admin'];

const ENDPOINTS: readonly Endpoint[] = [
  { name: 'GET /me', method: 'GET', url: () => '/me', allowed: WHO },
  { name: 'GET /home/summary', method: 'GET', url: () => '/home/summary', allowed: WHO },
  {
    name: 'GET /classes',
    method: 'GET',
    url: () => '/classes',
    allowed: [...SCHOOL_WIDE_READERS, 'class_teacher', 'subject_teacher', 'housemaster'],
  },
  {
    name: 'POST /students/:id/medical-notes',
    method: 'POST',
    url: () => `/students/${nanaId}/medical-notes`,
    body: { id: NEW_NOTE_ID, note: 'Test note.' },
    allowed: EDITORS,
  },
  {
    name: 'POST /medical-notes/:id/archive',
    method: 'POST',
    url: () => `/medical-notes/${NEW_NOTE_ID}/archive`,
    allowed: EDITORS,
  },
  {
    name: 'POST /medical-notes/:id/restore',
    method: 'POST',
    url: () => `/medical-notes/${NEW_NOTE_ID}/restore`,
    allowed: EDITORS,
  },
  {
    name: 'POST /students/:id/guardians',
    method: 'POST',
    url: () => `/students/${nanaId}/guardians`,
    body: () => ({
      linkId: NEW_LINK_ID,
      relationship: 'aunt',
      guardian: { kind: 'existing', guardianId: abenaKuffourId },
    }),
    allowed: EDITORS,
  },
  {
    name: 'PATCH /student-guardians/:id',
    method: 'PATCH',
    url: () => `/student-guardians/${NEW_LINK_ID}`,
    body: { relationship: 'other' },
    allowed: EDITORS,
  },
  {
    name: 'POST /student-guardians/:id/restore',
    method: 'POST',
    url: () => `/student-guardians/${NEW_LINK_ID}/restore`,
    allowed: EDITORS,
  },
  {
    name: 'POST /student-guardians/:id/archive',
    method: 'POST',
    url: () => `/student-guardians/${NEW_LINK_ID}/archive`,
    allowed: EDITORS,
  },
  { name: 'GET /families', method: 'GET', url: () => '/families', allowed: SCHOOL_WIDE_READERS },
  {
    name: 'POST /families/search',
    method: 'POST',
    url: () => '/families/search',
    body: { q: 'Asamoah' },
    allowed: SCHOOL_WIDE_READERS,
  },
  {
    name: 'GET /families/:id',
    method: 'GET',
    url: () => `/families/${asamoahFamilyId}`,
    allowed: SCHOOL_WIDE_READERS,
  },
  {
    name: 'POST /families',
    method: 'POST',
    url: () => '/families',
    body: () => ({ id: NEW_FAMILY_ID, studentIds: [akuaId] }),
    allowed: EDITORS,
  },
  {
    name: 'PATCH /families/:id',
    method: 'PATCH',
    url: () => `/families/${asamoahFamilyId}`,
    body: { name: 'Asamoah family' },
    allowed: EDITORS,
  },
  {
    name: 'POST /families/:id/students',
    method: 'POST',
    url: () => `/families/${asamoahFamilyId}/students`,
    body: () => ({ studentId: kwameId }),
    allowed: EDITORS,
  },
  {
    name: 'POST /families/:id/students/:studentId/remove (not a member)',
    method: 'POST',
    url: () => `/families/${asamoahFamilyId}/students/${akuaId}/remove`,
    allowed: EDITORS,
  },
  {
    name: 'POST /students/:id/siblings',
    method: 'POST',
    url: () => `/students/${kwameId}/siblings`,
    body: () => ({ siblingId: amaId, newFamilyId: NEW_FAMILY_ID }),
    allowed: EDITORS,
  },
  { name: 'GET /staff', method: 'GET', url: () => '/staff', allowed: EDITORS },
  {
    name: 'GET /staff/:id',
    method: 'GET',
    url: () => `/staff/${kofiStaffId}`,
    allowed: EDITORS,
  },
  {
    name: 'PUT /students/:id/photo',
    method: 'PUT',
    url: () => `/students/${kwameId}/photo`,
    photo: true,
    allowed: PHOTO_EDITORS,
  },
  {
    name: 'POST /students/:id/photo/remove',
    method: 'POST',
    url: () => `/students/${kwameId}/photo/remove`,
    allowed: PHOTO_EDITORS,
  },
  {
    name: 'PUT /guardians/:id/photo',
    method: 'PUT',
    url: () => `/guardians/${akosuaId}/photo`,
    photo: true,
    allowed: PHOTO_EDITORS,
  },
  {
    name: 'POST /guardians/:id/photo/remove',
    method: 'POST',
    url: () => `/guardians/${akosuaId}/photo/remove`,
    allowed: PHOTO_EDITORS,
  },
  {
    name: 'PUT /staff/:id/photo',
    method: 'PUT',
    url: () => `/staff/${kofiStaffId}/photo`,
    photo: true,
    allowed: EDITORS,
  },
  {
    name: 'POST /staff/:id/photo/remove',
    method: 'POST',
    url: () => `/staff/${kofiStaffId}/photo/remove`,
    allowed: EDITORS,
  },
  {
    name: 'PUT /me/photo',
    method: 'PUT',
    url: () => '/me/photo',
    photo: true,
    allowed: WHO,
    notFound: NO_STAFF_RECORD,
  },
  {
    name: 'POST /me/photo/remove',
    method: 'POST',
    url: () => '/me/photo/remove',
    allowed: WHO,
    notFound: NO_STAFF_RECORD,
  },
  {
    name: 'GET /students',
    method: 'GET',
    url: () => '/students',
    allowed: [...SCHOOL_WIDE_READERS, 'class_teacher', 'subject_teacher', 'housemaster'],
  },
  {
    name: 'POST /students/search',
    method: 'POST',
    url: () => '/students/search',
    body: { q: 'Asamoah' },
    allowed: [...SCHOOL_WIDE_READERS, 'class_teacher', 'subject_teacher', 'housemaster'],
  },
  {
    name: 'GET /students/:id (Basic 4A)',
    method: 'GET',
    url: () => `/students/${kwameId}`,
    allowed: [...SCHOOL_WIDE_READERS, 'class_teacher'],
  },
  {
    name: 'PATCH /students/:id',
    method: 'PATCH',
    url: () => `/students/${kwameId}`,
    body: { religion: 'christian' },
    allowed: EDITORS,
  },
  {
    name: 'GET /guardians',
    method: 'GET',
    url: () => '/guardians',
    allowed: [...SCHOOL_WIDE_READERS, 'class_teacher', 'housemaster'],
  },
  {
    name: 'POST /guardians/search',
    method: 'POST',
    url: () => '/guardians/search',
    body: { q: 'Asamoah' },
    allowed: [...SCHOOL_WIDE_READERS, 'class_teacher', 'housemaster'],
  },
  {
    name: 'GET /guardians/:id (Basic 4A parent)',
    method: 'GET',
    url: () => `/guardians/${akosuaId}`,
    allowed: [...SCHOOL_WIDE_READERS, 'class_teacher'],
  },
  {
    name: 'PATCH /guardians/:id (contact detail)',
    method: 'PATCH',
    url: () => `/guardians/${akosuaId}`,
    body: { occupation: 'Trader' },
    allowed: [...EDITORS, 'class_teacher'],
  },
];

const cases = ENDPOINTS.flatMap((endpoint) =>
  WHO.map((who) => ({
    endpoint: endpoint.name,
    who,
    expected: endpoint.notFound?.includes(who) ? 404 : endpoint.allowed.includes(who) ? 200 : 403,
    run: endpoint,
  })),
);

describe('who can call what', () => {
  test.each(cases)('$endpoint as $who → $expected', async ({ who, expected, run }) => {
    const sent = payload(run);
    const res = await ctx.app.inject({
      method: run.method,
      url: run.url(),
      ...sent,
      headers: { ...sent.headers, ...bearer(tokens.get(who) ?? '') },
    });
    expect(res.statusCode).toBe(expected);
    if (expected === 403) {
      expect(res.json()).toMatchObject({ error: { code: 'forbidden' } });
    }
  });

  test.each(ENDPOINTS)('$name without a token → 401', async (endpoint) => {
    const res = await ctx.app.inject({
      method: endpoint.method,
      url: endpoint.url(),
      ...payload(endpoint),
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('bad input → 400 with the standard error shape', () => {
  test.each([
    { name: 'page size too big', method: 'GET', url: () => '/students?pageSize=500' },
    { name: 'unknown status', method: 'GET', url: () => '/students?status=expelled' },
    { name: 'student id not a uuid', method: 'GET', url: () => '/students/abc' },
    { name: 'empty student edit', method: 'PATCH', url: () => `/students/${kwameId}`, body: {} },
    {
      name: 'admission number is not editable',
      method: 'PATCH',
      url: () => `/students/${kwameId}`,
      body: { admissionNumber: 'X' },
    },
    { name: 'guardian page 0', method: 'GET', url: () => '/guardians?page=0' },
    {
      name: 'blank student search',
      method: 'POST',
      url: () => '/students/search',
      body: { q: '  ' },
    },
    {
      name: 'student search page as text',
      method: 'POST',
      url: () => '/students/search',
      body: { q: 'Kofi', page: '2' },
    },
    {
      name: 'blank guardian search',
      method: 'POST',
      url: () => '/guardians/search',
      body: { q: '' },
    },
    { name: 'guardian id not a uuid', method: 'GET', url: () => '/guardians/abc' },
    {
      name: 'bad guardian phone',
      method: 'PATCH',
      url: () => `/guardians/${akosuaId}`,
      body: { primaryPhone: '12345' },
    },
    {
      name: 'blank medical note',
      method: 'POST',
      url: () => `/students/${nanaId}/medical-notes`,
      body: { id: NEW_NOTE_ID, note: '  ' },
    },
    {
      name: 'new guardian with a bad phone',
      method: 'POST',
      url: () => `/students/${nanaId}/guardians`,
      body: {
        linkId: NEW_LINK_ID,
        relationship: 'aunt',
        guardian: {
          kind: 'new',
          guardianId: NEW_FAMILY_ID,
          surname: 'A',
          firstName: 'B',
          primaryPhone: '12',
        },
      },
    },
    {
      name: 'a main contact cannot be switched off',
      method: 'PATCH',
      url: () => `/student-guardians/${NEW_LINK_ID}`,
      body: { isMainContact: false },
    },
    {
      name: 'family with no children',
      method: 'POST',
      url: () => '/families',
      body: { id: NEW_FAMILY_ID, studentIds: [] },
    },
    {
      name: 'blank family name',
      method: 'PATCH',
      url: () => `/families/${asamoahFamilyId}`,
      body: { name: ' ' },
    },
    {
      name: 'blank family search',
      method: 'POST',
      url: () => '/families/search',
      body: { q: '' },
    },
    {
      name: 'a photo that is not a JPEG',
      method: 'PUT',
      url: () => `/students/${kwameId}/photo`,
      body: { photo: 'x' },
    },
  ] as const)('$name', async ({ method, url, ...rest }) => {
    const res = await ctx.app.inject({
      method,
      url: url(),
      headers: bearer(tokens.get('head') ?? ''),
      ...('body' in rest ? { payload: rest.body } : {}),
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: { code: 'validation_error' } });
  });
});

describe('unknown ids → 404', () => {
  const missing = '0190a0a0-0000-7000-8000-000000000000';
  test.each([
    { method: 'GET', url: `/students/${missing}` },
    { method: 'PATCH', url: `/students/${missing}`, body: { religion: 'muslim' } },
    { method: 'GET', url: `/guardians/${missing}` },
    { method: 'PATCH', url: `/guardians/${missing}`, body: { occupation: 'x' } },
  ] as const)('$method $url', async ({ method, url, ...rest }) => {
    const res = await ctx.app.inject({
      method,
      url,
      headers: bearer(tokens.get('head') ?? ''),
      ...('body' in rest ? { payload: rest.body } : {}),
    });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ error: { code: 'not_found' } });
  });
});
