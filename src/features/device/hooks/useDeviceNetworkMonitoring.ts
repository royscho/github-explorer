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
// subsequent change, recreates the monitor when the app returns from the background, and mirrors
// each state onto React Query's `onlineManager` (§10.3) so queries pause while offline and resume
// on reconnect.
export function useDeviceNetworkMonitoring(): void {
  useEffect(() => {
    let isMounted = true;
    // Counts live events so that a `getNetworkState()` read resolving after an event has landed is
    // dropped instead of overwriting it with a value that was already stale on arrival. A counter
    // rather than a "seen an event" flag: a flag would latch after the first event and silently
    // discard every later read, including the ones below that exist to correct stale state.
    // This assumes an event is always fresher than a read issued before it — true for the fresh
    // monitor's initial update, and the reason a dropped read needs no retry.
    let eventCount = 0;
    // `'active'` also fires for transient interruptions that never suspended the app (Control
    // Centre, the app switcher, a Face ID prompt), and those can't have missed a path update — so
    // only an `'active'` that follows an observed `'background'` counts as a resume. Tracked from
    // the events themselves rather than `AppState.currentState`, which is nullable, and latched
    // until consumed so an intervening `'inactive'` on the way back up can't clear it.
    let wasBackgrounded = false;

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
    // `startNetworkMonitoring` resolving is missed. Every read is chained onto a *resolved* start:
    // `getNetworkState()` before monitoring is running reports an unstarted monitor's default
    // (unsatisfied) path on iOS, which would apply a spurious offline state.
    startNetworkMonitoring().then(readAndApply).catch(logFailure);

    const appStateSubscription = AppState.addEventListener('change', status => {
      if (status === 'background') {
        wasBackgrounded = true;
        return;
      }
      if (status !== 'active' || !wasBackgrounded) {
        return;
      }
      wasBackgrounded = false;

      // A suspended app isn't guaranteed to receive path updates, so a connectivity change while
      // backgrounded can be missed and leave the store (and `onlineManager`) stale. Re-reading
      // isn't enough on iOS: `getNetworkState()` returns the running monitor's `currentPath`, so a
      // monitor that went stale returns the same stale answer. Recreating it is what forces a real
      // update — `NWPathMonitor.start(queue:)` always delivers an initial path, which arrives here
      // as a live event. `startNetworkMonitoring()` alone can't do that (it's idempotent by
      // design), hence the stop first. On Android this is a cheap callback re-registration, and
      // the follow-up read is a live `activeNetwork` query that self-corrects on its own.
      stopNetworkMonitoring()
        .then(startNetworkMonitoring)
        .then(readAndApply)
        .catch(logFailure);
    });

    return () => {
      isMounted = false;
      subscription.remove();
      appStateSubscription.remove();
      stopNetworkMonitoring().catch(logFailure);
    };
  }, []);
}
