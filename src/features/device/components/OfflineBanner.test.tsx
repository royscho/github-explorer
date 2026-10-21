import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { render, screen } from '@testing-library/react-native';

import { mmkv, recordSync } from '@shared/storage';
import { ThemeProvider } from '@shared/theme';
import { formatTime } from '@shared/utils';

import { useNetworkStore } from '../store';
import { OfflineBanner } from './OfflineBanner';
import type { OfflineBannerProps } from './OfflineBanner';

// `spacing.sm`, the banner's own vertical padding, which the top inset is added on top of.
const BANNER_PADDING = 8;
const INSET_TOP = 47;

function renderBanner(props: OfflineBannerProps = {}) {
  return render(
    <SafeAreaInsetsContext.Provider
      value={{ top: INSET_TOP, bottom: 0, left: 0, right: 0 }}
    >
      <ThemeProvider>
        <OfflineBanner {...props} />
      </ThemeProvider>
    </SafeAreaInsetsContext.Provider>,
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

  it('adds the top safe-area inset to its padding by default', async () => {
    useNetworkStore.setState({ isOnline: false });
    await renderBanner();

    const { paddingTop } = StyleSheet.flatten(
      screen.getByRole('alert').props.style,
    );
    expect(paddingTop).toBe(BANNER_PADDING + INSET_TOP);
  });

  // Below a native-stack header the inset is already spoken for — see `OfflineBannerProps`.
  it('leaves the top inset out when withTopInset is false', async () => {
    useNetworkStore.setState({ isOnline: false });
    await renderBanner({ withTopInset: false });

    const { paddingTop } = StyleSheet.flatten(
      screen.getByRole('alert').props.style,
    );
    expect(paddingTop).toBe(BANNER_PADDING);
  });
});
