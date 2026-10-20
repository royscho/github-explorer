import React from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

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
      <View>
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
        {value.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear filter"
            onPress={() => onChangeText('')}
            style={styles.clearButton}
            hitSlop={8}
          >
            <Ionicons
              name="close-circle"
              size={18}
              color={theme.colors.textSecondary}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}
