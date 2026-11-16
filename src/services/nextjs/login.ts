import { request } from '@umijs/max';
import { authFailure } from '@/utils/api';
export function login(options?: Record<string, unknown>) {
  return request<API.LoginResponse>('/api/login', { method: 'POST', data: options });
}
export function loginOut() {
  localStorage.removeItem('accessToken');
  return Promise.resolve({ ok: true });
}
export function checkToken(token: string) {
  return request<API.LoginResponse>('/api/auth/me', {
    method: 'GET',
    headers: { Authorization: 'Bearer ' + token },
    skipErrorHandler: true,
  }).catch((error) => {
    authFailure(error.response?.status);
    return { ok: false };
  });
}
