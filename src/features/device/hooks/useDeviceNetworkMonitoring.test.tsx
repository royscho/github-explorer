import { onlineManager } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { logger } from '@shared/logger';

import { useNetworkStore } from '../store';
import type { NetworkState } from '../native';
import {
  getNetworkState,
  startNetworkMonitoring,
  stopNetworkMonitoring,
  subscribeToNetworkStatus,
} from '../native';
import { useDeviceNetworkMonitoring } from './useDeviceNetworkMonitoring';

jest.mock('../native');

const mockGetNetworkState = getNetworkState as jest.MockedFunction<
  typeof getNetworkState
>;
const mockStartNetworkMonitoring =
  startNetworkMonitoring as jest.MockedFunction<typeof startNetworkMonitoring>;
const mockStopNetworkMonitoring = stopNetworkMonitoring as jest.MockedFunction<
  typeof stopNetworkMonitoring
>;
const mockSubscribeToNetworkStatus =
  subscribeToNetworkStatus as jest.MockedFunction<
    typeof subscribeToNetworkStatus
  >;

function makeState(overrides: Partial<NetworkState> = {}): NetworkState {
  return {
    isConnected: true,
    connectionType: 'wifi',
    isExpensive: false,
    ...overrides,
  };
}

// A deferred promise that's explicitly resolved mid-test and then fully drained (every `await`
// below matches a `.then()` link in the hook's chain) — an unresolved or partially-drained promise
// left behind at the end of a test can settle during a *later* test and trip React's "overlapping
// act() calls" guard, which then silently breaks that later test's own effects.
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('useDeviceNetworkMonitoring', () => {
  const removeMock = jest.fn();

  beforeEach(() => {
    useNetworkStore.setState({
      isOnline: true,
      connectionType: 'unknown',
      isExpensive: false,
    });
    mockGetNetworkState.mockResolvedValue(makeState());
    mockStartNetworkMonitoring.mockResolvedValue(undefined);
    mockStopNetworkMonitoring.mockResolvedValue(undefined);
    mockSubscribeToNetworkStatus.mockReturnValue({ remove: removeMock });
  });

  afterEach(() => {
    jest.clearAllMocks();
    onlineManager.setOnline(true);
  });

  it('starts monitoring, subscribes, and seeds the store only after monitoring has started', async () => {
    mockGetNetworkState.mockResolvedValue(
      makeState({ isConnected: true, connectionType: 'cellular' }),
    );

    const { unmount } = await renderHook(() => useDeviceNetworkMonitoring());

    expect(mockSubscribeToNetworkStatus).toHaveBeenCalledTimes(1);
    expect(mockStartNetworkMonitoring).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(useNetworkStore.getState().connectionType).toBe('cellular');
    });
    // `getNetworkState` (the seed) is only called once `startNetworkMonitoring` has resolved.
    expect(mockGetNetworkState.mock.invocationCallOrder[0]).toBeGreaterThan(
      mockStartNetworkMonitoring.mock.invocationCallOrder[0],
    );

    await unmount();
  });

  it('updates the store and onlineManager when an event fires', async () => {
    const { unmount } = await renderHook(() => useDeviceNetworkMonitoring());
    await waitFor(() => {
      expect(mockSubscribeToNetworkStatus).toHaveBeenCalledTimes(1);
    });

    const listener = mockSubscribeToNetworkStatus.mock.calls[0][0];
    await act(() => {
      listener(makeState({ isConnected: false, connectionType: 'none' }));
    });

    expect(useNetworkStore.getState().isOnline).toBe(false);
    expect(onlineManager.isOnline()).toBe(false);

    await unmount();
  });

  it('drops a seed that resolves after a real event already landed', async () => {
    const seed = deferred<NetworkState>();
    mockGetNetworkState.mockReturnValue(seed.promise);

    const { unmount } = await renderHook(() => useDeviceNetworkMonitoring());
    await waitFor(() => {
      expect(mockSubscribeToNetworkStatus).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(mockGetNetworkState).toHaveBeenCalledTimes(1);
    });

    const listener = mockSubscribeToNetworkStatus.mock.calls[0][0];
    await act(() => {
      listener(makeState({ isConnected: false, connectionType: 'cellular' }));
    });

    await act(async () => {
      seed.resolve(makeState({ isConnected: true, connectionType: 'wifi' }));
      // Flushes the seed's own `.then(state => { ... })` link.
      await Promise.resolve();
    });

    expect(useNetworkStore.getState().connectionType).toBe('cellular');
    expect(useNetworkStore.getState().isOnline).toBe(false);

    await unmount();
  });

  it('ignores a seed that resolves after unmount', async () => {
    const seed = deferred<NetworkState>();
    mockGetNetworkState.mockReturnValue(seed.promise);

    const { unmount } = await renderHook(() => useDeviceNetworkMonitoring());
    await waitFor(() => {
      expect(mockGetNetworkState).toHaveBeenCalledTimes(1);
    });

    await unmount();

    await act(async () => {
      seed.resolve(makeState({ isConnected: false, connectionType: 'none' }));
      await Promise.resolve();
    });

    expect(useNetworkStore.getState().isOnline).toBe(true);
  });

  it('stops monitoring and unsubscribes on unmount', async () => {
    const { unmount } = await renderHook(() => useDeviceNetworkMonitoring());
    await waitFor(() => {
      expect(mockStartNetworkMonitoring).toHaveBeenCalledTimes(1);
    });

    await unmount();

    expect(removeMock).toHaveBeenCalledTimes(1);
    expect(mockStopNetworkMonitoring).toHaveBeenCalledTimes(1);
  });

  it('logs and does not throw when startNetworkMonitoring rejects', async () => {
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    mockStartNetworkMonitoring.mockRejectedValue(new Error('native failure'));

    const { unmount } = await renderHook(() => useDeviceNetworkMonitoring());

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(expect.any(Error), {
        feature: 'device',
      });
    });
    expect(useNetworkStore.getState().isOnline).toBe(true);
    errorSpy.mockRestore();
    await unmount();
  });

  it('logs and does not throw when the seed getNetworkState rejects', async () => {
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    mockGetNetworkState.mockRejectedValue(new Error('native failure'));

    const { unmount } = await renderHook(() => useDeviceNetworkMonitoring());

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(expect.any(Error), {
        feature: 'device',
      });
    });
    expect(useNetworkStore.getState().isOnline).toBe(true);
    errorSpy.mockRestore();
    await unmount();
  });
});
