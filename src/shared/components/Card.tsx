import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useCardStyles } from '@shared/hooks';

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Card({
  children,
  style,
  testID,
}: CardProps): React.JSX.Element {
  const styles = useCardStyles();
  return (
    <View style={[styles.container, style]} testID={testID}>
      {children}
    </View>
  );
}
