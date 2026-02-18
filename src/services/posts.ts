import { apiClient } from './apiClient';
import { API_ENDPOINTS } from './endpoints';
import type { PaginatedResponse, Post } from '@/types/api';

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const data = (payload as { data?: unknown }).data;
    return (data ?? payload) as T;
  }
  return payload as T;
}

export const postService = {
  async list(params?: Record<string, string | number | boolean>): Promise<PaginatedResponse<Post> | Post[]> {
    const response = await apiClient.get<PaginatedResponse<Post> | { data: PaginatedResponse<Post> }>(
      API_ENDPOINTS.POSTS.LIST,
      { params }
    );
    return unwrap<PaginatedResponse<Post> | Post[]>(response);
  },
  async show(id: number | string) {
    const response = await apiClient.get<{ data: Post } | Post>(API_ENDPOINTS.POSTS.SHOW(id));
    return unwrap<Post>(response);
  },
  async incrementView(id: number | string) {
    return apiClient.post(API_ENDPOINTS.POSTS.INCREMENT_VIEW(id));
  }
};

