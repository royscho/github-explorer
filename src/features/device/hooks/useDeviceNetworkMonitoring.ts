import { useEffect } from 'react';
import { onlineManager } from '@tanstack/react-query';

import { logger } from '@shared/logger';

import {
  getNetworkState,
  startNetworkMonitoring,
  stopNetworkMonitoring,
  subscribeToNetworkStatus,
} from '../native';
import type { NetworkState } from '../native';
import { useNetworkStore } from '../store';

function applyNetworkState(state: NetworkState): void {
  useNetworkStore.getState().setNetworkState(state);
  onlineManager.setOnline(state.isConnected);
}

// Called once, from `AppProviders` — starts native monitoring, seeds the store from one
// `getNetworkState()` call so state is correct before the first event, subscribes to every
// subsequent change, and mirrors each one onto React Query's `onlineManager` (§10.3) so queries
// pause while offline and resume on reconnect.
export function useDeviceNetworkMonitoring(): void {
  useEffect(() => {
    let isMounted = true;
    // The seed read races the first live event in principle (both are async). If an event already
    // landed, the seed — which can be stale by the time it resolves — is dropped instead of
    // clobbering newer state.
    let receivedEvent = false;

    const subscription = subscribeToNetworkStatus(state => {
      receivedEvent = true;
      applyNetworkState(state);
    });

    // Subscribe before starting, so no event between `subscribeToNetworkStatus` and
    // `startNetworkMonitoring` resolving is missed; seed only after monitoring has actually
    // started — `getNetworkState()` before that reads a monitor that was never (or no longer)
    // running, which on iOS reports an unstarted monitor's default (unsatisfied) path.
    startNetworkMonitoring()
      .then(() => getNetworkState())
      .then(state => {
        if (isMounted && !receivedEvent) {
          applyNetworkState(state);
        }
      })
      .catch((error: unknown) => logger.error(error, { feature: 'device' }));

    return () => {
      isMounted = false;
      subscription.remove();
      stopNetworkMonitoring().catch((error: unknown) =>
        logger.error(error, { feature: 'device' }),
      );
    };
  }, []);
}
