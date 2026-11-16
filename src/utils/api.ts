import { history } from '@umijs/max';
export function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: 'Bearer ' + token } : {};
}
export function authFailure(status: number) {
  if (status === 401) {
    localStorage.removeItem('accessToken');
    if (history.location.pathname !== '/user/login') history.push('/user/login');
  }
}
export class RequestError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T = any>(route: string, options: RequestInit = {}): Promise<T> {
  const base = process.env.BASE_API_URL || window.location.origin;
  const url = new URL(route, base);
  const headers = new Headers(options.headers);
  for (const [k, v] of Object.entries(authHeaders())) headers.set(k, v);
  if (options.body && !(options.body instanceof FormData))
    headers.set('Content-Type', 'application/json');
  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({ error: '服务响应无效' }));
  if (!response.ok || data.ok === false) {
    authFailure(response.status);
    throw new RequestError(data.error || '请求失败', response.status);
  }
  return data;
}
export async function uploadImage(file: File) {
  const form = new FormData();
  form.append('file', file);
  const result = await api<{ url: string }>('/api/upload-qiniu', { method: 'POST', body: form });
  return result.url;
}
export function creationKey(state: { key?: string; hash?: string }, payload: unknown) {
  const hash = JSON.stringify(payload);
  if (state.hash !== hash || !state.key) {
    state.hash = hash;
    state.key = crypto.randomUUID();
  }
  return state.key;
}
