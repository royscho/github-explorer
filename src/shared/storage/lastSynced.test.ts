import { mmkv } from './mmkv';
import { getLastSyncedAt, recordSync } from './lastSynced';

describe('lastSynced', () => {
  beforeEach(() => {
    mmkv.clearAll();
  });

  it('returns null before any sync has been recorded', () => {
    expect(getLastSyncedAt()).toBeNull();
  });

  it('returns the timestamp passed to recordSync', () => {
    recordSync(1_700_000_000_000);
    expect(getLastSyncedAt()).toBe(1_700_000_000_000);
  });

  it('defaults to the current time when no timestamp is given', () => {
    const before = Date.now();
    recordSync();
    const after = Date.now();

    const stored = getLastSyncedAt();
    expect(stored).not.toBeNull();
    expect(stored).toBeGreaterThanOrEqual(before);
    expect(stored).toBeLessThanOrEqual(after);
  });
});
