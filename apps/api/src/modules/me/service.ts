import type { ClassListResponse, HomeSummary, Me } from '@school-mgmt/shared';
import { type AuthUser, studentReach } from '../../access';
import { forbidden, notFound } from '../../plugins/errors';
import { photoLinks, type Services } from '../../services';
import * as repo from './repo';

export async function getMe(services: Services, user: AuthUser): Promise<Me> {
  const { db } = services;
  const { schoolId } = user;
  const profile = await repo.findProfile(db, { schoolId, userId: user.userId });
  if (profile === null) throw notFound();
  const [academicYearName, formClasses, taughtClasses, link] = await Promise.all([
    repo.findAcademicYearName(db, user.academicYearId),
    repo.listClassNames(db, { schoolId, ids: user.formClassIds }),
    repo.listClassNames(db, { schoolId, ids: user.taughtClassIds }),
    photoLinks(services, [profile.photoPath]),
  ]);
  return {
    userId: user.userId,
    displayName: profile.displayName,
    roles: user.roles,
    school: { name: profile.schoolName, shortName: profile.schoolShortName },
    staffId: user.staffId,
    jobTitle: profile.jobTitle,
    photoUrl: link(profile.photoPath),
    academicYearName,
    formClasses,
    taughtClasses,
  };
}

async function visibleClasses(services: Services, user: AuthUser) {
  const reach = studentReach(user, 'students.read');
  if (reach === null || user.academicYearId === null) return [];
  return repo.listVisibleClasses(services.db, {
    schoolId: user.schoolId,
    academicYearId: user.academicYearId,
    reach,
  });
}

const isMine = (user: AuthUser, classId: string) => user.formClassIds.includes(classId);

export async function listClasses(services: Services, user: AuthUser): Promise<ClassListResponse> {
  if (studentReach(user, 'students.read') === null) throw forbidden();
  const rows = await visibleClasses(services, user);
  return {
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      studentCount: row.studentCount,
      formTeacherName: row.formTeacherName,
      isMyFormClass: isMine(user, row.id),
    })),
  };
}

export async function getHomeSummary(services: Services, user: AuthUser): Promise<HomeSummary> {
  if (studentReach(user, 'students.read') === null) {
    return { studentCount: null, classCount: null, myClasses: [] };
  }
  const rows = await visibleClasses(services, user);
  return {
    studentCount: rows.reduce((sum, row) => sum + row.studentCount, 0),
    classCount: rows.length,
    myClasses: rows
      .filter((row) => isMine(user, row.id))
      .map((row) => ({ id: row.id, name: row.name, studentCount: row.studentCount })),
  };
}
