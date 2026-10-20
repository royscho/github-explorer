import React from 'react';
import * as ReactNative from 'react-native';
import { renderHook } from '@testing-library/react-native';

import { makeStyles } from './makeStyles';
import { ThemeProvider } from './ThemeProvider';

function wrapper({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('makeStyles', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reuses the same StyleSheet across re-renders when the theme is unchanged', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light');
    const useStyles = makeStyles(theme => ({
      root: { backgroundColor: theme.colors.background },
    }));

    const { result, rerender } = await renderHook(() => useStyles(), {
      wrapper,
    });
    const first = result.current;
    await rerender({});
    expect(result.current).toBe(first);
  });

  it('builds a new StyleSheet when the theme changes', async () => {
    const colorScheme = jest
      .spyOn(ReactNative, 'useColorScheme')
      .mockReturnValue('light');
    const useStyles = makeStyles(theme => ({
      root: { backgroundColor: theme.colors.background },
    }));

    const { result, rerender } = await renderHook(() => useStyles(), {
      wrapper,
    });
    const light = result.current;

    colorScheme.mockReturnValue('dark');
    await rerender({});
    expect(result.current).not.toBe(light);
  });
});
