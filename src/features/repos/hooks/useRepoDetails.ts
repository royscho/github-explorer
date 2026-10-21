import {
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import { useCallback } from 'react';

import { ApiError, isGitHubApiError, type GitHubApiError } from '@shared/api';

import type { OrgReposPage } from '../api/endpoints';
import { fetchRepoDetails } from '../api/endpoints';
import { repoKeys } from '../api/queryKeys';
import type { RepoDetails } from '../types';

export interface UseRepoDetailsResult {
  repoDetails: RepoDetails | undefined;
  status: 'pending' | 'error' | 'success';
  error: GitHubApiError | null;
  isPlaceholderData: boolean;
  isRefetching: boolean;
  refetch: () => void;
  // See `useOrgRepos`'s `isPaused` — same reasoning: a first open of a repo with no cached list
  // item to use as placeholder data would otherwise sit in `status: 'pending'` forever while
  // offline, with nothing to show.
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

// Route params are IDs only (no full `Repo` object), so the only way to reuse a list item the
// user already has on screen as placeholder data is to look for it in whatever org-repo-list
// queries are already cached. `repoKeys.lists()` matches only those (not detail queries, which
// share the same `repoKeys.all` root) — see the repoKeys factory. The `Array.isArray` guard is
// defensive: it assumes every query under that prefix is `InfiniteData<OrgReposPage>`-shaped,
// which holds today (it's the only query under that prefix) but isn't enforced by the type system.
function findCachedRepo(
  queryClient: QueryClient,
  owner: string,
  repo: string,
): RepoDetails | undefined {
  const fullName = `${owner}/${repo}`.toLowerCase();
  const listQueries = queryClient.getQueriesData<
    InfiniteData<OrgReposPage, number>
  >({
    queryKey: repoKeys.lists(),
  });

  for (const [, data] of listQueries) {
    if (!Array.isArray(data?.pages)) {
      continue;
    }
    const match = data.pages
      .flatMap(page => page.repos)
      .find(item => item.fullName.toLowerCase() === fullName);
    if (match) {
      return { ...match, defaultBranch: '', license: null, watchers: 0 };
    }
  }
  return undefined;
}

export function useRepoDetails(
  owner: string,
  repo: string,
): UseRepoDetailsResult {
  const queryClient = useQueryClient();

  const query = useQuery<RepoDetails>({
    queryKey: repoKeys.detail(owner, repo),
    queryFn: ({ signal }) => fetchRepoDetails(owner, repo, signal),
    placeholderData: () => findCachedRepo(queryClient, owner, repo),
  });

  const { refetch: queryRefetch } = query;
  const refetch = useCallback(() => {
    queryRefetch();
  }, [queryRefetch]);

  return {
    repoDetails: query.data,
    status: query.status,
    error: toGitHubApiError(query.error),
    isPlaceholderData: query.isPlaceholderData,
    // `placeholderData` makes React Query report `status: 'success'` (not `'pending'`) while the
    // real fetch is still in flight, which makes `isRefetching` (`isFetching && !isPending`) true
    // too — without this guard, every navigation from a cached list would show the pull-to-refresh
    // spinner on top of the screen's own placeholder UI.
    isRefetching: query.isRefetching && !query.isPlaceholderData,
    refetch,
    isPaused: query.status === 'pending' && query.fetchStatus === 'paused',
  };
}
