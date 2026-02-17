import { IS_ADMOB_AVAILABLE } from '@/config/admob';

type GoogleMobileAdsModule = typeof import('react-native-google-mobile-ads');

let cachedModule: GoogleMobileAdsModule | null | undefined;

export function getGoogleMobileAds(): GoogleMobileAdsModule | null {
  if (cachedModule !== undefined) {
    return cachedModule;
  }

  if (!IS_ADMOB_AVAILABLE) {
    cachedModule = null;
    return cachedModule;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedModule = require('react-native-google-mobile-ads') as GoogleMobileAdsModule;
  } catch (error) {
    if (__DEV__) console.warn('[AdMob] Failed to load native module:', error);
    cachedModule = null;
  }

  return cachedModule;
}
