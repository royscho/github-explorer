import React from 'react';
import { ScrollView } from 'react-native';

import { Screen } from '@shared/components';
import { DeviceInfoSection } from '@features/device';

export function SettingsScreen(): React.JSX.Element {
  return (
    <Screen>
      <ScrollView>
        <DeviceInfoSection />
      </ScrollView>
    </Screen>
  );
}
