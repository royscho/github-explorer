import React, { memo } from 'react';
import { View } from 'react-native';

import { Text } from '@shared/components';
import { formatCompactNumber, formatRelativeTime } from '@shared/utils';

import { useRepoCardStyles } from '../hooks';
import type { Repo } from '../types';

export interface RepoCardProps {
  repo: Repo;
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

function RepoCardComponent({ repo }: RepoCardProps): React.JSX.Element {
  const styles = useRepoCardStyles();

  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel={buildAccessibilityLabel(repo)}
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
        <Text variant="caption" color="secondary">
          ⭐ {formatCompactNumber(repo.stars)}
        </Text>
        <Text variant="caption" color="secondary">
          {formatCompactNumber(repo.forks)} forks
        </Text>
        <Text variant="caption" color="secondary">
          {formatCompactNumber(repo.openIssues)} issues
        </Text>
      </View>
      <Text variant="caption" color="secondary">
        updated {formatRelativeTime(repo.updatedAt)}
      </Text>
    </View>
  );
}

export const RepoCard = memo(RepoCardComponent);
