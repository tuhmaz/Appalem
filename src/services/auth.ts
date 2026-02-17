import { apiClient } from './apiClient';
import { API_ENDPOINTS } from './endpoints';
import type { AuthResponse, User } from '@/types/api';

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const data = (payload as { data?: unknown }).data;
    return (data ?? payload) as T;
  }
  return payload as T;
}

export const authService = {
  async login(payload: { email: string; password: string }): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse | { data: AuthResponse }>(API_ENDPOINTS.AUTH.LOGIN, payload);
    return unwrap<AuthResponse>(response);
  },
  async register(payload: { name: string; email: string; password: string; password_confirmation: string }): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse | { data: AuthResponse }>(API_ENDPOINTS.AUTH.REGISTER, payload);
    return unwrap<AuthResponse>(response);
  },
  async me(): Promise<User> {
    const response = await apiClient.get<{ data: { user: User } } | { user: User } | { data: User }>(API_ENDPOINTS.AUTH.ME);
    const data = unwrap<{ user?: User } | User>(response);
    if (data && typeof data === 'object' && 'user' in data && data.user) {
      return data.user;
    }
    return data as User;
  },
  async logout(): Promise<void> {
    await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
  },
  async forgotPassword(email: string) {
    return apiClient.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
  },
  async resetPassword(payload: { email: string; token: string; password: string; password_confirmation: string }) {
    return apiClient.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, payload);
  },
  async resendVerification() {
    return apiClient.post(API_ENDPOINTS.AUTH.RESEND_VERIFY);
  },
  async loginWithGoogleToken(accessToken: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse | { data: AuthResponse }>(
      API_ENDPOINTS.AUTH.GOOGLE_TOKEN,
      { access_token: accessToken }
    );
    return unwrap<AuthResponse>(response);
  },
  async deleteAccount(password?: string): Promise<void> {
    await apiClient.post(API_ENDPOINTS.AUTH.DELETE_ACCOUNT, password ? { password } : {});
  },
};
