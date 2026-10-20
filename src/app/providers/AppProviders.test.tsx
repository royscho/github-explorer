import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';

import { AppProviders } from './AppProviders';

function QueryProbe(): React.JSX.Element {
  const { data } = useQuery({
    queryKey: ['probe'],
    queryFn: () => Promise.resolve('ready'),
  });
  return <Text>{data ?? 'loading'}</Text>;
}

describe('AppProviders', () => {
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
});
