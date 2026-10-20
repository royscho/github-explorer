import React from 'react';
import { Pressable, View } from 'react-native';

import { makeStyles } from '@shared/theme';

import { Text } from './Text';

export interface ErrorViewProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorView({
  message,
  onRetry,
}: ErrorViewProps): React.JSX.Element {
  const styles = useStyles();
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

const useStyles = makeStyles(theme => ({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  message: {
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  button: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    color: theme.colors.textOnAccent,
    fontWeight: '600',
  },
}));
