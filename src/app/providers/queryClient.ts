import { QueryCache, QueryClient } from '@tanstack/react-query';

import {
  ApiError,
  NetworkError,
  NotFoundError,
  RateLimitError,
} from '@shared/api';
import { logger } from '@shared/logger';
import { recordSync } from '@shared/storage';

const MAX_RETRIES = 3;

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES) {
    return false;
  }
  if (error instanceof NotFoundError || error instanceof RateLimitError) {
    return false;
  }
  if (error instanceof ApiError) {
    return error.status >= 500;
  }
  if (error instanceof NetworkError) {
    return true;
  }
  // AbortError and anything unrecognized: don't retry.
  return false;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        // A cancelled request (org changed, screen unmounted) isn't a real failure — §5.3.
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        logger.error(error, { queryKey: query.queryKey });
      },
      // §11: the timestamp the offline banner shows ("showing data from HH:MM") once offline.
      onSuccess: () => recordSync(),
    }),
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        staleTime: 5 * 60 * 1000,
      },
    },
  });
}
