import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RepoDetailsScreen } from '@features/repos';
import { ScreenErrorBoundary } from '@shared/components';

import { MainTabs } from './MainTabs';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

function RepoDetailsScreenWithBoundary(): React.JSX.Element {
  return (
    <ScreenErrorBoundary>
      <RepoDetailsScreen />
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
