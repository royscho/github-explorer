import React from 'react';
import { View } from 'react-native';

import { makeStyles } from '@shared/theme';

export interface LoadingViewProps {
  count?: number;
  renderItem: (index: number) => React.ReactNode;
}

export function LoadingView({
  count = 6,
  renderItem,
}: LoadingViewProps): React.JSX.Element {
  const styles = useStyles();
  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading repositories"
    >
      {Array.from({ length: count }, (_, index) => (
        <React.Fragment key={index}>{renderItem(index)}</React.Fragment>
      ))}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  container: {
    flex: 1,
  },
}));
