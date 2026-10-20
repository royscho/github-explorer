import React from 'react';
import {
  act,
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

import type { UseOrgReposResult } from '../hooks';
import type { Repo } from '../types';
import { ExploreScreen } from './ExploreScreen';

jest.mock('../hooks', () => ({
  ...jest.requireActual('../hooks'),
  useOrgRepos: jest.fn(),
  usePrefetchRepoDetails: jest.fn(),
}));
const { useOrgRepos, usePrefetchRepoDetails } = require('../hooks') as {
  useOrgRepos: jest.Mock;
  usePrefetchRepoDetails: jest.Mock;
};

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

// FlashList's real scroll-virtualization needs real on-device layout measurement that the test
// renderer can't provide; this test cares about ExploreScreen's wiring (what it passes to the
// list), not FlashList's own end-reached/scroll-physics, which is that library's own test surface.
jest.mock('@shopify/flash-list', () => {
  // jest.mock factories can't reference outer-scope imports, so React and react-native are
  // required locally here rather than using the file's top-level `React` import.
  const ReactActual = require('react');
  const RN = require('react-native');
  return {
    FlashList: ({
      data,
      renderItem,
      keyExtractor,
      ListFooterComponent,
      ListEmptyComponent,
      onEndReached,
      onRefresh,
      refreshing,
    }: {
      data: unknown[];
      renderItem: (info: { item: unknown; index: number }) => React.ReactNode;
      keyExtractor: (item: unknown, index: number) => string;
      ListFooterComponent?: React.ReactNode;
      ListEmptyComponent?: React.ReactNode;
      onEndReached?: () => void;
      onRefresh?: () => void;
      refreshing?: boolean;
    }) =>
      ReactActual.createElement(
        RN.View,
        { testID: 'repo-list', onEndReached, onRefresh, refreshing },
        data.length === 0
          ? ListEmptyComponent
          : data.map((item, index) =>
              ReactActual.createElement(
                ReactActual.Fragment,
                { key: keyExtractor(item, index) },
                renderItem({ item, index }),
              ),
            ),
        ListFooterComponent,
      ),
  };
});

function makeRepo(id: number, overrides: Partial<Repo> = {}): Repo {
  return {
    id,
    name: `repo-${id}`,
    fullName: `facebook/repo-${id}`,
    owner: { login: 'facebook', avatarUrl: '', htmlUrl: '' },
    description: null,
    htmlUrl: '',
    language: null,
    stars: 0,
    forks: 0,
    openIssues: 0,
    createdAt: '2020-01-01T00:00:00Z',
    updatedAt: '2020-01-01T00:00:00Z',
    ...overrides,
  };
}

function mockResult(overrides: Partial<UseOrgReposResult>): UseOrgReposResult {
  return {
    repos: [],
    status: 'pending',
    error: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    isFetchNextPageError: false,
    fetchNextPage: jest.fn(),
    refetch: jest.fn(),
    isRefetching: false,
    isRefetchError: false,
    ...overrides,
  };
}

function renderScreen() {
  return render(
    <SafeAreaProvider>
      <ThemeProvider>
        <ExploreScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

async function submitOrg(org: string): Promise<void> {
  const input = await screen.findByLabelText('Organization name');
  await userEvent.type(input, org);
  const button = await screen.findByRole('button', { name: 'Search' });
  await userEvent.press(button);
}

describe('ExploreScreen', () => {
  beforeEach(() => {
    useOrgRepos.mockReturnValue(mockResult({ status: 'pending' }));
    usePrefetchRepoDetails.mockReturnValue(jest.fn());
    mockNavigate.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the input and no list before an org is submitted', async () => {
    await renderScreen();
    expect(await screen.findByLabelText('Organization name')).toBeOnTheScreen();
    expect(
      await screen.findByText(
        'Search a GitHub organization to see its repositories',
      ),
    ).toBeOnTheScreen();
  });

  it('shows loading skeletons for the first page', async () => {
    useOrgRepos.mockReturnValue(mockResult({ status: 'pending' }));
    await renderScreen();
    await submitOrg('facebook');
    expect(
      await screen.findByRole('progressbar', { name: 'Loading repositories' }),
    ).toBeOnTheScreen();
  });

  it('shows the repo list on success', async () => {
    useOrgRepos.mockReturnValue(
      mockResult({ status: 'success', repos: [makeRepo(1), makeRepo(2)] }),
    );
    await renderScreen();
    await submitOrg('facebook');
    expect(await screen.findByText('repo-1')).toBeOnTheScreen();
    expect(await screen.findByText('repo-2')).toBeOnTheScreen();
  });

  it('navigates to RepoDetails with the owner/repo when a card is pressed', async () => {
    useOrgRepos.mockReturnValue(
      mockResult({ status: 'success', repos: [makeRepo(1)] }),
    );
    await renderScreen();
    await submitOrg('facebook');
    const card = await screen.findByRole('button', { name: /^repo-1,/ });
    await userEvent.press(card);
    expect(mockNavigate).toHaveBeenCalledWith('RepoDetails', {
      owner: 'facebook',
      repo: 'repo-1',
    });
  });

  it('prefetches repo details on press-in of a card', async () => {
    const prefetch = jest.fn();
    usePrefetchRepoDetails.mockReturnValue(prefetch);
    useOrgRepos.mockReturnValue(
      mockResult({ status: 'success', repos: [makeRepo(1)] }),
    );
    await renderScreen();
    await submitOrg('facebook');
    const card = await screen.findByRole('button', { name: /^repo-1,/ });
    await userEvent.press(card);
    expect(prefetch).toHaveBeenCalledWith('facebook', 'repo-1');
  });

  it('shows the empty-org message when the org has no repos', async () => {
    useOrgRepos.mockReturnValue(mockResult({ status: 'success', repos: [] }));
    await renderScreen();
    await submitOrg('empty-org');
    expect(
      await screen.findByText('This organization has no public repositories'),
    ).toBeOnTheScreen();
  });

  it('shows an error view with Retry for a generic error, and retries on press', async () => {
    const refetch = jest.fn();
    useOrgRepos.mockReturnValue(
      mockResult({ status: 'error', error: new ApiError(500), refetch }),
    );
    await renderScreen();
    await submitOrg('facebook');
    expect(await screen.findByText('Something went wrong')).toBeOnTheScreen();
    const retry = await screen.findByRole('button', { name: 'Retry' });
    await userEvent.press(retry);
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('keeps the loaded list visible when a page/refresh error occurs instead of hiding it behind a full-screen error', async () => {
    useOrgRepos.mockReturnValue(
      mockResult({
        status: 'error',
        error: new RateLimitError(new Date(Date.now() + 100000)),
        repos: [makeRepo(1), makeRepo(2)],
      }),
    );
    await renderScreen();
    await submitOrg('facebook');
    expect(await screen.findByText('repo-1')).toBeOnTheScreen();
    expect(await screen.findByText('repo-2')).toBeOnTheScreen();
    expect(screen.queryByText(/Rate limit reached/)).toBeNull();
  });

  it('shows "Organization not found" for a NotFoundError with no Retry action', async () => {
    useOrgRepos.mockReturnValue(
      mockResult({ status: 'error', error: new NotFoundError() }),
    );
    await renderScreen();
    await submitOrg('does-not-exist');
    expect(await screen.findByText('Organization not found')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('clears the error message once the input diverges from the submitted org', async () => {
    useOrgRepos.mockReturnValue(
      mockResult({ status: 'error', error: new NotFoundError() }),
    );
    await renderScreen();
    await submitOrg('does-not-exist');
    expect(await screen.findByText('Organization not found')).toBeOnTheScreen();

    const input = await screen.findByLabelText('Organization name');
    await userEvent.type(input, 'x');

    expect(screen.queryByText('Organization not found')).toBeNull();
    expect(
      await screen.findByText(
        'Search a GitHub organization to see its repositories',
      ),
    ).toBeOnTheScreen();
  });

  it('shows "No connection" for a NetworkError', async () => {
    useOrgRepos.mockReturnValue(
      mockResult({ status: 'error', error: new NetworkError() }),
    );
    await renderScreen();
    await submitOrg('facebook');
    expect(await screen.findByText('No connection')).toBeOnTheScreen();
  });

  it('shows the rate-limit message with no Retry action before the reset time', async () => {
    const resetAt = new Date(Date.now() + 100000);
    useOrgRepos.mockReturnValue(
      mockResult({ status: 'error', error: new RateLimitError(resetAt) }),
    );
    await renderScreen();
    await submitOrg('facebook');
    const formatted = new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(resetAt);
    expect(
      await screen.findByText(`Rate limit reached, try again at ${formatted}`),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('allows retrying a rate-limit error once the reset time has passed', async () => {
    const refetch = jest.fn();
    const resetAt = new Date(Date.now() - 1000);
    useOrgRepos.mockReturnValue(
      mockResult({
        status: 'error',
        error: new RateLimitError(resetAt),
        refetch,
      }),
    );
    await renderScreen();
    await submitOrg('facebook');
    const retry = await screen.findByRole('button', { name: 'Retry' });
    await userEvent.press(retry);
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('calls fetchNextPage when scrolling reaches the end and more pages exist', async () => {
    const fetchNextPage = jest.fn();
    useOrgRepos.mockReturnValue(
      mockResult({
        status: 'success',
        repos: [makeRepo(1)],
        hasNextPage: true,
        fetchNextPage,
      }),
    );
    await renderScreen();
    await submitOrg('facebook');
    const list = await screen.findByTestId('repo-list');
    fireEvent(list, 'endReached');
    expect(fetchNextPage).toHaveBeenCalled();
  });

  it('does not call fetchNextPage on end-reached when there is no next page', async () => {
    const fetchNextPage = jest.fn();
    useOrgRepos.mockReturnValue(
      mockResult({
        status: 'success',
        repos: [makeRepo(1)],
        hasNextPage: false,
        fetchNextPage,
      }),
    );
    await renderScreen();
    await submitOrg('facebook');
    const list = await screen.findByTestId('repo-list');
    fireEvent(list, 'endReached');
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('does not call fetchNextPage on end-reached while already fetching the next page', async () => {
    const fetchNextPage = jest.fn();
    useOrgRepos.mockReturnValue(
      mockResult({
        status: 'success',
        repos: [makeRepo(1)],
        hasNextPage: true,
        isFetchingNextPage: true,
        fetchNextPage,
      }),
    );
    await renderScreen();
    await submitOrg('facebook');
    const list = await screen.findByTestId('repo-list');
    fireEvent(list, 'endReached');
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('shows a footer error with Retry when fetching the next page fails, and retries on press', async () => {
    const fetchNextPage = jest.fn();
    useOrgRepos.mockReturnValue(
      mockResult({
        status: 'success',
        repos: [makeRepo(1)],
        hasNextPage: true,
        isFetchNextPageError: true,
        error: new ApiError(500),
        fetchNextPage,
      }),
    );
    await renderScreen();
    await submitOrg('facebook');
    expect(await screen.findByText('Something went wrong')).toBeOnTheScreen();
    const retry = await screen.findByRole('button', { name: 'Retry' });
    await userEvent.press(retry);
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('shows a footer rate-limit message with no Retry when fetching the next page is rate limited', async () => {
    const resetAt = new Date(Date.now() + 100000);
    useOrgRepos.mockReturnValue(
      mockResult({
        status: 'success',
        repos: [makeRepo(1)],
        hasNextPage: true,
        isFetchNextPageError: true,
        error: new RateLimitError(resetAt),
      }),
    );
    await renderScreen();
    await submitOrg('facebook');
    expect(
      await screen.findByText(/Rate limit reached, try again at/),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('shows a footer "Organization not found" message with no Retry when the next page 404s', async () => {
    useOrgRepos.mockReturnValue(
      mockResult({
        status: 'success',
        repos: [makeRepo(1)],
        hasNextPage: true,
        isFetchNextPageError: true,
        error: new NotFoundError(),
      }),
    );
    await renderScreen();
    await submitOrg('facebook');
    expect(await screen.findByText('Organization not found')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('shows the footer loader while fetching the next page', async () => {
    useOrgRepos.mockReturnValue(
      mockResult({
        status: 'success',
        repos: [makeRepo(1)],
        hasNextPage: true,
        isFetchingNextPage: true,
      }),
    );
    await renderScreen();
    await submitOrg('facebook');
    expect(
      await screen.findByRole('progressbar', {
        name: 'Loading more repositories',
      }),
    ).toBeOnTheScreen();
  });

  it('triggers refetch on pull-to-refresh', async () => {
    const refetch = jest.fn();
    useOrgRepos.mockReturnValue(
      mockResult({ status: 'success', repos: [makeRepo(1)], refetch }),
    );
    await renderScreen();
    await submitOrg('facebook');
    const list = await screen.findByTestId('repo-list');
    fireEvent(list, 'refresh');
    expect(refetch).toHaveBeenCalled();
  });

  it('calls useOrgRepos with the trimmed org', async () => {
    useOrgRepos.mockReturnValue(
      mockResult({ status: 'success', repos: [makeRepo(1)] }),
    );
    await renderScreen();
    await submitOrg('  facebook  ');
    expect(useOrgRepos).toHaveBeenLastCalledWith('facebook');
  });

  it('refetches instead of no-op-ing when the same org is submitted again', async () => {
    const refetch = jest.fn();
    useOrgRepos.mockReturnValue(
      mockResult({ status: 'success', repos: [makeRepo(1)], refetch }),
    );
    await renderScreen();
    await submitOrg('facebook');
    // Press Search again without changing the input — the field still reads "facebook".
    const button = await screen.findByRole('button', { name: 'Search' });
    await userEvent.press(button);
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('never searches while typing, however long it waits, without an explicit submit', async () => {
    jest.useFakeTimers();
    await renderScreen();
    const input = await screen.findByLabelText('Organization name');

    await act(async () => {
      await fireEvent.changeText(input, 'facebook');
    });
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });

    expect(useOrgRepos).toHaveBeenLastCalledWith('');
  });

  it('does not search and shows a validation message when Search is pressed below the minimum length', async () => {
    await renderScreen();
    const input = await screen.findByLabelText('Organization name');
    await userEvent.type(input, 'f');
    const button = await screen.findByRole('button', { name: 'Search' });
    await userEvent.press(button);

    expect(useOrgRepos).toHaveBeenLastCalledWith('');
    expect(
      await screen.findByText('Enter at least 2 characters'),
    ).toBeOnTheScreen();
  });

  it('does not search and shows a validation message on keyboard submit below the minimum length', async () => {
    await renderScreen();
    const input = await screen.findByLabelText('Organization name');
    await userEvent.type(input, 'f');
    await fireEvent(input, 'submitEditing');

    expect(useOrgRepos).toHaveBeenLastCalledWith('');
    expect(
      await screen.findByText('Enter at least 2 characters'),
    ).toBeOnTheScreen();
  });

  it('does not show a validation message before any submit is attempted', async () => {
    await renderScreen();
    expect(screen.queryByText('Enter at least 2 characters')).toBeNull();
  });

  it('clears the validation message once the user edits the input again', async () => {
    await renderScreen();
    const input = await screen.findByLabelText('Organization name');
    await userEvent.type(input, 'f');
    const button = await screen.findByRole('button', { name: 'Search' });
    await userEvent.press(button);
    expect(
      await screen.findByText('Enter at least 2 characters'),
    ).toBeOnTheScreen();

    await userEvent.type(input, 'b');

    expect(screen.queryByText('Enter at least 2 characters')).toBeNull();
  });

  it('searches on keyboard submit at exactly the minimum length (2 characters)', async () => {
    await renderScreen();
    const input = await screen.findByLabelText('Organization name');
    await userEvent.type(input, 'fb');
    await fireEvent(input, 'submitEditing');

    expect(useOrgRepos).toHaveBeenLastCalledWith('fb');
    expect(screen.queryByText('Enter at least 2 characters')).toBeNull();
  });

  it('shows the name filter input once repos have loaded', async () => {
    useOrgRepos.mockReturnValue(
      mockResult({ status: 'success', repos: [makeRepo(1), makeRepo(2)] }),
    );
    await renderScreen();
    await submitOrg('facebook');
    expect(
      await screen.findByLabelText('Filter repositories by name'),
    ).toBeOnTheScreen();
  });

  it('does not show the name filter input before any repos are loaded', async () => {
    await renderScreen();
    expect(screen.queryByLabelText('Filter repositories by name')).toBeNull();
  });

  it('does not show the name filter input when the org has no repos', async () => {
    useOrgRepos.mockReturnValue(mockResult({ status: 'success', repos: [] }));
    await renderScreen();
    await submitOrg('empty-org');
    expect(screen.queryByLabelText('Filter repositories by name')).toBeNull();
  });

  it('keeps the name filter input visible when a page/refresh error occurs', async () => {
    useOrgRepos.mockReturnValue(
      mockResult({
        status: 'error',
        error: new RateLimitError(new Date(Date.now() + 100000)),
        repos: [makeRepo(1), makeRepo(2)],
      }),
    );
    await renderScreen();
    await submitOrg('facebook');
    expect(
      await screen.findByLabelText('Filter repositories by name'),
    ).toBeOnTheScreen();
  });

  it('clears the name filter once a new org is submitted', async () => {
    useOrgRepos.mockReturnValue(
      mockResult({ status: 'success', repos: [makeRepo(1), makeRepo(2)] }),
    );
    await renderScreen();
    await submitOrg('facebook');

    const filterInput = await screen.findByLabelText(
      'Filter repositories by name',
    );
    await userEvent.type(filterInput, 'repo-1');
    expect(filterInput.props.value).toBe('repo-1');

    const input = await screen.findByLabelText('Organization name');
    await userEvent.clear(input);
    await userEvent.type(input, 'google');
    const button = await screen.findByRole('button', { name: 'Search' });
    await userEvent.press(button);

    const filterInputAfterNewSearch = await screen.findByLabelText(
      'Filter repositories by name',
    );
    expect(filterInputAfterNewSearch.props.value).toBe('');
  });

  it('filters the visible list by name after the filter debounce delay', async () => {
    useOrgRepos.mockReturnValue(
      mockResult({ status: 'success', repos: [makeRepo(1), makeRepo(2)] }),
    );
    await renderScreen();
    await submitOrg('facebook');

    jest.useFakeTimers();
    const filterInput = await screen.findByLabelText(
      'Filter repositories by name',
    );
    await act(async () => {
      await fireEvent.changeText(filterInput, 'repo-1');
    });
    await act(async () => {
      jest.advanceTimersByTime(250);
    });

    expect(screen.queryByText('repo-1')).toBeOnTheScreen();
    expect(screen.queryByText('repo-2')).toBeNull();
  });

  it('does not show the "no repositories match" state before the filter debounce elapses', async () => {
    useOrgRepos.mockReturnValue(
      mockResult({ status: 'success', repos: [makeRepo(1), makeRepo(2)] }),
    );
    await renderScreen();
    await submitOrg('facebook');

    jest.useFakeTimers();
    const filterInput = await screen.findByLabelText(
      'Filter repositories by name',
    );
    await act(async () => {
      await fireEvent.changeText(filterInput, 'nonexistent');
    });
    await act(async () => {
      jest.advanceTimersByTime(249);
    });

    expect(
      screen.queryByText('No repositories match "nonexistent"'),
    ).toBeNull();
    expect(screen.queryByText('repo-1')).toBeOnTheScreen();
    expect(screen.queryByText('repo-2')).toBeOnTheScreen();
  });

  it('shows a "no repositories match" empty state when the filter matches nothing', async () => {
    useOrgRepos.mockReturnValue(
      mockResult({ status: 'success', repos: [makeRepo(1), makeRepo(2)] }),
    );
    await renderScreen();
    await submitOrg('facebook');

    jest.useFakeTimers();
    const filterInput = await screen.findByLabelText(
      'Filter repositories by name',
    );
    await act(async () => {
      await fireEvent.changeText(filterInput, 'nonexistent');
    });
    await act(async () => {
      jest.advanceTimersByTime(250);
    });

    expect(
      await screen.findByText('No repositories match "nonexistent"'),
    ).toBeOnTheScreen();
  });
});
