import React, { useMemo } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { ENV } from '@/config/env';
import { radius, spacing } from '@/theme';
import { AppText } from './AppText';

type RecaptchaModalProps = {
  visible: boolean;
  siteKey: string;
  locale: string;
  title: string;
  description: string;
  closeLabel: string;
  onClose: () => void;
  onToken: (token: string) => void;
  onExpired: () => void;
  onError: () => void;
};

type RecaptchaMessage =
  | { type: 'token'; token: string }
  | { type: 'expired' }
  | { type: 'error' }
  | { type: 'loaded' };

function parseRecaptchaMessage(raw: string): RecaptchaMessage | null {
  if (!raw) return null;

  try {
    const data = JSON.parse(raw) as { type?: string; token?: string };
    if (data.type === 'token' && typeof data.token === 'string') {
      return { type: 'token', token: data.token };
    }
    if (data.type === 'expired') {
      return { type: 'expired' };
    }
    if (data.type === 'error') {
      return { type: 'error' };
    }
    if (data.type === 'loaded') {
      return { type: 'loaded' };
    }
  } catch {
    return null;
  }

  return null;
}

function buildRecaptchaHtml(siteKey: string, locale: string): string {
  const recaptchaLocale = locale === 'ar' ? 'ar' : 'en';
  const siteKeyValue = JSON.stringify(siteKey);

  return `<!doctype html>
<html lang="${recaptchaLocale}" dir="${recaptchaLocale === 'ar' ? 'rtl' : 'ltr'}">
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
    />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        height: 100%;
        background: #ffffff;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      }
      .page {
        min-height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px 16px;
        box-sizing: border-box;
      }
      #recaptcha-root {
        min-height: 78px;
      }
      .hint {
        color: #334155;
        font-size: 14px;
        text-align: center;
        margin-bottom: 12px;
      }
    </style>
    <script>
      function postMessageSafe(payload) {
        if (
          window.ReactNativeWebView &&
          typeof window.ReactNativeWebView.postMessage === "function"
        ) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      }

      function onToken(token) {
        postMessageSafe({ type: "token", token: token });
      }

      function onExpired() {
        postMessageSafe({ type: "expired" });
      }

      function onError() {
        postMessageSafe({ type: "error" });
      }

      function renderRecaptcha() {
        if (!window.grecaptcha || typeof window.grecaptcha.render !== "function") {
          return;
        }

        try {
          const root = document.getElementById("recaptcha-root");
          if (!root) return;

          window.grecaptcha.render(root, {
            sitekey: ${siteKeyValue},
            callback: onToken,
            "expired-callback": onExpired,
            "error-callback": onError
          });

          postMessageSafe({ type: "loaded" });
        } catch (_error) {
          onError();
        }
      }

      function onloadCallback() {
        if (window.grecaptcha && typeof window.grecaptcha.ready === "function") {
          window.grecaptcha.ready(renderRecaptcha);
          return;
        }

        renderRecaptcha();
      }
    </script>
    <script
      src="https://www.google.com/recaptcha/api.js?onload=onloadCallback&render=explicit&hl=${encodeURIComponent(recaptchaLocale)}"
      async
      defer
    ></script>
  </head>
  <body>
    <div class="page">
      <div>
        <div class="hint">${recaptchaLocale === 'ar' ? 'يرجى إكمال التحقق الأمني للمتابعة.' : 'Please complete the security check to continue.'}</div>
        <div id="recaptcha-root"></div>
      </div>
    </div>
  </body>
</html>`;
}

export function RecaptchaModal({
  visible,
  siteKey,
  locale,
  title,
  description,
  closeLabel,
  onClose,
  onToken,
  onExpired,
  onError,
}: RecaptchaModalProps) {
  const html = useMemo(() => buildRecaptchaHtml(siteKey, locale), [siteKey, locale]);

  const handleMessage = (event: WebViewMessageEvent) => {
    const payload = parseRecaptchaMessage(event.nativeEvent.data);
    if (!payload) return;

    if (payload.type === 'token') {
      const token = payload.token.trim();
      if (!token) return;
      onToken(token);
      return;
    }

    if (payload.type === 'expired') {
      onExpired();
      return;
    }

    if (payload.type === 'error') {
      onError();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <AppText weight="bold" size="md" color="#0F172A">
                {title}
              </AppText>
              <AppText size="sm" color="#334155">
                {description}
              </AppText>
            </View>

            <Pressable onPress={onClose} style={styles.closeButton}>
              <AppText weight="semibold" size="sm" color="#0F172A">
                {closeLabel}
              </AppText>
            </Pressable>
          </View>

          <View style={styles.webviewContainer}>
            <WebView
              originWhitelist={['*']}
              source={{ html, baseUrl: ENV.SITE_URL }}
              onMessage={handleMessage}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              sharedCookiesEnabled
              thirdPartyCookiesEnabled
              setSupportMultipleWindows={false}
              renderLoading={() => (
                <View style={styles.loader}>
                  <ActivityIndicator size="small" color="#134765" />
                </View>
              )}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.65)',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  card: {
    borderRadius: radius.xl,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  headerText: {
    gap: 4,
  },
  closeButton: {
    alignSelf: 'flex-end',
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.18)',
    backgroundColor: 'rgba(255,255,255,0.75)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  webviewContainer: {
    height: 380,
    backgroundColor: '#FFFFFF',
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
