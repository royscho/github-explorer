import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '@shared/theme';

import { LoadingView } from './LoadingView';

describe('LoadingView', () => {
  it('renders the requested number of skeleton rows', async () => {
    await render(
      <ThemeProvider>
        <LoadingView
          count={4}
          renderItem={index => <Text key={index}>row-{index}</Text>}
        />
      </ThemeProvider>,
    );
    for (let i = 0; i < 4; i += 1) {
      expect(await screen.findByText(`row-${i}`)).toBeOnTheScreen();
    }
  });

  it('is exposed as a progress indicator for accessibility', async () => {
    await render(
      <ThemeProvider>
        <LoadingView
          renderItem={index => <Text key={index}>row-{index}</Text>}
        />
      </ThemeProvider>,
    );
    expect(await screen.findByRole('progressbar')).toBeOnTheScreen();
  });
});
