import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useTanStackQueryDevTools } from '@rozenite/tanstack-query-plugin';
import { useZustandDevTools, type StoreEntry } from 'rozenite-zustand-devtools';

import { ErrorBoundary } from '@shared/components';
import { queryPersistOptions } from '@shared/storage';
import { ThemeProvider } from '@shared/theme';
import {
  useDeviceNetworkMonitoring,
  networkStoreForDevtools,
} from '@features/device';
import { favoritesStoreForDevtools } from '@features/favorites';

import { createQueryClient } from './queryClient';

export interface AppProvidersProps {
  children: React.ReactNode;
}

// Module scope, not inline in the component: `useZustandDevTools`'s own effect dependency array
// includes this array by reference, and re-sends a full snapshot, re-registers its message
// listener and re-subscribes every store whenever that reference changes — an inline array literal
// would tear all of that down and rebuild it on every `AppProviders` render.
const zustandDevToolsStores: StoreEntry[] = [
  { name: 'favorites', store: favoritesStoreForDevtools },
  { name: 'network', store: networkStoreForDevtools },
];

export function AppProviders({
  children,
}: AppProvidersProps): React.JSX.Element {
  const [queryClient] = useState(createQueryClient);
  useDeviceNetworkMonitoring();
  // Both hooks no-op when NODE_ENV is 'production' (verified in each package's own shipped code),
  // so they're safe to call unconditionally, matching their documented usage.
  useTanStackQueryDevTools(queryClient);
  useZustandDevTools(zustandDevToolsStores);

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
