import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@react-native-vector-icons/ionicons';
import type { TextStyle } from 'react-native';

import { ComingSoonScreen } from '@shared/components';
import { makeStyles, useTheme } from '@shared/theme';
import { ExploreScreen } from '@features/repos';

import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

function FavoritesPlaceholder(): React.JSX.Element {
  return <ComingSoonScreen title="Favorites" />;
}

function SettingsPlaceholder(): React.JSX.Element {
  return <ComingSoonScreen title="Settings" />;
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
  const styles = useStyles();

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
        component={ExploreScreen}
        options={{ tabBarIcon: ExploreTabIcon }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesPlaceholder}
        options={{ tabBarIcon: FavoritesTabIcon }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsPlaceholder}
        options={{ tabBarIcon: SettingsTabIcon }}
      />
    </Tab.Navigator>
  );
}

const useStyles = makeStyles(theme => ({
  tabBar: {
    backgroundColor: theme.colors.surface,
    borderTopColor: theme.colors.border,
  },
}));
