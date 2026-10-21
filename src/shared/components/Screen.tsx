import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useScreenStyles } from '@shared/hooks';

import { useTopInsetConsumed } from './TopInsetContext';

export interface ScreenProps {
  children: React.ReactNode;
  /**
   * Edges to apply a safe-area inset to. Defaults to excluding `bottom`: this app's screens sit
   * either inside the bottom-tab navigator (which already reserves that space for the tab bar) or
   * are pushed over it (§6.1), so an extra bottom inset would double up as a visible blank gap.
   * Pass `['top', 'bottom', 'left', 'right']` for a screen genuinely at the bottom of the window.
   *
   * `'top'` is dropped from whatever is passed here while `useTopInsetConsumed()` reports `true` —
   * see `TopInsetContext.tsx`. A screen that always renders below something else that owns the top
   * inset (a native-stack header, say) should still leave `'top'` out of this prop directly, as
   * `RepoDetailsScreen` does; the context is for the case that only sometimes applies, such as an
   * offline banner that isn't always showing.
   */
  edges?: ReadonlyArray<'top' | 'bottom' | 'left' | 'right'>;
}

export function Screen({
  children,
  edges = ['top', 'left', 'right'],
}: ScreenProps): React.JSX.Element {
  const styles = useScreenStyles();
  const topInsetConsumed = useTopInsetConsumed();
  const effectiveEdges = topInsetConsumed
    ? edges.filter(edge => edge !== 'top')
    : edges;

  return (
    <SafeAreaView
      testID="screen"
      style={styles.container}
      edges={effectiveEdges}
    >
      {children}
    </SafeAreaView>
  );
}
