import { apiClient } from './apiClient';
import { API_ENDPOINTS } from './endpoints';
import type { SchoolClass } from '@/types/api';

function unwrap<T>(payload: any): T {
  return payload?.data ?? payload;
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

