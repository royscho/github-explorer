import { renderHook } from '@testing-library/react-native';

import { mmkv, recordSync } from '@shared/storage';

import { useNetworkStore } from '../store';
import { useOfflineMessage } from './useOfflineMessage';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

describe('useOfflineMessage', () => {
  beforeEach(() => {
    mmkv.clearAll();
    useNetworkStore.setState({
      isOnline: true,
      connectionType: 'wifi',
      isExpensive: false,
    });
  });

  it('returns null while online', async () => {
    const { result } = await renderHook(() => useOfflineMessage());
    expect(result.current).toBeNull();
  });

  it('returns a plain message when offline and nothing has ever synced', async () => {
    useNetworkStore.setState({ isOnline: false });
    const { result } = await renderHook(() => useOfflineMessage());
    expect(result.current).toBe("You're offline");
  });

  it('includes the last synced time when it is within the max cache age', async () => {
    recordSync(Date.now() - 1000);
    useNetworkStore.setState({ isOnline: false });

    const { result } = await renderHook(() => useOfflineMessage());

    expect(result.current).toMatch(/^You're offline — showing data from /);
  });

  it('falls back to the plain message once the last sync is older than the max cache age', async () => {
    recordSync(Date.now() - ONE_DAY_MS - 1);
    useNetworkStore.setState({ isOnline: false });

    const { result } = await renderHook(() => useOfflineMessage());

    expect(result.current).toBe("You're offline");
  });
});
