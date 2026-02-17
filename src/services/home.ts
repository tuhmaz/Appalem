import { apiClient } from './apiClient';
import { API_ENDPOINTS } from './endpoints';
import type { CalendarEvent } from '@/types/api';

export const homeService = {
  async getHome(params?: Record<string, string | number | boolean>) {
    return apiClient.get(API_ENDPOINTS.HOME.INDEX, { params });
  },
  async getCalendar(params?: Record<string, string | number | boolean>) {
    return apiClient.get<CalendarEvent[]>(API_ENDPOINTS.HOME.CALENDAR, { params });
  },
  async getEvent(id: number | string) {
    return apiClient.get(API_ENDPOINTS.HOME.EVENT(id));
  }
};

