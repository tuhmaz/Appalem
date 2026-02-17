import AsyncStorage from '@react-native-async-storage/async-storage';
import { DevSettings, I18nManager, Platform } from 'react-native';
import * as Localization from 'expo-localization';
import { ENV } from '@/config/env';
import ar from './ar.json';
import en from './en.json';

export type Locale = 'ar' | 'en';

const STORAGE_KEY = 'mobile.locale';
const translations: Record<Locale, Record<string, string>> = {
  ar,
  en
};

let currentLocale: Locale = (ENV.DEFAULT_LOCALE as Locale) || 'ar';

function normalizeLocale(value?: string): Locale {
  if (!value) return 'ar';
  return value.startsWith('en') ? 'en' : 'ar';
}

export async function initI18n(): Promise<Locale> {
  const saved = await AsyncStorage.getItem(STORAGE_KEY);
  const locales = Localization.getLocales();
  const deviceLocale = locales[0]?.languageTag;
  currentLocale = normalizeLocale(saved || deviceLocale || ENV.DEFAULT_LOCALE);

  // Enable RTL for Arabic (right to left)
  const shouldBeRtl = currentLocale === 'ar';
  I18nManager.allowRTL(true);
  I18nManager.swapLeftAndRightInRTL(true);
  if (I18nManager.isRTL !== shouldBeRtl && Platform.OS !== 'web') {
    I18nManager.forceRTL(shouldBeRtl);
  }

  return currentLocale;
}

export function t(key: string): string {
  return translations[currentLocale][key] || key;
}

export function getLocale(): Locale {
  return currentLocale;
}

export async function setLocale(locale: Locale): Promise<void> {
  currentLocale = locale;
  await AsyncStorage.setItem(STORAGE_KEY, locale);

  // Enable RTL for Arabic (right to left)
  const shouldBeRtl = locale === 'ar';
  I18nManager.allowRTL(true);
  I18nManager.swapLeftAndRightInRTL(true);
  if (I18nManager.isRTL !== shouldBeRtl && Platform.OS !== 'web') {
    I18nManager.forceRTL(shouldBeRtl);
    if (__DEV__) {
      DevSettings.reload();
    }
  }
}
