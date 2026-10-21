import React from 'react';
import { Linking, Text } from 'react-native';
import {
  fireEvent,
  render,
  screen,
  userEvent,
} from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '@shared/theme';
import {
  ApiError,
  NetworkError,
  NotFoundError,
  RateLimitError,
} from '@shared/api';

import type { UseRepoDetailsResult } from '../hooks';
import type { RepoDetails } from '../types';
import { RepoDetailsScreen } from './RepoDetailsScreen';

jest.mock('../hooks', () => ({
  ...jest.requireActual('../hooks'),
  useRepoDetails: jest.fn(),
}));
const { useRepoDetails } = require('../hooks') as { useRepoDetails: jest.Mock };

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: () => ({ params: { owner: 'facebook', repo: 'react' } }),
}));

// `RefreshControl`'s pull gesture can't be driven from the test renderer (it's a native
// interaction, same reasoning as FlashList's mock in `ExploreScreen.test.tsx`). Mocking the whole
// `react-native` module crashes with a `DevMenu` TurboModule invariant (see
// `docs/steps/03-repo-list.md`'s Follow-ups — `jest.requireActual('react-native')` inside a
// factory re-evaluates the real index, which needs native modules the test environment doesn't
// have), so only this one leaf submodule is mocked instead, standing it in for a `View` that
// exposes `onRefresh` as a plain prop.
jest.mock(
  'react-native/Libraries/Components/RefreshControl/RefreshControl',
  () => {
    const ReactActual = require('react');
    const { View } = require('react-native');
    return {
      __esModule: true,
      default: ({
        testID,
        onRefresh,
        refreshing,
      }: {
        testID?: string;
        onRefresh?: () => void;
        refreshing?: boolean;
      }) => ReactActual.createElement(View, { testID, onRefresh, refreshing }),
    };
  },
);

const baseRepoDetails: RepoDetails = {
  id: 1,
  name: 'react',
  fullName: 'facebook/react',
  owner: {
    login: 'facebook',
    avatarUrl: 'https://example.com/a.png',
    htmlUrl: 'https://github.com/facebook',
  },
  description: 'The library for web and native user interfaces.',
  htmlUrl: 'https://github.com/facebook/react',
  language: 'JavaScript',
  stars: 220000,
  forks: 45000,
  openIssues: 900,
  watchers: 6700,
  createdAt: '2013-05-24T16:15:54Z',
  updatedAt: '2020-01-01T00:00:00Z',
  defaultBranch: 'main',
  license: { key: 'mit', name: 'MIT License', spdxId: 'MIT' },
};

function mockResult(
  overrides: Partial<UseRepoDetailsResult>,
): UseRepoDetailsResult {
  return {
    repoDetails: undefined,
    status: 'pending',
    error: null,
    isPlaceholderData: false,
    isRefetching: false,
    refetch: jest.fn(),
    isPaused: false,
    ...overrides,
  };
}

