import type { SecureRequestOptions } from './secureApiClient';
import { secureApiClient } from './secureApiClient';

export type RequestOptions = SecureRequestOptions;

// Backwards-compatible export. All callers now use the secure client.
export const apiClient = secureApiClient;
