import type { Db } from '@school-mgmt/db';
import { connectTestDb } from '@school-mgmt/db/testing';
import type { StaffRole } from '@school-mgmt/shared';
import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { buildApp } from '../app';
import { loadEnv } from '../env';
import type { PhotoStorage } from '../modules/photos/storage';
import { API_TEST_DATABASE, TEST_NOW, TEST_SUPABASE_URL } from './constants';

const ISSUER = `${TEST_SUPABASE_URL}/auth/v1`;
const KEY_ID = 'test-key';

export const testEnv = loadEnv({
  APP_ENV: 'development',
  LOG_LEVEL: 'silent',
  CORS_ORIGINS: 'http://localhost:5173',
  DATABASE_URL: 'postgresql://unused@localhost:5432/unused',
  SUPABASE_URL: TEST_SUPABASE_URL,
  SUPABASE_SECRET_KEY: 'unused-in-tests',
});

/** Photo storage kept in memory: tests never call Supabase. */
export function memoryPhotoStorage() {
  const files = new Map<string, Buffer>();
  const storage: PhotoStorage = {
    upload: (path, bytes) => {
      files.set(path, bytes);
      return Promise.resolve();
    },
    signedUrls: (paths) =>
      Promise.resolve(new Map(paths.map((path) => [path, `https://photos.test/${path}`]))),
  };
  return { files, storage };
}

type SigningKey = Awaited<ReturnType<typeof generateKeyPair>>['privateKey'];

const { publicKey, privateKey } = await generateKeyPair('ES256');
const publicJwk = { ...(await exportJWK(publicKey)), kid: KEY_ID, alg: 'ES256' };

/** A token like Supabase's. `sub` is the auth user id, which the test setup made equal to users.id. */
export async function signToken(
  sub: string,
  overrides: { issuer?: string; audience?: string; expiresAt?: Date; key?: SigningKey } = {},
): Promise<string> {
  const issuedAt = Math.floor(TEST_NOW.getTime() / 1000);
  const expiresAt = overrides.expiresAt ?? new Date(TEST_NOW.getTime() + 60 * 60 * 1000);
  return new SignJWT({ role: 'authenticated' })
    .setProtectedHeader({ alg: 'ES256', kid: KEY_ID })
    .setSubject(sub)
    .setIssuer(overrides.issuer ?? ISSUER)
    .setAudience(overrides.audience ?? 'authenticated')
    .setIssuedAt(issuedAt)
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(overrides.key ?? privateKey);
}

export interface TestContext {
  app: FastifyInstance;
  db: Db;
  /** The files "uploaded" so far, by path. */
  photoFiles: Map<string, Buffer>;
  close: () => Promise<void>;
}

export async function startTestApp(): Promise<TestContext> {
  const connection = connectTestDb(API_TEST_DATABASE);
  const photos = memoryPhotoStorage();
  const app = await buildApp(testEnv, {
    db: connection.db,
    photos: photos.storage,
    jwks: createLocalJWKSet({ keys: [publicJwk] }),
    now: () => TEST_NOW,
  });
  return {
    app,
    db: connection.db,
    photoFiles: photos.files,
    close: async () => {
      await app.close();
      await connection.close();
    },
  };
}

/** Looks people up by the names the seed fixtures give them. */
export function lookup(db: Db) {
  const one = async (query: ReturnType<typeof sql>, what: string): Promise<string> => {
    const rows = await db.execute<{ id: string }>(query);
    if (rows.length !== 1 || rows[0] === undefined) {
      throw new Error(`Expected exactly one ${what}, found ${rows.length}`);
    }
    return rows[0].id;
  };
  return {
    /** The first (by name) login holding exactly this one role. */
    userWithOnlyRole: (role: StaffRole) =>
      one(
        sql`select u.id from users u
            where (select array_agg(r.role) from user_roles r
                   where r.user_id = u.id and r.archived_at is null) = array[${role}]::text[]
            order by u.display_name, u.id limit 1`,
        `user with only ${role}`,
      ),
    staffUser: (firstName: string, surname: string) =>
      one(
        sql`select user_id as id from staff where first_name = ${firstName} and surname = ${surname}`,
        `${firstName} ${surname}`,
      ),
    staff: (firstName: string, surname: string) =>
      one(
        sql`select id from staff where first_name = ${firstName} and surname = ${surname}`,
        `${firstName} ${surname}`,
      ),
    family: (name: string) =>
      one(sql`select id from families where name = ${name}`, `family called ${name}`),
    student: (firstName: string, surname: string) =>
      one(
        sql`select id from students where first_name = ${firstName} and surname = ${surname}`,
        `${firstName} ${surname}`,
      ),
    guardian: (firstName: string, surname: string) =>
      one(
        sql`select id from guardians where first_name = ${firstName} and surname = ${surname}`,
        `${firstName} ${surname}`,
      ),
    /** Any student boarding in the current (2026/2027) year. */
    aBoarder: () =>
      one(
        sql`select e.student_id as id from enrolments e
            join academic_years y on y.id = e.academic_year_id
            where y.name = '2026/2027' and e.is_boarder and e.status = 'active'
            order by e.student_id limit 1`,
        'boarder',
      ),
    /** Any active student in a class this year, by class name. */
    aStudentIn: (className: string) =>
      one(
        sql`select e.student_id as id from enrolments e
            join classes c on c.id = e.class_id
            join academic_years y on y.id = e.academic_year_id
            where y.name = '2026/2027' and c.name = ${className} and e.status = 'active'
            order by e.student_id limit 1`,
        `student in ${className}`,
      ),
  };
}

export const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
