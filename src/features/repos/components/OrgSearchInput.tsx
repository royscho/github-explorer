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
            // See `NameFilterInput`'s clear button for the full reasoning: 18pt icon + 18 left + 8
            // right = DESIGN §14's 44pt, asymmetric because slop past the parent's bounds is
            // clipped and this button sits 8pt from that edge.
            hitSlop={{ top: 8, bottom: 8, left: 18, right: 8 }}
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
