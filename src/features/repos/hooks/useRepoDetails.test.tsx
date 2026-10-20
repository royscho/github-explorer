import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { NotFoundError } from '@shared/api';

import { fetchRepoDetails } from '../api/endpoints';
import { repoKeys } from '../api/queryKeys';
import type { OrgReposPage } from '../api/endpoints';
import type { Repo, RepoDetails } from '../types';
import { useRepoDetails } from './useRepoDetails';

jest.mock('../api/endpoints');

const mockFetchRepoDetails = fetchRepoDetails as jest.MockedFunction<
  typeof fetchRepoDetails
>;

function makeRepo(overrides: Partial<Repo> = {}): Repo {
  return {
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
    createdAt: '2020-01-01T00:00:00Z',
    updatedAt: '2020-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeRepoDetails(overrides: Partial<RepoDetails> = {}): RepoDetails {
  return {
    ...makeRepo(),
    defaultBranch: 'main',
    license: null,
    watchers: 0,
    ...overrides,
  };
}

function createQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function createWrapper(queryClient: QueryClient) {
  return function wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('useRepoDetails', () => {
  beforeEach(() => {
    mockFetchRepoDetails.mockReset();
  });

  it('starts pending with no placeholder when nothing is cached', async () => {
    mockFetchRepoDetails.mockReturnValue(new Promise(() => {}));
    const queryClient = createQueryClient();
    const { result } = await renderHook(
      () => useRepoDetails('facebook', 'react'),
      { wrapper: createWrapper(queryClient) },
    );
    expect(result.current.status).toBe('pending');
    expect(result.current.repoDetails).toBeUndefined();
    expect(result.current.isPlaceholderData).toBe(false);
  });

  it('resolves to the fetched repo details on success', async () => {
    mockFetchRepoDetails.mockResolvedValue(makeRepoDetails());
    const queryClient = createQueryClient();
    const { result } = await renderHook(
      () => useRepoDetails('facebook', 'react'),
      { wrapper: createWrapper(queryClient) },
    );
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.repoDetails).toEqual(makeRepoDetails());
  });

  it('surfaces a typed error', async () => {
    mockFetchRepoDetails.mockRejectedValue(new NotFoundError());
    const queryClient = createQueryClient();
    const { result } = await renderHook(
      () => useRepoDetails('facebook', 'does-not-exist'),
      { wrapper: createWrapper(queryClient) },
    );
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBeInstanceOf(NotFoundError);
  });

  it('uses a matching cached list item as placeholder data while the real fetch is in flight', async () => {
    mockFetchRepoDetails.mockReturnValue(new Promise(() => {}));
    const queryClient = createQueryClient();
    const cachedRepo = makeRepo({ stars: 220000 });
    const page: OrgReposPage = { repos: [cachedRepo], hasNextPage: false };
    queryClient.setQueryData(repoKeys.orgList('facebook'), {
      pages: [page],
      pageParams: [1],
    });

    const { result } = await renderHook(
      () => useRepoDetails('facebook', 'react'),
      { wrapper: createWrapper(queryClient) },
    );

    expect(result.current.isPlaceholderData).toBe(true);
    // React Query reports `status: 'success'` (not `'pending'`) once placeholder data exists —
    // `isPlaceholderData` is the signal that it isn't the real result yet.
    expect(result.current.status).toBe('success');
    expect(result.current.repoDetails).toEqual({
      ...cachedRepo,
      defaultBranch: '',
      license: null,
      watchers: 0,
    });
  });

  it('does not report isRefetching while only placeholder data is showing', async () => {
    mockFetchRepoDetails.mockReturnValue(new Promise(() => {}));
    const queryClient = createQueryClient();
    const page: OrgReposPage = { repos: [makeRepo()], hasNextPage: false };
    queryClient.setQueryData(repoKeys.orgList('facebook'), {
      pages: [page],
      pageParams: [1],
    });

    const { result } = await renderHook(
      () => useRepoDetails('facebook', 'react'),
      { wrapper: createWrapper(queryClient) },
    );

    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.isRefetching).toBe(false);
  });

  it('matches a cached repo case-insensitively and across pages', async () => {
    mockFetchRepoDetails.mockReturnValue(new Promise(() => {}));
    const queryClient = createQueryClient();
    const cachedRepo = makeRepo({ fullName: 'Facebook/React' });
    const page1: OrgReposPage = {
      repos: [makeRepo({ id: 2, fullName: 'facebook/relay', name: 'relay' })],
      hasNextPage: true,
    };
    const page2: OrgReposPage = { repos: [cachedRepo], hasNextPage: false };
    queryClient.setQueryData(repoKeys.orgList('facebook'), {
      pages: [page1, page2],
      pageParams: [1, 2],
    });

    const { result } = await renderHook(
      () => useRepoDetails('facebook', 'react'),
      { wrapper: createWrapper(queryClient) },
    );

    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.repoDetails?.fullName).toBe('Facebook/React');
  });

  it('matches a cached repo found under a different cached org list', async () => {
    mockFetchRepoDetails.mockReturnValue(new Promise(() => {}));
    const queryClient = createQueryClient();
    const page: OrgReposPage = { repos: [makeRepo()], hasNextPage: false };
    queryClient.setQueryData(repoKeys.orgList('some-other-org'), {
      pages: [
        {
          repos: [makeRepo({ id: 99, fullName: 'some-other-org/thing' })],
          hasNextPage: false,
        },
      ],
      pageParams: [1],
    });
    queryClient.setQueryData(repoKeys.orgList('facebook'), {
      pages: [page],
      pageParams: [1],
    });

    const { result } = await renderHook(
      () => useRepoDetails('facebook', 'react'),
      { wrapper: createWrapper(queryClient) },
    );

    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.repoDetails?.fullName).toBe('facebook/react');
  });

  it('resolves to real data once the fetch completes, replacing the placeholder', async () => {
    mockFetchRepoDetails.mockResolvedValue(
      makeRepoDetails({ defaultBranch: 'main' }),
    );
    const queryClient = createQueryClient();
    const page: OrgReposPage = {
      repos: [makeRepo()],
      hasNextPage: false,
    };
    queryClient.setQueryData(repoKeys.orgList('facebook'), {
      pages: [page],
      pageParams: [1],
    });

    const { result } = await renderHook(
      () => useRepoDetails('facebook', 'react'),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.isPlaceholderData).toBe(false));
    expect(result.current.status).toBe('success');
    expect(result.current.repoDetails?.defaultBranch).toBe('main');
  });

  it('has no placeholder when the cache has no matching owner/repo', async () => {
    mockFetchRepoDetails.mockReturnValue(new Promise(() => {}));
    const queryClient = createQueryClient();
    const page: OrgReposPage = {
      repos: [makeRepo({ fullName: 'facebook/relay', name: 'relay' })],
      hasNextPage: false,
    };
    queryClient.setQueryData(repoKeys.orgList('facebook'), {
      pages: [page],
      pageParams: [1],
    });

    const { result } = await renderHook(
      () => useRepoDetails('facebook', 'react'),
      { wrapper: createWrapper(queryClient) },
    );

    expect(result.current.repoDetails).toBeUndefined();
    expect(result.current.isPlaceholderData).toBe(false);
  });

  it('refetch re-invokes the query function', async () => {
    mockFetchRepoDetails.mockResolvedValue(makeRepoDetails());
    const queryClient = createQueryClient();
    const { result } = await renderHook(
      () => useRepoDetails('facebook', 'react'),
      { wrapper: createWrapper(queryClient) },
    );
    await waitFor(() => expect(result.current.status).toBe('success'));

    mockFetchRepoDetails.mockClear();
    result.current.refetch();
    await waitFor(() => expect(mockFetchRepoDetails).toHaveBeenCalledTimes(1));
  });
});
