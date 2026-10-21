import { QueryClient } from '@tanstack/react-query';
import type { Query } from '@tanstack/react-query';

import packageJson from '../../../package.json';

import { QUERY_CACHE_MAX_AGE, queryPersistOptions } from './queryPersister';

async function buildQuery(
  queryFn: () => Promise<unknown>,
  queryKey: string[] = ['q'],
): Promise<Query> {
  const client = new QueryClient();
  await client.fetchQuery({ queryKey, queryFn, retry: false }).catch(() => {});
  const query = client.getQueryCache().find({ queryKey });
  if (!query) {
    throw new Error('expected query to exist');
  }
  return query;
}

function shouldDehydrate(query: Query): boolean {
  const shouldDehydrateQuery = queryPersistOptions.dehydrateOptions
    ?.shouldDehydrateQuery as ((query: Query) => boolean) | undefined;
  if (!shouldDehydrateQuery) {
    throw new Error('expected shouldDehydrateQuery to be set');
  }
  return shouldDehydrateQuery(query);
}

describe('queryPersistOptions', () => {
  it('ties the buster to the app version', () => {
    expect(queryPersistOptions.buster).toBe(packageJson.version);
  });

  it('sets a 24 hour max age', () => {
    expect(queryPersistOptions.maxAge).toBe(QUERY_CACHE_MAX_AGE);
  });

  it('dehydrates a query that has data', async () => {
    const query = await buildQuery(() => Promise.resolve('data'));
    expect(shouldDehydrate(query)).toBe(true);
  });

  it('does not dehydrate a query that has never had data', async () => {
    const query = await buildQuery(() => Promise.reject(new Error('boom')));
    expect(shouldDehydrate(query)).toBe(false);
  });

  // §11: keep working with the *last successful* data — a refetch failing (e.g. the rate limit
  // §13 says not to retry) must not drop the data a previous successful fetch already put there.
  it('still dehydrates a query whose most recent fetch failed but kept its earlier data', async () => {
    const queryKey = ['q'];
    const client = new QueryClient();
    await client.fetchQuery({
      queryKey,
      queryFn: () => Promise.resolve('data'),
    });
    await client
      .fetchQuery({
        queryKey,
        queryFn: () => Promise.reject(new Error('refetch failed')),
        retry: false,
      })
      .catch(() => {});

    const query = client.getQueryCache().find({ queryKey });
    if (!query) {
      throw new Error('expected query to exist');
    }

    expect(query.state.status).toBe('error');
    expect(query.state.data).toBe('data');
    expect(shouldDehydrate(query)).toBe(true);
  });

  it('persists and restores a client through the configured persister', async () => {
    const { persister } = queryPersistOptions;
    if (!persister) {
      throw new Error('expected a persister to be set');
    }

    const persistedClient = {
      timestamp: Date.now(),
      buster: packageJson.version,
      clientState: { queries: [], mutations: [] },
    };

    await persister.persistClient(persistedClient);
    const restored = await persister.restoreClient();

    expect(restored).toEqual(persistedClient);
  });
});
