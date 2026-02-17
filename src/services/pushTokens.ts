import { Platform } from 'react-native';
import { apiClient } from './apiClient';
import { API_ENDPOINTS } from './endpoints';

type PushTokenPlatform = 'android' | 'ios';

function detectPlatform(): PushTokenPlatform {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

export const pushTokensService = {
  async register(token: string) {
    return apiClient.post(API_ENDPOINTS.AUTH.PUSH_TOKEN, {
      token,
      platform: detectPlatform(),
    });
  },

  async unregister(token?: string) {
    return apiClient.delete(API_ENDPOINTS.AUTH.PUSH_TOKEN, {
      params: token ? { token } : undefined,
    });
  },
};
