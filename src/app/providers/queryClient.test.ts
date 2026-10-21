import {
  ApiError,
  NetworkError,
  NotFoundError,
  RateLimitError,
} from '@shared/api';
import { logger } from '@shared/logger';
// Spied directly on the defining module — `@shared/storage`'s barrel re-export is a non-
// configurable getter in the compiled output, which `jest.spyOn` can't redefine.
import * as lastSynced from '@shared/storage/lastSynced';

import { createQueryClient } from './queryClient';

function getRetryFn() {
  const client = createQueryClient();
  const retry = client.getDefaultOptions().queries?.retry;
  if (typeof retry !== 'function') {
    throw new Error('expected retry to be a function');
  }
  return retry;
}

describe('createQueryClient', () => {
  it('sets a 5 minute staleTime for queries', () => {
    const client = createQueryClient();
    expect(client.getDefaultOptions().queries?.staleTime).toBe(5 * 60 * 1000);
  });

  it('retries a NetworkError under the max attempt count', () => {
    const retry = getRetryFn();
    expect(retry(0, new NetworkError())).toBe(true);
    expect(retry(2, new NetworkError())).toBe(true);
  });

  it('stops retrying a NetworkError past the max attempt count', () => {
    const retry = getRetryFn();
    expect(retry(3, new NetworkError())).toBe(false);
  });

  it('never retries a NotFoundError', () => {
    const retry = getRetryFn();
    expect(retry(0, new NotFoundError())).toBe(false);
  });

  it('never retries a RateLimitError', () => {
    const retry = getRetryFn();
    expect(retry(0, new RateLimitError(new Date()))).toBe(false);
  });

  it('retries an ApiError with a 5xx status', () => {
    const retry = getRetryFn();
    expect(retry(0, new ApiError(500))).toBe(true);
  });

  it('does not retry an ApiError with a 4xx status', () => {
    const retry = getRetryFn();
    expect(retry(0, new ApiError(400))).toBe(false);
  });

  it('does not retry an unrecognized error', () => {
    const retry = getRetryFn();
    expect(retry(0, new Error('boom'))).toBe(false);
  });

  it('logs a failed query with its key', async () => {
    const spy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    const client = createQueryClient();
    const error = new NotFoundError();

    await client
      .fetchQuery({ queryKey: ['boom'], queryFn: () => Promise.reject(error) })
      .catch(() => {});

    expect(spy).toHaveBeenCalledWith(error, { queryKey: ['boom'] });
    spy.mockRestore();
  });

  it('does not log a cancelled (AbortError) query', async () => {
    const spy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    const client = createQueryClient();
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';

    await client
      .fetchQuery({
        queryKey: ['cancelled'],
        queryFn: () => Promise.reject(abortError),
      })
      .catch(() => {});

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('records a sync timestamp when a query succeeds', async () => {
    const spy = jest
      .spyOn(lastSynced, 'recordSync')
      .mockImplementation(() => {});
    const client = createQueryClient();

    await client.fetchQuery({
      queryKey: ['ok'],
      queryFn: () => Promise.resolve('data'),
    });

    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('does not record a sync timestamp when a query fails', async () => {
    const spy = jest
      .spyOn(lastSynced, 'recordSync')
      .mockImplementation(() => {});
    const client = createQueryClient();

    await client
      .fetchQuery({
        queryKey: ['boom'],
        queryFn: () => Promise.reject(new NotFoundError()),
      })
      .catch(() => {});

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
