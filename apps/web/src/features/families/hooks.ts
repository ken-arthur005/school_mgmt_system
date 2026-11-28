import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  type FamilyDetail,
  familyDetailSchema,
  familyListResponseSchema,
} from '@school-mgmt/shared';
import { api } from '@/lib/api';
import { useSave } from '@/lib/use-save';

export const FAMILY_PAGE_SIZE = 30;

/** All families a page at a time, or those matching a family or child name. */
export const useFamilies = (q: string, page: number) =>
  useQuery({
    queryKey: ['families', q, page],
    queryFn: ({ signal }) =>
      q === ''
        ? api(`/families?page=${page}&pageSize=${FAMILY_PAGE_SIZE}`, familyListResponseSchema, {
            signal,
          })
        : api('/families/search', familyListResponseSchema, {
            method: 'POST',
            body: { q, page, pageSize: FAMILY_PAGE_SIZE },
            signal,
          }),
    placeholderData: keepPreviousData,
  });

export const useFamily = (id: string) =>
  useQuery({
    queryKey: ['family', id],
    queryFn: ({ signal }) => api(`/families/${id}`, familyDetailSchema, { signal }),
  });

function useFamilyChange<Input>(
  path: (input: Input) => string,
  method: 'POST' | 'PATCH',
  body: (input: Input) => unknown,
) {
  return useSave(
    (input: Input) => api(path(input), familyDetailSchema, { method, body: body(input) }),
    (family: FamilyDetail) => ['family', family.id],
  );
}

export const useRenameFamily = (id: string) =>
  useFamilyChange<{ name: string }>(
    () => `/families/${id}`,
    'PATCH',
    (change) => change,
  );

export const useAddFamilyChild = (id: string) =>
  useFamilyChange<{ studentId: string; move: boolean }>(
    () => `/families/${id}/students`,
    'POST',
    (change) => change,
  );

export const useRemoveFamilyChild = (id: string) =>
  useFamilyChange<{ studentId: string }>(
    ({ studentId }) => `/families/${id}/students/${studentId}/remove`,
    'POST',
    () => undefined,
  );
