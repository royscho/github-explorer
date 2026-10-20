import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { zustandMmkvStorage } from '@shared/storage';

import type { Repo } from '@features/repos';

interface FavoritesState {
  favoritesById: Record<number, Repo>;
  toggleFavorite: (repo: Repo) => void;
}

// `toggleFavorite` is often called with a `RepoDetails` (a `Repo` plus `defaultBranch`/`license`/
// `watchers`) — structurally compatible, so TS lets it through, but storing it as-is would leak
// those extra fields (and, if captured from placeholder data, their fake placeholder values) into
// a store typed and persisted as `Record<number, Repo>`. Picking the `Repo` fields explicitly keeps
// what's on disk matching what `version: 1` says it is.
function toRepoSnapshot(repo: Repo): Repo {
  const {
    id,
    name,
    fullName,
    owner,
    description,
    htmlUrl,
    language,
    stars,
    forks,
    openIssues,
    createdAt,
    updatedAt,
  } = repo;
  return {
    id,
    name,
    fullName,
    owner,
    description,
    htmlUrl,
    language,
    stars,
    forks,
    openIssues,
    createdAt,
    updatedAt,
  };
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    immer(set => ({
      favoritesById: {},
      toggleFavorite: (repo: Repo) =>
        set(draft => {
          if (repo.id in draft.favoritesById) {
            delete draft.favoritesById[repo.id];
          } else {
            draft.favoritesById[repo.id] = toRepoSnapshot(repo);
          }
        }),
    })),
    {
      name: 'favorites-storage',
      storage: createJSONStorage(() => zustandMmkvStorage),
      version: 1,
      partialize: state => ({ favoritesById: state.favoritesById }),
    },
  ),
);
