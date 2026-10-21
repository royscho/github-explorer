import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { mmkv } from '@shared/storage';
import { ThemeProvider } from '@shared/theme';
import { useTopInsetConsumed } from '@shared/components';

import { useNetworkStore } from '../store';
import { OfflineBannerBoundary } from './OfflineBannerBoundary';

// Reads the context `OfflineBannerBoundary` is responsible for setting, so the assertions below can
// pin what actually reaches a `Screen` nested inside it without depending on `Screen`'s own
// rendering (covered separately by `Screen.test.tsx`).
function ConsumedProbe(): React.JSX.Element {
  const consumed = useTopInsetConsumed();
  return <Text>{`consumed=${consumed}`}</Text>;
}

function renderBoundary() {
  return render(
    <ThemeProvider>
      <OfflineBannerBoundary>
        <ConsumedProbe />
      </OfflineBannerBoundary>
    </ThemeProvider>,
  );
}

describe('OfflineBannerBoundary', () => {
  beforeEach(() => {
    mmkv.clearAll();
    useNetworkStore.setState({
      isOnline: true,
      connectionType: 'wifi',
      isExpensive: false,
    });
  });

  it('renders children and reports the inset as unconsumed while online', async () => {
    await renderBoundary();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('consumed=false')).toBeOnTheScreen();
  });

  it('shows the banner and reports the inset as consumed while offline', async () => {
    useNetworkStore.setState({ isOnline: false });
    await renderBoundary();
    expect(screen.getByRole('alert')).toBeOnTheScreen();
    expect(screen.getByText('consumed=true')).toBeOnTheScreen();
  });
});
