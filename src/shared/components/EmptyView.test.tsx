import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '@shared/theme';

import { EmptyView } from './EmptyView';

describe('EmptyView', () => {
  it('renders the given message', async () => {
    await render(
      <ThemeProvider>
        <EmptyView message="This organization has no public repositories" />
      </ThemeProvider>,
    );
    expect(
      await screen.findByText('This organization has no public repositories'),
    ).toBeOnTheScreen();
  });
});
