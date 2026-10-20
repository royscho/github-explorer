import { renderHook } from '@testing-library/react-native';

import type { Repo } from '@features/repos';

import { useFavoritesStore } from '../store';
import { useIsFavorite } from './useIsFavorite';

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

describe('useIsFavorite', () => {
  beforeEach(() => {
    useFavoritesStore.setState({ favoritesById: {} });
  });

  it('returns false for an id that is not favorited', async () => {
    const { result } = await renderHook(() => useIsFavorite(repo.id));
    expect(result.current).toBe(false);
  });

  it('returns true once the store has that id', async () => {
    useFavoritesStore.setState({ favoritesById: { [repo.id]: repo } });
    const { result } = await renderHook(() => useIsFavorite(repo.id));
    expect(result.current).toBe(true);
  });

  it('returns false when id is undefined', async () => {
    useFavoritesStore.setState({ favoritesById: { [repo.id]: repo } });
    const { result } = await renderHook(() => useIsFavorite(undefined));
    expect(result.current).toBe(false);
  });
});
