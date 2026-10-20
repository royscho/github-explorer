import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '@shared/theme';

import { RepoDetailsSkeleton } from './RepoDetailsSkeleton';

describe('RepoDetailsSkeleton', () => {
  it('renders without props', async () => {
    await render(
      <ThemeProvider>
        <RepoDetailsSkeleton />
      </ThemeProvider>,
    );
  });

  it('is hidden from the accessibility tree', async () => {
    await render(
      <ThemeProvider>
        <RepoDetailsSkeleton />
      </ThemeProvider>,
    );
    const tree = screen.toJSON();
    expect(JSON.stringify(tree)).toContain(
      '"accessibilityElementsHidden":true',
    );
    expect(JSON.stringify(tree)).toContain('"importantForAccessibility":"no"');
  });
});
