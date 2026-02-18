import React, { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { AppButton, AppText, Card, Screen } from '@/components';
import { authService } from '@/services/auth';
import { useTranslation } from '@/hooks/useTranslation';
import { spacing } from '@/theme';

export function VerifyEmailScreen() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const resend = async () => {
    setLoading(true);
    try {
      await authService.resendVerification();
      Alert.alert(t('sentTitle'), t('verificationSentMessage'));
    } catch {
      Alert.alert(t('errorTitle'), t('verificationFailedMessage'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <Card style={styles.card}>
        <AppText weight="bold" size="xl">{t('verifyEmailTitle')}</AppText>
        <AppText size="sm">{t('verifyEmailMessage')}</AppText>
        <AppButton title={t('resendEmail')} onPress={resend} loading={loading} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md
  }
});
