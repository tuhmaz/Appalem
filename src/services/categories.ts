import { apiClient } from './apiClient';
import { API_ENDPOINTS } from './endpoints';
import type { Category } from '@/types/api';

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const data = (payload as { data?: unknown }).data;
    return (data ?? payload) as T;
  }
  return payload as T;
}

export const categoryService = {
  async list(params?: Record<string, string | number | boolean>) {
    const response = await apiClient.get<Category[] | { data: Category[] }>(API_ENDPOINTS.CATEGORIES.LIST, { params });
    return unwrap<Category[]>(response);
  },
  async show(id: number | string) {
    const response = await apiClient.get<Category | { data: Category }>(API_ENDPOINTS.CATEGORIES.SHOW(id));
    return unwrap<Category>(response);
  }
};

