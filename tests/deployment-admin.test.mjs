import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { healthy, checkSiteAccess } from '../scripts/check-admin-health.mjs';
test('admin readiness verifies actual release, index and hashed assets', async () => {
  let failure = '';
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/api/deployment/readiness')) {
      if (failure === 'api') res.statusCode = 503;
      return res.end(JSON.stringify({ ok: true, contractVersion: 1, capabilities: ['admin-header-auth','content-summaries','idempotent-create','dynamic-drafts','series-v1'] }));
    }
    if (req.url.startsWith('/deploy-version')) return res.end(failure === 'marker' ? 'old' : 'current');
    if (req.url.startsWith('/?')) return res.end('<html><script src="/umi.hash.js"></script><link href="/umi.hash.css"></html>');
    if (failure === 'asset') res.statusCode = 404;
    res.setHeader('Content-Type', failure === 'fallback' ? 'text/html' : req.url.endsWith('.js') ? 'application/javascript' : 'text/css');
    res.end('asset');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    await healthy(base, 'current');
    failure = 'marker'; await assert.rejects(healthy(base, 'current'));
    failure = 'asset'; await assert.rejects(healthy(base, 'current'));
    failure = 'fallback'; await assert.rejects(healthy(base, 'current'));
    failure = 'api'; await assert.rejects(healthy(base, 'current'));
  } finally { await new Promise((resolve) => server.close(resolve)); }
});

test('protected admin uses Basic Auth for site requests while keeping API auth independent', async (t) => {
  const credentials = { username: 'probe', password: "test-only:' 中文 password" };
  const expected = 'Basic ' + Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
  let redirectAsset = false;
  let externalRequests = 0;
  const external = http.createServer((req, res) => { externalRequests++; res.end('external'); });
  await new Promise((resolve) => external.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => external.close(resolve)));
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/api/deployment/readiness')) {
      if (req.headers.authorization) res.statusCode = 403;
      return res.end(JSON.stringify({ ok: true, contractVersion: 1, capabilities: ['admin-header-auth','content-summaries','idempotent-create','dynamic-drafts','series-v1'] }));
    }
    if (req.headers.authorization !== expected) {
      res.statusCode = 401;
      res.setHeader('WWW-Authenticate', 'Basic realm="Restricted Admin Area"');
      return res.end('private response must not be logged');
    }
    if (req.url.startsWith('/deploy-version')) return res.end('current');
    if (req.url.startsWith('/?') || req.url === '/') return res.end('<html><script src="/umi.hash.js"></script><link href="/umi.hash.css"></html>');
    if (redirectAsset) {
      res.statusCode = 302;
      res.setHeader('Location', `http://127.0.0.1:${external.address().port}/asset.js`);
      return res.end();
    }
    res.setHeader('Content-Type', req.url.endsWith('.js') ? 'application/javascript' : 'text/css');
    res.end('asset');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port;
  await assert.rejects(checkSiteAccess(base, { username: '', password: '' }), /admin access: HTTP 401; check BLOG_ADMIN_HTTP_USERNAME/);
  await assert.rejects(checkSiteAccess(base, { username: 'probe', password: 'wrong' }), /HTTP 401/);
  await assert.rejects(healthy(base, 'current', base, { username: '', password: '' }), /release marker: HTTP 401/);
  await checkSiteAccess(base, credentials);
  await healthy(base, 'current', base, credentials);
  redirectAsset = true;
  await assert.rejects(healthy(base, 'current', base, credentials), /admin asset.*request failed/);
  assert.equal(externalRequests, 0, 'No Basic Auth request may follow the asset redirect');
});

test('invalid or unsafe Basic Auth configuration fails before network requests without logging values', async () => {
  await assert.rejects(checkSiteAccess('https://admin.example', { username: 'probe', password: '' }), /Configure both/);
  await assert.rejects(checkSiteAccess('https://admin.example', { username: 'probe:invalid', password: 'test-only' }), /valid Basic Auth username/);
  await assert.rejects(checkSiteAccess('https://probe:test-only@admin.example', { username: '', password: '' }), /without embedded credentials/);
  await assert.rejects(checkSiteAccess('http://admin.example', { username: 'probe', password: 'test-only' }), /requires HTTPS/);
});
