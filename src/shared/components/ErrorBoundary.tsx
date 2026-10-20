import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { useErrorBoundaryStyles } from '@shared/hooks';
import { logger } from '@shared/logger';

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
  const styles = useErrorBoundaryStyles();
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
