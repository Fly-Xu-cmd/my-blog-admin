import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compatible, waitForApi } from '../scripts/check-api-compatibility.mjs';
const valid = { ok: true, contractVersion: 1, capabilities: ['admin-header-auth', 'content-summaries', 'idempotent-create', 'dynamic-drafts', 'series-v1'] };
test('rejects old versions, incomplete capabilities, errors and malformed replies', () => {
  for (const value of [null, {}, { ...valid, ok: false }, { ...valid, contractVersion: 2 }, { ...valid, capabilities: ['series-v1'] }])
    assert.equal(compatible(value), false);
  assert.equal(compatible(valid), true);
});
test('waits for live API, bounded retries never write or retry a deployment', async () => {
  let calls = 0, waits = 0;
  await waitForApi('https://example.test', { attempts: 3, pause: async () => { waits++; }, request: async (url, options) => {
    assert.equal(url.pathname, '/api/deployment/readiness');
    assert.equal(options.method, undefined);
    calls++;
    return { ok: calls === 3, json: async () => valid };
  } });
  assert.equal(calls, 3); assert.equal(waits, 2);
  await assert.rejects(waitForApi('https://example.test', { attempts: 2, pause: async () => {}, request: async () => { throw new Error('offline'); } }));
});
test('credentials and non-HTTP addresses are rejected before any request', async () => {
  for (const base of ['file:///tmp/file', 'https://user:password@example.test'])
    await assert.rejects(waitForApi(base, { request: () => { assert.fail('must not request'); } }));
});
