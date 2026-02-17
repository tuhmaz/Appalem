import { apiClient } from './apiClient';
import { API_ENDPOINTS } from './endpoints';
import type { PaginatedResponse, Post } from '@/types/api';

function unwrap<T>(payload: any): T {
  return payload?.data ?? payload;
}

export const postService = {
  async list(params?: Record<string, string | number | boolean>) {
    const response = await apiClient.get<PaginatedResponse<Post> | { data: PaginatedResponse<Post> }>(
      API_ENDPOINTS.POSTS.LIST,
      { params }
    );
    return unwrap<any>(response);
  },
  async show(id: number | string) {
    const response = await apiClient.get<{ data: Post } | Post>(API_ENDPOINTS.POSTS.SHOW(id));
    return unwrap<Post>(response);
  },
  async incrementView(id: number | string) {
    return apiClient.post(API_ENDPOINTS.POSTS.INCREMENT_VIEW(id));
  }
};

