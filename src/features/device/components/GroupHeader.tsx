import React from 'react';
import { View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { Text } from '@shared/components';
import { hexToAlpha } from '@shared/utils';

import { useDeviceInfoSectionStyles } from '../hooks';

const BADGE_TINT_ALPHA = 0.15;
const ICON_SIZE = 16;

export interface GroupHeaderProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tint: string;
  title: string;
}

// A tinted icon badge + title, used by `DeviceInfoSection` to head each of its two cards (Device,
// Network) — styles come from the same hook as the rest of that section, since it's still that
// section's layout.
export function GroupHeader({
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
        <Ionicons name={icon} size={ICON_SIZE} color={tint} />
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
