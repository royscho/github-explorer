import React from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Text } from '@shared/components';
import { makeStyles, useTheme } from '@shared/theme';

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
  const styles = useStyles();

  return (
    <View style={styles.container}>
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

const useStyles = makeStyles(theme => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
  },
  button: {
    minHeight: 44,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    color: theme.colors.textOnAccent,
    fontWeight: '600',
  },
}));
