import { apiClient } from './apiClient';
import { API_ENDPOINTS } from './endpoints';
import type { ContactRequestPayload, Member, Settings } from '@/types/api';

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const data = (payload as { data?: unknown }).data;
    return (data ?? payload) as T;
  }
  return payload as T;
}

export type LegalType = 'privacy' | 'terms' | 'cookie' | 'disclaimer';

export type LegalPayload = {
  page: string;
  settings: Record<string, unknown>;
};

function normalizeLegal(payload: unknown): LegalPayload {
  const raw = unwrap<unknown>(payload);
  const data = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const settings =
    data?.settings && typeof data.settings === 'object' ? data.settings as Record<string, unknown> : {};

  return {
    page: typeof data?.page === 'string' ? data.page : '',
    settings,
  };
}

export const frontService = {
  async settings() {
    const response = await apiClient.get<{ data: Settings } | Settings>(API_ENDPOINTS.FRONT.SETTINGS);
    return unwrap<Settings>(response);
  },
  async submitContact(payload: ContactRequestPayload) {
    return apiClient.post(API_ENDPOINTS.FRONT.CONTACT, payload);
  },
  async members() {
    const response = await apiClient.get<Member[] | { data: Member[] }>(API_ENDPOINTS.FRONT.MEMBERS);
    return unwrap<Member[]>(response);
  },
  async member(id: number | string) {
    const response = await apiClient.get<Member | { data: Member }>(API_ENDPOINTS.FRONT.MEMBER(id));
    return unwrap<Member>(response);
  },
  async legal(type: LegalType) {
    const map = {
      privacy: API_ENDPOINTS.LEGAL.PRIVACY,
      terms: API_ENDPOINTS.LEGAL.TERMS,
      cookie: API_ENDPOINTS.LEGAL.COOKIE,
      disclaimer: API_ENDPOINTS.LEGAL.DISCLAIMER
    } as const;
    const response = await apiClient.get(map[type]);
    return normalizeLegal(response);
  }
};
