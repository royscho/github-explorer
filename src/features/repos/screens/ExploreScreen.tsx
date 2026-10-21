import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  EmptyView,
  ErrorView,
  ListFooterLoader,
  LoadingView,
  Screen,
  Text,
} from '@shared/components';
import { NotFoundError, RateLimitError } from '@shared/api';
import { useDebounce } from '@shared/hooks';
import { formatResetTime } from '@shared/utils';

import {
  NameFilterInput,
  OrgSearchInput,
  RepoCard,
  RepoCardSkeleton,
} from '../components';
import {
  useExploreScreenStyles,
  useOrgRepos,
  usePrefetchRepoDetails,
} from '../hooks';
import type { Repo, RepoDetailsRouteParams } from '../types';

import {
  filterReposByName,
  getErrorMessage,
  keyExtractor,
} from './ExploreScreen.utils';

// DESIGN §7: the org search only runs on an explicit Search (button or keyboard submit), never
// while typing, and requires at least this many characters (a shorter submission shows a
// validation message instead). The name filter is the opposite — it only ever runs client-side,
// so it can debounce and fire on every keystroke.
const MIN_ORG_LENGTH = 2;
const NAME_FILTER_DEBOUNCE_MS = 250;

function renderSkeleton(index: number): React.JSX.Element {
  return <RepoCardSkeleton key={index} />;
}

type ExploreScreenNavigationProp = NativeStackNavigationProp<{
  RepoDetails: RepoDetailsRouteParams;
}>;

export interface ExploreScreenProps {
  // Injected by `app/navigation` — see `RepoCardProps.renderFavoriteToggle`'s comment for why
  // this feature doesn't import `@features/favorites` to render its own.
  renderFavoriteToggle?: (repo: Repo) => React.ReactNode;
}

