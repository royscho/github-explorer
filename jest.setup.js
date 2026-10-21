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

// `@rozenite/tanstack-query-plugin`'s own production guard checks `NODE_ENV !== 'production'`,
// which is true under Jest's `NODE_ENV=test` too — so without this mock it loads its real
// implementation, which tries to open a DevTools-bridge connection that doesn't exist in Jest and
// hangs every test that renders `AppProviders` (which calls the hook on every mount) indefinitely.
jest.mock('@rozenite/tanstack-query-plugin', () => ({
  useTanStackQueryDevTools: jest.fn(() => ({ isConnected: false })),
}));

// `rozenite-zustand-devtools` has its own, differently-shaped production guard
// (`NODE_ENV !== 'production' && navigator.product === 'ReactNative' && typeof window !==
// 'undefined'`), but shares the same `NODE_ENV=test` gap as the plugin above — confirmed by
// reading its shipped code, not by independently reproducing the hang the way the plugin above
// was. Every test that renders `AppProviders` (which calls this hook on every mount) would
// otherwise risk the same kind of DevTools-bridge connection attempt that doesn't exist in Jest.
jest.mock('rozenite-zustand-devtools', () => ({
  useZustandDevTools: jest.fn(),
}));
