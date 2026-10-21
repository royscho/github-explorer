import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@shared/components';
import { useTheme } from '@shared/theme';

import { useOfflineBannerStyles, useOfflineMessage } from '../hooks';

// Mounted as a sibling *before* each screen's own `Screen` (the `SafeAreaView` that applies the
// top inset — see `shared/components/Screen.tsx`), above header-less tab screens in particular, so
// it needs its own top inset or it renders under the status bar / notch / Dynamic Island.
export function OfflineBanner(): React.JSX.Element | null {
  const message = useOfflineMessage();
  const styles = useOfflineBannerStyles();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  if (!message) {
    return null;
  }

  return (
    <View
      style={[styles.container, { paddingTop: theme.spacing.sm + insets.top }]}
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
