import React from 'react';
import { Text } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '@shared/theme';
import type { Repo } from '@features/repos';

import { useFavoritesStore } from '../store';
import { FavoritesScreen } from './FavoritesScreen';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockPrefetchRepoDetails = jest.fn();
jest.mock('@features/repos', () => ({
  ...jest.requireActual('@features/repos'),
  usePrefetchRepoDetails: () => mockPrefetchRepoDetails,
}));

// Same reasoning as ExploreScreen.test.tsx: FlashList's real virtualization needs on-device
// layout measurement the test renderer can't provide, so this test only cares that
// FavoritesScreen passes the right data/renderItem/keyExtractor, not FlashList's own behavior.
jest.mock('@shopify/flash-list', () => {
  const ReactActual = require('react');
  const RN = require('react-native');
  return {
    FlashList: ({
      data,
      renderItem,
      keyExtractor,
    }: {
      data: unknown[];
      renderItem: (info: { item: unknown; index: number }) => React.ReactNode;
      keyExtractor: (item: unknown, index: number) => string;
    }) =>
      ReactActual.createElement(
        RN.View,
        { testID: 'favorites-list' },
        data.map((item, index) =>
          ReactActual.createElement(
            ReactActual.Fragment,
            { key: keyExtractor(item, index) },
            renderItem({ item, index }),
          ),
        ),
      ),
  };
});

function makeRepo(id: number, name: string): Repo {
  return {
    id,
    name,
    fullName: `facebook/${name}`,
    owner: { login: 'facebook', avatarUrl: '', htmlUrl: '' },
    description: null,
    htmlUrl: '',
    language: null,
    stars: 0,
    forks: 0,
    openIssues: 0,
    createdAt: '2020-01-01T00:00:00Z',
    updatedAt: '2020-01-01T00:00:00Z',
  };
}

async function renderScreen(
  props: Partial<React.ComponentProps<typeof FavoritesScreen>> = {},
) {
  return render(
    <SafeAreaProvider>
      <ThemeProvider>
        <FavoritesScreen {...props} />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('FavoritesScreen', () => {
  beforeEach(() => {
    useFavoritesStore.setState({ favoritesById: {} });
    mockNavigate.mockClear();
    mockPrefetchRepoDetails.mockClear();
  });

  it('shows the empty-favorites message when there are no favorites', async () => {
    await renderScreen();
    expect(
      await screen.findByText(
        'No favorites yet — tap the star on a repo to add one',
      ),
    ).toBeOnTheScreen();
  });

  it('renders a card for each favorited repo', async () => {
    const react = makeRepo(1, 'react');
    const vue = makeRepo(2, 'vue');
    useFavoritesStore.setState({
      favoritesById: { [react.id]: react, [vue.id]: vue },
    });

    await renderScreen();

    expect(
      await screen.findByRole('button', { name: /^react,/ }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^vue,/ })).toBeOnTheScreen();
  });

  it('navigates to RepoDetails when a card is pressed', async () => {
    const react = makeRepo(1, 'react');
    useFavoritesStore.setState({ favoritesById: { [react.id]: react } });

    await renderScreen();
    const card = await screen.findByRole('button', { name: /^react,/ });
    await userEvent.press(card);

    expect(mockNavigate).toHaveBeenCalledWith('RepoDetails', {
      owner: 'facebook',
      repo: 'react',
    });
  });

  it('prefetches repo details on press-in of a card', async () => {
    const react = makeRepo(1, 'react');
    useFavoritesStore.setState({ favoritesById: { [react.id]: react } });

    await renderScreen();
    const card = await screen.findByRole('button', { name: /^react,/ });
    await userEvent.press(card);

    expect(mockPrefetchRepoDetails).toHaveBeenCalledWith('facebook', 'react');
  });

  it('passes renderFavoriteToggle through to each card, called with that repo', async () => {
    const react = makeRepo(1, 'react');
    useFavoritesStore.setState({ favoritesById: { [react.id]: react } });
    const renderFavoriteToggle = jest.fn((repo: Repo) => (
      <Text accessibilityRole="button" accessibilityLabel="favorite-slot">
        {repo.name}
      </Text>
    ));

    await renderScreen({ renderFavoriteToggle });

    expect(
      await screen.findByRole('button', { name: 'favorite-slot' }),
    ).toBeOnTheScreen();
    expect(renderFavoriteToggle).toHaveBeenCalledWith(react);
  });
});
