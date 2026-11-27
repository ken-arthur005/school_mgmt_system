import type { StaffRole } from '@school-mgmt/shared';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { bearer, lookup, signToken, startTestApp, type TestContext } from '../test/helpers';

// Every endpoint × every role. The people are seed fixtures:
// - class_teacher: Kofi Darkwa, form teacher of Basic 4A
// - subject_teacher: Kwesi Anan, teaches Maths and Science in Basic 5–6 only
// - housemaster: sees boarders (JHS 3) only
// The target student is Kwame Asamoah (Basic 4A, not a boarder); the target guardian is his
// mother, Akosua Asamoah.

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
});

afterAll(async () => {
  await ctx.close();
});

interface Endpoint {
  name: string;
  method: 'GET' | 'POST' | 'PATCH';
  url: () => string;
  body?: Record<string, unknown>;
  allowed: readonly Who[];
}

const SCHOOL_WIDE_READERS: readonly Who[] = ['owner', 'head', 'admin', 'bursar'];
const EDITORS: readonly Who[] = ['owner', 'head', 'admin'];

const ENDPOINTS: readonly Endpoint[] = [
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
    expected: endpoint.allowed.includes(who) ? 200 : 403,
    run: endpoint,
  })),
);

describe('who can call what', () => {
  test.each(cases)('$endpoint as $who → $expected', async ({ who, expected, run }) => {
    const res = await ctx.app.inject({
      method: run.method,
      url: run.url(),
      headers: bearer(tokens.get(who) ?? ''),
      ...(run.body === undefined ? {} : { payload: run.body }),
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
      ...(endpoint.body === undefined ? {} : { payload: endpoint.body }),
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
