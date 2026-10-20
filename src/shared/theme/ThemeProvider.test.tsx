import React from 'react';
import * as ReactNative from 'react-native';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { ThemeProvider, useTheme } from './ThemeProvider';

function ThemeProbe(): React.JSX.Element {
  const theme = useTheme();
  return <Text>{theme.mode}</Text>;
}

describe('ThemeProvider / useTheme', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('throws when used outside a provider', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(render(<ThemeProbe />)).rejects.toThrow(
      'useTheme must be used within a ThemeProvider',
    );
  });

  it('provides the light theme for a light color scheme', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light');
    await render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    expect(await screen.findByText('light')).toBeOnTheScreen();
  });

  it('provides the dark theme for a dark color scheme', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');
    await render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    expect(await screen.findByText('dark')).toBeOnTheScreen();
  });
});
