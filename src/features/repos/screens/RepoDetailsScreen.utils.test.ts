import { ApiError, NetworkError, NotFoundError } from '@shared/api';

import { getErrorMessage } from './RepoDetailsScreen.utils';

describe('getErrorMessage', () => {
  it('maps NetworkError to "No connection"', () => {
    expect(getErrorMessage(new NetworkError())).toBe('No connection');
  });

  it('maps NotFoundError to "Repository not found"', () => {
    expect(getErrorMessage(new NotFoundError())).toBe('Repository not found');
  });

  it('maps any other GitHubApiError to a generic message', () => {
    expect(getErrorMessage(new ApiError(500))).toBe('Something went wrong');
  });
});
