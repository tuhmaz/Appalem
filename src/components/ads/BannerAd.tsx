import React, { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AdMobConfig, IS_ADMOB_AVAILABLE, USE_TEST_ADS } from '@/config/admob';
import { getGoogleMobileAds } from '@/services/googleMobileAds';
import { adMobService } from '@/services/admob';
import { useTheme } from '@/theme/ThemeContext';

type GoogleMobileAdsModule = Exclude<ReturnType<typeof getGoogleMobileAds>, null>;
type BannerAdSizeKey = keyof GoogleMobileAdsModule['BannerAdSize'];

interface BannerAdComponentProps {
  /**
   * Size of the banner ad
   * @default 'BANNER'
   */
  size?: BannerAdSizeKey;

  /**
   * Custom styling for the container
   */
  style?: StyleProp<ViewStyle>;
}

/**
 * Banner Ad Component
 *
 * Follows Google AdMob policies:
 * - Properly labeled as advertising content
 * - Non-intrusive placement
 * - Doesn't obstruct navigation or content
 * - Handles errors gracefully
 */
export function BannerAdComponent({
  size = 'BANNER',
  style
}: BannerAdComponentProps) {
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(false);
  const { theme } = useTheme();

  const googleMobileAds = getGoogleMobileAds();
  if (!googleMobileAds) {
    return null;
  }

  const { BannerAd, BannerAdSize, TestIds } = googleMobileAds;

  // Use test ads in development
  const adUnitId = USE_TEST_ADS
    ? TestIds.BANNER
    : AdMobConfig.bannerAdUnitId;

  if (!IS_ADMOB_AVAILABLE || !adUnitId || adError) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }, style]}>
      {/* Ad label for transparency (required by policy) */}
      {adLoaded && (
        <View style={styles.adLabel}>
          {/* Label is handled internally by Google Mobile Ads */}
        </View>
      )}

      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize[size]}
        requestOptions={{
          requestNonPersonalizedAdsOnly: adMobService.nonPersonalizedOnly,
        }}
        onAdLoaded={() => {
          setAdLoaded(true);
          setAdError(false);
        }}
        onAdFailedToLoad={(error) => {
          if (__DEV__) console.warn('[AdMob] Banner ad failed to load:', error);
          setAdError(true);
          setAdLoaded(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8
  },
  adLabel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 0
  }
});
