import { useEffect, useCallback } from 'react';
import { interstitialAdService } from '@/services/interstitialAd';

/**
 * Hook for managing interstitial ads
 *
 * Usage:
 * const { showAd, isReady } = useInterstitialAd();
 *
 * // Show ad when navigating or after user action
 * await showAd();
 */
export function useInterstitialAd() {
  useEffect(() => {
    // Preload ad when component mounts
    interstitialAdService.preload();
  }, []);

  const showAd = useCallback(async (): Promise<boolean> => {
    try {
      return await interstitialAdService.show();
    } catch (error) {
      if (__DEV__) console.error('[AdMob] Failed to show interstitial ad:', error);
      return false;
    }
  }, []);

  const isReady = useCallback((): boolean => {
    return interstitialAdService.isReady();
  }, []);

  return {
    showAd,
    isReady
  };
}
