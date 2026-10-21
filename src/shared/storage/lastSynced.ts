import { mmkv } from './mmkv';

const LAST_SYNCED_AT_KEY = 'last-synced-at';

export function recordSync(timestamp: number = Date.now()): void {
  mmkv.set(LAST_SYNCED_AT_KEY, timestamp);
}

export function getLastSyncedAt(): number | null {
  return mmkv.getNumber(LAST_SYNCED_AT_KEY) ?? null;
}
