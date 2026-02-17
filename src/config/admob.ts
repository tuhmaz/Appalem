import { NativeModules, Platform } from 'react-native';
import { ENV } from './env';

export const IS_ADMOB_AVAILABLE =
  Platform.OS !== 'web' && !!NativeModules.RNGoogleMobileAdsModule;

export const AdMobConfig = {
  appId: Platform.select({
    ios: ENV.ADMOB_IOS_APP_ID,
    android: ENV.ADMOB_ANDROID_APP_ID
  }) || '',

  bannerAdUnitId: Platform.select({
    ios: ENV.ADMOB_IOS_BANNER_ID,
    android: ENV.ADMOB_ANDROID_BANNER_ID
  }) || '',

  interstitialAdUnitId: Platform.select({
    ios: ENV.ADMOB_IOS_INTERSTITIAL_ID,
    android: ENV.ADMOB_ANDROID_INTERSTITIAL_ID
  }) || ''
};

// Test mode - set to false in production
export const USE_TEST_ADS = __DEV__;
