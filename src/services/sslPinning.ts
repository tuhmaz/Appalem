export type SSLPinningConfig = {
  certs: string[];
};

type PinnedFetch = (url: string, init: any) => Promise<Response>;

// Certificate names (without extension) bundled in native projects.
// Android: android/app/src/main/res/raw/<name>.cer
// iOS: add <name>.cer to Xcode and include in Copy Bundle Resources.
const PINNED_CERTS: Record<string, string[]> = {
  'api.alemancenter.com': ['alemancenter_api'],
};

let cachedPinnedFetch: PinnedFetch | null = null;
let cachedPinnedFetchResolved = false;

function getPinnedFetch(): PinnedFetch | null {
  if (cachedPinnedFetchResolved) return cachedPinnedFetch;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require('react-native-ssl-pinning');
    cachedPinnedFetch = module?.fetch ?? null;
  } catch {
    cachedPinnedFetch = null;
  }
  cachedPinnedFetchResolved = true;

  return cachedPinnedFetch;
}

function matchPinnedCerts(hostname: string): string[] | null {
  const normalized = hostname.toLowerCase();
  const direct = PINNED_CERTS[normalized];
  if (direct?.length) return direct;

  const wildcard = Object.entries(PINNED_CERTS).find(([key]) => {
    return key.startsWith('*.') && normalized.endsWith(key.slice(1));
  });

  return wildcard?.[1]?.length ? wildcard[1] : null;
}

class SSLPinningService {
  private static instance: SSLPinningService;
  private enabled = !__DEV__;

  static getInstance(): SSLPinningService {
    if (!SSLPinningService.instance) {
      SSLPinningService.instance = new SSLPinningService();
    }
    return SSLPinningService.instance;
  }

  setPinningEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getPinningConfig(hostname: string): SSLPinningConfig | null {
    if (!this.enabled) return null;
    const certs = matchPinnedCerts(hostname);
    return certs ? { certs } : null;
  }

  getPinnedFetch(): PinnedFetch | null {
    if (!this.enabled) return null;
    return getPinnedFetch();
  }

  assertReady(): void {
    if (!this.enabled) return;

    if (!getPinnedFetch()) {
      if (__DEV__) {
        console.warn('[SSL Pinning] Native module not available. Pinning disabled in development.');
      } else {
        console.error('[SSL Pinning] Native module not available. API requests requiring SSL pinning will be blocked.');
      }
      this.enabled = false;
      return;
    }

    const invalidHosts = Object.entries(PINNED_CERTS)
      .filter(([, certs]) => !certs || certs.length === 0)
      .map(([host]) => host);

    if (invalidHosts.length > 0) {
      if (__DEV__) {
        console.warn(`[SSL Pinning] Certificates missing for: ${invalidHosts.join(', ')}. Pinning disabled in development.`);
      } else {
        console.error(`[SSL Pinning] Certificates missing for: ${invalidHosts.join(', ')}. API requests requiring SSL pinning will be blocked.`);
      }
      this.enabled = false;
    }
  }

  initialize(): void {
    if (!this.enabled) return;
    this.assertReady();
  }
}

export const sslPinningService = SSLPinningService.getInstance();
