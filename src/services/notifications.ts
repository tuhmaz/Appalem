import { apiClient } from './apiClient';
import { API_ENDPOINTS } from './endpoints';
import type { Notification, PaginatedResponse } from '@/types/api';

type ApiPayload<T> = T | { data: T };

function unwrap<T>(payload: ApiPayload<T>): T {
  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload
  ) {
    return payload.data;
  }
  return payload;
}

export const notificationService = {
  async latest(limit = 10) {
    const response = await apiClient.get<ApiPayload<Notification[]>>(API_ENDPOINTS.NOTIFICATIONS.LATEST, {
      params: { limit }
    });
    return unwrap<Notification[]>(response);
  },
  async list(params?: Record<string, string | number | boolean>) {
    const response = await apiClient.get<ApiPayload<PaginatedResponse<Notification>>>(
      API_ENDPOINTS.NOTIFICATIONS.LIST,
      { params }
    );
    return unwrap<PaginatedResponse<Notification>>(response);
  },
  async markRead(id: number | string) {
    return apiClient.post(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id));
  },
  async markAllRead() {
    return apiClient.post(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
  },
  async remove(id: number | string) {
    return apiClient.delete(API_ENDPOINTS.NOTIFICATIONS.DELETE(id));
  }
};
