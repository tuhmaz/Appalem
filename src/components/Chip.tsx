import React, { useMemo } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme';

type ChipProps = {
  label: string;
  onPress?: () => void;
  selected?: boolean;
};

export function Chip({ label, onPress, selected }: ChipProps) {
  const { theme } = useTheme();

  const chipStyle = useMemo(() => ({
    backgroundColor: selected ? theme.colors.primaryContainer : theme.colors.surface,
    borderColor: selected ? theme.colors.primary : theme.colors.outline,
  }), [theme, selected]);

  const textColor = selected ? theme.colors.primary : theme.colors.onSurface;

  return (
    <TouchableOpacity
      style={[styles.chip, chipStyle]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <AppText size="sm" color={textColor}>
        {label}
      </AppText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
  },
});
