import React from 'react';
import { View } from 'react-native';

import { useComingSoonScreenStyles } from '@shared/hooks';

import { Screen } from './Screen';
import { Text } from './Text';

export interface ComingSoonScreenProps {
  title: string;
}

export function ComingSoonScreen({
  title,
}: ComingSoonScreenProps): React.JSX.Element {
  const styles = useComingSoonScreenStyles();
  return (
    <Screen>
      <View style={styles.container}>
        <Text variant="title">{title}</Text>
        <Text variant="body" color="secondary" style={styles.message}>
          Coming in a later milestone.
        </Text>
      </View>
    </Screen>
  );
}
