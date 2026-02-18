import { apiClient } from './apiClient';
import { API_ENDPOINTS } from './endpoints';
import type { Article, PaginatedResponse } from '@/types/api';

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const data = (payload as { data?: unknown }).data;
    return (data ?? payload) as T;
  }
  return payload as T;
}

export const articleService = {
  async list(params?: Record<string, string | number | boolean>): Promise<PaginatedResponse<Article>> {
    const response = await apiClient.get<
      PaginatedResponse<Article> |
      { data: PaginatedResponse<Article> } |
      { data: Article[] } |
      Article[]
    >(
      API_ENDPOINTS.ARTICLES.LIST,
      { params }
    );
    const data = unwrap<PaginatedResponse<Article> | Article[]>(response);
    if (Array.isArray(data)) {
      return { data };
    }
    if (Array.isArray(data.data)) {
      return data;
    }
    return { data: [] };
  },
  async show(id: number | string) {
    const response = await apiClient.get<{ data: Article } | Article>(API_ENDPOINTS.ARTICLES.SHOW(id));
    return unwrap<Article>(response);
  },
  async byClass(gradeLevel: number | string, params?: Record<string, string | number | boolean>) {
    const response = await apiClient.get<{ data: Article[] } | Article[]>(API_ENDPOINTS.ARTICLES.BY_CLASS(gradeLevel), { params });
    return unwrap<Article[]>(response);
  },
  async byKeyword(keyword: string, params?: Record<string, string | number | boolean>) {
    const response = await apiClient.get<{ data: Article[] } | Article[]>(API_ENDPOINTS.ARTICLES.BY_KEYWORD(keyword), { params });
    return unwrap<Article[]>(response);
  },
  downloadUrl(id: number | string) {
    return `${API_ENDPOINTS.ARTICLES.DOWNLOAD(id)}`;
  }
};

