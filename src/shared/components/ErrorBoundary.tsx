import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { logger } from '@shared/logger';
import { makeStyles } from '@shared/theme';

import { Text } from './Text';

export interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error(error, { componentStack: info.componentStack });
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      return <ErrorBoundaryFallback onRestart={this.reset} />;
    }
    return this.props.children;
  }
}

function ErrorBoundaryFallback({
  onRestart,
}: {
  onRestart: () => void;
}): React.JSX.Element {
  const styles = useStyles();
  return (
    <View style={styles.container}>
      <Text variant="title" style={styles.title}>
        Something went wrong
      </Text>
      <Text variant="body" color="secondary" style={styles.message}>
        Please restart the app.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Restart"
        onPress={onRestart}
        style={styles.button}
        hitSlop={8}
      >
        <Text variant="body" style={styles.buttonLabel}>
          Restart
        </Text>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  title: {
    marginBottom: theme.spacing.sm,
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
