import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';

import { ThemeProvider } from '@shared/theme';
import type { Repo } from '@features/repos';

import { useFavoritesStore } from '../store';
import { FavoriteToggle } from './FavoriteToggle';

const repo: Repo = {
  id: 1,
  name: 'react',
  fullName: 'facebook/react',
  owner: {
    login: 'facebook',
    avatarUrl: 'https://example.com/a.png',
    htmlUrl: 'https://github.com/facebook',
  },
  description: null,
  htmlUrl: 'https://github.com/facebook/react',
  language: 'JavaScript',
  stars: 0,
  forks: 0,
  openIssues: 0,
  createdAt: '2013-05-24T16:15:54Z',
  updatedAt: '2026-10-19T08:00:00Z',
};

describe('FavoriteToggle', () => {
  beforeEach(() => {
    useFavoritesStore.setState({ favoritesById: {} });
  });

  it('reflects the store’s current favorite state for this repo', async () => {
    useFavoritesStore.setState({ favoritesById: { [repo.id]: repo } });
    await render(
      <ThemeProvider>
        <FavoriteToggle repo={repo} />
      </ThemeProvider>,
    );
    expect(
      screen.getByRole('button', { name: 'Remove from favorites' }),
    ).toBeOnTheScreen();
  });

  it('toggles the repo in the store when pressed', async () => {
    await render(
      <ThemeProvider>
        <FavoriteToggle repo={repo} />
      </ThemeProvider>,
    );
    await userEvent.press(
      screen.getByRole('button', { name: 'Add to favorites' }),
    );

    expect(useFavoritesStore.getState().favoritesById[repo.id]).toEqual(repo);
    expect(
      await screen.findByRole('button', { name: 'Remove from favorites' }),
    ).toBeOnTheScreen();
  });
});
