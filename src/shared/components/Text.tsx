import React from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { makeStyles } from '@shared/theme';

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
  const styles = useStyles();
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

const useStyles = makeStyles(theme => ({
  title: {
    fontSize: theme.typography.title.fontSize,
    fontWeight: theme.typography.title.fontWeight,
  },
  body: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: theme.typography.body.fontWeight,
  },
  caption: {
    fontSize: theme.typography.caption.fontSize,
    fontWeight: theme.typography.caption.fontWeight,
  },
  primary: {
    color: theme.colors.text,
  },
  secondary: {
    color: theme.colors.textSecondary,
  },
}));
