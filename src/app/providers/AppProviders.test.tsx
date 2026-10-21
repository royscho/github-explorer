import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';

// Already a jest.fn()-based mock registered globally in `jest.setup.js` — see its comment.
import NativeDeviceNetwork from '@specs/NativeDeviceNetwork';

import { AppProviders } from './AppProviders';

const mockNativeDeviceNetwork = NativeDeviceNetwork as jest.Mocked<
  typeof NativeDeviceNetwork
>;

function QueryProbe(): React.JSX.Element {
  const { data } = useQuery({
    queryKey: ['probe'],
    queryFn: () => Promise.resolve('ready'),
  });
  return <Text>{data ?? 'loading'}</Text>;
}

describe('AppProviders', () => {
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
});
