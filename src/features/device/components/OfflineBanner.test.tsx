import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '@shared/theme';

import { useNetworkStore } from '../store';
import { OfflineBanner } from './OfflineBanner';

function renderBanner() {
  return render(
    <ThemeProvider>
      <OfflineBanner />
    </ThemeProvider>,
  );
}

describe('OfflineBanner', () => {
  beforeEach(() => {
    useNetworkStore.setState({
      isOnline: true,
      connectionType: 'wifi',
      isExpensive: false,
    });
  });

  it('renders nothing while online', async () => {
    await renderBanner();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('renders the banner while offline', async () => {
    useNetworkStore.setState({ isOnline: false });
    await renderBanner();
    expect(
      screen.getByRole('alert', { name: "You're offline" }),
    ).toBeOnTheScreen();
  });
});
