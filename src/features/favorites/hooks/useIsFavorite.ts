import { useFavoritesStore } from '../store';

export function useIsFavorite(id: number | undefined): boolean {
  return useFavoritesStore(
    state => id !== undefined && id in state.favoritesById,
  );
}
