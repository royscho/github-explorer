import React from 'react';

import { TopInsetConsumedProvider } from '@shared/components';

import { useOfflineMessage } from '../hooks';
import { OfflineBanner } from './OfflineBanner';

export interface OfflineBannerBoundaryProps {
  children: React.ReactNode;
}

// Pairs `OfflineBanner` with the fact that, for as long as it's actually showing, it — not the
// `Screen` below it — is genuinely the topmost thing on screen: `OfflineBanner` applies its own top
// inset so its background clears the status bar, and without this, `Screen`'s `SafeAreaView` would
// apply the SAME inset a second time once it's been pushed down past the status bar by the banner's
// height (a no-op on Android, a visible blank band on iOS — see `TopInsetConsumedProvider`'s own
// comment for why the two platforms differ).
//
// `useOfflineMessage()` is called here as well as inside `OfflineBanner` itself, rather than
// computed once and threaded through as a prop: it's a cheap selector plus a synchronous MMKV read,
// both call sites re-render in the same tick off the same `isOnline` flip (so there is no "banner
// disagrees with context" case to worry about), and this keeps `OfflineBanner` a self-contained
// component that `RootStack` can keep using on its own, without this wrapper.
export function OfflineBannerBoundary({
  children,
}: OfflineBannerBoundaryProps): React.JSX.Element {
  const message = useOfflineMessage();

  return (
    <>
      <OfflineBanner />
      <TopInsetConsumedProvider consumed={message !== null}>
        {children}
      </TopInsetConsumedProvider>
    </>
  );
}
