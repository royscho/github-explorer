import React from 'react';
import * as ReactNative from 'react-native';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { darkTheme, lightTheme, ThemeProvider } from '@shared/theme';

import { AppNavigationContainer } from './AppNavigationContainer';

const capturedThemes: unknown[] = [];

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    NavigationContainer: ({
      theme,
      children,
    }: {
      theme: unknown;
      children: React.ReactNode;
    }) => {
      capturedThemes.push(theme);
      return children;
    },
  };
});

describe('AppNavigationContainer', () => {
  beforeEach(() => {
    capturedThemes.length = 0;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders children', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light');
    await render(
      <ThemeProvider>
        <AppNavigationContainer>
          <Text>hello</Text>
        </AppNavigationContainer>
      </ThemeProvider>,
    );
    expect(await screen.findByText('hello')).toBeOnTheScreen();
  });

  it('maps the light app theme onto a light navigation theme', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light');
    await render(
      <ThemeProvider>
        <AppNavigationContainer>
          <Text>hello</Text>
        </AppNavigationContainer>
      </ThemeProvider>,
    );
    expect(capturedThemes[0]).toMatchObject({
      dark: false,
      colors: expect.objectContaining({
        primary: lightTheme.colors.accent,
        background: lightTheme.colors.background,
      }),
    });
  });

  it('maps the dark app theme onto a dark navigation theme', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');
    await render(
      <ThemeProvider>
        <AppNavigationContainer>
          <Text>hello</Text>
        </AppNavigationContainer>
      </ThemeProvider>,
    );
    expect(capturedThemes[0]).toMatchObject({
      dark: true,
      colors: expect.objectContaining({
        primary: darkTheme.colors.accent,
        background: darkTheme.colors.background,
      }),
    });
  });
});
