import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { spacing } from '@/theme';

type DividerProps = {
  inset?: boolean;
  style?: ViewStyle;
};

export function Divider({ inset, style }: DividerProps) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        {
          height: 1,
          backgroundColor: theme.colors.outlineVariant,
          marginStart: inset ? spacing.md : 0,
        },
        style,
      ]}
    />
  );
}
