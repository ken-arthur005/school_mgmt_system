import { type Db, getCurrentAcademicYear, schema } from '@school-mgmt/db';
import { type Action, can, schoolToday, type StaffRole } from '@school-mgmt/shared';
import { and, eq, isNull } from 'drizzle-orm';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { errors as joseErrors, type JWTVerifyGetKey, jwtVerify } from 'jose';
import type { AuthUser } from '../access';
import { forbidden, unauthorized } from './errors';

declare module 'fastify' {
  interface FastifyContextConfig {
    /** A route that needs no sign-in (e.g. /health). It must never return school data. */
    public?: boolean;
    /**
     * The action a route needs. With a list, any one of them is enough (the service then decides
     * what each one allows). Every non-public route must declare one, or the app won't start.
     */
    permission?: Action | readonly Action[];
  }

  interface FastifyRequest {
    /** The signed-in staff member. Null only on public routes. */
    auth: AuthUser | null;
  }
}

export interface AuthDeps {
  db: Db;
  /** Supabase's public signing keys (JWKS). Tests pass their own. */
  jwks: JWTVerifyGetKey;
  /** Where Supabase issues tokens from, e.g. https://abcd.supabase.co/auth/v1 */
  issuer: string;
  now: () => Date;
}

/** The signed-in user. Use in handlers on non-public routes, where auth always ran. */
export function authOf(request: FastifyRequest): AuthUser {
  if (request.auth === null) {
    throw unauthorized();
  }
  return request.auth;
}

function bearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (header === undefined) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  return match?.[1] ?? null;
}

async function verifyToken(token: string, deps: AuthDeps): Promise<string> {
  try {
    const { payload } = await jwtVerify(token, deps.jwks, {
      issuer: deps.issuer,
      audience: 'authenticated',
      currentDate: deps.now(),
    });
    if (typeof payload.sub !== 'string' || payload.sub === '') {
      throw unauthorized();
    }
    return payload.sub;
  } catch (error) {
    if (error instanceof joseErrors.JOSEError) {
      throw unauthorized();
    }
    throw error;
  }
}

async function loadUser(deps: AuthDeps, authUserId: string): Promise<AuthUser | null> {
  const { db } = deps;
  const [user] = await db
    .select({ id: schema.users.id, schoolId: schema.users.schoolId })
    .from(schema.users)
    .where(
      and(
        eq(schema.users.authUserId, authUserId),
        eq(schema.users.isSystem, false),
        isNull(schema.users.archivedAt),
      ),
    );
  if (user === undefined) {
    return null;
  }

  const roleRows = await db
    .select({ role: schema.userRoles.role })
    .from(schema.userRoles)
    .where(and(eq(schema.userRoles.userId, user.id), isNull(schema.userRoles.archivedAt)));
  const roles: StaffRole[] = roleRows.map((row) => row.role);

  const [staffRow] = await db
    .select({ id: schema.staff.id })
    .from(schema.staff)
    .where(and(eq(schema.staff.userId, user.id), isNull(schema.staff.archivedAt)));
  const staffId = staffRow?.id ?? null;

  const year = await getCurrentAcademicYear(db, {
    schoolId: user.schoolId,
    date: schoolToday(deps.now()),
  });
  const academicYearId = year?.id ?? null;

  let formClassIds: string[] = [];
  let taughtClassIds: string[] = [];
  if (staffId !== null && academicYearId !== null) {
    if (roles.includes('class_teacher')) {
      const rows = await db
        .select({ id: schema.classes.id })
        .from(schema.classes)
        .where(
          and(
            eq(schema.classes.formTeacherStaffId, staffId),
            eq(schema.classes.academicYearId, academicYearId),
            isNull(schema.classes.archivedAt),
          ),
        );
      formClassIds = rows.map((row) => row.id);
    }
    if (roles.includes('subject_teacher')) {
      const rows = await db
        .selectDistinct({ id: schema.classes.id })
        .from(schema.staffAssignments)
        .innerJoin(schema.classes, eq(schema.classes.id, schema.staffAssignments.classId))
        .where(
          and(
            eq(schema.staffAssignments.staffId, staffId),
            isNull(schema.staffAssignments.archivedAt),
            eq(schema.classes.academicYearId, academicYearId),
            isNull(schema.classes.archivedAt),
          ),
        );
      taughtClassIds = rows.map((row) => row.id);
    }
  }

  return {
    userId: user.id,
    schoolId: user.schoolId,
    roles,
    staffId,
    academicYearId,
    formClassIds,
    taughtClassIds,
  };
}

/**
 * Sign-in and permission checks for every route. Registered on the root instance so the hooks
 * apply everywhere. Order per request: who are you (401) → may your roles do this at all (403).
 * Which students it reaches is the service's job (see access.ts).
 */
export function registerAuth(app: FastifyInstance, deps: AuthDeps): void {
  app.decorateRequest('auth', null);

  // Fail at startup, not in production, if someone adds a route and forgets its permission.
  app.addHook('onRoute', (route) => {
    // @fastify/cors answers browser preflights on `OPTIONS *`. Browsers never send a login
    // with a preflight, so that one route is public by nature.
    if (route.method === 'OPTIONS' && route.url === '*') {
      route.config = { ...route.config, public: true };
      return;
    }
    if (route.config?.public !== true && route.config?.permission === undefined) {
      throw new Error(`Route ${String(route.method)} ${route.url} must declare config.permission`);
    }
  });

  app.addHook('onRequest', async (request) => {
    const config = request.routeOptions.config;
    // Unknown URLs go to the 404 handler without a sign-in check.
    if (request.is404 || config.public === true) {
      return;
    }

    const token = bearerToken(request);
    if (token === null) {
      throw unauthorized();
    }
    const authUserId = await verifyToken(token, deps);
    const user = await loadUser(deps, authUserId);
    if (user === null) {
      throw forbidden('Your login is not linked to a staff account yet. Please ask the office.');
    }
    request.auth = user;

    const needed = config.permission;
    const actions: readonly Action[] =
      needed === undefined ? [] : typeof needed === 'string' ? [needed] : needed;
    if (!actions.some((action) => can(user.roles, action))) {
      throw forbidden();
    }
  });
}
