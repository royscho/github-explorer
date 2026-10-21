import React from 'react';
import { View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { Text } from '@shared/components';
import { useTheme } from '@shared/theme';
import { formatCompactNumber } from '@shared/utils';

import { useRepoStatsStyles } from '../hooks';

const STAT_ICON_SIZE = 14;

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
  const theme = useTheme();
  const iconColor = theme.colors.textSecondary;

  return (
    <View style={styles.container}>
      <View
        style={styles.stat}
        accessible
        accessibilityLabel={`${formatCompactNumber(stars)} stars`}
      >
        <Ionicons name="star-outline" size={STAT_ICON_SIZE} color={iconColor} />
        <Text variant="caption" color="secondary">
          {formatCompactNumber(stars)}
        </Text>
      </View>
      <View
        style={styles.stat}
        accessible
        accessibilityLabel={`${formatCompactNumber(forks)} forks`}
      >
        <Ionicons
          name="git-branch-outline"
          size={STAT_ICON_SIZE}
          color={iconColor}
        />
        <Text variant="caption" color="secondary">
          {formatCompactNumber(forks)}
        </Text>
      </View>
      <View
        style={styles.stat}
        accessible
        accessibilityLabel={`${formatCompactNumber(openIssues)} open issues`}
      >
        <Ionicons
          name="alert-circle-outline"
          size={STAT_ICON_SIZE}
          color={iconColor}
        />
        <Text variant="caption" color="secondary">
          {formatCompactNumber(openIssues)}
        </Text>
      </View>
      {watchers !== undefined ? (
        <View
          style={styles.stat}
          accessible
          accessibilityLabel={`${formatCompactNumber(watchers)} watchers`}
        >
          <Ionicons
            name="eye-outline"
            size={STAT_ICON_SIZE}
            color={iconColor}
          />
          <Text variant="caption" color="secondary">
            {formatCompactNumber(watchers)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
