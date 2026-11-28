import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  type GuardianDetail,
  guardianDetailSchema,
  type guardianEditSchema,
  guardianListResponseSchema,
} from '@school-mgmt/shared';
import type { z } from 'zod';
import { api } from '@/lib/api';
import { useSave } from '@/lib/use-save';

export const useGuardian = (id: string) =>
  useQuery({
    queryKey: ['guardian', id],
    queryFn: ({ signal }) => api(`/guardians/${id}`, guardianDetailSchema, { signal }),
  });

export const useGuardianSearch = (q: string, enabled = true) =>
  useQuery({
    queryKey: ['guardians', 'search', q],
    queryFn: ({ signal }) =>
      api('/guardians/search', guardianListResponseSchema, {
        method: 'POST',
        body: { q, pageSize: 25 },
        signal,
      }),
    enabled: enabled && q !== '',
    placeholderData: keepPreviousData,
  });

export const useEditGuardian = (id: string) =>
  useSave(
    (changes: z.input<typeof guardianEditSchema>) =>
      api(`/guardians/${id}`, guardianDetailSchema, { method: 'PATCH', body: changes }),
    (guardian: GuardianDetail) => ['guardian', guardian.id],
  );
