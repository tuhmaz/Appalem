import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { useTheme } from '@/theme/ThemeContext';
import { spacing } from '@/theme';

export function HeroHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <AppText weight="bold" size="xl" color={theme.colors.onBackground}>
        {title}
      </AppText>
      {subtitle ? (
        <AppText
          size="md"
          color={theme.colors.onSurfaceVariant}
          style={styles.subtitle}
        >
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.lg,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
});
