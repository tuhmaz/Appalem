import React, { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { AppButton, AppInput, AppText, Card, Screen } from '@/components';
import { authService } from '@/services/auth';
import { useTranslation } from '@/hooks/useTranslation';
import { spacing } from '@/theme';

export function ResetPasswordScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await authService.resetPassword({
        email,
        token,
        password,
        password_confirmation: passwordConfirmation
      });
      Alert.alert(t('updatedTitle'), t('passwordUpdatedMessage'));
    } catch {
      Alert.alert(t('errorTitle'), t('passwordUpdateError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <Card style={styles.card}>
        <AppText weight="bold" size="xl">{t('resetPasswordTitle')}</AppText>
        <AppInput placeholder={t('email')} value={email} onChangeText={setEmail} style={styles.input} />
        <AppInput placeholder={t('resetCode')} value={token} onChangeText={setToken} style={styles.input} />
        <AppInput placeholder={t('newPassword')} value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
        <AppInput placeholder={t('confirmPassword')} value={passwordConfirmation} onChangeText={setPasswordConfirmation} secureTextEntry style={styles.input} />
        <AppButton title={t('resetPassword')} onPress={submit} loading={loading} />
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
