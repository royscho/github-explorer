import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react-native';

import { ThemeProvider, lightTheme } from '@shared/theme';
import { logger } from '@shared/logger';

import { getDeviceInfo, isLowPowerMode } from '../native';
import { useNetworkStore } from '../store';
import { DeviceInfoSection } from './DeviceInfoSection';

jest.mock('../native');

const mockGetDeviceInfo = getDeviceInfo as jest.MockedFunction<
  typeof getDeviceInfo
>;
const mockIsLowPowerMode = isLowPowerMode as jest.MockedFunction<
  typeof isLowPowerMode
>;

function renderSection() {
  return render(
    <ThemeProvider>
      <DeviceInfoSection />
    </ThemeProvider>,
  );
}

describe('DeviceInfoSection', () => {
  beforeEach(() => {
    useNetworkStore.setState({
      isOnline: true,
      connectionType: 'wifi',
      isExpensive: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows a loading state before device info resolves', async () => {
    mockGetDeviceInfo.mockReturnValue(new Promise(() => {}));
    mockIsLowPowerMode.mockReturnValue(new Promise(() => {}));

    await renderSection();

    expect(screen.getByText('Loading…')).toBeOnTheScreen();
  });

  it('shows an error view and logs when the native call fails', async () => {
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    const error = new Error('boom');
    mockGetDeviceInfo.mockRejectedValue(error);
    mockIsLowPowerMode.mockResolvedValue(false);

    await renderSection();

    expect(
      await screen.findByText("Couldn't read device info"),
    ).toBeOnTheScreen();
    expect(errorSpy).toHaveBeenCalledWith(error, { feature: 'device' });
    errorSpy.mockRestore();
  });

  it('shows device info, low-power mode and live network state once loaded', async () => {
    mockGetDeviceInfo.mockResolvedValue({
      model: 'iPhone 17',
      osVersion: '27.0',
      appVersion: '1.0',
      buildNumber: '42',
    });
    mockIsLowPowerMode.mockResolvedValue(true);
    useNetworkStore.setState({
      isOnline: false,
      connectionType: 'cellular',
      isExpensive: true,
    });

    await renderSection();

    await waitFor(() => {
      expect(screen.getByText('iPhone 17')).toBeOnTheScreen();
    });
    expect(screen.getByText('27.0')).toBeOnTheScreen();
    expect(screen.getByText('1.0')).toBeOnTheScreen();
    expect(screen.getByText('42')).toBeOnTheScreen();
    expect(screen.getByText('On')).toBeOnTheScreen();
    expect(screen.getByText('Offline')).toBeOnTheScreen();
    expect(screen.getByText('Cellular')).toBeOnTheScreen();
    expect(screen.getByText('Yes')).toBeOnTheScreen();
  });

  it('groups device info and network state into separate cards', async () => {
    mockGetDeviceInfo.mockResolvedValue({
      model: 'iPhone 17',
      osVersion: '27.0',
      appVersion: '1.0',
      buildNumber: '42',
    });
    mockIsLowPowerMode.mockResolvedValue(false);
    useNetworkStore.setState({
      isOnline: true,
      connectionType: 'wifi',
      isExpensive: false,
    });

    await renderSection();

    const deviceCard = await screen.findByTestId('device-info-group');
    const networkCard = screen.getByTestId('network-info-group');

    expect(
      within(deviceCard).getByRole('header', { name: 'Device' }),
    ).toBeOnTheScreen();
    expect(
      within(networkCard).getByRole('header', { name: 'Network' }),
    ).toBeOnTheScreen();

    await waitFor(() => {
      expect(
        within(deviceCard).getByLabelText('Model: iPhone 17'),
      ).toBeOnTheScreen();
    });
    expect(
      within(deviceCard).getByLabelText('Low power mode: Off'),
    ).toBeOnTheScreen();
    expect(within(networkCard).queryByText('Model')).toBeNull();

    expect(
      within(networkCard).getByLabelText('Status: Online'),
    ).toBeOnTheScreen();
    expect(
      within(networkCard).getByLabelText('Connection: Wi-Fi'),
    ).toBeOnTheScreen();
    expect(within(deviceCard).queryByText('Status')).toBeNull();
  });

  it('colors the status pill green when online and neutral when offline', async () => {
    mockGetDeviceInfo.mockResolvedValue({
      model: 'iPhone 17',
      osVersion: '27.0',
      appVersion: '1.0',
      buildNumber: '42',
    });
    mockIsLowPowerMode.mockResolvedValue(false);

    await renderSection();

    expect(await screen.findByTestId('status-dot-Status')).toHaveStyle({
      backgroundColor: lightTheme.colors.success,
    });
    expect(screen.getByTestId('status-dot-Low power mode')).toHaveStyle({
      backgroundColor: lightTheme.colors.textSecondary,
    });

    useNetworkStore.setState({
      isOnline: false,
      connectionType: 'wifi',
      isExpensive: false,
    });

    expect(await screen.findByTestId('status-dot-Status')).toHaveStyle({
      backgroundColor: lightTheme.colors.textSecondary,
    });
  });
});
