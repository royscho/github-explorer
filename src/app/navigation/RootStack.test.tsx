import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '@shared/theme';

import { RootStack } from './RootStack';

jest.mock('@features/repos', () => ({
  RepoDetailsScreen: () => {
    const { Text: RNText } = jest.requireActual('react-native');
    return <RNText>Repo Details Stub</RNText>;
  },
}));

jest.mock('./MainTabs', () => ({
  MainTabs: () => {
    const { Text: RNText } = jest.requireActual('react-native');
    return <RNText>Main Tabs Stub</RNText>;
  },
}));

// The stub renders `withTopInset` so the assertion below can pin it: below this screen's native
// header the banner must not add the top inset a second time.
jest.mock('@features/device', () => ({
  OfflineBanner: ({ withTopInset }: { withTopInset?: boolean }) => {
    const { Text: RNText } = jest.requireActual('react-native');
    return (
      <RNText>{`Offline Banner Stub withTopInset=${withTopInset}`}</RNText>
    );
  },
}));

function renderRootStack(
  initialRouteName: 'MainTabs' | 'RepoDetails',
  params?: object,
) {
  return render(
    <ThemeProvider>
      <NavigationContainer
        initialState={{
          routes: [{ name: initialRouteName, params }],
        }}
      >
        <RootStack />
      </NavigationContainer>
    </ThemeProvider>,
  );
}

describe('RootStack', () => {
  it('renders MainTabs with no header', async () => {
    await renderRootStack('MainTabs');
    expect(await screen.findByText('Main Tabs Stub')).toBeOnTheScreen();
  });

  it('renders RepoDetails with a header titled after the repo param', async () => {
    await renderRootStack('RepoDetails', { owner: 'facebook', repo: 'react' });
    expect(await screen.findByText('Repo Details Stub')).toBeOnTheScreen();
    expect(
      screen.getByText('Offline Banner Stub withTopInset=false'),
    ).toBeOnTheScreen();
    // The native-stack header's title is a native prop on `RNSScreenStackHeaderConfig`, not
    // rendered text, so there's no accessible query for it — asserted against the raw tree instead.
    expect(JSON.stringify(screen.toJSON())).toContain('"title":"react"');
  });
});
