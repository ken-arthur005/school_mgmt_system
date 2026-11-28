import { type Tx, withActor } from '@school-mgmt/db';
import {
  can,
  type FamilyAddChild,
  type FamilyCreate,
  type FamilyDetail,
  type FamilyListQuery,
  type FamilyListResponse,
  type FamilySearch,
  type SiblingAdd,
  type StudentDetail,
} from '@school-mgmt/shared';
import type { AuthUser } from '../../access';
import { ApiError, badRequest, forbidden, notFound } from '../../plugins/errors';
import { type PhotoLinker, photoLinks, type Services } from '../../services';
import * as links from '../links/repo';
import { getStudent, studentToChange } from '../students/service';
import * as repo from './repo';

type ChildRow = Awaited<ReturnType<typeof repo.listChildren>>[number];

const toChild = (link: PhotoLinker) => (row: ChildRow) => ({
  studentId: row.studentId,
  admissionNumber: row.admissionNumber,
  surname: row.surname,
  firstName: row.firstName,
  status: row.status,
  className: row.className,
  photoUrl: link(row.photoPath),
});

async function findFamilies(
  services: Services,
  user: AuthUser,
  query: FamilyListQuery,
  search: string | null,
): Promise<FamilyListResponse> {
  const { schoolId } = user;
  const { items, total } = await repo.listFamilies(services.db, { schoolId, ...query, search });
  const children = await repo.listChildren(services.db, {
    schoolId,
    familyIds: items.map((family) => family.id),
    academicYearId: user.academicYearId,
  });
  const link = await photoLinks(
    services,
    children.map((child) => child.photoPath),
  );
  return {
    items: items.map((family) => ({
      ...family,
      children: children.filter((child) => child.familyId === family.id).map(toChild(link)),
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export function listFamilies(services: Services, user: AuthUser, query: FamilyListQuery) {
  return findFamilies(services, user, query, null);
}

export function searchFamilies(services: Services, user: AuthUser, body: FamilySearch) {
  const { q, ...query } = body;
  return findFamilies(services, user, query, q);
}

export async function getFamily(
  services: Services,
  user: AuthUser,
  id: string,
): Promise<FamilyDetail> {
  const { schoolId } = user;
  const family = await repo.findFamily(services.db, { schoolId, id });
  if (family === null) throw notFound('We could not find this family.');
  const [children, guardianRows] = await Promise.all([
    repo.listChildren(services.db, {
      schoolId,
      familyIds: [id],
      academicYearId: user.academicYearId,
    }),
    repo.listFamilyGuardians(services.db, { schoolId, familyId: id }),
  ]);
  const link = await photoLinks(services, [
    ...children.map((child) => child.photoPath),
    ...guardianRows.map((row) => row.photoPath),
  ]);

  const guardians = new Map<string, FamilyDetail['guardians'][number]>();
  for (const row of guardianRows) {
    const guardian = guardians.get(row.guardianId) ?? {
      guardianId: row.guardianId,
      surname: row.surname,
      firstName: row.firstName,
      primaryPhone: row.primaryPhone,
      photoUrl: link(row.photoPath),
      children: [],
    };
    guardian.children.push({
      studentId: row.studentId,
      firstName: row.childFirstName,
      relationship: row.relationship,
      isMainContact: row.isMainContact,
    });
    guardians.set(row.guardianId, guardian);
  }

  return {
    id: family.id,
    name: family.name,
    children: children.map(toChild(link)),
    guardians: [...guardians.values()],
  };
}

/**
 * Locks the students and puts them in the family. A child already in another family is only moved
 * when the caller says so.
 */
async function joinFamily(
  tx: Tx,
  user: AuthUser,
  params: { familyId: string; studentIds: string[]; move: boolean },
): Promise<void> {
  const { schoolId } = user;
  const found = await repo.lockStudents(tx, { schoolId, ids: params.studentIds });
  if (found.length !== new Set(params.studentIds).size) {
    throw notFound('We could not find one of these students.');
  }
  const elsewhere = found.filter(
    (student) => student.familyId !== null && student.familyId !== params.familyId,
  );
  if (elsewhere.length > 0 && !params.move) {
    throw new ApiError(
      409,
      'in_other_family',
      'This child is already in another family. Move them to this one?',
      { studentIds: elsewhere.map((student) => student.id) },
    );
  }
  await repo.setFamily(tx, { schoolId, studentIds: params.studentIds, familyId: params.familyId });
}

const familyNameFor = (surname: string) => `${surname} family`;

export async function createFamily(
  services: Services,
  user: AuthUser,
  body: FamilyCreate,
): Promise<FamilyDetail> {
  const { schoolId } = user;
  await withActor(services.db, { userId: user.userId }, async (tx) => {
    if (await repo.familyIdTaken(tx, body.id)) {
      // A retried save, unless the id belongs to someone else's school.
      if ((await repo.findFamily(tx, { schoolId, id: body.id })) !== null) return;
      throw new ApiError(409, 'id_in_use', 'This could not be saved. Please try again.');
    }
    const [first] = await repo.lockStudents(tx, {
      schoolId,
      ids: body.studentIds.slice(0, 1),
    });
    if (first === undefined) throw notFound('We could not find one of these students.');
    await repo.insertFamily(tx, {
      id: body.id,
      schoolId,
      createdBy: user.userId,
      name: body.name ?? familyNameFor(first.surname),
    });
    await joinFamily(tx, user, {
      familyId: body.id,
      studentIds: body.studentIds,
      move: body.move,
    });
  });
  return getFamily(services, user, body.id);
}

export async function renameFamily(
  services: Services,
  user: AuthUser,
  id: string,
  name: string,
): Promise<FamilyDetail> {
  const { schoolId } = user;
  if ((await repo.findFamily(services.db, { schoolId, id })) === null) {
    throw notFound('We could not find this family.');
  }
  await withActor(services.db, { userId: user.userId }, (tx) =>
    repo.renameFamily(tx, { schoolId, id, name }),
  );
  return getFamily(services, user, id);
}

export async function addChild(
  services: Services,
  user: AuthUser,
  familyId: string,
  body: FamilyAddChild,
): Promise<FamilyDetail> {
  const { schoolId } = user;
  if ((await repo.findFamily(services.db, { schoolId, id: familyId })) === null) {
    throw notFound('We could not find this family.');
  }
  await withActor(services.db, { userId: user.userId }, (tx) =>
    joinFamily(tx, user, { familyId, studentIds: [body.studentId], move: body.move }),
  );
  return getFamily(services, user, familyId);
}

export async function removeChild(
  services: Services,
  user: AuthUser,
  familyId: string,
  studentId: string,
): Promise<FamilyDetail> {
  const { schoolId } = user;
  if ((await repo.findFamily(services.db, { schoolId, id: familyId })) === null) {
    throw notFound('We could not find this family.');
  }
  await withActor(services.db, { userId: user.userId }, async (tx) => {
    const [student] = await repo.lockStudents(tx, { schoolId, ids: [studentId] });
    if (student === undefined) throw notFound('We could not find this student.');
    // Already removed (a retry) or moved elsewhere since: leave it be.
    if (student.familyId !== familyId) return;
    await repo.setFamily(tx, { schoolId, studentIds: [studentId], familyId: null });
  });
  return getFamily(services, user, familyId);
}

/** Gives the brother or sister the student's guardians they don't have yet, without consent. */
async function shareGuardians(
  tx: Tx,
  user: AuthUser,
  fromStudentId: string,
  toStudentId: string,
): Promise<void> {
  const { schoolId } = user;
  const theirs = await links.listActiveLinks(tx, { schoolId, studentId: toStudentId });
  const have = new Set(theirs.map((link) => link.guardianId));
  const source = await links.listActiveLinks(tx, { schoolId, studentId: fromStudentId });
  for (const link of source.filter((candidate) => !have.has(candidate.guardianId))) {
    await links.insertLink(tx, {
      schoolId,
      createdBy: user.userId,
      studentId: toStudentId,
      guardianId: link.guardianId,
      relationship: link.relationship,
      // Only when the child had nobody at all does the main contact carry over.
      isMainContact: theirs.length === 0 && link.isMainContact,
      whatsappOptIn: false,
      whatsappOptInAt: null,
    });
  }
}

/** "Add a brother or sister": puts both children in one family, creating it if needed. */
export async function addSibling(
  services: Services,
  user: AuthUser,
  studentId: string,
  body: SiblingAdd,
): Promise<StudentDetail> {
  if (body.siblingId === studentId) {
    throw badRequest('Choose a different student.');
  }
  if (body.linkGuardians && !can(user.roles, 'guardians.link')) throw forbidden();
  await studentToChange(services, user, studentId, 'families.manage');
  await studentToChange(services, user, body.siblingId, 'families.manage');
  const { schoolId } = user;

  await withActor(services.db, { userId: user.userId }, async (tx) => {
    const found = await repo.lockStudents(tx, { schoolId, ids: [studentId, body.siblingId] });
    const student = found.find((row) => row.id === studentId);
    const sibling = found.find((row) => row.id === body.siblingId);
    if (student === undefined || sibling === undefined) {
      throw notFound('We could not find one of these students.');
    }

    // The student's family wins; otherwise the brother or sister's; otherwise a new one.
    let familyId = student.familyId ?? sibling.familyId;
    if (familyId === null) {
      if (await repo.familyIdTaken(tx, body.newFamilyId)) {
        throw new ApiError(409, 'id_in_use', 'This could not be saved. Please try again.');
      }
      familyId = body.newFamilyId;
      await repo.insertFamily(tx, {
        id: familyId,
        schoolId,
        createdBy: user.userId,
        name: familyNameFor(student.surname),
      });
    }
    await joinFamily(tx, user, {
      familyId,
      studentIds: [studentId, body.siblingId],
      move: body.move,
    });
    if (body.linkGuardians) {
      await shareGuardians(tx, user, studentId, body.siblingId);
    }
  });
  return getStudent(services, user, studentId);
}
