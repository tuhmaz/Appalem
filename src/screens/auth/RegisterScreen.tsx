import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppButton, AppInput, AppText, Card, InlineNotice, Screen } from '@/components';
import { useAuth } from '@/store/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { spacing } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import { buildGoogleAuthErrorMessage, buildRegisterErrorMessage } from '@/utils/authErrorMessage';

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
  VerifyEmail: undefined;
};

export function RegisterScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { register, loginWithGoogle, loading } = useAuth();
  const { t, locale } = useTranslation();
  const { theme } = useTheme();
  const isRTL = locale === 'ar';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const googleTitle = t('signUpWithGoogle');
  const registerErrorTitle = t('registrationFailed');

  const redirectToHome = () => {
    const parentNavigation = navigation.getParent();
    if (!parentNavigation) return;

    parentNavigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Tabs' }],
      })
    );
  };

  const submit = async () => {
    setErrorMessage(null);
    try {
      await register(name, email, password, passwordConfirmation);
      redirectToHome();
    } catch (error) {
      setErrorMessage(buildRegisterErrorMessage(error, isRTL, t('errorMessage')));
    }
  };

  const submitGoogle = async () => {
    setErrorMessage(null);
    try {
      await loginWithGoogle();
      redirectToHome();
    } catch (error) {
      const message = buildGoogleAuthErrorMessage(error, isRTL, t('errorMessage'));
      if (message === 'google_auth_cancelled') {
        return;
      }
      setErrorMessage(message);
    }
  };

  return (
    <Screen scroll>
      <Card style={styles.card}>
        <AppText weight="bold" size="xl">{t('register')}</AppText>
        <AppText size="sm" color={theme.colors.onSurfaceVariant}>{t('registerSubtitle')}</AppText>

        {errorMessage ? (
          <InlineNotice
            variant="error"
            title={registerErrorTitle}
            message={errorMessage}
            isRTL={isRTL}
            onDismiss={() => setErrorMessage(null)}
          />
        ) : null}

        <AppInput
          placeholder={t('name')}
          value={name}
          onChangeText={(value) => {
            setName(value);
            if (errorMessage) setErrorMessage(null);
          }}
          style={styles.input}
        />
        <AppInput
          placeholder={t('email')}
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            if (errorMessage) setErrorMessage(null);
          }}
          style={styles.input}
        />
        <AppInput
          placeholder={t('password')}
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            if (errorMessage) setErrorMessage(null);
          }}
          secureTextEntry
          style={styles.input}
        />
        <AppInput
          placeholder={t('confirmPassword')}
          value={passwordConfirmation}
          onChangeText={(value) => {
            setPasswordConfirmation(value);
            if (errorMessage) setErrorMessage(null);
          }}
          secureTextEntry
          style={styles.input}
        />

        <AppButton title={t('registerAction')} onPress={submit} loading={loading} />
        <AppButton title={googleTitle} variant="secondary" onPress={submitGoogle} loading={loading} style={styles.googleButton} />

        <View style={[styles.footer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <AppText size="sm">{t('haveAccount')}</AppText>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <AppText size="sm" color={theme.colors.primary}>{t('loginAction')}</AppText>
          </TouchableOpacity>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  input: {
    marginTop: spacing.sm,
  },
  googleButton: {
    marginTop: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
});
