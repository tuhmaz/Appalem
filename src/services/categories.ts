import { apiClient } from './apiClient';
import { API_ENDPOINTS } from './endpoints';
import type { Category } from '@/types/api';

function unwrap<T>(payload: any): T {
  return payload?.data ?? payload;
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

