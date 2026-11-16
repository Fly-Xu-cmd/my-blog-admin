import { api, authHeaders, authFailure, creationKey, uploadImage } from '../../src/utils/api';
import { history } from '@umijs/max';
beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  global.fetch = jest.fn();
  global.Headers = class {
    private entries = new Map<string, string>();
    constructor(values?: Record<string, string>) {
      for (const [key, val] of Object.entries(values || {})) this.set(key, val);
    }
    set(key: string, value: string) {
      this.entries.set(key.toLowerCase(), value);
    }
    get(key: string) {
      return this.entries.get(key.toLowerCase());
    }
  } as unknown as typeof Headers;
});
test('creation retries retain UUID and changing content or starting again rotates it', () => {
  const state = {};
  const first = creationKey(state, { title: '中文' });
  expect(first).toMatch(/^[0-9a-f-]{36}$/);
  expect(creationKey(state, { title: '中文' })).toBe(first);
  expect(creationKey(state, { title: 'new' })).not.toBe(first);
  expect(creationKey({}, { title: '中文' })).not.toBe(first);
});
test('fetch sends header token and idempotency key without retrying failed writes', async () => {
  localStorage.setItem('accessToken', 'test-token');
  (fetch as jest.Mock).mockResolvedValue({
    ok: false,
    status: 403,
    json: async () => ({ error: 'forbidden' }),
  });
  await expect(
    api('/api/posts', { method: 'POST', body: '{}', headers: { 'Idempotency-Key': 'key' } }),
  ).rejects.toMatchObject({ status: 403 });
  expect(fetch).toHaveBeenCalledTimes(1);
  const options = (fetch as jest.Mock).mock.calls[0][1];
  expect(options.headers.get('Authorization')).toBe('Bearer test-token');
  expect(options.headers.get('Idempotency-Key')).toBe('key');
  expect(localStorage.getItem('accessToken')).toBe('test-token');
});
test('401 clears token and navigates to login; 403 retains session', () => {
  localStorage.setItem('accessToken', 'token');
  expect(authHeaders()).toEqual({ Authorization: 'Bearer token' });
  authFailure(403);
  expect(localStorage.getItem('accessToken')).toBe('token');
  authFailure(401);
  expect(localStorage.getItem('accessToken')).toBeNull();
  expect(history.push).toHaveBeenCalledWith('/user/login');
});
test('upload uses header identity and multipart body without JSON content type', async () => {
  localStorage.setItem('accessToken', 'token');
  (fetch as jest.Mock).mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ url: 'https://example.com/image.png' }),
  });
  expect(await uploadImage(new File(['png'], 'image.png', { type: 'image/png' }))).toContain(
    'image.png',
  );
  const options = (fetch as jest.Mock).mock.calls[0][1];
  expect(options.headers.get('Authorization')).toBe('Bearer token');
  expect(options.headers.get('Content-Type')).toBeUndefined();
  expect(options.body).toBeInstanceOf(FormData);
});
