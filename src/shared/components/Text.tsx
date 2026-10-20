import React from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useTextStyles } from '@shared/hooks';

export type TextVariant = 'title' | 'body' | 'caption';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: 'primary' | 'secondary';
  children: React.ReactNode;
}

export function Text({
  variant = 'body',
  color = 'primary',
  style,
  children,
  ...rest
}: TextProps): React.JSX.Element {
  const styles = useTextStyles();
  return (
    <RNText
      style={[
        styles[variant],
        color === 'secondary' ? styles.secondary : styles.primary,
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
}
