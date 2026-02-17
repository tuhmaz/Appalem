import { secureStorage } from './secureStorage';

/**
 * AES-256-CBC Encryption Service
 * Uses react-native-crypto (browserify-cipher) for real AES operations
 * and native crypto.getRandomValues (Hermes CSPRNG) for key generation.
 * Keys are stored in Keychain via secureStorage.
 */

interface CipherLike {
  update(data: string, inputEncoding: string, outputEncoding: string): string;
  final(outputEncoding: string): string;
}

interface CryptoModule {
  createCipheriv(algorithm: string, key: Buffer, iv: Buffer): CipherLike;
  createDecipheriv(algorithm: string, key: Buffer, iv: Buffer): CipherLike;
}

// Pure-JS AES from react-native-crypto (browserify-cipher, no native module needed)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const rnCrypto: CryptoModule = require('react-native-crypto');

interface EncryptionKey {
  key: string; // 64-char hex string (256-bit)
  createdAt: number;
}

interface KeyStore {
  currentId: string;
  keys: Record<string, EncryptionKey>;
}

const KEY_SERVICE = 'com.alemancenter.encryption';
const KEY_STORAGE_KEY = 'enc_keys';
const KEY_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
const ALGORITHM = 'aes-256-cbc';

/**
 * Generate hex string from CSPRNG.
 * Uses crypto.getRandomValues which is available natively in Hermes (RN 0.70+).
 */
function secureRandomHex(byteLength: number): string {
  if (typeof globalThis.crypto?.getRandomValues !== 'function') {
    throw new Error('CSPRNG not available. Cannot generate secure random bytes.');
  }
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

class EncryptionService {
  private static instance: EncryptionService;

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /** Load key store from Keychain. Returns empty store on failure. */
  private async loadStore(): Promise<KeyStore> {
    try {
      const raw = await secureStorage.getSecureItem(KEY_STORAGE_KEY, {
        service: KEY_SERVICE,
      });
      if (raw) return JSON.parse(raw) as KeyStore;
    } catch {
      // Corrupt or missing data – start fresh
    }
    return { currentId: '', keys: {} };
  }

  /** Persist key store to Keychain. */
  private async saveStore(store: KeyStore): Promise<void> {
    await secureStorage.setSecureItem(
      KEY_STORAGE_KEY,
      JSON.stringify(store),
      { service: KEY_SERVICE },
    );
  }

  /** Get or create the current encryption key. */
  private async ensureCurrentKey(): Promise<{ id: string; keyHex: string }> {
    const store = await this.loadStore();
    const current = store.keys[store.currentId];

    if (current && Date.now() - current.createdAt <= KEY_MAX_AGE_MS) {
      return { id: store.currentId, keyHex: current.key };
    }

    // Generate a new 256-bit key
    const id = `k${Date.now()}`;
    const keyHex = secureRandomHex(32);
    store.keys[id] = { key: keyHex, createdAt: Date.now() };
    store.currentId = id;
    await this.saveStore(store);
    return { id, keyHex };
  }

  /**
   * Encrypt a plaintext string with AES-256-CBC.
   * Output format: `keyId:ivHex:ciphertextBase64`
   * A fresh random IV is generated for every call.
   */
  async encryptData(data: string): Promise<string> {
    try {
      const { id, keyHex } = await this.ensureCurrentKey();
      const ivHex = secureRandomHex(16); // fresh 128-bit IV per message

      const key = Buffer.from(keyHex, 'hex');
      const iv = Buffer.from(ivHex, 'hex');

      const cipher = rnCrypto.createCipheriv(ALGORITHM, key, iv);
      const encrypted =
        cipher.update(data, 'utf8', 'base64') + cipher.final('base64');

      return `${id}:${ivHex}:${encrypted}`;
    } catch (error) {
      if (__DEV__) console.error('[Encryption] Encrypt failed:', error);
      throw new Error('Data encryption failed');
    }
  }

  /**
   * Decrypt data previously encrypted with encryptData().
   * Expects format: `keyId:ivHex:ciphertextBase64`
   */
  async decryptData(encryptedData: string): Promise<string> {
    try {
      const first = encryptedData.indexOf(':');
      const second = encryptedData.indexOf(':', first + 1);
      if (first === -1 || second === -1) {
        throw new Error('Invalid encrypted data format');
      }

      const keyId = encryptedData.slice(0, first);
      const ivHex = encryptedData.slice(first + 1, second);
      const ciphertext = encryptedData.slice(second + 1);

      const store = await this.loadStore();
      const keyInfo = store.keys[keyId];
      if (!keyInfo) throw new Error('Decryption key not found');

      const key = Buffer.from(keyInfo.key, 'hex');
      const iv = Buffer.from(ivHex, 'hex');

      const decipher = rnCrypto.createDecipheriv(ALGORITHM, key, iv);
      const decrypted =
        decipher.update(ciphertext, 'base64', 'utf8') +
        decipher.final('utf8');

      return decrypted;
    } catch (error) {
      if (__DEV__) console.error('[Encryption] Decrypt failed:', error);
      throw new Error('Data decryption failed');
    }
  }

  /**
   * Rotate the current key. Old keys are kept so existing data can
   * still be decrypted.
   */
  async rotateKeys(): Promise<void> {
    try {
      const store = await this.loadStore();
      const id = `k${Date.now()}`;
      store.keys[id] = { key: secureRandomHex(32), createdAt: Date.now() };
      store.currentId = id;
      await this.saveStore(store);
    } catch (error) {
      if (__DEV__) console.error('[Encryption] Key rotation failed:', error);
      throw new Error('Encryption key rotation failed');
    }
  }

  /** Key count (useful for diagnostics). */
  async getKeyInfo(): Promise<{ currentKeyId: string; keyCount: number }> {
    const store = await this.loadStore();
    return {
      currentKeyId: store.currentId,
      keyCount: Object.keys(store.keys).length,
    };
  }
}

export const encryptionService = EncryptionService.getInstance();
