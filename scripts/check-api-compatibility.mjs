import { pathToFileURL } from 'node:url';
const capabilities = ['admin-header-auth', 'content-summaries', 'idempotent-create', 'dynamic-drafts', 'series-v1', 'about-page-v1', 'reading-entry-v1'];
export function compatible(value) {
  return value?.ok === true && value.contractVersion === 1 && Array.isArray(value.capabilities) &&
    capabilities.every((name) => value.capabilities.includes(name));
}
export async function waitForApi(base, { attempts = 80, delay = 15000, request = fetch,
  pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  const url = new URL(base);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password)
    throw new Error('Invalid API base address');
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 120) throw new Error('Invalid attempt count');
  const endpoint = new URL(url.toString().replace(/\/$/, '') + '/api/deployment/readiness');
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt % 10 === 0) console.log(`Waiting for live API compatibility (${attempt + 1}/${attempts})`);
    try {
      const response = await request(endpoint, { signal: AbortSignal.timeout(5000), redirect: 'error',
        headers: { 'Cache-Control': 'no-cache' } });
      if (response.ok && compatible(await response.json())) { console.log('Live API compatibility verified'); return; }
    } catch { /* API may still be switching; retry only this read-only check. */ }
    if (attempt + 1 < attempts) await pause(delay);
  }
  throw new Error('Live API is not compatible or unavailable; check the frontend deployment. No admin files were switched.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  waitForApi(process.argv[2] || process.env.BLOG_API_BASE_URL || 'https://admin.xylxf.xyz',
    process.argv.includes('--once') ? { attempts: 1 } : {}).catch(() => {
    console.error('API compatibility check failed; verify the frontend/API deployment and rerun admin when healthy.');
    process.exitCode = 1;
  });
