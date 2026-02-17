import React, { Component } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { t, getLocale } from '@/i18n/i18n';

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (__DEV__) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  private handleRestart = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isRTL = getLocale() === 'ar';
    const writingDirection = isRTL ? ('rtl' as const) : ('ltr' as const);

    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={t('unexpectedError')}
            style={styles.iconWrap}
          >
            <Ionicons name="alert-circle-outline" size={48} color="#F87171" />
          </View>
          <Text style={[styles.title, { writingDirection }]}>
            {t('unexpectedError')}
          </Text>
          <Text style={[styles.subtitle, { writingDirection }]}>
            {t('unexpectedErrorMessage')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('retry')}
            style={[styles.button, isRTL && styles.buttonRTL]}
            onPress={this.handleRestart}
          >
            <Ionicons name="refresh-outline" size={18} color="#0B2338" />
            <Text style={styles.buttonText}>{t('retry')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#091725',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: 'rgba(16,41,61,0.9)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F4FAFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(226,240,255,0.7)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#63E6E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonRTL: {
    flexDirection: 'row-reverse',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0B2338',
  },
});
