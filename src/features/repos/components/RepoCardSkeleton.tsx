import React from 'react';
import { View } from 'react-native';

import { Card } from '@shared/components';

import { useRepoCardSkeletonStyles } from '../hooks';

export function RepoCardSkeleton(): React.JSX.Element {
  const styles = useRepoCardSkeletonStyles();
  return (
    <View
      style={styles.wrapper}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Card style={styles.container}>
        <View style={[styles.bar, styles.title]} />
        <View style={[styles.bar, styles.line]} />
        <View style={[styles.bar, styles.lineShort]} />
      </Card>
    </View>
  );
}
