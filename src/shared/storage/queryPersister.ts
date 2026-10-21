import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';
import type { Query } from '@tanstack/react-query';

import packageJson from '../../../package.json';

import { mmkv } from './mmkv';

export const QUERY_CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

const persister = createAsyncStoragePersister({
  storage: {
    getItem: key => mmkv.getString(key) ?? null,
    setItem: (key, value) => {
      mmkv.set(key, value);
    },
    removeItem: key => {
      mmkv.delete(key);
    },
  },
  key: 'react-query-cache',
});

// A query that loaded data and then failed a *refetch* (e.g. a rate limit, which §13 says not to
// retry) is `status: 'error'` but still holds the last good `data` — and §11 wants exactly that
// still showing while offline. Each save dehydrates and overwrites the whole cache, so gating on
// `status === 'success'` would drop that data the moment a background refetch failed, long before
// `maxAge` or an app-version bust would. Gating on "has ever loaded data" keeps it.
function hasData(query: Query): boolean {
  return query.state.data !== undefined;
}

// §11: a 24h max age and a buster tied to the app version — so a cache from an older release
// (whose shape may have changed) is discarded rather than hydrated as-is.
export const queryPersistOptions: Omit<
  PersistQueryClientOptions,
  'queryClient'
> = {
  persister,
  maxAge: QUERY_CACHE_MAX_AGE,
  buster: packageJson.version,
  dehydrateOptions: {
    shouldDehydrateQuery: hasData,
  },
};
