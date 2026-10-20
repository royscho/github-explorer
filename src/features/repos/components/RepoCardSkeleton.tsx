import React from 'react';
import { View } from 'react-native';

import { useRepoCardSkeletonStyles } from '../hooks';

export function RepoCardSkeleton(): React.JSX.Element {
  const styles = useRepoCardSkeletonStyles();
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
