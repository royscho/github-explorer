import type { Repo } from '@features/repos';
import { mmkv } from '@shared/storage';

import { useFavoritesStore } from './favoritesStore';

function makeRepo(overrides: Partial<Repo> = {}): Repo {
  return {
    id: 1,
    name: 'react',
    fullName: 'facebook/react',
    owner: {
      login: 'facebook',
      avatarUrl: 'https://example.com/a.png',
      htmlUrl: 'https://github.com/facebook',
    },
    description: 'The library for web and native user interfaces.',
    htmlUrl: 'https://github.com/facebook/react',
    language: 'JavaScript',
    stars: 220000,
    forks: 45000,
    openIssues: 900,
    createdAt: '2013-05-24T16:15:54Z',
    updatedAt: '2026-10-19T08:00:00Z',
    ...overrides,
  };
}

describe('useFavoritesStore', () => {
  beforeEach(() => {
    useFavoritesStore.setState({ favoritesById: {} });
    mmkv.delete('favorites-storage');
  });

  it('toggleFavorite adds a repo that is not favorited yet', () => {
    const repo = makeRepo();
    useFavoritesStore.getState().toggleFavorite(repo);

    expect(useFavoritesStore.getState().favoritesById).toEqual({
      [repo.id]: repo,
    });
  });

  it('toggleFavorite removes a repo that is already favorited', () => {
    const repo = makeRepo();
    useFavoritesStore.getState().toggleFavorite(repo);
    useFavoritesStore.getState().toggleFavorite(repo);

    expect(useFavoritesStore.getState().favoritesById).toEqual({});
  });

  it('keeps two different favorited repos independently', () => {
    const react = makeRepo({ id: 1, name: 'react' });
    const vue = makeRepo({ id: 2, name: 'vue' });
    useFavoritesStore.getState().toggleFavorite(react);
    useFavoritesStore.getState().toggleFavorite(vue);

    expect(useFavoritesStore.getState().favoritesById).toEqual({
      [react.id]: react,
      [vue.id]: vue,
    });
  });

  it('strips fields that are not part of Repo (e.g. a RepoDetails) before storing', () => {
    const repoDetails = {
      ...makeRepo(),
      defaultBranch: 'main',
      license: null,
      watchers: 6700,
    };
    useFavoritesStore.getState().toggleFavorite(repoDetails);

    expect(useFavoritesStore.getState().favoritesById[repoDetails.id]).toEqual(
      makeRepo(),
    );
  });

  it('persists the favorited repo to MMKV under the versioned shape', () => {
    const repo = makeRepo();
    useFavoritesStore.getState().toggleFavorite(repo);

    const raw = mmkv.getString('favorites-storage');
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw as string);
    expect(parsed.version).toBe(1);
    expect(parsed.state.favoritesById).toEqual({ [repo.id]: repo });
    expect(parsed.state.toggleFavorite).toBeUndefined();
  });

  it('rehydrates favorites already on disk', async () => {
    const repo = makeRepo();
    mmkv.set(
      'favorites-storage',
      JSON.stringify({
        state: { favoritesById: { [repo.id]: repo } },
        version: 1,
      }),
    );

    await useFavoritesStore.persist.rehydrate();

    expect(useFavoritesStore.getState().favoritesById).toEqual({
      [repo.id]: repo,
    });
  });
});
