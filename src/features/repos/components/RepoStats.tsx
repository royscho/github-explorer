import React from 'react';
import { View } from 'react-native';

import { Text } from '@shared/components';
import { formatCompactNumber } from '@shared/utils';

import { useRepoStatsStyles } from '../hooks';

export interface RepoStatsProps {
  stars: number;
  forks: number;
  openIssues: number;
  watchers?: number;
}

export function RepoStats({
  stars,
  forks,
  openIssues,
  watchers,
}: RepoStatsProps): React.JSX.Element {
  const styles = useRepoStatsStyles();

  return (
    <View style={styles.container}>
      <Text
        variant="caption"
        color="secondary"
        accessible
        accessibilityLabel={`${formatCompactNumber(stars)} stars`}
      >
        ⭐ {formatCompactNumber(stars)}
      </Text>
      <Text
        variant="caption"
        color="secondary"
        accessible
        accessibilityLabel={`${formatCompactNumber(forks)} forks`}
      >
        {formatCompactNumber(forks)} forks
      </Text>
      <Text
        variant="caption"
        color="secondary"
        accessible
        accessibilityLabel={`${formatCompactNumber(openIssues)} open issues`}
      >
        {formatCompactNumber(openIssues)} issues
      </Text>
      {watchers !== undefined ? (
        <Text
          variant="caption"
          color="secondary"
          accessible
          accessibilityLabel={`${formatCompactNumber(watchers)} watchers`}
        >
          {formatCompactNumber(watchers)} watchers
        </Text>
      ) : null}
    </View>
  );
}
