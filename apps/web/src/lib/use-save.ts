import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * A change sent to the API. Afterwards every loaded screen refreshes, because one change shows in
 * several places (a guardian's phone appears on each child's profile and in search).
 */
export function useSave<Input, Result>(
  send: (input: Input) => Promise<Result>,
  /** Where the answer belongs, so the screen updates at once. */
  cacheAs?: (result: Result) => readonly unknown[],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: send,
    onSuccess: (result) => {
      if (cacheAs !== undefined) queryClient.setQueryData(cacheAs(result), result);
      void queryClient.invalidateQueries();
    },
  });
}
