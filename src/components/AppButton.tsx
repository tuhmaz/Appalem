import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { useTheme } from '@/theme/ThemeContext';
import { spacing, radius } from '@/theme';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'text';
type ButtonSize = 'sm' | 'md' | 'lg';

type AppButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  fullWidth,
  style,
}: AppButtonProps) {
  const { theme } = useTheme();
  const isDisabled = disabled || loading;

  const variantStyle = useMemo(() => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: theme.colors.primary,
          borderColor: theme.colors.primary,
        };
      case 'secondary':
        return {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outline,
        };
      case 'tertiary':
        return {
          backgroundColor: theme.colors.primaryContainer,
          borderColor: theme.colors.primaryContainer,
        };
      case 'text':
        return {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
        };
    }
  }, [variant, theme]);

  const textColor = useMemo(() => {
    switch (variant) {
      case 'primary':
        return theme.colors.onPrimary;
      case 'secondary':
        return theme.colors.onSurface;
      case 'tertiary':
        return theme.colors.primary;
      case 'text':
        return theme.colors.primary;
    }
  }, [variant, theme]);

  const sizeStyle = useMemo(() => {
    switch (size) {
      case 'sm':
        return { paddingVertical: spacing.xs, paddingHorizontal: spacing.md, minHeight: 36 };
      case 'md':
        return { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, minHeight: 44 };
      case 'lg':
        return { paddingVertical: spacing.md, paddingHorizontal: spacing.xl, minHeight: 52 };
    }
  }, [size]);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      activeOpacity={0.8}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        sizeStyle,
        variantStyle,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <AppText
          weight="semibold"
          size={size === 'sm' ? 'sm' : 'md'}
          color={textColor}
        >
          {title}
        </AppText>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
});
