import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@react-native-vector-icons/ionicons';
import type { TextStyle } from 'react-native';

import { ScreenErrorBoundary } from '@shared/components';
import { useTheme } from '@shared/theme';
import { ExploreScreen } from '@features/repos';
import type { Repo } from '@features/repos';
import { FavoriteToggle, FavoritesScreen } from '@features/favorites';
import { OfflineBanner } from '@features/device';
import { SettingsScreen } from '@features/settings';
import { useMainTabsStyles } from '@app/hooks';

import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

// `features/repos` and `features/favorites` never import each other (favorites already depends
// on repos for `Repo`/`RepoCard`, so the other direction would be a cycle) — this is the one spot
// that knows both, wiring the favorites-aware toggle into the repo cards each tab renders.
function renderCardFavoriteToggle(repo: Repo): React.JSX.Element {
  return <FavoriteToggle repo={repo} compact />;
}

function ExploreScreenWithBoundary(): React.JSX.Element {
  return (
    <ScreenErrorBoundary>
      <OfflineBanner />
      <ExploreScreen renderFavoriteToggle={renderCardFavoriteToggle} />
    </ScreenErrorBoundary>
  );
}

function FavoritesScreenWithBoundary(): React.JSX.Element {
  return (
    <ScreenErrorBoundary>
      <OfflineBanner />
      <FavoritesScreen renderFavoriteToggle={renderCardFavoriteToggle} />
    </ScreenErrorBoundary>
  );
}

function SettingsScreenWithBoundary(): React.JSX.Element {
  return (
    <ScreenErrorBoundary>
      <OfflineBanner />
      <SettingsScreen />
    </ScreenErrorBoundary>
  );
}

interface TabIconProps {
  color: TextStyle['color'];
  size: number;
}

function ExploreTabIcon({ color, size }: TabIconProps): React.JSX.Element {
  return <Ionicons name="compass-outline" size={size} color={color} />;
}

function FavoritesTabIcon({ color, size }: TabIconProps): React.JSX.Element {
  return <Ionicons name="star-outline" size={size} color={color} />;
}

function SettingsTabIcon({ color, size }: TabIconProps): React.JSX.Element {
  return <Ionicons name="settings-outline" size={size} color={color} />;
}

export function MainTabs(): React.JSX.Element {
  const theme = useTheme();
  const styles = useMainTabsStyles();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tab.Screen
        name="Explore"
        component={ExploreScreenWithBoundary}
        options={{ tabBarIcon: ExploreTabIcon }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreenWithBoundary}
        options={{ tabBarIcon: FavoritesTabIcon }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreenWithBoundary}
        options={{ tabBarIcon: SettingsTabIcon }}
      />
    </Tab.Navigator>
  );
}
