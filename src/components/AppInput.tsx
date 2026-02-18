import React, { useMemo } from 'react';
import { TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing, typography } from '@/theme';
import { useLocale } from '@/store/LocaleContext';

type AppInputProps = TextInputProps & {
  error?: boolean;
};

export function AppInput({ error, style, ...props }: AppInputProps) {
  const { theme } = useTheme();
  const { locale } = useLocale();
  const isRTL = locale === 'ar';

  const containerStyle = useMemo(() => ({
    borderWidth: 1,
    borderColor: error ? theme.colors.error : theme.colors.outlineVariant,
    borderRadius: radius.md,
    backgroundColor: theme.colors.surfaceContainerLowest,
    paddingHorizontal: spacing.md,
  }), [theme, error]);

  const inputStyle = useMemo(() => ({
    height: 48,
    color: theme.colors.onSurface,
    fontSize: typography.size.md,
    fontFamily: typography.fontFamily.regular,
  }), [theme]);

  return (
    <View style={containerStyle}>
      <TextInput
        {...props}
        placeholderTextColor={theme.colors.onSurfaceVariant}
        style={[
          inputStyle,
          { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
          style
        ]}
      />
    </View>
  );
}
