import { useQuery } from '@tanstack/react-query';
import {
  type Action,
  can,
  classListResponseSchema,
  homeSummarySchema,
  type Me,
  meSchema,
  reachFor,
} from '@school-mgmt/shared';
import { api } from '@/lib/api';

export const meQuery = {
  queryKey: ['me'],
  queryFn: ({ signal }: { signal: AbortSignal }) => api('/me', meSchema, { signal }),
  staleTime: 5 * 60_000,
};

export const useMe = () => useQuery(meQuery);

export const useHomeSummary = () =>
  useQuery({
    queryKey: ['home'],
    queryFn: ({ signal }) => api('/home/summary', homeSummarySchema, { signal }),
  });

export const useClasses = (enabled = true) =>
  useQuery({
    queryKey: ['classes'],
    queryFn: ({ signal }) => api('/classes', classListResponseSchema, { signal }),
    enabled,
  });

/** Whether to show a button. Cosmetic only: the API decides (Golden rule 4). */
export function useCan(action: Action): boolean {
  const me = useMe();
  return me.data !== undefined && can(me.data.roles, action);
}

/**
 * Whether the user's permission covers a student in this class: office roles cover everyone, a
 * class teacher only their own class.
 */
export function coversClass(me: Me, action: Action, className: string | null): boolean {
  const reaches = reachFor(me.roles, action);
  if (reaches.includes('school')) return true;
  return reaches.includes('form_classes') && me.formClasses.some((c) => c.name === className);
}
