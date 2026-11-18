import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { healthy } from '../scripts/check-admin-health.mjs';
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
