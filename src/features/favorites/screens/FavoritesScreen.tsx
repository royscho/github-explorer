import React, { useCallback } from 'react';
import { View } from 'react-native';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { EmptyView, Screen } from '@shared/components';
import { RepoCard, usePrefetchRepoDetails } from '@features/repos';
import type { Repo, RepoDetailsRouteParams } from '@features/repos';

import { useFavoritesList, useFavoritesScreenStyles } from '../hooks';

function keyExtractor(item: Repo): string {
  return String(item.id);
}

type FavoritesScreenNavigationProp = NativeStackNavigationProp<{
  RepoDetails: RepoDetailsRouteParams;
}>;

export interface FavoritesScreenProps {
  // Injected by `app/navigation` — see `RepoCardProps.renderFavoriteToggle`'s comment for why
  // this feature doesn't read its own store to render it.
  renderFavoriteToggle?: (repo: Repo) => React.ReactNode;
}

export function FavoritesScreen({
  renderFavoriteToggle,
}: FavoritesScreenProps = {}): React.JSX.Element {
  const styles = useFavoritesScreenStyles();
  const navigation = useNavigation<FavoritesScreenNavigationProp>();
  const prefetchRepoDetails = usePrefetchRepoDetails();
  const favorites = useFavoritesList();

  const openRepoDetails = useCallback(
    (repo: Repo) => {
      navigation.navigate('RepoDetails', {
        owner: repo.owner.login,
        repo: repo.name,
      });
    },
    [navigation],
  );

  const prefetchRepo = useCallback(
    (repo: Repo) => {
      prefetchRepoDetails(repo.owner.login, repo.name);
    },
    [prefetchRepoDetails],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Repo>) => (
      <RepoCard
        repo={item}
        onPress={openRepoDetails}
        onPressIn={prefetchRepo}
        renderFavoriteToggle={renderFavoriteToggle}
      />
    ),
    [openRepoDetails, prefetchRepo, renderFavoriteToggle],
  );

  function renderContent(): React.JSX.Element {
    if (favorites.length === 0) {
      return (
        <EmptyView message="No favorites yet — tap the star on a repo to add one" />
      );
    }

    return (
      <FlashList<Repo>
        data={favorites}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
      />
    );
  }

  return (
    <Screen>
      <View style={styles.container}>{renderContent()}</View>
    </Screen>
  );
}
