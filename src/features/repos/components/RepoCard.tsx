import React, { memo } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@shared/components';
import { formatCompactNumber, formatRelativeTime } from '@shared/utils';

import { useRepoCardStyles } from '../hooks';
import type { Repo } from '../types';
import { RepoStats } from './RepoStats';

export interface RepoCardProps {
  repo: Repo;
  // Take the pressed repo as an argument (rather than being pre-bound per-card) so a parent list
  // can pass the same stable function reference to every cell — `memo` below only skips a
  // re-render when every prop, including these, is referentially equal across renders.
  onPress: (repo: Repo) => void;
  onPressIn?: (repo: Repo) => void;
}

function buildAccessibilityLabel(repo: Repo): string {
  const parts = [repo.name];
  if (repo.language) {
    parts.push(repo.language);
  }
  parts.push(
    `${formatCompactNumber(repo.stars)} stars`,
    `${formatCompactNumber(repo.forks)} forks`,
    `${formatCompactNumber(repo.openIssues)} open issues`,
    `updated ${formatRelativeTime(repo.updatedAt)}`,
    repo.description ?? 'No description',
  );
  return parts.join(', ');
}

function RepoCardComponent({
  repo,
  onPress,
  onPressIn,
}: RepoCardProps): React.JSX.Element {
  const styles = useRepoCardStyles();

  function handlePress(): void {
    onPress(repo);
  }

  function handlePressIn(): void {
    onPressIn?.(repo);
  }

  return (
    <Pressable
      style={styles.container}
      accessible
      accessibilityRole="button"
      accessibilityLabel={buildAccessibilityLabel(repo)}
      onPress={handlePress}
      onPressIn={handlePressIn}
    >
      <Text variant="title" numberOfLines={1}>
        {repo.name}
      </Text>
      <Text
        variant="body"
        color="secondary"
        style={styles.description}
        numberOfLines={2}
      >
        {repo.description ?? 'No description'}
      </Text>
      <View style={styles.metaRow}>
        {repo.language ? (
          <Text variant="caption" color="secondary">
            {repo.language}
          </Text>
        ) : null}
        <RepoStats
          stars={repo.stars}
          forks={repo.forks}
          openIssues={repo.openIssues}
        />
      </View>
      <Text variant="caption" color="secondary">
        updated {formatRelativeTime(repo.updatedAt)}
      </Text>
    </Pressable>
  );
}

export const RepoCard = memo(RepoCardComponent);
