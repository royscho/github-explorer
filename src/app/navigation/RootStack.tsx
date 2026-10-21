import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RepoDetailsScreen } from '@features/repos';
import type { RepoDetails } from '@features/repos';
import { FavoriteToggle } from '@features/favorites';
import { OfflineBanner } from '@features/device';
import { ScreenErrorBoundary } from '@shared/components';

import { MainTabs } from './MainTabs';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// See MainTabs.tsx's `renderCardFavoriteToggle` comment — same reasoning, non-compact here since
// this renders inline in the details content rather than overlaid on a card corner.
function renderDetailsFavoriteToggle(
  repoDetails: RepoDetails,
): React.JSX.Element {
  return <FavoriteToggle repo={repoDetails} />;
}

function RepoDetailsScreenWithBoundary(): React.JSX.Element {
  return (
    <ScreenErrorBoundary>
      <OfflineBanner />
      <RepoDetailsScreen renderFavoriteToggle={renderDetailsFavoriteToggle} />
    </ScreenErrorBoundary>
  );
}

export function RootStack(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen
        name="RepoDetails"
        component={RepoDetailsScreenWithBoundary}
        options={({ route }) => ({
          headerShown: true,
          title: route.params.repo,
        })}
      />
    </Stack.Navigator>
  );
}
