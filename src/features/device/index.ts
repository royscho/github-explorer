import { useNetworkStore } from './store';

export {
  OfflineBanner,
  OfflineBannerBoundary,
  DeviceInfoSection,
} from './components';
export type { OfflineBannerProps } from './components';
export { useDeviceNetworkMonitoring } from './hooks';

// Read-only view for devtools registration (AppProviders) only — feature code should keep using
// the narrower `useNetworkStatus` selector hook. Typed to just `getState`/`subscribe` (what
// devtools registration needs) rather than the full hook, so this can't be called as a hook or
// used to write state from outside the feature.
export const networkStoreForDevtools: Pick<
  typeof useNetworkStore,
  'getState' | 'subscribe'
> = useNetworkStore;
