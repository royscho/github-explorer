import React, { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';

import {
  EmptyView,
  ErrorView,
  ListFooterLoader,
  LoadingView,
  Screen,
  Text,
} from '@shared/components';
import { NetworkError, NotFoundError, RateLimitError } from '@shared/api';
import type { GitHubApiError } from '@shared/api';
import { makeStyles } from '@shared/theme';

import { OrgSearchInput, RepoCard, RepoCardSkeleton } from '../components';
import { useOrgRepos } from '../hooks';
import type { Repo } from '../types';

function formatResetTime(resetAt: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(resetAt);
}

function getErrorMessage(error: GitHubApiError): string {
  if (error instanceof NetworkError) {
    return 'No connection';
  }
  if (error instanceof NotFoundError) {
    return 'Organization not found';
  }
  return 'Something went wrong';
}

function keyExtractor(item: Repo): string {
  return String(item.id);
}

function renderItem({ item }: ListRenderItemInfo<Repo>): React.JSX.Element {
  return <RepoCard repo={item} />;
}

function renderSkeleton(index: number): React.JSX.Element {
  return <RepoCardSkeleton key={index} />;
}

export function ExploreScreen(): React.JSX.Element {
  const styles = useStyles();
  const [orgInput, setOrgInput] = useState('');
  const [org, setOrg] = useState('');

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
  } = useOrgRepos(org);

  function handleSubmit(): void {
    const trimmed = orgInput.trim();
    if (trimmed === org) {
      refetch();
      return;
    }
    setOrg(trimmed);
  }

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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

    if (status === 'pending') {
      return <LoadingView renderItem={renderSkeleton} />;
    }

    // A pagination or refresh failure keeps the already-loaded list visible (§19: don't throw away
    // data a 60-req/hour budget already paid for) — only a first-load failure is full-screen.
    if (status === 'error' && repos.length === 0 && error) {
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
      return <ErrorView message={getErrorMessage(error)} onRetry={refetch} />;
    }

    if (repos.length === 0) {
      return (
        <EmptyView message="This organization has no public repositories" />
      );
    }

    return (
      <FlashList<Repo>
        data={repos}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter()}
        refreshing={isRefetching}
        onRefresh={refetch}
      />
    );
  }

  return (
    <Screen>
      <OrgSearchInput
        value={orgInput}
        onChangeText={setOrgInput}
        onSubmit={handleSubmit}
      />
      <View style={styles.container}>{renderContent()}</View>
    </Screen>
  );
}

const useStyles = makeStyles(theme => ({
  container: {
    flex: 1,
  },
  footerError: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  footerErrorMessage: {
    textAlign: 'center',
  },
  footerRetryLabel: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
}));
