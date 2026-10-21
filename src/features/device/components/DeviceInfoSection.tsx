import React from 'react';
import { View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { Card, ErrorView, Text } from '@shared/components';
import { useTheme } from '@shared/theme';
import { hexToAlpha } from '@shared/utils';

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

const BADGE_TINT_ALPHA = 0.15;
const PILL_TINT_ALPHA = 0.15;
const GROUP_ICON_SIZE = 16;

interface GroupHeaderProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tint: string;
  title: string;
}

function GroupHeader({
  icon,
  tint,
  title,
}: GroupHeaderProps): React.JSX.Element {
  const styles = useDeviceInfoSectionStyles();
  return (
    <View style={styles.groupHeader}>
      <View
        style={[
          styles.groupIconBadge,
          { backgroundColor: hexToAlpha(tint, BADGE_TINT_ALPHA) },
        ]}
      >
        <Ionicons name={icon} size={GROUP_ICON_SIZE} color={tint} />
      </View>
      <Text
        variant="title"
        style={styles.groupTitle}
        accessibilityRole="header"
      >
        {title}
      </Text>
    </View>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
  // Renders `value` as a small tinted pill with a leading dot instead of plain text — for
  // status-like fields (DESIGN mockup: "Status", "Low power mode"), not plain facts like Model.
  tone?: 'success' | 'neutral';
}

function InfoRow({ label, value, tone }: InfoRowProps): React.JSX.Element {
  const styles = useDeviceInfoSectionStyles();
  const theme = useTheme();
  const toneColor =
    tone === 'success' ? theme.colors.success : theme.colors.textSecondary;

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <Text variant="body" color="secondary">
        {label}
      </Text>
      {tone ? (
        <View
          style={[
            styles.valuePill,
            { backgroundColor: hexToAlpha(toneColor, PILL_TINT_ALPHA) },
          ]}
        >
          <View
            testID={`status-dot-${label}`}
            style={[styles.valueDot, { backgroundColor: toneColor }]}
          />
          <Text variant="caption">{value}</Text>
        </View>
      ) : (
        <Text variant="body">{value}</Text>
      )}
    </View>
  );
}

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
