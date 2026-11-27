import { type Db, withActor } from '@school-mgmt/db';
import {
  type StudentDetail,
  type StudentEdit,
  type StudentListQuery,
  type StudentListResponse,
  tryNormalizeGhanaPhone,
} from '@school-mgmt/shared';
import { type AuthUser, studentReach } from '../../access';
import { ApiError, badRequest, forbidden, notFound } from '../../plugins/errors';
import * as repo from './repo';

const NOT_YOUR_STUDENT = 'This student is not in one of your classes.';

export async function listStudents(
  db: Db,
  user: AuthUser,
  query: StudentListQuery,
): Promise<StudentListResponse> {
  const reach = studentReach(user, 'students.read');
  if (reach === null) throw forbidden();
  const phone = query.q === undefined ? null : tryNormalizeGhanaPhone(query.q);
  const { items, total } = await repo.listStudents(db, {
    schoolId: user.schoolId,
    academicYearId: user.academicYearId,
    reach,
    query,
    phone,
  });
  return { items, total, page: query.page, pageSize: query.pageSize };
}

/** 404 when there's no such student in this school; 403 when it exists but is out of reach. */
export async function getStudent(db: Db, user: AuthUser, id: string): Promise<StudentDetail> {
  const student = await repo.findStudent(db, { schoolId: user.schoolId, id });
  if (student === null) throw notFound('We could not find this student.');
  const canRead = await repo.isStudentInReach(db, {
    studentId: id,
    reach: studentReach(user, 'students.read'),
  });
  if (!canRead) throw forbidden(NOT_YOUR_STUDENT);

  const [currentEnrolment, seesGuardians, seesMedical] = await Promise.all([
    repo.findCurrentEnrolment(db, { studentId: id, academicYearId: user.academicYearId }),
    repo.isStudentInReach(db, { studentId: id, reach: studentReach(user, 'guardians.read') }),
    repo.isStudentInReach(db, { studentId: id, reach: studentReach(user, 'medical_notes.read') }),
  ]);
  const scope = { schoolId: user.schoolId, studentId: id };

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
    currentEnrolment,
    ...(seesGuardians ? { guardians: await repo.listGuardianLinks(db, scope) } : {}),
    ...(seesMedical
      ? {
          medicalNotes: (await repo.listMedicalNotes(db, scope)).map((note) => ({
            ...note,
            createdAt: note.createdAt.toISOString(),
          })),
        }
      : {}),
  };
}

export async function editStudent(
  db: Db,
  user: AuthUser,
  id: string,
  changes: StudentEdit,
): Promise<StudentDetail> {
  const student = await repo.findStudent(db, { schoolId: user.schoolId, id });
  if (student === null) throw notFound('We could not find this student.');
  const canEdit = await repo.isStudentInReach(db, {
    studentId: id,
    reach: studentReach(user, 'students.edit'),
  });
  if (!canEdit) throw forbidden();
  if (student.archivedAt !== null) {
    throw new ApiError(409, 'archived', 'This student record is archived and cannot be changed.');
  }
  const dateOfBirth = changes.dateOfBirth ?? student.dateOfBirth;
  if (dateOfBirth >= student.admittedOn) {
    throw badRequest('Date of birth must be before the date the student was admitted.', [
      { path: '/dateOfBirth', message: 'Must be before the admission date.' },
    ]);
  }

  await withActor(db, { userId: user.userId }, (tx) =>
    repo.updateStudent(tx, { schoolId: user.schoolId, id, changes }),
  );
  return getStudent(db, user, id);
}
