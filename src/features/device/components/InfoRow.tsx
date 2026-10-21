import React from 'react';
import { View } from 'react-native';

import { Text } from '@shared/components';
import { useTheme } from '@shared/theme';
import { hexToAlpha } from '@shared/utils';

import { useDeviceInfoSectionStyles } from '../hooks';

const PILL_TINT_ALPHA = 0.15;

export interface InfoRowProps {
  label: string;
  value: string;
  // Renders `value` as a small tinted pill with a leading dot instead of plain text — for
  // status-like fields (DESIGN mockup: "Status", "Low power mode"), not plain facts like Model.
  tone?: 'success' | 'neutral';
}

// A label/value row used by `DeviceInfoSection`'s two cards — plain text normally, or a tinted
// status pill when `tone` is given.
export function InfoRow({
  label,
  value,
  tone,
}: InfoRowProps): React.JSX.Element {
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
