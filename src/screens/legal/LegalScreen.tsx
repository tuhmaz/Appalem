import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppText, Card, Screen } from '@/components';
import { useTranslation } from '@/hooks/useTranslation';
import { radius, spacing } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import type { LegalType } from '@/services/front';

type RootStackParamList = {
  PolicyDetails: {
    policyType: LegalType;
    title: string;
  };
};

type LegalNavigation = NativeStackNavigationProp<RootStackParamList>;

export function LegalScreen() {
  const navigation = useNavigation<LegalNavigation>();
  const { t, locale } = useTranslation();
  const { theme } = useTheme();
  const isRTL = locale === 'ar';
  const oppositeTextStyle = isRTL ? styles.oppositeTextRTL : styles.oppositeTextLTR;

  const tabs: Array<{ key: string; label: string; policyType: LegalType }> = [
    { key: 'privacy', label: t('privacyPolicy'), policyType: 'privacy' },
    { key: 'terms', label: t('termsOfService'), policyType: 'terms' },
    { key: 'cookie', label: t('cookiePolicy'), policyType: 'cookie' },
    { key: 'disclaimer', label: t('disclaimer'), policyType: 'disclaimer' },
  ];

  return (
    <Screen style={styles.screen} contentStyle={styles.content}>
      <View style={styles.list}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => navigation.navigate('PolicyDetails', {
              policyType: tab.policyType,
              title: tab.label,
            })}
            activeOpacity={0.85}
          >
            <Card style={styles.card}>
              <AppText weight="bold" style={oppositeTextStyle}>{tab.label}</AppText>
              <AppText size="sm" color={theme.colors.onSurfaceVariant} style={[styles.hint, oppositeTextStyle]}>
                {t('openInApp')}
              </AppText>
            </Card>
          </TouchableOpacity>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: 0,
  },
  content: {
    padding: 0,
  },
  list: {
    padding: spacing.md,
    gap: spacing.md,
  },
  card: {
    borderRadius: radius.lg,
  },
  hint: {
    marginTop: spacing.xs,
  },
  oppositeTextRTL: {
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  oppositeTextLTR: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
