import { ApiError, NetworkError, NotFoundError } from '@shared/api';

import type { Repo } from '../types';
import {
  filterReposByName,
  getErrorMessage,
  keyExtractor,
} from './ExploreScreen.utils';

const repo: Repo = {
  id: 1,
  name: 'react',
  fullName: 'facebook/react',
  owner: { login: 'facebook', avatarUrl: '', htmlUrl: '' },
  description: null,
  htmlUrl: '',
  language: null,
  stars: 0,
  forks: 0,
  openIssues: 0,
  createdAt: '2020-01-01T00:00:00Z',
  updatedAt: '2020-01-01T00:00:00Z',
};

function makeRepo(id: number, name: string): Repo {
  return { ...repo, id, name };
}

describe('getErrorMessage', () => {
  it('maps NetworkError to "No connection"', () => {
    expect(getErrorMessage(new NetworkError())).toBe('No connection');
  });

  it('maps NotFoundError to "Organization not found"', () => {
    expect(getErrorMessage(new NotFoundError())).toBe('Organization not found');
  });

  it('maps any other GitHubApiError to a generic message', () => {
    expect(getErrorMessage(new ApiError(500))).toBe('Something went wrong');
  });
});

describe('keyExtractor', () => {
  it('returns the repo id as a string', () => {
    expect(keyExtractor(repo)).toBe('1');
  });
});

describe('filterReposByName', () => {
  const repos = [
    makeRepo(1, 'react'),
    makeRepo(2, 'react-native'),
    makeRepo(3, 'relay'),
  ];

  it('matches case-insensitively on a substring of the name', () => {
    expect(filterReposByName(repos, 'REACT')).toEqual([repos[0], repos[1]]);
  });

  it('returns all repos unchanged for an empty query', () => {
    expect(filterReposByName(repos, '')).toBe(repos);
  });

  it('returns all repos unchanged for a whitespace-only query', () => {
    expect(filterReposByName(repos, '   ')).toBe(repos);
  });

  it('returns an empty array when nothing matches', () => {
    expect(filterReposByName(repos, 'graphql')).toEqual([]);
  });
});
