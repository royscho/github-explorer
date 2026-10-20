import { NetworkError, NotFoundError, type GitHubApiError } from '@shared/api';

import type { Repo } from '../types';

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

export function filterReposByName(repos: Repo[], query: string): Repo[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return repos;
  }
  return repos.filter(repo => repo.name.toLowerCase().includes(trimmed));
}
