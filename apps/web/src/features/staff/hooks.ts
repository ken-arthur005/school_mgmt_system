import { useQuery } from '@tanstack/react-query';
import { staffDetailSchema, staffListResponseSchema } from '@school-mgmt/shared';
import { api } from '@/lib/api';

export const useStaffList = () =>
  useQuery({
    queryKey: ['staff'],
    queryFn: ({ signal }) => api('/staff', staffListResponseSchema, { signal }),
  });

export const useStaffMember = (id: string) =>
  useQuery({
    queryKey: ['staff', id],
    queryFn: ({ signal }) => api(`/staff/${id}`, staffDetailSchema, { signal }),
  });
