/* eslint-env jest */
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

// `react-native-mmkv` already detects `JEST_WORKER_ID` and swaps in its own in-memory mock
// (`createMMKV.mock.ts`) — no mock needed here.
