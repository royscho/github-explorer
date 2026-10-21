import { getLastSyncedAt, QUERY_CACHE_MAX_AGE } from '@shared/storage';
import { formatTime } from '@shared/utils';

import { useNetworkStatus } from './useNetworkStatus';

// §11: once something has synced, say when its (now possibly stale) data is from; before that —
// e.g. the very first launch happens offline — or once the persisted cache has aged past the same
// `QUERY_CACHE_MAX_AGE` the persister itself discards it at, there's nothing meaningful to show a
// time for.
//
// `getLastSyncedAt()` is a plain (non-reactive) read: nothing can sync while offline, so the value
// read the moment `isOnline` flips to `false` is always current for the rest of the offline
// session. The one gap this accepts: a request already in flight at the moment of going offline
// can still resolve and call `recordSync()` a tick later — the banner won't pick that up until its
// next re-render (e.g. the next network-state change), so it can lag by one successful fetch.
export function useOfflineMessage(): string | null {
  const { isOnline } = useNetworkStatus();

  if (isOnline) {
    return null;
  }

  const lastSyncedAt = getLastSyncedAt();
  if (
    lastSyncedAt === null ||
    Date.now() - lastSyncedAt >= QUERY_CACHE_MAX_AGE
  ) {
    return "You're offline";
  }
  return `You're offline — showing data from ${formatTime(
    new Date(lastSyncedAt),
  )}`;
}
