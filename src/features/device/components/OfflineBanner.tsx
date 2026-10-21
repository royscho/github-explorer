import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@shared/components';
import { useTheme } from '@shared/theme';

import { useOfflineBannerStyles, useOfflineMessage } from '../hooks';

export interface OfflineBannerProps {
  /**
   * Whether to add the top safe-area inset to the banner's own padding. Defaults to `true`, for the
   * header-less tab screens this mostly renders above. Pass `false` on a screen that already has
   * something occupying that inset above the banner — a native-stack header, say: neither
   * `@react-navigation/native-stack` nor `react-native-screens` narrows `SafeAreaInsetsContext` for
   * the screens below a header, so `useSafeAreaInsets()` still reports the full window inset there
   * and adding it would push the banner a status-bar's height below the header.
   */
  withTopInset?: boolean;
}

// Mounted as a sibling *before* each screen's own `Screen` (the `SafeAreaView` that applies the
// top inset — see `shared/components/Screen.tsx`), above header-less tab screens in particular, so
// it needs its own top inset or it renders under the status bar / notch / Dynamic Island.
export function OfflineBanner({
  withTopInset = true,
}: OfflineBannerProps): React.JSX.Element | null {
  const message = useOfflineMessage();
  const styles = useOfflineBannerStyles();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  if (!message) {
    return null;
  }

  const topInset = withTopInset ? insets.top : 0;

  return (
    <View
      style={[styles.container, { paddingTop: theme.spacing.sm + topInset }]}
      accessible
      accessibilityRole="alert"
      accessibilityLabel={message}
      accessibilityLiveRegion="polite"
    >
      <Text variant="body" style={styles.message}>
        {message}
      </Text>
    </View>
  );
}
