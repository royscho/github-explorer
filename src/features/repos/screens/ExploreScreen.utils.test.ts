import { ApiError, NetworkError, NotFoundError } from '@shared/api';

import type { Repo } from '../types';
import {
  formatResetTime,
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
  watchers: 0,
  createdAt: '2020-01-01T00:00:00Z',
  updatedAt: '2020-01-01T00:00:00Z',
};

describe('formatResetTime', () => {
  it('formats a date as a localized hour:minute string', () => {
    const resetAt = new Date('2026-01-01T15:30:00.000Z');
    const expected = new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(resetAt);
    expect(formatResetTime(resetAt)).toBe(expected);
  });
});

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
