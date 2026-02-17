import React, { useMemo } from 'react';
import { View, ViewProps, ViewStyle, Platform } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme';

type CardVariant = 'elevated' | 'filled' | 'outlined';

type CardProps = ViewProps & {
  variant?: CardVariant;
  glow?: boolean;
};

export function Card({ variant = 'elevated', glow, style, ...props }: CardProps) {
  const { theme, isDark } = useTheme();

  const cardStyle = useMemo((): ViewStyle => {
    const base: ViewStyle = {
      borderRadius: radius.xl,
      padding: spacing.md,
      backgroundColor: theme.colors.surface,
    };

    // Dark mode: floating card with subtle border
    if (isDark) {
      const darkBase: ViewStyle = {
        ...base,
        borderWidth: 1,
        borderColor: theme.colors.outlineVariant,
      };

      switch (variant) {
        case 'elevated':
          return {
            ...darkBase,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOpacity: 0.25,
                shadowRadius: 22,
                shadowOffset: { width: 0, height: 10 },
              },
              android: {
                elevation: 10,
              },
            }),
            ...(glow ? {
              borderColor: (theme.colors as any).accentGlow || 'rgba(99,230,226,0.15)',
            } : {}),
          };
        case 'filled':
          return {
            ...darkBase,
            backgroundColor: theme.colors.surfaceContainerLow,
          };
        case 'outlined':
          return darkBase;
      }
    }

    // Light mode: keep existing behavior
    switch (variant) {
      case 'elevated':
        return {
          ...base,
          ...Platform.select({
            ios: {
              shadowColor: theme.colors.primary,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
            },
            android: {
              elevation: 3,
            },
          }),
        };
      case 'filled':
        return {
          ...base,
          backgroundColor: theme.colors.surfaceContainerLow,
        };
      case 'outlined':
        return {
          ...base,
          borderWidth: 1,
          borderColor: theme.colors.outlineVariant,
        };
    }
  }, [variant, glow, theme, isDark]);

  return <View {...props} style={[cardStyle, style]} />;
}
