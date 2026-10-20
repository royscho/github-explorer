import React from 'react';
import { TextInput, View } from 'react-native';

import { useTheme } from '@shared/theme';

import { useNameFilterInputStyles } from '../hooks';

export interface NameFilterInputProps {
  value: string;
  onChangeText: (value: string) => void;
}

export function NameFilterInput({
  value,
  onChangeText,
}: NameFilterInputProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useNameFilterInputStyles();

  return (
    <View style={styles.container}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Filter by name"
        placeholderTextColor={theme.colors.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        style={styles.input}
        accessibilityLabel="Filter repositories by name"
      />
    </View>
  );
}
