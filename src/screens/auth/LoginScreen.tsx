import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppButton, AppInput, AppText, Card, InlineNotice, Screen } from '@/components';
import { useAuth } from '@/store/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { spacing } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import { buildGoogleAuthErrorMessage, buildLoginErrorMessage } from '@/utils/authErrorMessage';

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
  VerifyEmail: undefined;
};

export function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { login, loginWithGoogle, loading } = useAuth();
  const { t, locale } = useTranslation();
  const { theme } = useTheme();
  const isRTL = locale === 'ar';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const googleTitle = t('continueWithGoogle');
  const loginErrorTitle = t('signInFailed');

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
      await login(email, password);
      redirectToHome();
    } catch (error) {
      setErrorMessage(buildLoginErrorMessage(error, isRTL, t('errorMessage')));
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
        <AppText weight="bold" size="xl">{t('login')}</AppText>
        <AppText size="sm" color={theme.colors.onSurfaceVariant}>{t('welcomeBack')}</AppText>

        {errorMessage ? (
          <InlineNotice
            variant="error"
            title={loginErrorTitle}
            message={errorMessage}
            isRTL={isRTL}
            onDismiss={() => setErrorMessage(null)}
          />
        ) : null}

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

        <AppButton title={t('loginAction')} onPress={submit} loading={loading} />
        <AppButton title={googleTitle} variant="secondary" onPress={submitGoogle} loading={loading} style={styles.googleButton} />

        <TouchableOpacity
          onPress={() => navigation.navigate('ForgotPassword')}
          style={[styles.link, { alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}
        >
          <AppText size="sm" color={theme.colors.primary}>{t('forgotPassword')}</AppText>
        </TouchableOpacity>

        <View style={[styles.footer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <AppText size="sm">{t('noAccount')}</AppText>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <AppText size="sm" color={theme.colors.primary}>{t('registerAction')}</AppText>
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
  link: {
    alignSelf: 'flex-start',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
});
