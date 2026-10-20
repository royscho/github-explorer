import { NetworkError, NotFoundError, type GitHubApiError } from '@shared/api';

import type { Repo } from '../types';

export function formatResetTime(resetAt: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(resetAt);
}

export function getErrorMessage(error: GitHubApiError): string {
  if (error instanceof NetworkError) {
    return 'No connection';
  }
  if (error instanceof NotFoundError) {
    return 'Organization not found';
  }
  return 'Something went wrong';
}

export function keyExtractor(item: Repo): string {
  return String(item.id);
}
