import React from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useTextStyles } from '@shared/hooks';

export type TextVariant = 'title' | 'body' | 'caption';

export type TextColor = 'primary' | 'secondary' | 'danger';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: TextColor;
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
    <RNText style={[styles[variant], styles[color], style]} {...rest}>
      {children}
    </RNText>
  );
}
