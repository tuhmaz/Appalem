import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { useTheme } from '@/theme/ThemeContext';
import { spacing } from '@/theme';
import { useLocale } from '@/store/LocaleContext';

export function SectionHeader({
  title,
  action,
  titleColor,
  invertDirection = false,
}: {
  title: string;
  action?: React.ReactNode;
  titleColor?: string;
  invertDirection?: boolean;
}) {
  const { theme } = useTheme();
  const { locale } = useLocale();
  const isRTL = locale === 'ar';
  const shouldUseRTLDirection = invertDirection ? !isRTL : isRTL;

  return (
    <View style={[styles.container, shouldUseRTLDirection && styles.containerRTL]}>
      <AppText weight="bold" size="lg" color={titleColor ?? theme.colors.onSurface}>
        {title}
      </AppText>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  containerRTL: {
    flexDirection: 'row-reverse',
  },
});
