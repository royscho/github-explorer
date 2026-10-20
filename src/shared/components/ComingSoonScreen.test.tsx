import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '@shared/theme';

import { ComingSoonScreen } from './ComingSoonScreen';

describe('ComingSoonScreen', () => {
  it('renders the given title', async () => {
    await render(
      <SafeAreaProvider>
        <ThemeProvider>
          <ComingSoonScreen title="Favorites" />
        </ThemeProvider>
      </SafeAreaProvider>,
    );
    expect(await screen.findByText('Favorites')).toBeOnTheScreen();
    expect(
      await screen.findByText('Coming in a later milestone.'),
    ).toBeOnTheScreen();
  });
});
