import React from 'react';
import { View } from 'react-native';
import { AppText } from './AppText';
import { useTheme } from '@/theme/ThemeContext';
import { spacing } from '@/theme';

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl }}>
      <AppText weight="bold" size="lg" color={theme.colors.onSurface}>{title}</AppText>
      {subtitle ? (
        <AppText size="sm" color={theme.colors.onSurfaceVariant} style={{ marginTop: spacing.sm }}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}
