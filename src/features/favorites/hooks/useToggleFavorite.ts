import { useFavoritesStore } from '../store';

import type { Repo } from '@features/repos';

export function useToggleFavorite(): (repo: Repo) => void {
  return useFavoritesStore(state => state.toggleFavorite);
}
