import React from 'react';
import { View } from 'react-native';

import { makeStyles } from '@shared/theme';

import { Text } from './Text';

export interface EmptyViewProps {
  message: string;
}

export function EmptyView({ message }: EmptyViewProps): React.JSX.Element {
  const styles = useStyles();
  return (
    <View style={styles.container}>
      <Text variant="body" color="secondary" style={styles.message}>
        {message}
      </Text>
    </View>
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
    textAlign: 'center',
  },
}));
