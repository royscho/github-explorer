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
            // The icon is 18pt, so slop supplies the other 26 to reach DESIGN §14's 44pt minimum.
            // Asymmetric on purpose: hit slop is clipped at the parent's bounds ("the touch area
            // never extends past the parent view bounds" — RN's own `hitSlop` docs), and
            // `clearButton` sits `right: spacing.sm` (8) from the wrapper's edge, so anything over
            // 8 on the right is silently dropped. 18 + 18 + 8 = 44, all of it inside the wrapper.
            // Vertically it already clears 44 — the button stretches the input's full height.
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
    </View>
  );
}
