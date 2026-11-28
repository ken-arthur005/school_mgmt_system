import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Without internet, fail with a clear message instead of waiting silently.
        networkMode: 'always',
        // Asking again can't change a refusal.
        retry: (failures, error) => !(error instanceof ApiError) && failures < 2,
      },
      mutations: { networkMode: 'always', retry: false },
    },
  });
}
