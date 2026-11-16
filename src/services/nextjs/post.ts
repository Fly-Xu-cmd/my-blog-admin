import { request } from '@umijs/max';
export function addPost(payload?: Record<string, unknown>, key?: string) {
  return request<API.PostList>('/api/posts', {
    method: 'POST',
    data: payload,
    headers: { 'Idempotency-Key': key || crypto.randomUUID() },
  });
}
export function getPosts(params?: Record<string, any>, options?: Record<string, any>) {
  return request<API.PostList>('/api/posts', {
    method: 'GET',
    params: {
      ...params,
      scope: 'admin',
      current: params?.current || 1,
      pageSize: params?.pageSize || 10,
    },
    ...options,
  });
}
export function updatePost(slug: string, payload?: Record<string, unknown>) {
  return request<API.PostList>('/api/posts/' + encodeURIComponent(slug), {
    method: 'PUT',
    data: payload,
  });
}
export function deletePost(slug: string) {
  return request('/api/posts/' + encodeURIComponent(slug), { method: 'DELETE' });
}
