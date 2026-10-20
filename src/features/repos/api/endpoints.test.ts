import { httpGet } from '@shared/api';

import { fetchOrgRepos, fetchRepoDetails } from './endpoints';
import type { RepoDto } from './dto';

jest.mock('@shared/api', () => ({
  httpGet: jest.fn(),
}));

const httpGetMock = httpGet as jest.Mock;

function makeDto(overrides: Partial<RepoDto> = {}): RepoDto {
  return {
    id: 1,
    name: 'react',
    full_name: 'facebook/react',
    owner: {
      login: 'facebook',
      avatar_url: 'https://avatars/1',
      html_url: 'https://github.com/facebook',
    },
    description: 'A UI library',
    html_url: 'https://github.com/facebook/react',
    language: 'JavaScript',
    stargazers_count: 1,
    forks_count: 1,
    open_issues_count: 1,
    watchers_count: 1,
    created_at: '2013-05-24T16:15:54Z',
    updated_at: '2026-10-19T08:00:00Z',
    default_branch: 'main',
    license: null,
    ...overrides,
  };
}

describe('fetchOrgRepos', () => {
  beforeEach(() => {
    httpGetMock.mockReset();
  });

  it('requests the org repos endpoint with per_page/page/sort and maps the response', async () => {
    httpGetMock.mockResolvedValueOnce({
      data: [makeDto()],
      headers: new Headers({
        Link: '<https://api.github.com/x?page=2>; rel="next"',
      }),
    });

    const result = await fetchOrgRepos('facebook', 1);

    expect(httpGetMock).toHaveBeenCalledWith('/orgs/facebook/repos', {
      signal: undefined,
      searchParams: { per_page: '30', page: '1', sort: 'updated' },
    });
    expect(result.repos).toEqual([
      expect.objectContaining({ id: 1, name: 'react' }),
    ]);
    expect(result.hasNextPage).toBe(true);
  });

  it('sets hasNextPage to false when the Link header has no next rel', async () => {
    httpGetMock.mockResolvedValueOnce({
      data: [makeDto()],
      headers: new Headers(),
    });

    const result = await fetchOrgRepos('facebook', 10);

    expect(result.hasNextPage).toBe(false);
  });

  it('returns an empty repos array for an empty org', async () => {
    httpGetMock.mockResolvedValueOnce({ data: [], headers: new Headers() });

    const result = await fetchOrgRepos('empty-org', 1);

    expect(result).toEqual({ repos: [], hasNextPage: false });
  });

  it('propagates errors from httpGet unchanged', async () => {
    const error = new Error('boom');
    httpGetMock.mockRejectedValueOnce(error);

    await expect(fetchOrgRepos('facebook', 1)).rejects.toBe(error);
  });

  it('URL-encodes an org name with characters that would otherwise change the request path', async () => {
    httpGetMock.mockResolvedValueOnce({ data: [], headers: new Headers() });

    await fetchOrgRepos('my org/../x', 1);

    expect(httpGetMock).toHaveBeenCalledWith(
      '/orgs/my%20org%2F..%2Fx/repos',
      expect.objectContaining({
        searchParams: { per_page: '30', page: '1', sort: 'updated' },
      }),
    );
  });

  it('forwards the caller-provided AbortSignal to httpGet', async () => {
    httpGetMock.mockResolvedValueOnce({ data: [], headers: new Headers() });
    const { signal } = new AbortController();

    await fetchOrgRepos('facebook', 1, signal);

    expect(httpGetMock).toHaveBeenCalledWith(
      '/orgs/facebook/repos',
      expect.objectContaining({ signal }),
    );
  });
});

describe('fetchRepoDetails', () => {
  beforeEach(() => {
    httpGetMock.mockReset();
  });

  it('requests the repo details endpoint and maps the response', async () => {
    httpGetMock.mockResolvedValueOnce({
      data: makeDto(),
      headers: new Headers(),
    });

    const details = await fetchRepoDetails('facebook', 'react');

    expect(httpGetMock).toHaveBeenCalledWith('/repos/facebook/react', {
      signal: undefined,
    });
    expect(details).toEqual(
      expect.objectContaining({
        fullName: 'facebook/react',
        defaultBranch: 'main',
      }),
    );
  });

  it('propagates errors from httpGet unchanged', async () => {
    const error = new Error('boom');
    httpGetMock.mockRejectedValueOnce(error);

    await expect(fetchRepoDetails('facebook', 'react')).rejects.toBe(error);
  });

  it('URL-encodes owner and repo names with characters that would otherwise change the request path', async () => {
    httpGetMock.mockResolvedValueOnce({
      data: makeDto(),
      headers: new Headers(),
    });

    await fetchRepoDetails('my owner', 'my/repo');

    expect(httpGetMock).toHaveBeenCalledWith(
      '/repos/my%20owner/my%2Frepo',
      expect.anything(),
    );
  });

  it('forwards the caller-provided AbortSignal to httpGet', async () => {
    httpGetMock.mockResolvedValueOnce({
      data: makeDto(),
      headers: new Headers(),
    });
    const { signal } = new AbortController();

    await fetchRepoDetails('facebook', 'react', signal);

    expect(httpGetMock).toHaveBeenCalledWith('/repos/facebook/react', {
      signal,
    });
  });
});
