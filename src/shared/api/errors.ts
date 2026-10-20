export class NetworkError extends Error {
  readonly name = 'NetworkError';

  constructor(cause?: unknown) {
    super('Unable to reach the network');
    this.cause = cause;
  }
}

export class NotFoundError extends Error {
  readonly name = 'NotFoundError';

  constructor(message: string = 'Resource not found') {
    super(message);
  }
}

export class RateLimitError extends Error {
  readonly name = 'RateLimitError';
  readonly resetAt: Date;

  constructor(resetAt: Date) {
    super(`Rate limit reached, resets at ${resetAt.toISOString()}`);
    this.resetAt = resetAt;
  }
}

export class ApiError extends Error {
  readonly name = 'ApiError';
  readonly status: number;

  constructor(
    status: number,
    message: string = `GitHub API request failed with status ${status}`,
  ) {
    super(message);
    this.status = status;
  }
}

export type GitHubApiError =
  | NetworkError
  | NotFoundError
  | RateLimitError
  | ApiError;

export function isGitHubApiError(error: unknown): error is GitHubApiError {
  return (
    error instanceof NetworkError ||
    error instanceof NotFoundError ||
    error instanceof RateLimitError ||
    error instanceof ApiError
  );
}