function renderScreen(
  props: Partial<React.ComponentProps<typeof RepoDetailsScreen>> = {},
) {
  return render(
    <SafeAreaProvider>
      <ThemeProvider>
        <RepoDetailsScreen {...props} />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('RepoDetailsScreen', () => {
  beforeEach(() => {
    useRepoDetails.mockReturnValue(mockResult({}));
    jest.spyOn(Linking, 'openURL').mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows a loading skeleton when nothing is cached yet', async () => {
    useRepoDetails.mockReturnValue(
      mockResult({ status: 'pending', repoDetails: undefined }),
    );
    await renderScreen();
    expect(screen.queryByText('facebook/react')).toBeNull();
    // The skeleton is intentionally hidden from accessibility (RepoDetailsSkeleton.test.tsx covers
    // that), so it needs `includeHiddenElements` to be found by testID here.
    expect(
      await screen.findByTestId('repo-details-skeleton', {
        includeHiddenElements: true,
      }),
    ).toBeOnTheScreen();
  });

  // §11: opening a repo with no cached list item to use as placeholder data pauses (rather than
  // fails) while offline — this must not show an endless loading skeleton that never resolves.
  it('shows an offline message instead of an endless skeleton when nothing is cached and offline', async () => {
    useRepoDetails.mockReturnValue(
      mockResult({ status: 'pending', repoDetails: undefined, isPaused: true }),
    );
    await renderScreen();
    expect(
      await screen.findByText(
        "You're offline — this will load once you're back online",
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('repo-details-skeleton')).toBeNull();
  });

  it('shows known fields immediately from placeholder data while still filling in watchers/default branch/license', async () => {
    // React Query reports `status: 'success'` (not `'pending'`) once placeholder data exists —
    // `isPlaceholderData` is the signal that it isn't the real result yet (see useRepoDetails.ts).
    useRepoDetails.mockReturnValue(
      mockResult({
        status: 'success',
        isPlaceholderData: true,
        repoDetails: {
          ...baseRepoDetails,
          defaultBranch: '',
          license: null,
          watchers: 0,
        },
      }),
    );
    await renderScreen();
    expect(await screen.findByText('facebook/react')).toBeOnTheScreen();
    expect(await screen.findByText('⭐ 220k')).toBeOnTheScreen();
    expect(screen.getAllByText('Loading…')).toHaveLength(2);
    // Watchers aren't known yet either, but there's no sentinel value for it to leak — the stat
    // simply doesn't render until the real fetch resolves (RepoStats omits it when undefined).
    expect(screen.queryByText(/watchers/)).toBeNull();
    // The real (non-refresh) first fetch is still in flight here, but since the screen already has
    // placeholder content to show, the pull-to-refresh spinner must not also be spinning on top of it.
    const refreshControl = await screen.findByTestId('repo-details-refresh');
    expect(refreshControl.props.refreshing).toBe(false);
  });

  it('shows the full details on success', async () => {
    useRepoDetails.mockReturnValue(
      mockResult({ status: 'success', repoDetails: baseRepoDetails }),
    );
    await renderScreen();
    expect(await screen.findByText('facebook/react')).toBeOnTheScreen();
    expect(
      await screen.findByText(
        'The library for web and native user interfaces.',
      ),
    ).toBeOnTheScreen();
    expect(await screen.findByText('main')).toBeOnTheScreen();
    expect(await screen.findByText('MIT License')).toBeOnTheScreen();
    expect(await screen.findByText('6.7k watchers')).toBeOnTheScreen();
    expect(await screen.findByText(/^Created /)).toBeOnTheScreen();
    expect(await screen.findByText(/^Updated /)).toBeOnTheScreen();
  });

  it('shows "No description" and "No license" when absent', async () => {
    useRepoDetails.mockReturnValue(
      mockResult({
        status: 'success',
        repoDetails: {
          ...baseRepoDetails,
          description: null,
          license: null,
        },
      }),
    );
    await renderScreen();
    expect(await screen.findByText('No description')).toBeOnTheScreen();
    expect(await screen.findByText('No license')).toBeOnTheScreen();
  });

  it('opens the repository URL when "View on GitHub" is pressed', async () => {
    useRepoDetails.mockReturnValue(
      mockResult({ status: 'success', repoDetails: baseRepoDetails }),
    );
    await renderScreen();
    const link = await screen.findByRole('link', { name: 'View on GitHub' });
    await userEvent.press(link);
    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://github.com/facebook/react',
    );
  });

  it('shows an error view with Retry for a generic error, and retries on press', async () => {
    const refetch = jest.fn();
    useRepoDetails.mockReturnValue(
      mockResult({ status: 'error', error: new ApiError(500), refetch }),
    );
    await renderScreen();
    expect(await screen.findByText('Something went wrong')).toBeOnTheScreen();
    const retry = await screen.findByRole('button', { name: 'Retry' });
    await userEvent.press(retry);
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('shows "Repository not found" for a NotFoundError with no Retry action', async () => {
    useRepoDetails.mockReturnValue(
      mockResult({ status: 'error', error: new NotFoundError() }),
    );
    await renderScreen();
    expect(await screen.findByText('Repository not found')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('shows the rate-limit message with no Retry action before the reset time', async () => {
    const resetAt = new Date(Date.now() + 100000);
    useRepoDetails.mockReturnValue(
      mockResult({ status: 'error', error: new RateLimitError(resetAt) }),
    );
    await renderScreen();
    const formatted = new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(resetAt);
    expect(
      await screen.findByText(`Rate limit reached, try again at ${formatted}`),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('keeps the loaded details visible when a refresh fails, instead of a full-screen error', async () => {
    // React Query keeps the last successful `data` across a failed refetch while flipping `status`
    // to `'error'` — the screen must prefer showing that data over the error (DESIGN §19).
    useRepoDetails.mockReturnValue(
      mockResult({
        status: 'error',
        error: new ApiError(500),
        repoDetails: baseRepoDetails,
      }),
    );
    await renderScreen();
    expect(await screen.findByText('facebook/react')).toBeOnTheScreen();
    expect(screen.queryByText('Something went wrong')).toBeNull();
  });

  it('shows "No connection" for a NetworkError', async () => {
    useRepoDetails.mockReturnValue(
      mockResult({ status: 'error', error: new NetworkError() }),
    );
    await renderScreen();
    expect(await screen.findByText('No connection')).toBeOnTheScreen();
  });

  it('triggers refetch on pull-to-refresh', async () => {
    const refetch = jest.fn();
    useRepoDetails.mockReturnValue(
      mockResult({ status: 'success', repoDetails: baseRepoDetails, refetch }),
    );
    await renderScreen();
    const refreshControl = await screen.findByTestId('repo-details-refresh');
    fireEvent(refreshControl, 'refresh');
    expect(refetch).toHaveBeenCalled();
  });

  // The screen has no idea what favorites are — it only calls whatever `renderFavoriteToggle` it
  // was given, with the loaded `repoDetails`. The favorites-aware implementation itself
  // (`FavoriteToggle`, wired in by `app/navigation`) is covered in `features/favorites`.
  it('calls renderFavoriteToggle with repoDetails and renders what it returns, once loaded', async () => {
    const renderFavoriteToggle = jest.fn((details: RepoDetails) => (
      <Text accessibilityRole="button" accessibilityLabel="favorite-slot">
        {details.fullName}
      </Text>
    ));
    useRepoDetails.mockReturnValue(
      mockResult({ status: 'success', repoDetails: baseRepoDetails }),
    );
    await renderScreen({ renderFavoriteToggle });

    expect(renderFavoriteToggle).toHaveBeenCalledWith(baseRepoDetails);
    expect(
      await screen.findByRole('button', { name: 'favorite-slot' }),
    ).toBeOnTheScreen();
  });

  it('does not call renderFavoriteToggle while there is no repoDetails yet (skeleton/error)', async () => {
    const renderFavoriteToggle = jest.fn();
    useRepoDetails.mockReturnValue(
      mockResult({ status: 'pending', repoDetails: undefined }),
    );
    await renderScreen({ renderFavoriteToggle });

    expect(renderFavoriteToggle).not.toHaveBeenCalled();
  });

  it('renders normally when renderFavoriteToggle is omitted', async () => {
    useRepoDetails.mockReturnValue(
      mockResult({ status: 'success', repoDetails: baseRepoDetails }),
    );
    await expect(renderScreen()).resolves.not.toThrow();
  });
});