export function ExploreScreen({
  renderFavoriteToggle,
}: ExploreScreenProps = {}): React.JSX.Element {
  const styles = useExploreScreenStyles();
  const navigation = useNavigation<ExploreScreenNavigationProp>();
  const prefetchRepoDetails = usePrefetchRepoDetails();
  const [orgInput, setOrgInput] = useState('');
  const [org, setOrg] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [orgTooShort, setOrgTooShort] = useState(false);

  const debouncedNameFilter = useDebounce(nameFilter, NAME_FILTER_DEBOUNCE_MS);

  const {
    repos,
    status,
    error,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
    refetch,
    isRefetching,
    isPaused,
  } = useOrgRepos(org);

  const filteredRepos = useMemo(
    () => filterReposByName(repos, debouncedNameFilter),
    [repos, debouncedNameFilter],
  );

  // While the input has drifted from the last submitted org (the user is typing toward a new
  // search but hasn't pressed Search yet), an error for the *previous* org shouldn't linger.
  const isEditingNewOrg = orgInput.trim() !== org;

  // A name filter is scoped to the org it was typed against — carrying it over to a freshly
  // submitted org would silently hide repos the user never filtered.
  useEffect(() => {
    setNameFilter('');
  }, [org]);

  // DESIGN §7: the org search is explicit-trigger-only (Search button or keyboard submit) — no
  // network call while typing — and a sub-minimum-length submission shows a validation message
  // instead of searching (or clearing) with it.
  function handleSubmit(): void {
    const trimmed = orgInput.trim();
    if (trimmed.length < MIN_ORG_LENGTH) {
      setOrgTooShort(true);
      return;
    }
    if (trimmed === org) {
      refetch();
      return;
    }
    setOrg(trimmed);
  }

  function handleOrgInputChange(value: string): void {
    setOrgInput(value);
    setOrgTooShort(false);
  }

  // DESIGN §7: the name filter only ever searches already-loaded pages, so pagination must not
  // auto-advance while a filter is active — FlashList fires onEndReached whenever the *filtered*
  // list is short enough to fit the viewport, which would otherwise silently page through the
  // whole org just because a filter narrowed the visible rows. Checking the raw `nameFilter`
  // (not the debounced one) turns the guard on at the first keystroke; checking both means
  // clearing the filter can't leave a ~250ms window where the still-narrow debounced list lets
  // one unwanted page slip through before it catches up.
  const onEndReached = useCallback(() => {
    if (
      nameFilter.trim() ||
      debouncedNameFilter.trim() ||
      !hasNextPage ||
      isFetchingNextPage
    ) {
      return;
    }
    fetchNextPage();
  }, [
    nameFilter,
    debouncedNameFilter,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]);

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

  function renderFooter(): React.ReactElement | null {
    if (isFetchingNextPage) {
      return <ListFooterLoader />;
    }

    if (isFetchNextPageError && error) {
      if (error instanceof RateLimitError) {
        return (
          <View style={styles.footerError}>
            <Text variant="caption" color="secondary">
              {`Rate limit reached, try again at ${formatResetTime(
                error.resetAt,
              )}`}
            </Text>
          </View>
        );
      }
      // A 404 means the org name itself is wrong — retrying the exact same query can only fail
      // the same way again, so there's no Retry action for it (DESIGN §5.3).
      if (error instanceof NotFoundError) {
        return (
          <View style={styles.footerError}>
            <Text variant="caption" color="secondary">
              {getErrorMessage(error)}
            </Text>
          </View>
        );
      }
      return (
        <View style={styles.footerError}>
          <Text
            variant="caption"
            color="secondary"
            style={styles.footerErrorMessage}
          >
            {getErrorMessage(error)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry"
            onPress={fetchNextPage}
            hitSlop={8}
          >
            <Text variant="caption" style={styles.footerRetryLabel}>
              Retry
            </Text>
          </Pressable>
        </View>
      );
    }

    return null;
  }

  function renderContent(): React.JSX.Element {
    if (!org) {
      return (
        <EmptyView message="Search a GitHub organization to see its repositories" />
      );
    }

    // §11: a first search for an org with nothing cached yet pauses (rather than fails) while
    // offline — an endless skeleton would otherwise never resolve into anything.
    if (status === 'pending' && isPaused) {
      return (
        <ErrorView message="You're offline — search will run once you're back online" />
      );
    }

    if (status === 'pending') {
      return <LoadingView renderItem={renderSkeleton} />;
    }

    // A pagination or refresh failure keeps the already-loaded list visible (§19: don't throw away
    // data a 60-req/hour budget already paid for) — only a first-load failure is full-screen.
    if (status === 'error' && repos.length === 0 && error) {
      if (isEditingNewOrg) {
        return (
          <EmptyView message="Search a GitHub organization to see its repositories" />
        );
      }
      if (error instanceof RateLimitError) {
        const canRetry = Date.now() >= error.resetAt.getTime();
        return (
          <ErrorView
            message={`Rate limit reached, try again at ${formatResetTime(
              error.resetAt,
            )}`}
            onRetry={canRetry ? refetch : undefined}
          />
        );
      }
      // Same reasoning as the footer case above: a 404 can't be fixed by retrying.
      const canRetry = !(error instanceof NotFoundError);
      return (
        <ErrorView
          message={getErrorMessage(error)}
          onRetry={canRetry ? refetch : undefined}
        />
      );
    }

    if (repos.length === 0) {
      return (
        <EmptyView message="This organization has no public repositories" />
      );
    }

    return (
      <FlashList<Repo>
        data={filteredRepos}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter()}
        ListEmptyComponent={
          <EmptyView
            message={`No repositories match "${debouncedNameFilter.trim()}"`}
          />
        }
        refreshing={isRefetching}
        onRefresh={refetch}
      />
    );
  }

  // Independent of `status`: a page/refresh error (handled above, in renderFooter/renderContent)
  // keeps already-loaded repos visible, and the filter should stay usable over them too.
  const showNameFilter = repos.length > 0;

  return (
    <Screen>
      <OrgSearchInput
        value={orgInput}
        onChangeText={handleOrgInputChange}
        onSubmit={handleSubmit}
      />
      {orgTooShort && (
        <Text
          variant="caption"
          color="danger"
          style={styles.orgInputErrorMessage}
        >
          {`Enter at least ${MIN_ORG_LENGTH} characters`}
        </Text>
      )}
      {showNameFilter && (
        <NameFilterInput value={nameFilter} onChangeText={setNameFilter} />
      )}
      <View style={styles.container}>{renderContent()}</View>
    </Screen>
  );
}
