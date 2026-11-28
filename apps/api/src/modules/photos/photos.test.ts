import { PHOTO_MAX_BYTES, type StudentDetail } from '@school-mgmt/shared';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { bearer, lookup, signToken, startTestApp, type TestContext } from '../../test/helpers';

let ctx: TestContext;
let kofi: string; // form teacher of Basic 4A
let find: ReturnType<typeof lookup>;
let yawId: string; // Basic 4A

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

beforeAll(async () => {
  ctx = await startTestApp();
  find = lookup(ctx.db);
  kofi = await signToken(await find.staffUser('Kofi', 'Darkwa'));
  yawId = await find.student('Yaw', 'Sakyi');
});

afterAll(async () => {
  await ctx.close();
});

function put(url: string, body: Buffer, type = 'image/jpeg') {
  return ctx.app.inject({
    method: 'PUT',
    url,
    headers: { ...bearer(kofi), 'content-type': type },
    payload: body,
  });
}

const yaw = async () =>
  (
    await ctx.app.inject({ method: 'GET', url: `/students/${yawId}`, headers: bearer(kofi) })
  ).json<StudentDetail>();

describe('photos', () => {
  test('a saved photo shows on the profile; the path holds ids only', async () => {
    const res = await put(`/students/${yawId}/photo`, JPEG);
    expect(res.statusCode).toBe(200);
    const [path] = [...ctx.photoFiles.keys()];
    expect(path).toMatch(/^[0-9a-f-]{36}\/students\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg$/);
    expect(path).toContain(yawId);
    expect((await yaw()).photoUrl).toBe(`https://photos.test/${path}`);
  });

  test('removing it keeps the file', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: `/students/${yawId}/photo/remove`,
      headers: bearer(kofi),
    });
    expect(res.json()).toEqual({ photoUrl: null });
    expect((await yaw()).photoUrl).toBeNull();
    expect(ctx.photoFiles.size).toBe(1);
  });

  test.each([
    { name: 'not a JPEG', body: Buffer.from('hello'), type: 'image/jpeg', status: 400 },
    { name: 'another file type', body: JPEG, type: 'image/png', status: 415 },
    {
      name: 'too big',
      body: Buffer.concat([JPEG, Buffer.alloc(PHOTO_MAX_BYTES)]),
      type: 'image/jpeg',
      status: 413,
    },
  ])('refuses: $name → $status', async ({ body, type, status }) => {
    const res = await put(`/students/${yawId}/photo`, body, type);
    expect(res.statusCode).toBe(status);
  });

  test('a class teacher cannot change another class’s student', async () => {
    const ama = await find.student('Ama', 'Asamoah');
    expect((await put(`/students/${ama}/photo`, JPEG)).statusCode).toBe(403);
  });
});
