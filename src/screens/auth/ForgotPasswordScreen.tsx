import React, { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { AppButton, AppInput, AppText, Card, Screen } from '@/components';
import { authService } from '@/services/auth';
import { useTranslation } from '@/hooks/useTranslation';
import { spacing } from '@/theme';

export function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      Alert.alert(t('sentTitle'), t('resetLinkSent'));
    } catch {
      Alert.alert(t('errorTitle'), t('resetLinkError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <Card style={styles.card}>
        <AppText weight="bold" size="xl">{t('forgotPasswordTitle')}</AppText>
        <AppText size="sm">{t('forgotPasswordSubtitle')}</AppText>
        <AppInput placeholder={t('email')} value={email} onChangeText={setEmail} style={styles.input} />
        <AppButton title={t('send')} onPress={submit} loading={loading} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md
  },
  input: {
    marginTop: spacing.sm
  }
});
