import { apiClient } from './apiClient';
import { API_ENDPOINTS } from './endpoints';
import type { Comment } from '@/types/api';

type CommentListResult = {
  items: Comment[];
  meta?: Record<string, unknown>;
};

type CommentListParams = {
  commentable_id?: number | string;
  commentable_type?: string;
  page?: number;
  per_page?: number;
  q?: string;
  [key: string]: string | number | boolean | undefined;
};

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null;
}

function unwrap<T>(payload: unknown): T {
  if (isObject(payload) && 'data' in payload) {
    const data = payload.data;
    return (data ?? payload) as T;
  }
  return payload as T;
}

function pickMeta(payload: JsonObject): Record<string, unknown> | undefined {
  if (isObject(payload.meta)) return payload.meta;
  if (isObject(payload.pagination)) return payload.pagination;
  return undefined;
}

function normalizeList(payload: unknown): CommentListResult {
  const data = unwrap<unknown>(payload);

  if (Array.isArray(data)) {
    return { items: data as Comment[] };
  }

  if (isObject(data) && Array.isArray(data.data)) {
    return { items: data.data as Comment[], meta: pickMeta(data) };
  }

  if (isObject(data) && Array.isArray(data.comments)) {
    return { items: data.comments as Comment[], meta: pickMeta(data) };
  }

  if (isObject(payload) && isObject(payload.data) && Array.isArray(payload.data.data)) {
    return { items: payload.data.data as Comment[], meta: pickMeta(payload.data) };
  }

  return { items: [] };
}

function normalizeComment(payload: unknown): Comment | null {
  const data = unwrap<unknown>(payload);

  if (isObject(data) && isObject(data.comment)) {
    return data.comment as Comment;
  }

  if (isObject(data)) {
    return data as Comment;
  }

  if (isObject(payload) && isObject(payload.comment)) {
    return payload.comment as Comment;
  }

  if (isObject(payload) && isObject(payload.data) && isObject(payload.data.comment)) {
    return payload.data.comment as Comment;
  }

  return null;
}

export const commentService = {
  async list(database: string, params?: CommentListParams) {
    const response = await apiClient.get<unknown>(
      API_ENDPOINTS.COMMENTS.LIST_PUBLIC(database),
      params ? { params } : undefined
    );
    return normalizeList(response);
  },
  async create(database: string, data: { body: string; commentable_id: number; commentable_type: string }) {
    const response = await apiClient.post<unknown>(API_ENDPOINTS.COMMENTS.STORE(database), data);
    return normalizeComment(response);
  },
  async remove(database: string, id: number | string) {
    return apiClient.delete(API_ENDPOINTS.COMMENTS.DELETE(database, id));
  }
};
