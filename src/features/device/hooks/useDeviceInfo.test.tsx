import { renderHook, waitFor } from '@testing-library/react-native';

import { logger } from '@shared/logger';

import { getDeviceInfo, isLowPowerMode } from '../native';
import { useDeviceInfo } from './useDeviceInfo';

jest.mock('../native');

const mockGetDeviceInfo = getDeviceInfo as jest.MockedFunction<
  typeof getDeviceInfo
>;
const mockIsLowPowerMode = isLowPowerMode as jest.MockedFunction<
  typeof isLowPowerMode
>;

describe('useDeviceInfo', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('starts in a loading state', async () => {
    mockGetDeviceInfo.mockReturnValue(new Promise(() => {}));
    mockIsLowPowerMode.mockReturnValue(new Promise(() => {}));

    const { result } = await renderHook(() => useDeviceInfo());

    expect(result.current).toEqual({
      data: null,
      isLoading: true,
      error: null,
    });
  });

  it('resolves to device info and low-power mode', async () => {
    mockGetDeviceInfo.mockResolvedValue({
      model: 'iPhone',
      osVersion: '18.0',
      appVersion: '1.0',
      buildNumber: '1',
    });
    mockIsLowPowerMode.mockResolvedValue(true);

    const { result } = await renderHook(() => useDeviceInfo());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual({
      info: {
        model: 'iPhone',
        osVersion: '18.0',
        appVersion: '1.0',
        buildNumber: '1',
      },
      isLowPowerMode: true,
    });
  });

  it('surfaces a rejected native call as an error and logs it', async () => {
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    const error = new Error('native failure');
    mockGetDeviceInfo.mockRejectedValue(error);
    mockIsLowPowerMode.mockResolvedValue(false);

    const { result } = await renderHook(() => useDeviceInfo());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.data).toBeNull();
    expect(result.current.error).toEqual(error);
    expect(errorSpy).toHaveBeenCalledWith(error, { feature: 'device' });
    errorSpy.mockRestore();
  });
});
