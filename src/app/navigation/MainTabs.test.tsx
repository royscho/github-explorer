import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { render, screen, userEvent } from '@testing-library/react-native';

import { ThemeProvider } from '@shared/theme';

import { MainTabs } from './MainTabs';

jest.mock('@features/repos', () => ({
  ExploreScreen: () => {
    const { Text: RNText } = jest.requireActual('react-native');
    return <RNText>Explore Stub</RNText>;
  },
}));

jest.mock('@features/favorites', () => ({
  FavoritesScreen: () => {
    const { Text: RNText } = jest.requireActual('react-native');
    return <RNText>Favorites Stub</RNText>;
  },
}));

jest.mock('@features/settings', () => ({
  SettingsScreen: () => {
    const { Text: RNText } = jest.requireActual('react-native');
    return <RNText>Settings Stub</RNText>;
  },
}));

jest.mock('@features/device', () => ({
  OfflineBanner: () => {
    const { Text: RNText } = jest.requireActual('react-native');
    return <RNText>Offline Banner Stub</RNText>;
  },
}));

function renderMainTabs() {
  return render(
    <ThemeProvider>
      <NavigationContainer>
        <MainTabs />
      </NavigationContainer>
    </ThemeProvider>,
  );
}

describe('MainTabs', () => {
  it('shows all three tabs by role', async () => {
    await renderMainTabs();
    expect(
      await screen.findByRole('button', { name: /^Explore/ }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: /^Favorites/ }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^Settings/ })).toBeOnTheScreen();
  });

  it('shows the Explore screen and the offline banner by default', async () => {
    await renderMainTabs();
    expect(await screen.findByText('Explore Stub')).toBeOnTheScreen();
    expect(screen.getByText('Offline Banner Stub')).toBeOnTheScreen();
  });

  it('switches to the Favorites screen when its tab is pressed', async () => {
    await renderMainTabs();
    await userEvent.press(
      await screen.findByRole('button', { name: /^Favorites/ }),
    );
    expect(await screen.findByText('Favorites Stub')).toBeOnTheScreen();
    expect(screen.getByText('Offline Banner Stub')).toBeOnTheScreen();
    expect(screen.queryByText('Explore Stub')).toBeNull();
  });

  it('switches to the Settings screen when its tab is pressed', async () => {
    await renderMainTabs();
    await userEvent.press(
      await screen.findByRole('button', { name: /^Settings/ }),
    );
    expect(await screen.findByText('Settings Stub')).toBeOnTheScreen();
    expect(screen.getByText('Offline Banner Stub')).toBeOnTheScreen();
    expect(screen.queryByText('Explore Stub')).toBeNull();
  });
});
