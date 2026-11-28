import { withActor } from '@school-mgmt/db';
import {
  type Action,
  type MedicalNoteCreate,
  type StudentDetail,
  type StudentEdit,
  type StudentListQuery,
  type StudentListResponse,
  type StudentSearch,
  tryNormalizeGhanaPhone,
} from '@school-mgmt/shared';
import { type AuthUser, studentReach } from '../../access';
import { ApiError, badRequest, forbidden, notFound } from '../../plugins/errors';
import { photoLinks, type Services } from '../../services';
import * as repo from './repo';

const NOT_YOUR_STUDENT = 'This student is not in one of your classes.';

async function findStudents(
  services: Services,
  user: AuthUser,
  query: StudentListQuery,
  search: repo.SearchText | null,
): Promise<StudentListResponse> {
  const reach = studentReach(user, 'students.read');
  if (reach === null) throw forbidden();
  const { items, total } = await repo.listStudents(services.db, {
    schoolId: user.schoolId,
    academicYearId: user.academicYearId,
    reach,
    query,
    search,
  });
  const link = await photoLinks(
    services,
    items.map((item) => item.photoPath),
  );
  return {
    items: items.map(({ photoPath, ...item }) => ({ ...item, photoUrl: link(photoPath) })),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export function listStudents(services: Services, user: AuthUser, query: StudentListQuery) {
  return findStudents(services, user, query, null);
}

export function searchStudents(services: Services, user: AuthUser, body: StudentSearch) {
  const { q, ...query } = body;
  return findStudents(services, user, query, { text: q, phone: tryNormalizeGhanaPhone(q) });
}

/** 404 when there's no such student in this school; 403 when it exists but is out of reach. */
export async function getStudent(
  services: Services,
  user: AuthUser,
  id: string,
): Promise<StudentDetail> {
  const { db } = services;
  const student = await repo.findStudent(db, { schoolId: user.schoolId, id });
  if (student === null) throw notFound('We could not find this student.');
  const readReach = studentReach(user, 'students.read');
  if (
    readReach === null ||
    !(await repo.isStudentInReach(db, { studentId: id, reach: readReach }))
  ) {
    throw forbidden(NOT_YOUR_STUDENT);
  }

  const scope = { schoolId: user.schoolId, studentId: id };
  const [currentEnrolment, seesGuardians, seesMedical, family, siblings] = await Promise.all([
    repo.findCurrentEnrolment(db, { studentId: id, academicYearId: user.academicYearId }),
    repo.isStudentInReach(db, { studentId: id, reach: studentReach(user, 'guardians.read') }),
    repo.isStudentInReach(db, { studentId: id, reach: studentReach(user, 'medical_notes.read') }),
    repo.findFamily(db, { schoolId: user.schoolId, familyId: student.familyId }),
    repo.listSiblings(db, {
      ...scope,
      familyId: student.familyId,
      academicYearId: user.academicYearId,
      reach: readReach,
    }),
  ]);
  const guardianLinks = seesGuardians ? await repo.listGuardianLinks(db, scope) : null;
  const medicalNotes = seesMedical ? await repo.listMedicalNotes(db, scope) : null;
  const link = await photoLinks(services, [
    student.photoPath,
    ...siblings.map((sibling) => sibling.photoPath),
    ...(guardianLinks ?? []).map((guardian) => guardian.photoPath),
  ]);

  return {
    id: student.id,
    admissionNumber: student.admissionNumber,
    surname: student.surname,
    firstName: student.firstName,
    otherNames: student.otherNames,
    sex: student.sex,
    dateOfBirth: student.dateOfBirth,
    admittedOn: student.admittedOn,
    status: student.status,
    religion: student.religion,
    ghanaCardNumber: student.ghanaCardNumber,
    nhisNumber: student.nhisNumber,
    archivedAt: student.archivedAt?.toISOString() ?? null,
    photoUrl: link(student.photoPath),
    family,
    siblings: siblings.map(({ photoPath, ...sibling }) => ({
      ...sibling,
      photoUrl: link(photoPath),
    })),
    currentEnrolment,
    ...(guardianLinks === null
      ? {}
      : {
          guardians: guardianLinks.map(({ photoPath, ...guardian }) => ({
            ...guardian,
            photoUrl: link(photoPath),
          })),
        }),
    ...(medicalNotes === null
      ? {}
      : {
          medicalNotes: medicalNotes.map((note) => ({
            ...note,
            createdAt: note.createdAt.toISOString(),
          })),
        }),
  };
}

/**
 * The student, if the caller may change them in this way: 404 unknown, 403 out of reach, 409
 * archived.
 */
export async function studentToChange(
  services: Services,
  user: AuthUser,
  id: string,
  action: Action,
) {
  const student = await repo.findStudent(services.db, { schoolId: user.schoolId, id });
  if (student === null) throw notFound('We could not find this student.');
  const allowed = await repo.isStudentInReach(services.db, {
    studentId: id,
    reach: studentReach(user, action),
  });
  if (!allowed) throw forbidden(NOT_YOUR_STUDENT);
  if (student.archivedAt !== null) {
    throw new ApiError(409, 'archived', 'This student record is archived and cannot be changed.');
  }
  return student;
}

export async function editStudent(
  services: Services,
  user: AuthUser,
  id: string,
  changes: StudentEdit,
): Promise<StudentDetail> {
  const student = await studentToChange(services, user, id, 'students.edit');
  const dateOfBirth = changes.dateOfBirth ?? student.dateOfBirth;
  if (dateOfBirth >= student.admittedOn) {
    throw badRequest('Date of birth must be before the date the student was admitted.', [
      { path: '/dateOfBirth', message: 'Must be before the admission date.' },
    ]);
  }

  await withActor(services.db, { userId: user.userId }, (tx) =>
    repo.updateStudent(tx, { schoolId: user.schoolId, id, changes }),
  );
  return getStudent(services, user, id);
}

export async function addMedicalNote(
  services: Services,
  user: AuthUser,
  studentId: string,
  body: MedicalNoteCreate,
): Promise<StudentDetail> {
  await studentToChange(services, user, studentId, 'medical_notes.edit');
  await withActor(services.db, { userId: user.userId }, async (tx) => {
    await repo.addMedicalNote(tx, {
      ...body,
      studentId,
      schoolId: user.schoolId,
      createdBy: user.userId,
    });
    const saved = await repo.findMedicalNote(tx, { schoolId: user.schoolId, id: body.id });
    if (saved?.studentId !== studentId) {
      throw new ApiError(409, 'id_in_use', 'This note could not be saved. Please try again.');
    }
  });
  return getStudent(services, user, studentId);
}

/** Takes a note off the record (or puts it back). Notes are never edited or deleted. */
export async function setMedicalNoteArchived(
  services: Services,
  user: AuthUser,
  noteId: string,
  archivedAt: Date | null,
): Promise<StudentDetail> {
  const note = await repo.findMedicalNote(services.db, { schoolId: user.schoolId, id: noteId });
  if (note === null) throw notFound('We could not find this note.');
  await studentToChange(services, user, note.studentId, 'medical_notes.edit');
  if ((note.archivedAt === null) !== (archivedAt === null)) {
    await withActor(services.db, { userId: user.userId }, (tx) =>
      repo.setMedicalNoteArchived(tx, { schoolId: user.schoolId, id: noteId, archivedAt }),
    );
  }
  return getStudent(services, user, note.studentId);
}
