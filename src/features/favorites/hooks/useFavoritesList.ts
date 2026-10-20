import { useMemo } from 'react';

import { useFavoritesStore } from '../store';

import type { Repo } from '@features/repos';

export function useFavoritesList(): Repo[] {
  const favoritesById = useFavoritesStore(state => state.favoritesById);
  return useMemo(
    () =>
      Object.values(favoritesById).sort((a, b) => a.name.localeCompare(b.name)),
    [favoritesById],
  );
}
