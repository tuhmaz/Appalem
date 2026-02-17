import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { typography } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import { useLocale } from '@/store/LocaleContext';

type AppTextProps = TextProps & {
  weight?: keyof typeof typography.fontFamily;
  size?: keyof typeof typography.size;
  color?: string;
};

export function AppText({
  weight = 'regular',
  size = 'md',
  color,
  style,
  ...props
}: AppTextProps) {
  const { theme } = useTheme();
  const { locale } = useLocale();
  const isRTL = locale === 'ar';
  const resolvedColor = color ?? theme.colors.onSurface;

  return (
    <Text
      {...props}
      style={[
        {
          fontFamily: typography.fontFamily[weight],
          fontSize: typography.size[size],
          color: resolvedColor,
          textAlign: isRTL ? 'right' : 'left',
          writingDirection: isRTL ? 'rtl' : 'ltr'
        } as TextStyle,
        style
      ]}
    />
  );
}
