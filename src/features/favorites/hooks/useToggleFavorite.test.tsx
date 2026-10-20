import { renderHook } from '@testing-library/react-native';

import type { Repo } from '@features/repos';

import { useFavoritesStore } from '../store';
import { useToggleFavorite } from './useToggleFavorite';

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

describe('useToggleFavorite', () => {
  beforeEach(() => {
    useFavoritesStore.setState({ favoritesById: {} });
  });

  it('adds the repo to the store when called', async () => {
    const { result } = await renderHook(() => useToggleFavorite());
    result.current(repo);

    expect(useFavoritesStore.getState().favoritesById).toEqual({
      [repo.id]: repo,
    });
  });

  it('removes the repo when called again with the same repo', async () => {
    const { result } = await renderHook(() => useToggleFavorite());
    result.current(repo);
    result.current(repo);

    expect(useFavoritesStore.getState().favoritesById).toEqual({});
  });
});
