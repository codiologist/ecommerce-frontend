import { apiClient } from '@/lib/api-client';
import { isApiError } from '@/lib/api-error';

import type {
  ActiveSession,
  AdminSession,
  ChangePasswordInput,
  LoginInput,
  LoginResponse,
  LoginTwoFactorInput,
  MessageResponse,
  ReauthInput,
  RegisterInput,
  TwoFactorSetup,
  UpdateProfileInput,
  User,
} from './types';

/** Current user, or null when not logged in (never redirects: safe on public pages). */
export async function getMe(signal?: AbortSignal): Promise<User | null> {
  try {
    return await apiClient.get<User>('/users/me', {
      authRedirect: false,
      ...(signal ? { signal } : {}),
    });
  } catch (error) {
    if (isApiError(error) && error.status === 401) return null;
    throw error;
  }
}

export const authApi = {
  register: (input: RegisterInput) => apiClient.post<MessageResponse>('/auth/register', input),
  verifyEmail: (token: string) => apiClient.post<MessageResponse>('/auth/verify-email', { token }),
  resendVerification: (email: string) =>
    apiClient.post<MessageResponse>('/auth/resend-verification', { email }),
  login: (input: LoginInput) => apiClient.post<LoginResponse>('/auth/login', input),
  loginTwoFactor: (input: LoginTwoFactorInput) =>
    apiClient.post<LoginResponse>('/auth/login/2fa', input),
  logout: () => apiClient.post<undefined>('/auth/logout', undefined, { authRedirect: false }),
  logoutAll: () => apiClient.post<undefined>('/auth/logout-all'),
  forgotPassword: (email: string) =>
    apiClient.post<MessageResponse>('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    apiClient.post<MessageResponse>('/auth/reset-password', { token, password }),
  reauth: (input: ReauthInput) => apiClient.post<undefined>('/auth/reauth', input),
  setupTwoFactor: () => apiClient.post<TwoFactorSetup>('/auth/2fa/setup'),
  enableTwoFactor: (code: string) =>
    apiClient.post<{ backupCodes: string[] }>('/auth/2fa/enable', { code }),
  disableTwoFactor: () => apiClient.post<undefined>('/auth/2fa/disable'),
};

export const accountApi = {
  updateProfile: (input: UpdateProfileInput) => apiClient.patch<User>('/users/me', input),
  changePassword: (input: ChangePasswordInput) =>
    apiClient.post<undefined>('/users/me/change-password', input),
  listSessions: (signal?: AbortSignal) =>
    apiClient.get<ActiveSession[]>('/users/me/sessions', signal ? { signal } : {}),
  revokeSession: (id: string) =>
    apiClient.delete<undefined>(`/users/me/sessions/${encodeURIComponent(id)}`),
};

export const adminApi = {
  session: (signal?: AbortSignal) =>
    apiClient.get<AdminSession>('/admin/session', signal ? { signal } : {}),
};
