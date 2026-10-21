import { act, renderHook } from '@testing-library/react-native';

import { useNetworkStore } from '../store';
import { useNetworkStatus } from './useNetworkStatus';

describe('useNetworkStatus', () => {
  beforeEach(() => {
    useNetworkStore.setState({
      isOnline: true,
      connectionType: 'unknown',
      isExpensive: false,
    });
  });

  it('returns the store current state', async () => {
    useNetworkStore.setState({
      isOnline: false,
      connectionType: 'cellular',
      isExpensive: true,
    });

    const { result } = await renderHook(() => useNetworkStatus());

    expect(result.current).toEqual({
      isOnline: false,
      connectionType: 'cellular',
      isExpensive: true,
    });
  });

  it('re-renders when the store updates', async () => {
    const { result, rerender } = await renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);

    await act(() => {
      useNetworkStore.getState().setNetworkState({
        isConnected: false,
        connectionType: 'none',
        isExpensive: false,
      });
    });
    await rerender({});

    expect(result.current.isOnline).toBe(false);
    expect(result.current.connectionType).toBe('none');
  });
});
