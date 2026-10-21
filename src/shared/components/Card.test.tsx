import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { ThemeProvider, lightTheme } from '@shared/theme';

import { Card } from './Card';

describe('Card', () => {
  it('renders its children', async () => {
    await render(
      <ThemeProvider>
        <Card>
          <Text>content</Text>
        </Card>
      </ThemeProvider>,
    );
    expect(await screen.findByText('content')).toBeOnTheScreen();
  });

  it('applies the surface, radius and elevation tokens', async () => {
    await render(
      <ThemeProvider>
        <Card testID="card">
          <Text>content</Text>
        </Card>
      </ThemeProvider>,
    );
    expect(await screen.findByTestId('card')).toHaveStyle({
      backgroundColor: lightTheme.colors.surface,
      borderRadius: lightTheme.radii.md,
      elevation: lightTheme.elevation.card.elevation,
    });
  });

  it('merges a passed style with the base card style', async () => {
    await render(
      <ThemeProvider>
        <Card testID="card" style={{ marginTop: 12 }}>
          <Text>content</Text>
        </Card>
      </ThemeProvider>,
    );
    expect(await screen.findByTestId('card')).toHaveStyle({
      borderRadius: lightTheme.radii.md,
      marginTop: 12,
    });
  });
});
