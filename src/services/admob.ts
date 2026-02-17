import AsyncStorage from '@react-native-async-storage/async-storage';
import { IS_ADMOB_AVAILABLE } from '@/config/admob';
import { getGoogleMobileAds } from './googleMobileAds';

const CONSENT_KEY = 'admob_consent_status';

class AdMobService {
  private initialized = false;
  private _nonPersonalizedOnly = true;

  /** Whether ads should be non-personalized (based on user consent) */
  get nonPersonalizedOnly(): boolean {
    return this._nonPersonalizedOnly;
  }

  /**
   * Initialize AdMob SDK
   * Must be called before showing any ads
   */
  async initialize(): Promise<void> {
    try {
      if (this.initialized) return;
      if (!IS_ADMOB_AVAILABLE) {
        if (__DEV__) console.warn('[AdMob] Native module not available. Skipping initialization.');
        return;
      }

      const googleMobileAds = getGoogleMobileAds();
      if (!googleMobileAds) {
        if (__DEV__) console.warn('[AdMob] Native module not available. Skipping initialization.');
        return;
      }

      const { default: mobileAds } = googleMobileAds;

      // Check and request consent for GDPR/CCPA compliance
      await this.checkConsent();

      // Initialize Mobile Ads SDK
      await mobileAds().initialize();

      this.initialized = true;
      if (__DEV__) console.log('[AdMob] SDK initialized successfully');
    } catch (error) {
      if (__DEV__) console.error('[AdMob] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Check and request user consent for personalized ads (GDPR/CCPA)
   * Required by Google AdMob policy
   */
  private async checkConsent(): Promise<void> {
    if (!IS_ADMOB_AVAILABLE) return;

    const googleMobileAds = getGoogleMobileAds();
    if (!googleMobileAds) return;

    const { AdsConsent, AdsConsentStatus } = googleMobileAds;

    // Load cached consent first as fallback
    try {
      const cached = await AsyncStorage.getItem(CONSENT_KEY);
      if (cached != null) {
        this._nonPersonalizedOnly = cached !== AdsConsentStatus.OBTAINED.toString();
      }
    } catch {
      // ignore cache read failure
    }

    // Try UMP flow — may fail if no consent form is configured in AdMob console
    try {
      const consentInfo = await AdsConsent.requestInfoUpdate();

      if (
        consentInfo.status === AdsConsentStatus.REQUIRED ||
        consentInfo.status === AdsConsentStatus.UNKNOWN
      ) {
        const formResult = await AdsConsent.showForm();
        await AsyncStorage.setItem(CONSENT_KEY, formResult.status.toString());
        this._nonPersonalizedOnly = formResult.status !== AdsConsentStatus.OBTAINED;
        if (__DEV__) console.log('[AdMob] Consent status:', formResult.status);
      } else {
        await AsyncStorage.setItem(CONSENT_KEY, consentInfo.status.toString());
        this._nonPersonalizedOnly = consentInfo.status !== AdsConsentStatus.OBTAINED;
        if (__DEV__) console.log('[AdMob] Consent not required or already obtained');
      }
    } catch (error) {
      // "no form(s) configured" is expected when UMP form isn't set up in AdMob console.
      // Ads still work — they just show as non-personalized (safe default).
      if (__DEV__) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes('no form')) {
          console.warn('[AdMob] No consent form configured in AdMob console — using non-personalized ads.');
        } else {
          console.warn('[AdMob] Consent check failed:', msg);
        }
      }
    }
  }

  /**
   * Reset consent for testing purposes
   * Only use in development
   */
  async resetConsent(): Promise<void> {
    if (__DEV__) {
      if (!IS_ADMOB_AVAILABLE) {
        return;
      }
      const googleMobileAds = getGoogleMobileAds();
      if (!googleMobileAds) {
        return;
      }
      const { AdsConsent } = googleMobileAds;

      await AdsConsent.reset();
      await AsyncStorage.removeItem(CONSENT_KEY);
      console.log('[AdMob] Consent reset');
    }
  }

  /**
   * Check if user has consented to personalized ads
   */
  async hasConsent(): Promise<boolean> {
    try {
      const googleMobileAds = getGoogleMobileAds();
      if (!googleMobileAds) {
        return false;
      }
      const { AdsConsentStatus } = googleMobileAds;

      const consent = await AsyncStorage.getItem(CONSENT_KEY);
      return consent === AdsConsentStatus.OBTAINED.toString();
    } catch {
      return false;
    }
  }

  /**
   * Open privacy options form so users can withdraw or update ad consent.
   * Returns true when a form is shown, false when no form is available/required.
   */
  async openAdSettings(): Promise<boolean> {
    try {
      if (!IS_ADMOB_AVAILABLE) {
        return false;
      }
      const googleMobileAds = getGoogleMobileAds();
      if (!googleMobileAds) {
        return false;
      }

      const { AdsConsent, AdsConsentPrivacyOptionsRequirementStatus, AdsConsentStatus } = googleMobileAds;
      const consentInfo = await AdsConsent.requestInfoUpdate();

      if (consentInfo.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED) {
        const updatedConsentInfo = await AdsConsent.showPrivacyOptionsForm();
        await AsyncStorage.setItem(CONSENT_KEY, updatedConsentInfo.status.toString());
        this._nonPersonalizedOnly = updatedConsentInfo.status !== AdsConsentStatus.OBTAINED;
        return true;
      }

      if (consentInfo.isConsentFormAvailable) {
        const fallbackConsentInfo = await AdsConsent.showForm();
        await AsyncStorage.setItem(CONSENT_KEY, fallbackConsentInfo.status.toString());
        this._nonPersonalizedOnly = fallbackConsentInfo.status !== AdsConsentStatus.OBTAINED;
        return true;
      }

      if (__DEV__) {
        console.warn('[AdMob] Privacy options form is not required for this region/user.');
      }
      return false;
    } catch (error) {
      if (__DEV__) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes('no form')) {
          console.warn('[AdMob] No consent form configured in AdMob console.');
        } else {
          console.error('[AdMob] Failed to open ad settings:', msg);
        }
      }
      return false;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const adMobService = new AdMobService();
