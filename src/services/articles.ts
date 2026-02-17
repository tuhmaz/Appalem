import { apiClient } from './apiClient';
import { API_ENDPOINTS } from './endpoints';
import type { Article, PaginatedResponse } from '@/types/api';

function unwrap<T>(payload: any): T {
  return payload?.data ?? payload;
}

export const articleService = {
  async list(params?: Record<string, string | number | boolean>) {
    const response = await apiClient.get<PaginatedResponse<Article> | { data: PaginatedResponse<Article> } | { data: Article[] }>(
      API_ENDPOINTS.ARTICLES.LIST,
      { params }
    );
    return unwrap<any>(response);
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

