import {
  ApiError,
  isGitHubApiError,
  NetworkError,
  NotFoundError,
  RateLimitError,
} from './errors';

describe('NetworkError', () => {
  it('is an Error with name NetworkError and keeps the cause', () => {
    const cause = new Error('offline');
    const error = new NetworkError(cause);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('NetworkError');
    expect(error.cause).toBe(cause);
  });
});

describe('NotFoundError', () => {
  it('defaults to a generic message', () => {
    const error = new NotFoundError();

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('NotFoundError');
    expect(error.message).toBe('Resource not found');
  });

  it('accepts a custom message', () => {
    const error = new NotFoundError('Organization not found');

    expect(error.message).toBe('Organization not found');
  });
});

describe('RateLimitError', () => {
  it('carries the resetAt date it was given', () => {
    const resetAt = new Date('2026-10-20T12:00:00Z');
    const error = new RateLimitError(resetAt);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('RateLimitError');
    expect(error.resetAt).toBe(resetAt);
  });
});

describe('ApiError', () => {
  it('carries the status it was given', () => {
    const error = new ApiError(500);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiError');
    expect(error.status).toBe(500);
  });

  it('accepts a custom message', () => {
    const error = new ApiError(502, 'Bad gateway');

    expect(error.message).toBe('Bad gateway');
  });
});

describe('isGitHubApiError', () => {
  it('returns true for each of the typed GitHub API errors', () => {
    expect(isGitHubApiError(new NetworkError())).toBe(true);
    expect(isGitHubApiError(new NotFoundError())).toBe(true);
    expect(isGitHubApiError(new RateLimitError(new Date()))).toBe(true);
    expect(isGitHubApiError(new ApiError(500))).toBe(true);
  });

  it('returns false for a plain Error or non-error value', () => {
    expect(isGitHubApiError(new Error('plain'))).toBe(false);
    expect(isGitHubApiError('not an error')).toBe(false);
    expect(isGitHubApiError(null)).toBe(false);
  });
});
