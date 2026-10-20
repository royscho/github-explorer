import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';

import { logger } from '@shared/logger';

import { ErrorView } from './ErrorView';

export interface ScreenErrorBoundaryProps {
  children: ReactNode;
}

interface ScreenErrorBoundaryInnerProps {
  children: ReactNode;
  onReset: () => void;
}

interface ScreenErrorBoundaryState {
  error: Error | null;
}

// A per-screen boundary (DESIGN §13), distinct from the app-level `ErrorBoundary`: this fallback
// lets the user retry just this screen instead of restarting the whole app. Wrapped in
// `QueryErrorResetBoundary` so retrying also clears any query that was reset-pending (relevant if
// a screen ever opts a query into `throwOnError`; today no query does, so that half is inert, but
// it's the mechanism DESIGN §13 describes — "resets boundary and query").
class ScreenErrorBoundaryInner extends Component<
  ScreenErrorBoundaryInnerProps,
  ScreenErrorBoundaryState
> {
  state: ScreenErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ScreenErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error(error, { componentStack: info.componentStack });
  }

  retry = (): void => {
    this.props.onReset();
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      return <ErrorView message="Something went wrong" onRetry={this.retry} />;
    }
    return this.props.children;
  }
}

export function ScreenErrorBoundary({
  children,
}: ScreenErrorBoundaryProps): React.JSX.Element {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ScreenErrorBoundaryInner onReset={reset}>
          {children}
        </ScreenErrorBoundaryInner>
      )}
    </QueryErrorResetBoundary>
  );
}
