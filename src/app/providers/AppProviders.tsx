import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';

import { ErrorBoundary } from '@shared/components';
import { queryPersistOptions } from '@shared/storage';
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
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={queryPersistOptions}
      >
        <ThemeProvider>
          <ErrorBoundary>{children}</ErrorBoundary>
        </ThemeProvider>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}
