import React, { useCallback } from 'react';

import type { Repo } from '@features/repos';

import { useIsFavorite, useToggleFavorite } from '../hooks';
import { FavoriteButton } from './FavoriteButton';

export interface FavoriteToggleProps {
  repo: Repo;
  compact?: boolean;
}

// The one place this feature reads the store directly. `app/` wires this in wherever
// `features/repos` needs a favorite affordance, so `repos` never has to import `favorites`
// itself (see docs/steps/06-favorites.md's dependency-direction note).
export function FavoriteToggle({
  repo,
  compact,
}: FavoriteToggleProps): React.JSX.Element {
  const isFavorite = useIsFavorite(repo.id);
  const toggleFavorite = useToggleFavorite();

  const handlePress = useCallback(() => {
    toggleFavorite(repo);
  }, [repo, toggleFavorite]);

  return (
    <FavoriteButton
      isFavorite={isFavorite}
      onPress={handlePress}
      compact={compact}
    />
  );
}
