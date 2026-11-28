import { type ErrorResponse, type StudentDetail, uuidv7 } from '@school-mgmt/shared';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { bearer, lookup, signToken, startTestApp, type TestContext } from '../../test/helpers';

// Kojo Boadu starts with no guardian at all. The tests build on each other, in order.

let ctx: TestContext;
let admin: string;
let find: ReturnType<typeof lookup>;
let kojoId: string;
let abenaId: string; // Abena Kuffour, on file as another family's mother

const momLink = uuidv7();
const momId = uuidv7();
const aunt = uuidv7();

beforeAll(async () => {
  ctx = await startTestApp();
  find = lookup(ctx.db);
  admin = await signToken(await find.userWithOnlyRole('admin'));
  kojoId = await find.student('Kojo', 'Boadu');
  abenaId = await find.guardian('Abena', 'Kuffour');
});

afterAll(async () => {
  await ctx.close();
});

function call(method: 'POST' | 'PATCH', url: string, payload?: Record<string, unknown>) {
  return ctx.app.inject({
    method,
    url,
    headers: bearer(admin),
    ...(payload === undefined ? {} : { payload }),
  });
}

async function ok(method: 'POST' | 'PATCH', url: string, payload?: Record<string, unknown>) {
  const res = await call(method, url, payload);
  expect(res.statusCode).toBe(200);
  return res.json<StudentDetail>();
}

const summary = (student: StudentDetail) =>
  (student.guardians ?? []).map((g) => ({
    name: g.firstName,
    main: g.isMainContact,
    optIn: g.whatsappOptIn,
  }));

const newMother = {
  linkId: momLink,
  relationship: 'mother',
  whatsappOptIn: true,
  guardian: {
    kind: 'new',
    guardianId: momId,
    surname: 'Boadu',
    firstName: 'Esther',
    primaryPhone: '024 555 0001',
  },
};

describe('linking guardians', () => {
  test('a student’s first guardian becomes the main contact', async () => {
    const kojo = await ok('POST', `/students/${kojoId}/guardians`, newMother);
    expect(summary(kojo)).toEqual([{ name: 'Esther', main: true, optIn: true }]);
    expect(kojo.guardians?.[0]).toMatchObject({
      primaryPhone: '+233245550001',
      whatsappPhone: '+233245550001',
    });
  });

  test('sending the same save again adds nothing', async () => {
    const kojo = await ok('POST', `/students/${kojoId}/guardians`, newMother);
    expect(kojo.guardians).toHaveLength(1);
    const rows = await ctx.db.execute(sql`select 1 from guardians where first_name = 'Esther'
      and surname = 'Boadu'`);
    expect(rows).toHaveLength(1);
  });

  test('a phone already on file is questioned, then accepted once confirmed', async () => {
    const body = {
      linkId: aunt,
      relationship: 'aunt',
      guardian: {
        kind: 'new',
        guardianId: uuidv7(),
        surname: 'Boadu',
        firstName: 'Grace',
        primaryPhone: '024 400 0103', // Abena Kuffour's
      },
    };
    const refused = await call('POST', `/students/${kojoId}/guardians`, body);
    expect(refused.statusCode).toBe(409);
    expect(refused.json<ErrorResponse>().error).toMatchObject({
      code: 'possible_duplicate',
      details: { matches: [{ id: abenaId, firstName: 'Abena' }] },
    });

    const kojo = await ok('POST', `/students/${kojoId}/guardians`, {
      ...body,
      guardian: { ...body.guardian, confirmNew: true },
    });
    expect(summary(kojo)).toContainEqual({ name: 'Grace', main: false, optIn: false });
  });

  test('the same guardian cannot be linked twice', async () => {
    const res = await call('POST', `/students/${kojoId}/guardians`, {
      linkId: uuidv7(),
      relationship: 'mother',
      guardian: { kind: 'existing', guardianId: momId },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ error: { code: 'already_linked' } });
  });

  test('the main contact cannot be removed', async () => {
    const res = await call('POST', `/student-guardians/${momLink}/archive`);
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ error: { code: 'main_contact' } });
  });

  test('moving the main contact leaves exactly one', async () => {
    const kojo = await ok('PATCH', `/student-guardians/${aunt}`, { isMainContact: true });
    expect(summary(kojo).filter((g) => g.main)).toEqual([
      { name: 'Grace', main: true, optIn: false },
    ]);
  });

  test('consent records when it was given, and forgets it when withdrawn', async () => {
    const consentAt = async () => {
      const rows = await ctx.db.execute<{ at: string | null }>(
        sql`select whatsapp_opt_in_at as at from student_guardians where id = ${aunt}`,
      );
      return rows[0]?.at ?? null;
    };
    await ok('PATCH', `/student-guardians/${aunt}`, { whatsappOptIn: true });
    expect(await consentAt()).not.toBeNull();
    await ok('PATCH', `/student-guardians/${aunt}`, { whatsappOptIn: false });
    expect(await consentAt()).toBeNull();
  });

  test('remove and undo', async () => {
    const without = await ok('POST', `/student-guardians/${momLink}/archive`);
    expect(summary(without).map((g) => g.name)).toEqual(['Grace']);
    const restored = await ok('POST', `/student-guardians/${momLink}/restore`);
    expect(summary(restored)).toEqual([
      { name: 'Grace', main: true, optIn: false },
      { name: 'Esther', main: false, optIn: true },
    ]);
  });

  test('a student keeps at least one guardian', async () => {
    await ok('POST', `/student-guardians/${momLink}/archive`);
    const res = await call('POST', `/student-guardians/${aunt}/archive`);
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ error: { code: 'last_guardian' } });
  });
});

describe('a new WhatsApp number', () => {
  test('clears consent; another detail keeps it', async () => {
    const father = await find.guardian('Yaw', 'Nkansah');
    const consents = () =>
      ctx.db.execute<{ ok: boolean }>(
        sql`select whatsapp_opt_in as ok from student_guardians where guardian_id = ${father}`,
      );

    await call('PATCH', `/guardians/${father}`, { occupation: 'Driver' });
    expect((await consents()).map((row) => row.ok)).toEqual([true]);

    // The same number typed another way is not a change.
    await call('PATCH', `/guardians/${father}`, { whatsappPhone: '+233 24 400 0107' });
    expect((await consents()).map((row) => row.ok)).toEqual([true]);

    const res = await call('PATCH', `/guardians/${father}`, { whatsappPhone: '020 111 2222' });
    expect(res.statusCode).toBe(200);
    expect((await consents()).map((row) => row.ok)).toEqual([false]);
  });
});

describe('browser preflight', () => {
  test.each(['PATCH', 'PUT'])('%s is allowed from the web app', async (method) => {
    const res = await ctx.app.inject({
      method: 'OPTIONS',
      url: '/guardians',
      headers: {
        origin: 'http://localhost:5173',
        'access-control-request-method': method,
      },
    });
    expect(res.headers['access-control-allow-methods']).toContain(method);
  });
});
