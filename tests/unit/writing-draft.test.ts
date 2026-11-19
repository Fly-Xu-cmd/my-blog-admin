import { creationKey } from '../../src/utils/api';
import { draftSession } from '../../src/utils/writing-draft';

const login = (username: string) =>
  localStorage.setItem(
    'accessToken',
    `header.${btoa(JSON.stringify({ username }))}.signature`,
  );
beforeEach(() => {
  localStorage.clear();
  login('writer');
});
test('refresh recovery retains a lost-response creation key and rotates it after content changes', () => {
  const original = draftSession('new-post');
  const fields = { title: 'Test', content: 'Saved locally' };
  const request = {};
  const key = creationKey(request, fields);
  original.write(fields, request);
  const refresh = draftSession('new-post');
  const recovered = refresh.candidates[0].value;
  expect(recovered.fields).toEqual(fields);
  expect(creationKey(recovered.request, fields)).toBe(key);
  expect(
    creationKey(recovered.request, { ...fields, content: 'Changed' }),
  ).not.toBe(key);
  expect(JSON.stringify(refresh.candidates)).not.toContain('signature');
});
test('two windows keep separate drafts and an old discard cannot delete a new save', () => {
  const first = draftSession('posts:test');
  first.write({ content: 'A' }, {});
  const second = draftSession('posts:test');
  first.write({ content: 'B' }, {});
  second.discard(second.candidates[0]);
  second.write({ content: 'C' }, {});
  expect(
    draftSession('posts:test')
      .candidates.map((r) => r.value.fields.content)
      .sort(),
  ).toEqual(['B', 'C']);
  second.clear();
  expect(draftSession('posts:test').candidates[0].value.fields.content).toBe(
    'B',
  );
});
test('account changes isolate recovery and reject writes from the previous editor', () => {
  const first = draftSession('new-post');
  first.write({ content: 'private' }, {});
  login('other');
  expect(draftSession('new-post').candidates).toHaveLength(0);
  expect(() => first.write({ content: 'oops' }, {})).toThrow('登录身份已改变');
  expect(() => first.clear()).toThrow();
});
