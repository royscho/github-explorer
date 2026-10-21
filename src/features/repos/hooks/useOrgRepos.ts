import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { useCallback } from 'react';

import { ApiError, isGitHubApiError, type GitHubApiError } from '@shared/api';

import type { OrgReposPage } from '../api/endpoints';
import { fetchOrgRepos } from '../api/endpoints';
import { repoKeys } from '../api/queryKeys';
import type { Repo } from '../types';

export interface UseOrgReposResult {
  repos: Repo[];
  status: 'pending' | 'error' | 'success';
  error: GitHubApiError | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
  isRefetching: boolean;
  isRefetchError: boolean;
  // React Query *pauses* rather than fails a fetch while offline (§11/§10.3's `onlineManager`
  // wiring) — a first search for an org with nothing cached yet would otherwise sit in
  // `status: 'pending'` forever with no error to show. `true` only while there's nothing to show
  // for it yet (`status === 'pending'`); a paused *background* refetch over already-loaded repos
  // is exactly the "keep showing the last successful data" case §11 wants, not an error state.
  isPaused: boolean;
}

function toGitHubApiError(error: unknown): GitHubApiError | null {
  if (error === null) {
    return null;
  }
  if (isGitHubApiError(error)) {
    return error;
  }
  return new ApiError(0, String(error));
}

function selectRepos(data: InfiniteData<OrgReposPage, number>): Repo[] {
  return data.pages.flatMap(page => page.repos);
}

export function useOrgRepos(org: string): UseOrgReposResult {
  const query = useInfiniteQuery({
    queryKey: repoKeys.orgList(org),
    queryFn: ({ pageParam, signal }) => fetchOrgRepos(org, pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) =>
      lastPage.hasNextPage ? pages.length + 1 : undefined,
    enabled: Boolean(org),
    select: selectRepos,
  });

  const { fetchNextPage: queryFetchNextPage, refetch: queryRefetch } = query;

  const fetchNextPage = useCallback(() => {
    queryFetchNextPage();
  }, [queryFetchNextPage]);

  const refetch = useCallback(() => {
    queryRefetch();
  }, [queryRefetch]);

  return {
    repos: query.data ?? [],
    status: query.status,
    error: toGitHubApiError(query.error),
    hasNextPage: Boolean(query.hasNextPage),
    isFetchingNextPage: query.isFetchingNextPage,
    isFetchNextPageError: query.isFetchNextPageError,
    fetchNextPage,
    refetch,
    isRefetching: query.isRefetching,
    isRefetchError: query.isRefetchError,
    isPaused: query.status === 'pending' && query.fetchStatus === 'paused',
  };
}
