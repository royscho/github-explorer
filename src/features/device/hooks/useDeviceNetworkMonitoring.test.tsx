import { AppState } from 'react-native';
import type { AppStateStatus, NativeEventSubscription } from 'react-native';
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
  const appStateRemoveMock = jest.fn();
  // `jest.mock('react-native', factory)` crashes with a `DevMenu` TurboModule invariant violation
  // in this project's Jest setup, so `AppState` is spied on rather than module-mocked.
  let addEventListenerSpy: jest.SpyInstance;
  let appStateHandler: (status: AppStateStatus) => void = () => {};

  function emitAppState(status: AppStateStatus): void {
    appStateHandler(status);
  }

  // The hook only treats `background` → `active` as a resume, so a test that wants a resume has to
  // go through `background` first.
  async function resumeFromBackground(): Promise<void> {
    await act(() => {
      emitAppState('background');
    });
    await act(() => {
      emitAppState('active');
    });
  }

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
    addEventListenerSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_type, listener) => {
        appStateHandler = listener as (status: AppStateStatus) => void;
        return { remove: appStateRemoveMock } as NativeEventSubscription;
      });
  });

  afterEach(() => {
    jest.clearAllMocks();
    addEventListenerSpy.mockRestore();
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
    expect(appStateRemoveMock).toHaveBeenCalledTimes(1);
    expect(mockStopNetworkMonitoring).toHaveBeenCalledTimes(1);
  });

  // `getNetworkState()` on iOS returns the running monitor's `currentPath`, so re-reading a monitor
  // that went stale while the app was suspended returns the same stale answer. Recreating it is
  // what forces a real path update — the same thing a JS reload does, which is why reloading
  // appears to fix a stuck state.
  it('recreates the monitor and re-reads when resuming from the background', async () => {
    mockGetNetworkState.mockResolvedValue(
      makeState({ isConnected: false, connectionType: 'none' }),
    );

    const { unmount } = await renderHook(() => useDeviceNetworkMonitoring());
    await waitFor(() => {
      expect(useNetworkStore.getState().isOnline).toBe(false);
    });
    expect(onlineManager.isOnline()).toBe(false);

    mockGetNetworkState.mockResolvedValue(
      makeState({ isConnected: true, connectionType: 'wifi' }),
    );
    await resumeFromBackground();

    await waitFor(() => {
      expect(useNetworkStore.getState().isOnline).toBe(true);
    });
    expect(useNetworkStore.getState().connectionType).toBe('wifi');
    expect(onlineManager.isOnline()).toBe(true);

    // Stop → start → read, in that order: a read issued before the fresh monitor is running would
    // report an unstarted monitor's unsatisfied default on iOS.
    expect(mockStopNetworkMonitoring).toHaveBeenCalledTimes(1);
    expect(mockStartNetworkMonitoring).toHaveBeenCalledTimes(2);
    expect(
      mockStartNetworkMonitoring.mock.invocationCallOrder[1],
    ).toBeGreaterThan(mockStopNetworkMonitoring.mock.invocationCallOrder[0]);
    expect(mockGetNetworkState.mock.invocationCallOrder[1]).toBeGreaterThan(
      mockStartNetworkMonitoring.mock.invocationCallOrder[1],
    );

    await unmount();
  });

  // Pins the event *counter* specifically: a "have we seen an event" flag would latch after the
  // first event and discard every later read, so this resume would never apply and the whole
  // mechanism would be dead on any device that has had at least one event.
  it('still applies a resume read after a live event has already landed', async () => {
    const { unmount } = await renderHook(() => useDeviceNetworkMonitoring());
    await waitFor(() => {
      expect(mockGetNetworkState).toHaveBeenCalledTimes(1);
    });

    const listener = mockSubscribeToNetworkStatus.mock.calls[0][0];
    await act(() => {
      listener(makeState({ isConnected: false, connectionType: 'none' }));
    });
    expect(useNetworkStore.getState().isOnline).toBe(false);

    mockGetNetworkState.mockResolvedValue(
      makeState({ isConnected: true, connectionType: 'wifi' }),
    );
    await resumeFromBackground();

    await waitFor(() => {
      expect(useNetworkStore.getState().isOnline).toBe(true);
    });
    expect(onlineManager.isOnline()).toBe(true);

    await unmount();
  });

  it('ignores a transient interruption that never backgrounded the app', async () => {
    const { unmount } = await renderHook(() => useDeviceNetworkMonitoring());
    await waitFor(() => {
      expect(mockGetNetworkState).toHaveBeenCalledTimes(1);
    });

    // Control Centre / app switcher / Face ID: active → inactive → active, never suspended.
    await act(() => {
      emitAppState('inactive');
    });
    await act(() => {
      emitAppState('active');
    });

    // Still just the initial start and seed — no monitor churn, no re-read.
    expect(mockStopNetworkMonitoring).not.toHaveBeenCalled();
    expect(mockStartNetworkMonitoring).toHaveBeenCalledTimes(1);
    expect(mockGetNetworkState).toHaveBeenCalledTimes(1);

    await unmount();
  });

  it('does not re-read when the app state changes to something other than active', async () => {
    const { unmount } = await renderHook(() => useDeviceNetworkMonitoring());
    await waitFor(() => {
      expect(mockGetNetworkState).toHaveBeenCalledTimes(1);
    });

    await act(() => {
      emitAppState('background');
    });

    // Still just the initial seed.
    expect(mockGetNetworkState).toHaveBeenCalledTimes(1);
    expect(mockStopNetworkMonitoring).not.toHaveBeenCalled();

    await unmount();
  });

  it('drops a resume read that resolves after a live event already landed', async () => {
    const { unmount } = await renderHook(() => useDeviceNetworkMonitoring());
    await waitFor(() => {
      expect(mockGetNetworkState).toHaveBeenCalledTimes(1);
    });

    const read = deferred<NetworkState>();
    mockGetNetworkState.mockReturnValue(read.promise);
    await resumeFromBackground();
    await waitFor(() => {
      expect(mockGetNetworkState).toHaveBeenCalledTimes(2);
    });

    const listener = mockSubscribeToNetworkStatus.mock.calls[0][0];
    await act(() => {
      listener(makeState({ isConnected: false, connectionType: 'none' }));
    });

    await act(async () => {
      read.resolve(makeState({ isConnected: true, connectionType: 'wifi' }));
      await Promise.resolve();
    });

    expect(useNetworkStore.getState().isOnline).toBe(false);
    expect(useNetworkStore.getState().connectionType).toBe('none');

    await unmount();
  });

  it('logs and leaves state untouched when the resume read rejects', async () => {
    // Seeded offline, so "state is unchanged" is a claim that can actually fail.
    mockGetNetworkState.mockResolvedValue(
      makeState({ isConnected: false, connectionType: 'none' }),
    );
    const { unmount } = await renderHook(() => useDeviceNetworkMonitoring());
    await waitFor(() => {
      expect(useNetworkStore.getState().isOnline).toBe(false);
    });

    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    mockGetNetworkState.mockRejectedValue(new Error('native failure'));

    await resumeFromBackground();

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(expect.any(Error), {
        feature: 'device',
      });
    });
    expect(useNetworkStore.getState().isOnline).toBe(false);
    expect(useNetworkStore.getState().connectionType).toBe('none');

    errorSpy.mockRestore();
    await unmount();
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
