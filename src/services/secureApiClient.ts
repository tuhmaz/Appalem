import { ENV } from '@/config/env';
import type { Country } from '@/config/countries';
import { sslPinningService, type SSLPinningConfig } from './sslPinning';
import { isLocalHost, normalizeBaseUrl } from '@/utils/url';

export type SecureRequestOptions = {
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  timeout?: number;
  requireSSL?: boolean; // Whether SSL pinning is required for this request
};

type PinnedRequestInit = RequestInit & {
  timeoutInterval?: number;
  sslPinning?: SSLPinningConfig;
};

type ApiErrorPayload = {
  message?: string;
  errors?: Record<string, string | string[]>;
};

type ApiClientError = Error & {
  status?: number;
  errors?: ApiErrorPayload['errors'] | null;
  isHandledApiError?: boolean;
};

class SecureApiClient {
  private baseUrl: string = ENV.API_URL;
  private token: string | null = null;
  private country: Country | null = null;
  private locale: string = ENV.DEFAULT_LOCALE;
  private requestTimeout = 15000;
  private onUnauthorized: (() => void) | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  setCountry(country: Country | null) {
    this.country = country;
  }

  setLocale(locale: string) {
    this.locale = locale;
  }

  setOnUnauthorized(callback: (() => void) | null) {
    this.onUnauthorized = callback;
  }

  private buildUrl(endpoint: string, params?: SecureRequestOptions['params']) {
    const base = normalizeBaseUrl(this.baseUrl);
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    let url = `${base}${normalizedEndpoint}`;

    if (params) {
      const query = Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join('&');
      if (query) {
        url += url.includes('?') ? `&${query}` : `?${query}`;
      }
    }

    return url;
  }

  private assertHttps(url: string): void {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:') return;

    if (__DEV__ && isLocalHost(parsed.hostname)) {
      return;
    }

    throw new Error('Insecure connection blocked. HTTPS is required.');
  }

  private buildHeaders(method: string, extra?: Record<string, string>) {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Accept-Language': this.locale,
      'X-Requested-With': 'XMLHttpRequest',
      'X-App-Locale': this.locale,
      ...(extra || {})
    };

    if (method !== 'GET') {
      headers['Content-Type'] = 'application/json';
    }

    if (ENV.FRONTEND_KEY) {
      headers['X-Frontend-Key'] = ENV.FRONTEND_KEY;
    }

    if (this.country) {
      headers['X-Country-Id'] = this.country.id;
      headers['X-Country-Code'] = this.country.code;
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private getPinningConfig(url: string, requireSSL: boolean): SSLPinningConfig | null {
    const parsed = new URL(url);
    const hostname = parsed.hostname;

    if (isLocalHost(hostname)) return null;

    // In production, SSL pinning is always required (requireSSL override ignored)
    const effectiveRequireSSL = __DEV__ ? requireSSL : true;
    if (!effectiveRequireSSL) return null;

    if (!sslPinningService.isEnabled()) {
      // In dev, allow unpinned requests; in prod, block them
      if (__DEV__) return null;
      throw new Error(
        `SSL pinning is required but not available. Request to ${hostname} blocked.`,
      );
    }

    const config = sslPinningService.getPinningConfig(hostname);
    if (!config) {
      throw new Error(`SSL pinning is required but not configured for ${hostname}`);
    }

    return config;
  }

  private async handleResponse<T>(response: Response, url: string): Promise<T> {
    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      if (response.status === 401 && this.token && this.onUnauthorized) {
        this.onUnauthorized();
      }
      const payload = (data && typeof data === 'object' ? data : {}) as ApiErrorPayload;
      const error = new Error(payload.message || 'Request failed') as ApiClientError;
      error.status = response.status;
      error.errors = payload.errors || null;
      error.isHandledApiError = true;
      if (__DEV__ && response.status >= 500) {
        console.error(`[API] Server error ${response.status}: ${url}`, payload);
      }
      throw error;
    }

    return data as T;
  }

  private createTimeoutError(timeout: number): ApiClientError {
    const error = new Error(`Request timeout after ${timeout}ms`) as ApiClientError;
    error.status = 408;
    error.isHandledApiError = true;
    return error;
  }

  private async request<T>(method: string, endpoint: string, body?: unknown, options: SecureRequestOptions = {}) {
    const url = this.buildUrl(endpoint, options.params);
    this.assertHttps(url);

    const headers = this.buildHeaders(method, options.headers);
    const requireSSL = options.requireSSL ?? true;
    const timeout = options.timeout ?? this.requestTimeout;
    const pinningConfig = this.getPinningConfig(url, requireSSL);

    if (pinningConfig) {
      const pinnedFetch = sslPinningService.getPinnedFetch();
      if (!pinnedFetch) {
        throw new Error('SSL pinning module is not available.');
      }

      const fetchPromise = pinnedFetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        timeoutInterval: timeout,
        sslPinning: pinningConfig,
      } as PinnedRequestInit);

      let pinnedTimeoutId: ReturnType<typeof setTimeout>;
      const timeoutPromise = new Promise<never>((_, reject) => {
        pinnedTimeoutId = setTimeout(
          () => reject(this.createTimeoutError(timeout)),
          timeout,
        );
      });

      try {
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        return this.handleResponse<T>(response, url);
      } catch (error) {
        // Prevent unhandled rejection from the losing promise
        fetchPromise.catch(() => {});
        const apiError = error as ApiClientError;
        if (__DEV__ && !apiError.isHandledApiError) {
          console.error(`[API] Request failed: ${url}`, error);
        }
        throw error;
      } finally {
        clearTimeout(pinnedTimeoutId!);
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      return await this.handleResponse<T>(response, url);
    } catch (error) {
      // Convert AbortError into a clear timeout error
      if (error instanceof Error && error.name === 'AbortError') {
        throw this.createTimeoutError(timeout);
      }
      const apiError = error as ApiClientError;
      if (__DEV__ && !apiError.isHandledApiError) {
        console.error(`[API] Request failed: ${url}`, error);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  get<T>(endpoint: string, options?: SecureRequestOptions) {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  post<T>(endpoint: string, data?: unknown, options?: SecureRequestOptions) {
    return this.request<T>('POST', endpoint, data, options);
  }

  put<T>(endpoint: string, data?: unknown, options?: SecureRequestOptions) {
    return this.request<T>('PUT', endpoint, data, options);
  }

  delete<T>(endpoint: string, options?: SecureRequestOptions) {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }
}

export const secureApiClient = new SecureApiClient();

try {
  sslPinningService.initialize();
} catch (error) {
  if (__DEV__) {
    console.error('[SSL Pinning] Initialization failed', error);
  }
}
