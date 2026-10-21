/* eslint-env jest */
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

// `react-native-mmkv` already detects `JEST_WORKER_ID` and swaps in its own in-memory mock
// (`createMMKV.mock.ts`) — no mock needed here.

// `TurboModuleRegistry.getEnforcing('DeviceNetwork')` throws under Jest since there's no real
// native module registered — this default stub lets any test that renders `AppProviders` (which
// starts network monitoring on mount) run without crashing. Tests that care about the device
// feature's own behavior override this per-file with their own `jest.mock('../native', ...)` or
// `jest.mock('@specs/NativeDeviceNetwork', ...)`.
jest.mock('@specs/NativeDeviceNetwork', () => ({
  __esModule: true,
  default: {
    getNetworkState: jest.fn().mockResolvedValue({
      isConnected: true,
      connectionType: 'wifi',
      isExpensive: false,
    }),
    getDeviceInfo: jest.fn().mockResolvedValue({
      model: 'unknown',
      osVersion: 'unknown',
      appVersion: 'unknown',
      buildNumber: 'unknown',
    }),
    isLowPowerMode: jest.fn().mockResolvedValue(false),
    startNetworkMonitoring: jest.fn().mockResolvedValue(undefined),
    stopNetworkMonitoring: jest.fn().mockResolvedValue(undefined),
    onNetworkStatusChanged: jest.fn().mockReturnValue({ remove: jest.fn() }),
  },
}));
