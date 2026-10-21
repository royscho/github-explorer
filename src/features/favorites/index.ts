import { useFavoritesStore } from './store';

export { FavoritesScreen } from './screens';
export { FavoriteToggle } from './components';

// Read-only view for devtools registration (AppProviders) only — feature code should keep using
// the narrower `useIsFavorite`/`useToggleFavorite`/`useFavoritesList` selector hooks. Typed to just
// `getState`/`subscribe` (what devtools registration needs) rather than the full hook, so this
// can't be called as a hook or used to write state from outside the feature.
export const favoritesStoreForDevtools: Pick<
  typeof useFavoritesStore,
  'getState' | 'subscribe'
> = useFavoritesStore;
