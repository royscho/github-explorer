import React from 'react';
import { View } from 'react-native';

import { useRepoDetailsSkeletonStyles } from '../hooks';

export function RepoDetailsSkeleton(): React.JSX.Element {
  const styles = useRepoDetailsSkeletonStyles();
  return (
    <View
      testID="repo-details-skeleton"
      style={styles.container}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <View style={[styles.bar, styles.title]} />
      <View style={[styles.bar, styles.line]} />
      <View style={[styles.bar, styles.line]} />
      <View style={[styles.bar, styles.lineShort]} />
    </View>
  );
}
