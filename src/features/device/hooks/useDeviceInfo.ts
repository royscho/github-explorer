import { useEffect, useState } from 'react';

import { logger } from '@shared/logger';

import { getDeviceInfo, isLowPowerMode } from '../native';
import type { DeviceInfo } from '../native';

export interface DeviceInfoData {
  info: DeviceInfo;
  isLowPowerMode: boolean;
}

export interface UseDeviceInfoResult {
  data: DeviceInfoData | null;
  isLoading: boolean;
  error: Error | null;
}

// A one-shot read of device info + low-power mode: local device state fetched once, not GitHub
// server data, so it's a plain hook rather than a React Query (§4) — no caching/retry/pagination
// needs apply.
export function useDeviceInfo(): UseDeviceInfoResult {
  const [state, setState] = useState<UseDeviceInfoResult>({
    data: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    Promise.all([getDeviceInfo(), isLowPowerMode()])
      .then(([info, lowPowerMode]) => {
        if (isMounted) {
          setState({
            data: { info, isLowPowerMode: lowPowerMode },
            isLoading: false,
            error: null,
          });
        }
      })
      .catch((error: unknown) => {
        logger.error(error, { feature: 'device' });
        if (isMounted) {
          setState({
            data: null,
            isLoading: false,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return state;
}
