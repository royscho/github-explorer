import {
  StyleSheet,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useTheme } from './ThemeProvider';
import type { Theme } from './tokens';

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

export function makeStyles<T extends NamedStyles<T> | NamedStyles<unknown>>(
  createStyles: (theme: Theme) => T,
): () => T {
  let cachedTheme: Theme | null = null;
  let cachedStyles: T | null = null;

  return function useStyles(): T {
    const theme = useTheme();
    if (cachedStyles === null || cachedTheme !== theme) {
      cachedTheme = theme;
      cachedStyles = StyleSheet.create(createStyles(theme));
    }
    return cachedStyles;
  };
}
