import type { RepoDetailsRouteParams } from '@features/repos';

export type MainTabParamList = {
  Explore: undefined;
  Favorites: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  RepoDetails: RepoDetailsRouteParams;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
