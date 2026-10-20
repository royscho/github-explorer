import React from 'react';
import { View } from 'react-native';

import { makeStyles } from '@shared/theme';

import { Screen } from './Screen';
import { Text } from './Text';

export interface ComingSoonScreenProps {
  title: string;
}

export function ComingSoonScreen({
  title,
}: ComingSoonScreenProps): React.JSX.Element {
  const styles = useStyles();
  return (
    <Screen>
      <View style={styles.container}>
        <Text variant="title">{title}</Text>
        <Text variant="body" color="secondary" style={styles.message}>
          Coming in a later milestone.
        </Text>
      </View>
    </Screen>
  );
}

const useStyles = makeStyles(theme => ({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  message: {
    marginTop: theme.spacing.sm,
  },
}));
