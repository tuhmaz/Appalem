import { apiClient } from './apiClient';
import { API_ENDPOINTS } from './endpoints';
import type { FileItem } from '@/types/api';

function unwrap<T>(payload: any): T {
  return payload?.data ?? payload;
}

export const fileService = {
  async info(id: number | string) {
    const response = await apiClient.get<FileItem | { data: FileItem }>(API_ENDPOINTS.FILES.INFO(id));
    return unwrap<FileItem>(response);
  },
  async incrementView(id: number | string) {
    return apiClient.post(API_ENDPOINTS.FILES.INCREMENT_VIEW(id));
  }
};

