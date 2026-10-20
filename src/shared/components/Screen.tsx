import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { makeStyles } from '@shared/theme';

export interface ScreenProps {
  children: React.ReactNode;
  /**
   * Edges to apply a safe-area inset to. Defaults to excluding `bottom`: this app's screens sit
   * either inside the bottom-tab navigator (which already reserves that space for the tab bar) or
   * are pushed over it (§6.1), so an extra bottom inset would double up as a visible blank gap.
   * Pass `['top', 'bottom', 'left', 'right']` for a screen genuinely at the bottom of the window.
   */
  edges?: ReadonlyArray<'top' | 'bottom' | 'left' | 'right'>;
}

export function Screen({
  children,
  edges = ['top', 'left', 'right'],
}: ScreenProps): React.JSX.Element {
  const styles = useStyles();
  return (
    <SafeAreaView style={styles.container} edges={edges}>
      {children}
    </SafeAreaView>
  );
}

const useStyles = makeStyles(theme => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
}));
