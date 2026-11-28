import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  type guardianLinkCreateSchema,
  type GuardianLinkEdit,
  type MedicalNoteCreate,
  type SiblingAdd,
  type StudentDetail,
  studentDetailSchema,
  type StudentEdit,
  studentListResponseSchema,
} from '@school-mgmt/shared';
import type { z } from 'zod';
import { api } from '@/lib/api';
import { useSave } from '@/lib/use-save';

export const studentQuery = (id: string) => ({
  queryKey: ['student', id],
  queryFn: ({ signal }: { signal: AbortSignal }) =>
    api(`/students/${id}`, studentDetailSchema, { signal }),
});

export const useStudent = (id: string) => useQuery(studentQuery(id));

/** Search by name, admission number or a guardian's phone. Waits for something to search for. */
export const useStudentSearch = (q: string) =>
  useQuery({
    queryKey: ['students', 'search', q],
    queryFn: ({ signal }) =>
      api('/students/search', studentListResponseSchema, {
        method: 'POST',
        body: { q, pageSize: 25 },
        signal,
      }),
    enabled: q !== '',
    placeholderData: keepPreviousData,
  });

/** A whole class list (the largest class has well under 100 students). */
export const useClassStudents = (classId: string) =>
  useQuery({
    queryKey: ['students', 'class', classId],
    queryFn: ({ signal }) =>
      api(`/students?classId=${classId}&pageSize=100`, studentListResponseSchema, { signal }),
  });

/** A change to one student that answers with their updated profile. */
function useStudentChange<Input>(
  path: (input: Input) => string,
  method: 'POST' | 'PATCH',
  body: (input: Input) => unknown,
) {
  return useSave(
    (input: Input) => api(path(input), studentDetailSchema, { method, body: body(input) }),
    (student: StudentDetail) => ['student', student.id],
  );
}

export const useEditStudent = (id: string) =>
  useStudentChange<StudentEdit>(
    () => `/students/${id}`,
    'PATCH',
    (changes) => changes,
  );

export const useAddMedicalNote = (studentId: string) =>
  useStudentChange<MedicalNoteCreate>(
    () => `/students/${studentId}/medical-notes`,
    'POST',
    (note) => note,
  );

export const useArchiveMedicalNote = () =>
  useStudentChange<{ noteId: string; undo?: boolean }>(
    ({ noteId, undo }) => `/medical-notes/${noteId}/${undo ? 'restore' : 'archive'}`,
    'POST',
    () => undefined,
  );

export const useAddGuardianLink = (studentId: string) =>
  useStudentChange<z.input<typeof guardianLinkCreateSchema>>(
    () => `/students/${studentId}/guardians`,
    'POST',
    (link) => link,
  );

export const useEditGuardianLink = () =>
  useStudentChange<{ linkId: string; changes: GuardianLinkEdit }>(
    ({ linkId }) => `/student-guardians/${linkId}`,
    'PATCH',
    ({ changes }) => changes,
  );

export const useRemoveGuardianLink = () =>
  useStudentChange<{ linkId: string; undo?: boolean }>(
    ({ linkId, undo }) => `/student-guardians/${linkId}/${undo ? 'restore' : 'archive'}`,
    'POST',
    () => undefined,
  );

export const useAddSibling = (studentId: string) =>
  useStudentChange<SiblingAdd>(
    () => `/students/${studentId}/siblings`,
    'POST',
    (sibling) => sibling,
  );
