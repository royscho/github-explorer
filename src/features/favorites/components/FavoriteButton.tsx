import React from 'react';
import { Pressable } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { Text } from '@shared/components';
import { useTheme } from '@shared/theme';

import { useFavoriteButtonStyles } from '../hooks';

export interface FavoriteButtonProps {
  isFavorite: boolean;
  onPress: () => void;
  // Icon-only, no text label — for overlaying on a RepoCard. The full icon+label form is for
  // RepoDetailsScreen, where it reads as its own content row rather than a corner affordance.
  compact?: boolean;
}

export function FavoriteButton({
  isFavorite,
  onPress,
  compact = false,
}: FavoriteButtonProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useFavoriteButtonStyles();
  const label = isFavorite ? 'Remove from favorites' : 'Add to favorites';

  return (
    <Pressable
      style={compact ? styles.compactContainer : styles.container}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
    >
      <Ionicons
        name={isFavorite ? 'star' : 'star-outline'}
        size={compact ? 22 : 20}
        color={isFavorite ? theme.colors.accent : theme.colors.textSecondary}
      />
      {!compact && (
        <Text variant="body" color={isFavorite ? 'primary' : 'secondary'}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
