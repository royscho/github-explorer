import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, useQuery } from '@tanstack/react-query';
import { useTanStackQueryDevTools } from '@rozenite/tanstack-query-plugin';
import { useZustandDevTools } from 'rozenite-zustand-devtools';

// Already jest.fn()-based mocks registered globally in `jest.setup.js` — see its comments.
import NativeDeviceNetwork from '@specs/NativeDeviceNetwork';
import { mmkv, queryPersistOptions } from '@shared/storage';

import { AppProviders } from './AppProviders';

const mockNativeDeviceNetwork = NativeDeviceNetwork as jest.Mocked<
  typeof NativeDeviceNetwork
>;
const mockUseTanStackQueryDevTools =
  useTanStackQueryDevTools as jest.MockedFunction<
    typeof useTanStackQueryDevTools
  >;
const mockUseZustandDevTools = useZustandDevTools as jest.MockedFunction<
  typeof useZustandDevTools
>;

function QueryProbe(): React.JSX.Element {
  const { data } = useQuery({
    queryKey: ['probe'],
    queryFn: () => Promise.resolve('ready'),
  });
  return <Text>{data ?? 'loading'}</Text>;
}

// Never resolves — if a probe using this shows anything other than its initial fallback, it can
// only be a restored value, not one this queryFn produced.
function NeverResolvingProbe(): React.JSX.Element {
  const { data } = useQuery({
    queryKey: ['probe'],
    queryFn: () => new Promise<string>(() => {}),
  });
  return <Text>{data ?? 'loading'}</Text>;
}

async function persistProbeClient(
  overrides: { buster?: string; timestamp?: number } = {},
): Promise<void> {
  const { persister } = queryPersistOptions;
  if (!persister) {
    throw new Error('expected a persister to be set');
  }
  await persister.persistClient({
    timestamp: overrides.timestamp ?? Date.now(),
    buster: overrides.buster ?? queryPersistOptions.buster ?? '',
    clientState: {
      queries: [
        {
          queryKey: ['probe'],
          queryHash: JSON.stringify(['probe']),
          dehydratedAt: Date.now(),
          state: {
            data: 'restored',
            dataUpdateCount: 1,
            dataUpdatedAt: Date.now(),
            error: null,
            errorUpdateCount: 0,
            errorUpdatedAt: 0,
            fetchFailureCount: 0,
            fetchFailureReason: null,
            fetchMeta: null,
            isInvalidated: false,
            status: 'success',
            fetchStatus: 'idle',
          },
        },
      ],
      mutations: [],
    },
  });
}

describe('AppProviders', () => {
  beforeEach(() => {
    mmkv.clearAll();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders children', async () => {
    await render(
      <AppProviders>
        <Text>hello</Text>
      </AppProviders>,
    );
    expect(await screen.findByText('hello')).toBeOnTheScreen();
  });

  it('provides a working QueryClient to descendants', async () => {
    await render(
      <AppProviders>
        <QueryProbe />
      </AppProviders>,
    );
    expect(await screen.findByText('ready')).toBeOnTheScreen();
  });

  it('starts device network monitoring on mount', async () => {
    await render(
      <AppProviders>
        <Text>hello</Text>
      </AppProviders>,
    );
    await waitFor(() => {
      expect(
        mockNativeDeviceNetwork.startNetworkMonitoring,
      ).toHaveBeenCalledTimes(1);
    });
  });

  it('wires the QueryClient into the TanStack Query devtools hook', async () => {
    await render(
      <AppProviders>
        <Text>hello</Text>
      </AppProviders>,
    );

    expect(mockUseTanStackQueryDevTools).toHaveBeenCalledWith(
      expect.any(QueryClient),
    );
  });

  it('registers favorites and network with the Zustand devtools hook, with a stable stores reference across renders', async () => {
    const { rerender } = await render(
      <AppProviders>
        <Text>hello</Text>
      </AppProviders>,
    );

    expect(mockUseZustandDevTools).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'favorites' }),
      expect.objectContaining({ name: 'network' }),
    ]);

    await rerender(
      <AppProviders>
        <Text>hello again</Text>
      </AppProviders>,
    );

    // The module-scope stores array must be the exact same reference across renders — a new one
    // would make `useZustandDevTools`'s own effect tear down and rebuild every store subscription.
    expect(mockUseZustandDevTools.mock.calls[1][0]).toBe(
      mockUseZustandDevTools.mock.calls[0][0],
    );
  });

  it('restores a persisted query into a descendant before it would otherwise resolve', async () => {
    await persistProbeClient();

    await render(
      <AppProviders>
        <NeverResolvingProbe />
      </AppProviders>,
    );

    expect(await screen.findByText('restored')).toBeOnTheScreen();
  });

  it('does not restore a persisted client saved under a different app version', async () => {
    await persistProbeClient({ buster: 'some-other-version' });

    await render(
      <AppProviders>
        <NeverResolvingProbe />
      </AppProviders>,
    );

    expect(await screen.findByText('loading')).toBeOnTheScreen();
  });

  it('does not restore a persisted client older than the max cache age', async () => {
    const { maxAge } = queryPersistOptions;
    if (maxAge === undefined) {
      throw new Error('expected a maxAge to be set');
    }
    await persistProbeClient({ timestamp: Date.now() - maxAge - 1 });

    await render(
      <AppProviders>
        <NeverResolvingProbe />
      </AppProviders>,
    );

    expect(await screen.findByText('loading')).toBeOnTheScreen();
  });
});
