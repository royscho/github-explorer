import React from 'react';
import { render } from '@testing-library/react-native';

import { ThemeProvider } from '@shared/theme';

import { RepoCardSkeleton } from './RepoCardSkeleton';

describe('RepoCardSkeleton', () => {
  it('renders without a repo prop', async () => {
    await render(
      <ThemeProvider>
        <RepoCardSkeleton />
      </ThemeProvider>,
    );
  });
});
