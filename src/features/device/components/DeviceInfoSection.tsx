import React from 'react';
import { View } from 'react-native';

import { Card, ErrorView, Text } from '@shared/components';
import { useTheme } from '@shared/theme';

import {
  useDeviceInfo,
  useDeviceInfoSectionStyles,
  useNetworkStatus,
} from '../hooks';
import type { ConnectionType } from '../native';

import { GroupHeader } from './GroupHeader';
import { InfoRow } from './InfoRow';

const connectionTypeLabels: Record<ConnectionType, string> = {
  wifi: 'Wi-Fi',
  cellular: 'Cellular',
  ethernet: 'Ethernet',
  none: 'None',
  unknown: 'Unknown',
};

// §10.3: a visible demo of the `DeviceNetwork` native module for reviewers — device info + live
// network state + low-power mode, all read through the module.
export function DeviceInfoSection(): React.JSX.Element {
  const styles = useDeviceInfoSectionStyles();
  const theme = useTheme();
  const { data, isLoading, error } = useDeviceInfo();
  const { isOnline, connectionType, isExpensive } = useNetworkStatus();

  return (
    <View style={styles.container}>
      <Card style={styles.group} testID="device-info-group">
        <GroupHeader
          icon="phone-portrait-outline"
          tint={theme.colors.accent}
          title="Device"
        />
        {isLoading ? (
          <Text
            variant="body"
            color="secondary"
            accessibilityRole="progressbar"
            accessibilityLabel="Loading device info"
          >
            Loading…
          </Text>
        ) : null}
        {error ? <ErrorView message="Couldn't read device info" /> : null}
        {data ? (
          <>
            <InfoRow label="Model" value={data.info.model} />
            <InfoRow label="OS version" value={data.info.osVersion} />
            <InfoRow label="App version" value={data.info.appVersion} />
            <InfoRow label="Build" value={data.info.buildNumber} />
            <InfoRow
              label="Low power mode"
              value={data.isLowPowerMode ? 'On' : 'Off'}
              tone="neutral"
            />
          </>
        ) : null}
      </Card>
      <Card style={styles.group} testID="network-info-group">
        <GroupHeader
          icon="wifi-outline"
          tint={theme.colors.success}
          title="Network"
        />
        <InfoRow
          label="Status"
          value={isOnline ? 'Online' : 'Offline'}
          tone={isOnline ? 'success' : 'neutral'}
        />
        <InfoRow
          label="Connection"
          value={connectionTypeLabels[connectionType]}
        />
        <InfoRow label="Metered" value={isExpensive ? 'Yes' : 'No'} />
      </Card>
    </View>
  );
}
