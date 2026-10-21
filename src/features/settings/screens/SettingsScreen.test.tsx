import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { ThemeProvider } from '@shared/theme';

import { SettingsScreen } from './SettingsScreen';

jest.mock('@features/device', () => ({
  DeviceInfoSection: () => {
    const { Text: RNText } = jest.requireActual('react-native');
    return <RNText>Device Section Stub</RNText>;
  },
}));

describe('SettingsScreen', () => {
  it('renders the Device section', async () => {
    await render(
      <ThemeProvider>
        <SettingsScreen />
      </ThemeProvider>,
    );

    expect(await screen.findByText('Device Section Stub')).toBeOnTheScreen();
  });
});
