import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '@shared/theme';

import { ListFooterLoader } from './ListFooterLoader';

describe('ListFooterLoader', () => {
  it('renders an accessible progress indicator', async () => {
    await render(
      <ThemeProvider>
        <ListFooterLoader />
      </ThemeProvider>,
    );
    expect(
      await screen.findByRole('progressbar', {
        name: 'Loading more repositories',
      }),
    ).toBeOnTheScreen();
  });
});
