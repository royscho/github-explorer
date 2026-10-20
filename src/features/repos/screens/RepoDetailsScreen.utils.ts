import { NetworkError, NotFoundError, type GitHubApiError } from '@shared/api';

export function getErrorMessage(error: GitHubApiError): string {
  if (error instanceof NetworkError) {
    return 'No connection';
  }
  if (error instanceof NotFoundError) {
    return 'Repository not found';
  }
  return 'Something went wrong';
}
