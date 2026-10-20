import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { fetchRepoDetails } from '../api/endpoints';
import { repoKeys } from '../api/queryKeys';
import type { RepoDetails } from '../types';
import { usePrefetchRepoDetails } from './usePrefetchRepoDetails';

jest.mock('../api/endpoints');

const mockFetchRepoDetails = fetchRepoDetails as jest.MockedFunction<
  typeof fetchRepoDetails
>;

const repoDetails: RepoDetails = {
  id: 1,
  name: 'react',
  fullName: 'facebook/react',
  owner: { login: 'facebook', avatarUrl: '', htmlUrl: '' },
  description: null,
  htmlUrl: 'https://github.com/facebook/react',
  language: null,
  stars: 0,
  forks: 0,
  openIssues: 0,
  watchers: 0,
  createdAt: '2020-01-01T00:00:00Z',
  updatedAt: '2020-01-01T00:00:00Z',
  defaultBranch: 'main',
  license: null,
};

function createWrapper(queryClient: QueryClient) {
  return function wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('usePrefetchRepoDetails', () => {
  beforeEach(() => {
    mockFetchRepoDetails.mockReset();
  });

  it('populates the query cache for the given owner/repo', async () => {
    mockFetchRepoDetails.mockResolvedValue(repoDetails);
    const queryClient = new QueryClient();
    const { result } = await renderHook(() => usePrefetchRepoDetails(), {
      wrapper: createWrapper(queryClient),
    });

    result.current('facebook', 'react');

    await waitFor(() =>
      expect(
        queryClient.getQueryData(repoKeys.detail('facebook', 'react')),
      ).toEqual(repoDetails),
    );
  });

  it('does not refetch a second time for the same owner/repo while still fresh', async () => {
    // Matches production's `createQueryClient()` default `staleTime` (`app/providers/queryClient.ts`)
    // — a bare `new QueryClient()` has `staleTime: 0`, which would always refetch and not
    // exercise the dedup behavior this test is checking.
    mockFetchRepoDetails.mockResolvedValue(repoDetails);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { staleTime: 5 * 60 * 1000 } },
    });
    const { result } = await renderHook(() => usePrefetchRepoDetails(), {
      wrapper: createWrapper(queryClient),
    });

    result.current('facebook', 'react');
    await waitFor(() => expect(mockFetchRepoDetails).toHaveBeenCalledTimes(1));

    result.current('facebook', 'react');
    await waitFor(() => expect(mockFetchRepoDetails).toHaveBeenCalledTimes(1));
  });
});
