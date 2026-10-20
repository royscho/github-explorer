import React from 'react';
import { View } from 'react-native';

import { makeStyles } from '@shared/theme';

export function RepoCardSkeleton(): React.JSX.Element {
  const styles = useStyles();
  return (
    <View
      style={styles.container}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <View style={[styles.bar, styles.title]} />
      <View style={[styles.bar, styles.line]} />
      <View style={[styles.bar, styles.lineShort]} />
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  bar: {
    backgroundColor: theme.colors.border,
    borderRadius: theme.radii.sm,
    height: 12,
  },
  title: {
    width: '50%',
    height: 16,
  },
  line: {
    width: '90%',
  },
  lineShort: {
    width: '60%',
  },
}));
