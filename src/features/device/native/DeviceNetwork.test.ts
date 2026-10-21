import type { NetworkState } from '@specs/NativeDeviceNetwork';
// `@specs/NativeDeviceNetwork` is already a jest.fn()-based mock registered globally in
// `jest.setup.js` (real `TurboModuleRegistry.getEnforcing` has nothing to resolve under Jest) —
// reusing that mock here instead of re-registering the module keeps a single source of truth for
// what "the native module" looks like in tests.
import NativeDeviceNetwork from '@specs/NativeDeviceNetwork';

import {
  getDeviceInfo,
  getNetworkState,
  isLowPowerMode,
  startNetworkMonitoring,
  stopNetworkMonitoring,
  subscribeToNetworkStatus,
} from './DeviceNetwork';

const mockNativeDeviceNetwork = NativeDeviceNetwork as jest.Mocked<
  typeof NativeDeviceNetwork
>;

describe('DeviceNetwork native wrapper', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('getNetworkState forwards to the native module', async () => {
    const state: NetworkState = {
      isConnected: true,
      connectionType: 'wifi',
      isExpensive: false,
    };
    mockNativeDeviceNetwork.getNetworkState.mockResolvedValue(state);

    await expect(getNetworkState()).resolves.toEqual(state);
    expect(mockNativeDeviceNetwork.getNetworkState).toHaveBeenCalledTimes(1);
  });

  it('getDeviceInfo forwards to the native module', async () => {
    const info = {
      model: 'iPhone',
      osVersion: '18.0',
      appVersion: '1.0',
      buildNumber: '1',
    };
    mockNativeDeviceNetwork.getDeviceInfo.mockResolvedValue(info);

    await expect(getDeviceInfo()).resolves.toEqual(info);
    expect(mockNativeDeviceNetwork.getDeviceInfo).toHaveBeenCalledTimes(1);
  });

  it('isLowPowerMode forwards to the native module', async () => {
    mockNativeDeviceNetwork.isLowPowerMode.mockResolvedValue(true);

    await expect(isLowPowerMode()).resolves.toBe(true);
    expect(mockNativeDeviceNetwork.isLowPowerMode).toHaveBeenCalledTimes(1);
  });

  it('startNetworkMonitoring forwards to the native module', async () => {
    mockNativeDeviceNetwork.startNetworkMonitoring.mockResolvedValue(undefined);

    await startNetworkMonitoring();
    expect(
      mockNativeDeviceNetwork.startNetworkMonitoring,
    ).toHaveBeenCalledTimes(1);
  });

  it('stopNetworkMonitoring forwards to the native module', async () => {
    mockNativeDeviceNetwork.stopNetworkMonitoring.mockResolvedValue(undefined);

    await stopNetworkMonitoring();
    expect(mockNativeDeviceNetwork.stopNetworkMonitoring).toHaveBeenCalledTimes(
      1,
    );
  });

  it('subscribeToNetworkStatus registers the listener and returns the subscription', () => {
    const subscription = { remove: jest.fn() };
    mockNativeDeviceNetwork.onNetworkStatusChanged.mockReturnValue(
      subscription,
    );
    const listener = jest.fn();

    const result = subscribeToNetworkStatus(listener);

    expect(mockNativeDeviceNetwork.onNetworkStatusChanged).toHaveBeenCalledWith(
      listener,
    );
    expect(result).toBe(subscription);
  });
});
