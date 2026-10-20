import React from 'react';
import { Pressable, View } from 'react-native';

import { useErrorViewStyles } from '@shared/hooks';

import { Text } from './Text';

export interface ErrorViewProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorView({
  message,
  onRetry,
}: ErrorViewProps): React.JSX.Element {
  const styles = useErrorViewStyles();
  return (
    <View style={styles.container}>
      <Text variant="body" color="secondary" style={styles.message}>
        {message}
      </Text>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry"
          onPress={onRetry}
          style={styles.button}
          hitSlop={8}
        >
          <Text variant="body" style={styles.buttonLabel}>
            Retry
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
