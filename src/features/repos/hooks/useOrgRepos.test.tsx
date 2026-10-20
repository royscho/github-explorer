import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { NotFoundError } from '@shared/api';

import { fetchOrgRepos } from '../api/endpoints';
import type { Repo } from '../types';
import { useOrgRepos } from './useOrgRepos';

jest.mock('../api/endpoints');

const mockFetchOrgRepos = fetchOrgRepos as jest.MockedFunction<
  typeof fetchOrgRepos
>;

function makeRepo(id: number): Repo {
  return {
    id,
    name: `repo-${id}`,
    fullName: `facebook/repo-${id}`,
    owner: { login: 'facebook', avatarUrl: '', htmlUrl: '' },
    description: null,
    htmlUrl: '',
    language: null,
    stars: 0,
    forks: 0,
    openIssues: 0,
    watchers: 0,
    createdAt: '2020-01-01T00:00:00Z',
    updatedAt: '2020-01-01T00:00:00Z',
  };
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('useOrgRepos', () => {
  beforeEach(() => {
    mockFetchOrgRepos.mockReset();
  });

  it('starts in a pending state', async () => {
    mockFetchOrgRepos.mockReturnValue(new Promise(() => {}));
    const { result } = await renderHook(() => useOrgRepos('facebook'), {
      wrapper: createWrapper(),
    });
    expect(result.current.status).toBe('pending');
  });

  it('flattens repos across pages and reports hasNextPage from the last page', async () => {
    mockFetchOrgRepos.mockResolvedValue({
      repos: [makeRepo(1), makeRepo(2)],
      hasNextPage: true,
    });
    const { result } = await renderHook(() => useOrgRepos('facebook'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.repos).toHaveLength(2);
    expect(result.current.hasNextPage).toBe(true);
  });

  it('fetchNextPage requests the next page for the same org', async () => {
    mockFetchOrgRepos.mockResolvedValueOnce({
      repos: [makeRepo(1)],
      hasNextPage: true,
    });
    const { result } = await renderHook(() => useOrgRepos('facebook'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.status).toBe('success'));

    mockFetchOrgRepos.mockResolvedValueOnce({
      repos: [makeRepo(2)],
      hasNextPage: false,
    });
    result.current.fetchNextPage();

    await waitFor(() => expect(result.current.repos).toHaveLength(2));
    expect(mockFetchOrgRepos).toHaveBeenLastCalledWith(
      'facebook',
      2,
      expect.any(AbortSignal),
    );
  });

  it('surfaces a typed error', async () => {
    mockFetchOrgRepos.mockRejectedValue(new NotFoundError());
    const { result } = await renderHook(() => useOrgRepos('not-an-org'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBeInstanceOf(NotFoundError);
  });

  it('never calls fetchOrgRepos when the org is empty', async () => {
    await renderHook(() => useOrgRepos(''), { wrapper: createWrapper() });
    expect(mockFetchOrgRepos).not.toHaveBeenCalled();
  });

  it('reports an empty org result as an empty repo list with no error', async () => {
    mockFetchOrgRepos.mockResolvedValue({ repos: [], hasNextPage: false });
    const { result } = await renderHook(() => useOrgRepos('empty-org'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.repos).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});
