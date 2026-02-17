import { AdMobConfig, IS_ADMOB_AVAILABLE, USE_TEST_ADS } from '@/config/admob';
import { getGoogleMobileAds } from './googleMobileAds';
import { adMobService } from './admob';

type GoogleMobileAdsModule = Exclude<ReturnType<typeof getGoogleMobileAds>, null>;
type InterstitialAdInstance = ReturnType<GoogleMobileAdsModule['InterstitialAd']['createForAdRequest']>;

class InterstitialAdService {
  private interstitial: InterstitialAdInstance | null = null;
  private isLoading = false;
  private isLoaded = false;
  private lastShownTime = 0;
  private readonly MIN_INTERVAL = 60000; // Minimum 60 seconds between ads (policy compliance)

  constructor() {
    this.initializeAd();
  }

  /**
   * Initialize the interstitial ad
   * Follows Google policy: Load ads in advance but don't show too frequently
   */
  private initializeAd() {
    try {
      const googleMobileAds = getGoogleMobileAds();
      if (!googleMobileAds) {
        if (__DEV__) console.warn('[AdMob] Native module not available. Interstitial disabled.');
        return;
      }

      const { InterstitialAd, AdEventType, TestIds } = googleMobileAds;

      const adUnitId = USE_TEST_ADS
        ? TestIds.INTERSTITIAL
        : AdMobConfig.interstitialAdUnitId;

      if (!adUnitId) {
        if (__DEV__) console.warn('[AdMob] No interstitial ad unit ID configured');
        return;
      }

      this.interstitial = InterstitialAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: adMobService.nonPersonalizedOnly,
      });

      // Set up event listeners
      this.interstitial.addAdEventListener(AdEventType.LOADED, () => {
        this.isLoaded = true;
        this.isLoading = false;
        if (__DEV__) console.log('[AdMob] Interstitial ad loaded');
      });

      this.interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
        this.isLoaded = false;
        this.isLoading = false;
        if (__DEV__) console.warn('[AdMob] Interstitial ad error:', error);
      });

      this.interstitial.addAdEventListener(AdEventType.CLOSED, () => {
        this.isLoaded = false;
        this.lastShownTime = Date.now();
        // Preload next ad
        this.loadAd();
      });

      // Load the first ad
      this.loadAd();
    } catch (error) {
      if (__DEV__) console.error('[AdMob] Failed to initialize interstitial ad:', error);
    }
  }

  /**
   * Load an interstitial ad
   */
  private loadAd() {
    if (this.isLoading || this.isLoaded || !this.interstitial) {
      return;
    }

    this.isLoading = true;
    this.interstitial.load();
  }

  /**
   * Show the interstitial ad if loaded and policy requirements are met
   * @returns Promise<boolean> - true if ad was shown, false otherwise
   */
  async show(): Promise<boolean> {
    try {
      // Check if enough time has passed since last ad (policy compliance)
      const timeSinceLastAd = Date.now() - this.lastShownTime;
      if (timeSinceLastAd < this.MIN_INTERVAL) {
        if (__DEV__) console.log('[AdMob] Interstitial ad shown too recently, skipping');
        return false;
      }

      // Check if ad is loaded
      if (!this.isLoaded || !this.interstitial) {
        if (__DEV__) console.log('[AdMob] Interstitial ad not loaded yet');
        return false;
      }

      // Show the ad
      await this.interstitial.show();
      return true;
    } catch (error) {
      if (__DEV__) console.error('[AdMob] Failed to show interstitial ad:', error);
      return false;
    }
  }

  /**
   * Check if ad is ready to be shown
   */
  isReady(): boolean {
    const timeSinceLastAd = Date.now() - this.lastShownTime;
    return this.isLoaded && timeSinceLastAd >= this.MIN_INTERVAL;
  }

  /**
   * Preload ad for faster display
   */
  preload() {
    this.loadAd();
  }
}

class NoopInterstitialAdService {
  preload() {}
  isReady() {
    return false;
  }
  async show() {
    return false;
  }
}

export const interstitialAdService = IS_ADMOB_AVAILABLE
  ? new InterstitialAdService()
  : new NoopInterstitialAdService();
