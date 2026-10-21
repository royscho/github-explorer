import { useEffect } from 'react';
import { AppState } from 'react-native';
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
// subsequent change, re-reads on foreground, and mirrors each one onto React Query's
// `onlineManager` (§10.3) so queries pause while offline and resume on reconnect.
export function useDeviceNetworkMonitoring(): void {
  useEffect(() => {
    let isMounted = true;
    // Counts live events so that a `getNetworkState()` read resolving after an event has landed is
    // dropped instead of overwriting it with a value that was already stale on arrival. Both the
    // initial seed and every foreground re-read race live events this way.
    let eventCount = 0;

    const logFailure = (error: unknown): void =>
      logger.error(error, { feature: 'device' });

    function readAndApply(): Promise<void> {
      const eventsAtIssue = eventCount;
      return getNetworkState().then(state => {
        if (isMounted && eventCount === eventsAtIssue) {
          applyNetworkState(state);
        }
      });
    }

    const subscription = subscribeToNetworkStatus(state => {
      eventCount += 1;
      applyNetworkState(state);
    });

    // Subscribe before starting, so no event between `subscribeToNetworkStatus` and
    // `startNetworkMonitoring` resolving is missed; seed only after monitoring has actually
    // started — `getNetworkState()` before that reads a monitor that was never (or no longer)
    // running, which on iOS reports an unstarted monitor's default (unsatisfied) path.
    startNetworkMonitoring().then(readAndApply).catch(logFailure);

    // A suspended app isn't guaranteed to receive path updates, so a connectivity change while
    // backgrounded can be missed entirely and leave the store (and `onlineManager`) stale until the
    // next remount — which is why reloading the app "fixes" it. Re-reading on foreground makes
    // that self-correcting. It also covers the iOS Simulator, where `NWPathMonitor` often never
    // re-fires the offline→online event at all.
    const appStateSubscription = AppState.addEventListener('change', status => {
      if (status === 'active') {
        readAndApply().catch(logFailure);
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
      appStateSubscription.remove();
      stopNetworkMonitoring().catch(logFailure);
    };
  }, []);
}
