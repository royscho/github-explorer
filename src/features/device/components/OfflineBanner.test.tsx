import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { mmkv, recordSync } from '@shared/storage';
import { ThemeProvider } from '@shared/theme';
import { formatTime } from '@shared/utils';

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
    mmkv.clearAll();
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

  it('renders "You\'re offline" with no timestamp before anything has synced', async () => {
    useNetworkStore.setState({ isOnline: false });
    await renderBanner();
    expect(
      screen.getByRole('alert', { name: "You're offline" }),
    ).toBeOnTheScreen();
  });

  it('includes the last synced time once something has synced', async () => {
    const syncedAt = Date.now() - 1000;
    recordSync(syncedAt);
    useNetworkStore.setState({ isOnline: false });

    await renderBanner();

    expect(
      screen.getByRole('alert', {
        name: `You're offline — showing data from ${formatTime(
          new Date(syncedAt),
        )}`,
      }),
    ).toBeOnTheScreen();
  });
});
