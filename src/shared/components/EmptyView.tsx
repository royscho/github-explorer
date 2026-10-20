import React from 'react';
import { View } from 'react-native';

import { useEmptyViewStyles } from '@shared/hooks';

import { Text } from './Text';

export interface EmptyViewProps {
  message: string;
}

export function EmptyView({ message }: EmptyViewProps): React.JSX.Element {
  const styles = useEmptyViewStyles();
  return (
    <View style={styles.container}>
      <Text variant="body" color="secondary" style={styles.message}>
        {message}
      </Text>
    </View>
  );
}
