import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { makeStyles, useTheme } from '@shared/theme';

export function ListFooterLoader(): React.JSX.Element {
  const theme = useTheme();
  const styles = useStyles();
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

const useStyles = makeStyles(theme => ({
  container: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
}));
