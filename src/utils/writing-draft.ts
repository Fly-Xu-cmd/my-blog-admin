export type RequestKey = { key?: string; hash?: string };
export type WritingDraft = {
  version: 1;
  fields: Record<string, any>;
  request: RequestKey;
  updatedAt: string;
};
const prefix = 'blog-writing-v1:';

// Scope drafts by API and account, without storing an authentication token.
function scope(slot: string) {
  const token = localStorage.getItem('accessToken') || '';
  const encoded = (token.split('.')[1] || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const payload = JSON.parse(
    decodeURIComponent(
      Array.from(
        atob(encoded),
        (char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`,
      ).join(''),
    ),
  );
  if (typeof payload.username !== 'string')
    throw new Error('请先登录后保存本地草稿');
  const base = new URL(process.env.BASE_API_URL || window.location.origin).href;
  return (
    prefix +
    encodeURIComponent(JSON.stringify([base, payload.username, slot])) +
    ':'
  );
}
export function draftSession(slot: string) {
  const namespace = scope(slot);
  const ownKey = namespace + crypto.randomUUID();
  const assertAccount = () => {
    if (scope(slot) !== namespace)
      throw new Error('登录身份已改变，请重新打开编辑器');
  };
  const candidates = Object.keys(localStorage)
    .filter((key) => key.startsWith(namespace))
    .flatMap((key) => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const value = JSON.parse(raw) as WritingDraft;
        return value.version === 1 &&
          typeof value.updatedAt === 'string' &&
          value.request &&
          typeof value.request === 'object' &&
          value.fields &&
          typeof value.fields === 'object'
          ? [{ key, raw, value }]
          : [];
      } catch {
        return [];
      }
    })
    .sort((a, b) => b.value.updatedAt.localeCompare(a.value.updatedAt));
  return {
    candidates,
    write(fields: WritingDraft['fields'], request: RequestKey) {
      assertAccount();
      localStorage.setItem(
        ownKey,
        JSON.stringify({
          version: 1,
          fields,
          request,
          updatedAt: new Date().toISOString(),
        } satisfies WritingDraft),
      );
    },
    clear() {
      assertAccount();
      localStorage.removeItem(ownKey);
    },
    discard(candidate: (typeof candidates)[number]) {
      assertAccount();
      // A different window may have saved this draft since it was offered.
      if (localStorage.getItem(candidate.key) === candidate.raw)
        localStorage.removeItem(candidate.key);
    },
  };
}
