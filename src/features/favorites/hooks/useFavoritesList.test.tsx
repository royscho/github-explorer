import { act, renderHook } from '@testing-library/react-native';

import type { Repo } from '@features/repos';

import { useFavoritesStore } from '../store';
import { useFavoritesList } from './useFavoritesList';

function makeRepo(id: number, name: string): Repo {
  return {
    id,
    name,
    fullName: `facebook/${name}`,
    owner: {
      login: 'facebook',
      avatarUrl: 'https://example.com/a.png',
      htmlUrl: 'https://github.com/facebook',
    },
    description: null,
    htmlUrl: `https://github.com/facebook/${name}`,
    language: 'JavaScript',
    stars: 0,
    forks: 0,
    openIssues: 0,
    createdAt: '2013-05-24T16:15:54Z',
    updatedAt: '2026-10-19T08:00:00Z',
  };
}

describe('useFavoritesList', () => {
  beforeEach(() => {
    useFavoritesStore.setState({ favoritesById: {} });
  });

  it('returns an empty list when there are no favorites', async () => {
    const { result } = await renderHook(() => useFavoritesList());
    expect(result.current).toEqual([]);
  });

  it('returns favorited repos sorted alphabetically by name', async () => {
    const vue = makeRepo(2, 'vue');
    const react = makeRepo(1, 'react');
    useFavoritesStore.setState({
      favoritesById: { [vue.id]: vue, [react.id]: react },
    });

    const { result } = await renderHook(() => useFavoritesList());
    expect(result.current.map(repo => repo.name)).toEqual(['react', 'vue']);
  });

  it('updates once a favorite is added in the store', async () => {
    const { result } = await renderHook(() => useFavoritesList());
    expect(result.current).toEqual([]);

    const react = makeRepo(1, 'react');
    await act(() => {
      useFavoritesStore.setState({ favoritesById: { [react.id]: react } });
    });

    expect(result.current).toEqual([react]);
  });
});
