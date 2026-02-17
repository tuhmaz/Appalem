import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { secureStorage } from './secureStorage';

/**
 * Biometric Authentication Service
 * Provides secure biometric authentication for sensitive features
 */

export type BiometryType = 'fingerprint' | 'face' | 'iris' | 'none';
export interface BiometricAuthOptions {
  promptMessage?: string;
  cancelLabel?: string;
  fallbackEnabled?: boolean;
}

class BiometricAuthService {
  private static instance: BiometricAuthService;

  static getInstance(): BiometricAuthService {
    if (!BiometricAuthService.instance) {
      BiometricAuthService.instance = new BiometricAuthService();
    }
    return BiometricAuthService.instance;
  }

  /**
   * Check if biometric authentication is available on the device
   */
  async isBiometricAuthAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch (error) {
      if (__DEV__) console.error('Failed to check biometric availability:', error);
      return false;
    }
  }

  /**
   * Get available biometric types
   */
  async getAvailableBiometryTypes(): Promise<BiometryType[]> {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      const availableTypes: BiometryType[] = [];
      
      types.forEach(type => {
        switch (type) {
          case LocalAuthentication.AuthenticationType.FINGERPRINT:
            availableTypes.push('fingerprint');
            break;
          case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
            availableTypes.push('face');
            break;
          case LocalAuthentication.AuthenticationType.IRIS:
            availableTypes.push('iris');
            break;
        }
      });
      
      return availableTypes;
    } catch (error) {
      if (__DEV__) console.error('Failed to get biometry types:', error);
      return [];
    }
  }

  /**
   * Authenticate using biometrics
   */
  async authenticate(
    options: BiometricAuthOptions = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const defaultOptions: LocalAuthentication.LocalAuthenticationOptions = {
        promptMessage: options.promptMessage || 'المصادقة المطلوبة',
        cancelLabel: options.cancelLabel || 'إلغاء',
        disableDeviceFallback: !(options.fallbackEnabled ?? true),
      };

      const result = await LocalAuthentication.authenticateAsync(defaultOptions);

      if (result.success) {
        return { success: true };
      } else {
        return {
          success: false,
          error: this.getErrorMessage(result.error),
        };
      }
    } catch (error) {
      if (__DEV__) console.error('Biometric authentication failed:', error);
      return {
        success: false,
        error: 'فشل المصادقة الحيوية',
      };
    }
  }

  /**
   * Enable biometric authentication for a specific feature
   */
  async enableBiometricForFeature(featureKey: string): Promise<boolean> {
    try {
      const isAvailable = await this.isBiometricAuthAvailable();
      if (!isAvailable) {
        throw new Error('المصادقة الحيوية غير متاحة على هذا الجهاز');
      }

      // Store feature biometric setting
      await secureStorage.setEncryptedItem(`biometric_${featureKey}`, {
        enabled: true,
        enabledAt: Date.now(),
        deviceId: Platform.OS,
      });

      return true;
    } catch (error) {
      if (__DEV__) console.error('Failed to enable biometric for feature:', error);
      return false;
    }
  }

  /**
   * Check if biometric is enabled for a specific feature
   */
  async isBiometricEnabledForFeature(featureKey: string): Promise<boolean> {
    try {
      const setting = await secureStorage.getEncryptedItem<{
        enabled: boolean;
        enabledAt: number;
        deviceId: string;
      }>(`biometric_${featureKey}`);

      return setting?.enabled === true && setting.deviceId === Platform.OS;
    } catch (error) {
      if (__DEV__) console.error('Failed to check biometric setting:', error);
      return false;
    }
  }

  /**
   * Disable biometric authentication for a feature
   */
  async disableBiometricForFeature(featureKey: string): Promise<boolean> {
    try {
      await secureStorage.removeEncryptedItem(`biometric_${featureKey}`);
      return true;
    } catch (error) {
      if (__DEV__) console.error('Failed to disable biometric for feature:', error);
      return false;
    }
  }

  /**
   * Secure sensitive operation with biometric authentication
   */
  async withBiometricAuth<T>(
    featureKey: string,
    operation: () => Promise<T>,
    options?: BiometricAuthOptions
  ): Promise<T> {
    try {
      // Check if biometric is enabled for this feature
      const isEnabled = await this.isBiometricEnabledForFeature(featureKey);
      if (!isEnabled) {
        throw new Error('المصادقة الحيوية غير مفعلة لهذه الميزة');
      }

      // Perform biometric authentication
      const authResult = await this.authenticate(options);
      if (!authResult.success) {
        throw new Error(authResult.error || 'فشل المصادقة');
      }

      // Execute the sensitive operation
      return await operation();
    } catch (error) {
      if (__DEV__) console.error('Biometric protected operation failed:', error);
      throw error;
    }
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: string): string {
    const errorMessages: { [key: string]: string } = {
      'not_available': 'المصادقة الحيوية غير متاحة',
      'not_enrolled': 'لم تقم بإعداد المصادقة الحيوية على جهازك',
      'not_present': 'لم يتم التعرف على البصمة/الوجه',
      'locked': 'تم قفل المصادقة الحيوية مؤقتاً',
      'passcode_not_set': 'لم تقم بإعداد رمز المرور على جهازك',
      'user_cancel': 'تم إلغاء المصادقة',
      'user_fallback': 'تم استخدام الطريقة البديلة',
      'app_cancel': 'تم إلغاء المصادقة من التطبيق',
    };

    return errorMessages[error] || 'فشل المصادقة غير معروف';
  }

  /**
   * Check if device supports strong biometric authentication
   */
  async isStrongBiometricAvailable(): Promise<boolean> {
    try {
      const types = await this.getAvailableBiometryTypes();
      
      // Consider face recognition and fingerprint as strong biometrics
      const strongBiometrics: BiometryType[] = ['face', 'fingerprint'];
      
      return types.some(type => strongBiometrics.includes(type));
    } catch (error) {
      if (__DEV__) console.error('Failed to check strong biometric:', error);
      return false;
    }
  }
}

// Export singleton instance
export const biometricAuth = BiometricAuthService.getInstance();

// Usage examples:
/*
// Enable biometric for a feature
await biometricAuth.enableBiometricForFeature('payment');

// Perform sensitive operation with biometric protection
const result = await biometricAuth.withBiometricAuth(
  'payment',
  async () => {
    // Your sensitive operation here
    return await processPayment();
  },
  {
    promptMessage: 'المصادقة مطلوبة لإتمام الدفع',
    cancelLabel: 'إلغاء الدفع'
  }
);

// Check biometric availability
const isAvailable = await biometricAuth.isBiometricAuthAvailable();
*/
