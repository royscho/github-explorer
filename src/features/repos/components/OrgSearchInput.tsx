import React from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import { Text } from '@shared/components';
import { useTheme } from '@shared/theme';

import { useOrgSearchInputStyles } from '../hooks';

export interface OrgSearchInputProps {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
}

export function OrgSearchInput({
  value,
  onChangeText,
  onSubmit,
}: OrgSearchInputProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useOrgSearchInputStyles();

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          placeholder="Search a GitHub organization"
          placeholderTextColor={theme.colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={styles.input}
          accessibilityLabel="Organization name"
        />
        {value.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear organization name"
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Search"
        onPress={onSubmit}
        style={styles.button}
        hitSlop={8}
      >
        <Text variant="body" style={styles.buttonLabel}>
          Search
        </Text>
      </Pressable>
    </View>
  );
}
