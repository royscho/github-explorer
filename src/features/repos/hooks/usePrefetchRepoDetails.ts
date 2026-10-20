import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { fetchRepoDetails } from '../api/endpoints';
import { repoKeys } from '../api/queryKeys';

export function usePrefetchRepoDetails(): (
  owner: string,
  repo: string,
) => void {
  const queryClient = useQueryClient();

  return useCallback(
    (owner: string, repo: string) => {
      queryClient.prefetchQuery({
        queryKey: repoKeys.detail(owner, repo),
        queryFn: ({ signal }) => fetchRepoDetails(owner, repo, signal),
      });
    },
    [queryClient],
  );
}
