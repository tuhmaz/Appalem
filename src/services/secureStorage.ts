import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';

/**
 * Secure Storage Service
 * Uses React Native Keychain for secure credential storage
 * Falls back to AsyncStorage for non-credential data
 */

export type SecureStorageOptions = {
  accessible?: Keychain.ACCESSIBLE;
  accessControl?: Keychain.ACCESS_CONTROL;
  service?: string;
};

class SecureStorageService {
  private static instance: SecureStorageService;
  private defaultService: string = 'com.alemancenter.alemedu';
  private keychainAvailable: boolean | null = null;
  private warnedKeychainUnavailable = false;

  static getInstance(): SecureStorageService {
    if (!SecureStorageService.instance) {
      SecureStorageService.instance = new SecureStorageService();
    }
    return SecureStorageService.instance;
  }

  private buildFallbackKey(key: string, service?: string): string {
    const resolvedService = service || this.defaultService;
    return `secure.${resolvedService}.${key}`;
  }

  private isKeychainAvailable(): boolean {
    if (this.keychainAvailable !== null) return this.keychainAvailable;
    if (Platform.OS === 'web') {
      this.keychainAvailable = false;
      return false;
    }

    const module = (NativeModules as any).RNKeychainManager
      ?? (NativeModules as any).RNKeychainManagerTurboModule;
    this.keychainAvailable = Boolean(module);
    return this.keychainAvailable;
  }

  private warnKeychainUnavailable() {
    if (this.warnedKeychainUnavailable) return;
    this.warnedKeychainUnavailable = true;
    if (__DEV__) console.warn('[SecureStorage] Keychain module unavailable, falling back to AsyncStorage.');
  }

  /**
   * Store sensitive data securely using Keychain
   */
  async setSecureItem(
    key: string,
    value: string,
    options: SecureStorageOptions = {}
  ): Promise<boolean> {
    try {
      const service = options.service || this.defaultService;
      if (!this.isKeychainAvailable()) {
        this.warnKeychainUnavailable();
        await AsyncStorage.setItem(this.buildFallbackKey(key, service), value);
        return true;
      }
      const accessible = options.accessible || Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY;

      const result = await Keychain.setGenericPassword(key, value, {
        service,
        accessible,
        accessControl: options.accessControl,
      });

      return result === false ? false : true;
    } catch (error) {
      if (__DEV__) console.error('Failed to store secure item:', error);
      return false;
    }
  }

  /**
   * Retrieve sensitive data from Keychain
   */
  async getSecureItem(key: string, options: SecureStorageOptions = {}): Promise<string | null> {
    try {
      const service = options.service || this.defaultService;
      if (!this.isKeychainAvailable()) {
        this.warnKeychainUnavailable();
        return await AsyncStorage.getItem(this.buildFallbackKey(key, service));
      }

      const credentials = await Keychain.getGenericPassword({
        service,
        authenticationPrompt: {
          title: 'Authentication Required',
          subtitle: 'Access your secure data',
          description: 'Biometric authentication is required to access secure storage',
          cancel: 'Cancel',
        },
      });

      if (credentials && credentials.username === key) {
        return credentials.password;
      }

      return null;
    } catch (error) {
      if (__DEV__) console.error('Failed to retrieve secure item:', error);
      try {
        const service = options.service || this.defaultService;
        return await AsyncStorage.getItem(this.buildFallbackKey(key, service));
      } catch {
        return null;
      }
    }
  }

  /**
   * Remove sensitive data from Keychain
   */
  async removeSecureItem(key: string, options: SecureStorageOptions = {}): Promise<boolean> {
    try {
      const service = options.service || this.defaultService;
      if (!this.isKeychainAvailable()) {
        this.warnKeychainUnavailable();
        await AsyncStorage.removeItem(this.buildFallbackKey(key, service));
        return true;
      }

      const result = await Keychain.resetGenericPassword({ service });
      return result === false ? false : true;
    } catch (error) {
      if (__DEV__) console.error('Failed to remove secure item:', error);
      return false;
    }
  }

  /**
   * Store non-sensitive structured data with AsyncStorage
   * For sensitive data, always use Keychain methods (setSecureItem)
   */
  async setEncryptedItem(key: string, value: any): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      if (__DEV__) console.error('Failed to store item:', error);
      throw error;
    }
  }

  /**
   * Retrieve structured data from AsyncStorage
   */
  async getEncryptedItem<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;

      // Try parsing as JSON first (current format)
      try {
        return JSON.parse(raw) as T;
      } catch {
        // Backward compat: old data was base64-encoded JSON
        try {
          const decoded = Buffer.from(raw, 'base64').toString('utf8');
          return JSON.parse(decoded) as T;
        } catch {
          return null;
        }
      }
    } catch (error) {
      if (__DEV__) console.error('Failed to retrieve item:', error);
      return null;
    }
  }

  /**
   * Remove structured data from AsyncStorage
   */
  async removeEncryptedItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      if (__DEV__) console.error('Failed to remove item:', error);
      throw error;
    }
  }

  /**
   * Check if biometric authentication is available
   */
  async isBiometricAuthAvailable(): Promise<boolean> {
    try {
      if (!this.isKeychainAvailable()) {
        return false;
      }
      const result = await Keychain.getSupportedBiometryType();
      return result !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get supported biometric type
   */
  async getSupportedBiometryType(): Promise<Keychain.BIOMETRY_TYPE | null> {
    try {
      if (!this.isKeychainAvailable()) {
        return null;
      }
      return await Keychain.getSupportedBiometryType();
    } catch {
      return null;
    }
  }

  /**
   * Clear all secure storage
   */
  async clearAll(): Promise<void> {
    try {
      if (this.isKeychainAvailable()) {
        await Keychain.resetGenericPassword();
      }
      await AsyncStorage.clear();
    } catch (error) {
      if (__DEV__) console.error('Failed to clear secure storage:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const secureStorage = SecureStorageService.getInstance();
