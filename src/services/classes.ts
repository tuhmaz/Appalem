import { apiClient } from './apiClient';
import { API_ENDPOINTS } from './endpoints';
import type { SchoolClass } from '@/types/api';

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const data = (payload as { data?: unknown }).data;
    return (data ?? payload) as T;
  }
  return payload as T;
}

export const classService = {
  async list() {
    const response = await apiClient.get<SchoolClass[] | { data: SchoolClass[] }>(API_ENDPOINTS.CLASSES.LIST);
    return unwrap<SchoolClass[]>(response);
  },
  async show(id: number | string) {
    const response = await apiClient.get<SchoolClass | { data: SchoolClass }>(API_ENDPOINTS.CLASSES.SHOW(id));
    return unwrap<SchoolClass>(response);
  }
};

