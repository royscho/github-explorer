import React from 'react';
import { View } from 'react-native';

import { ErrorView, Text } from '@shared/components';

import {
  useDeviceInfo,
  useDeviceInfoSectionStyles,
  useNetworkStatus,
} from '../hooks';
import type { ConnectionType } from '../native';

const connectionTypeLabels: Record<ConnectionType, string> = {
  wifi: 'Wi-Fi',
  cellular: 'Cellular',
  ethernet: 'Ethernet',
  none: 'None',
  unknown: 'Unknown',
};

interface InfoRowProps {
  label: string;
  value: string;
}

function InfoRow({ label, value }: InfoRowProps): React.JSX.Element {
  const styles = useDeviceInfoSectionStyles();
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <Text variant="body" color="secondary">
        {label}
      </Text>
      <Text variant="body">{value}</Text>
    </View>
  );
}

// §10.3: a visible demo of the `DeviceNetwork` native module for reviewers — device info + live
// network state + low-power mode, all read through the module.
export function DeviceInfoSection(): React.JSX.Element {
  const styles = useDeviceInfoSectionStyles();
  const { data, isLoading, error } = useDeviceInfo();
  const { isOnline, connectionType, isExpensive } = useNetworkStatus();

  return (
    <View style={styles.container}>
      <Text variant="title" style={styles.title}>
        Device
      </Text>
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
          />
        </>
      ) : null}
      <InfoRow label="Network" value={isOnline ? 'Online' : 'Offline'} />
      <InfoRow
        label="Connection"
        value={connectionTypeLabels[connectionType]}
      />
      <InfoRow label="Metered" value={isExpensive ? 'Yes' : 'No'} />
    </View>
  );
}
