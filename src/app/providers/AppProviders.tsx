import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';

import { ErrorBoundary } from '@shared/components';
import { ThemeProvider } from '@shared/theme';
import { useDeviceNetworkMonitoring } from '@features/device';

import { createQueryClient } from './queryClient';

export interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({
  children,
}: AppProvidersProps): React.JSX.Element {
  const [queryClient] = useState(createQueryClient);
  useDeviceNetworkMonitoring();

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ErrorBoundary>{children}</ErrorBoundary>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
