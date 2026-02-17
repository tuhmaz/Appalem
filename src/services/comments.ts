import { apiClient } from './apiClient';
import { API_ENDPOINTS } from './endpoints';
import type { Comment } from '@/types/api';

type CommentListResult = {
  items: Comment[];
  meta?: Record<string, any>;
};

type CommentListParams = {
  commentable_id?: number | string;
  commentable_type?: string;
  page?: number;
  per_page?: number;
  q?: string;
  [key: string]: string | number | boolean | undefined;
};

function unwrap<T>(payload: any): T {
  return payload?.data ?? payload;
}

function normalizeList(payload: any): CommentListResult {
  const data = unwrap<any>(payload);

  if (Array.isArray(data)) {
    return { items: data };
  }

  if (Array.isArray(data?.data)) {
    return { items: data.data, meta: data.meta || data.pagination };
  }

  if (Array.isArray(data?.comments)) {
    return { items: data.comments, meta: data.meta || data.pagination };
  }

  if (Array.isArray(payload?.data?.data)) {
    return { items: payload.data.data, meta: payload.data.meta || payload.data.pagination };
  }

  return { items: [] };
}

function normalizeComment(payload: any): Comment | null {
  const data = unwrap<any>(payload);
  return data?.comment || data || payload?.comment || payload?.data?.comment || null;
}

export const commentService = {
  async list(database: string, params?: CommentListParams) {
    const response = await apiClient.get<any>(
      API_ENDPOINTS.COMMENTS.LIST_PUBLIC(database),
      params ? { params } : undefined
    );
    return normalizeList(response);
  },
  async create(database: string, data: { body: string; commentable_id: number; commentable_type: string }) {
    const response = await apiClient.post<any>(API_ENDPOINTS.COMMENTS.STORE(database), data);
    return normalizeComment(response);
  },
  async remove(database: string, id: number | string) {
    return apiClient.delete(API_ENDPOINTS.COMMENTS.DELETE(database, id));
  }
};