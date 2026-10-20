import React, { useCallback } from 'react';
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';

import { ErrorView, Screen, Text } from '@shared/components';
import { NotFoundError, RateLimitError } from '@shared/api';
import { formatDate, formatResetTime } from '@shared/utils';
import { logger } from '@shared/logger';

import { RepoDetailsSkeleton, RepoStats } from '../components';
import { useRepoDetails, useRepoDetailsScreenStyles } from '../hooks';
import type { RepoDetailsRouteParams } from '../types';

import { getErrorMessage } from './RepoDetailsScreen.utils';

type RepoDetailsScreenRouteProp = RouteProp<
  { RepoDetails: RepoDetailsRouteParams },
  'RepoDetails'
>;

export function RepoDetailsScreen(): React.JSX.Element {
  const styles = useRepoDetailsScreenStyles();
  const route = useRoute<RepoDetailsScreenRouteProp>();
  const { owner, repo } = route.params;

  const {
    repoDetails,
    status,
    error,
    isPlaceholderData,
    isRefetching,
    refetch,
  } = useRepoDetails(owner, repo);

  const openRepositoryUrl = useCallback(() => {
    if (!repoDetails) {
      return;
    }
    Linking.openURL(repoDetails.htmlUrl).catch(openError => {
      logger.error(openError, { htmlUrl: repoDetails.htmlUrl });
    });
  }, [repoDetails]);

  function renderContent(): React.JSX.Element {
    if (status === 'pending' && !repoDetails) {
      return <RepoDetailsSkeleton />;
    }

    // A refresh failure keeps the already-loaded details visible instead of replacing them with a
    // full-screen error (same reasoning as ExploreScreen, DESIGN §19) — only a first-load failure,
    // with nothing to show yet, is full-screen.
    if (status === 'error' && !repoDetails && error) {
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
      // Same reasoning as Explore: a 404 can't be fixed by retrying the exact same request.
      const canRetry = !(error instanceof NotFoundError);
      return (
        <ErrorView
          message={getErrorMessage(error)}
          onRetry={canRetry ? refetch : undefined}
        />
      );
    }

    if (!repoDetails) {
      return <RepoDetailsSkeleton />;
    }

    return (
      <ScrollView
        refreshControl={
          <RefreshControl
            testID="repo-details-refresh"
            refreshing={isRefetching}
            onRefresh={refetch}
          />
        }
      >
        <View style={styles.content}>
          <Text variant="title">{repoDetails.fullName}</Text>
          <Text variant="body" color="secondary" style={styles.description}>
            {repoDetails.description ?? 'No description'}
          </Text>
          <RepoStats
            stars={repoDetails.stars}
            forks={repoDetails.forks}
            openIssues={repoDetails.openIssues}
            watchers={isPlaceholderData ? undefined : repoDetails.watchers}
          />
          <View style={styles.row}>
            <Text variant="body" color="secondary">
              Default branch:
            </Text>
            {isPlaceholderData ? (
              <Text
                variant="body"
                color="secondary"
                style={styles.placeholderValue}
              >
                Loading…
              </Text>
            ) : (
              <Text variant="body">{repoDetails.defaultBranch}</Text>
            )}
          </View>
          <View style={styles.row}>
            <Text variant="body" color="secondary">
              License:
            </Text>
            {isPlaceholderData ? (
              <Text
                variant="body"
                color="secondary"
                style={styles.placeholderValue}
              >
                Loading…
              </Text>
            ) : (
              <Text variant="body">
                {repoDetails.license?.name ?? 'No license'}
              </Text>
            )}
          </View>
          <Text variant="caption" color="secondary">
            Created {formatDate(repoDetails.createdAt)}
          </Text>
          <Text variant="caption" color="secondary">
            Updated {formatDate(repoDetails.updatedAt)}
          </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="View on GitHub"
            onPress={openRepositoryUrl}
            style={styles.link}
            hitSlop={8}
          >
            <Text variant="body" style={styles.linkLabel}>
              View on GitHub
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.container}>{renderContent()}</View>
    </Screen>
  );
}
