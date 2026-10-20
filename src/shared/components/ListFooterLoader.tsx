import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useListFooterLoaderStyles } from '@shared/hooks';
import { useTheme } from '@shared/theme';

export function ListFooterLoader(): React.JSX.Element {
  const theme = useTheme();
  const styles = useListFooterLoaderStyles();
  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading more repositories"
    >
      <ActivityIndicator color={theme.colors.accent} />
    </View>
  );
}
