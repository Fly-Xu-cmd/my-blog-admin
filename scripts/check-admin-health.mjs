import { pathToFileURL } from 'node:url';
import { waitForApi } from './check-api-compatibility.mjs';
function siteClient(base, {
  username = process.env.BLOG_ADMIN_HTTP_USERNAME || '',
  password = process.env.BLOG_ADMIN_HTTP_PASSWORD || '',
} = {}) {
  const url = new URL(base);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
    throw new Error('Admin site URL must use HTTP(S) without embedded credentials');
  if (Boolean(username) !== Boolean(password) || username.includes(':'))
    throw new Error('Configure both BLOG_ADMIN_HTTP_USERNAME and BLOG_ADMIN_HTTP_PASSWORD with a valid Basic Auth username');
  if (username && url.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    throw new Error('Admin Basic Auth requires HTTPS outside loopback');
  const headers = { 'Cache-Control': 'no-cache' };
  if (username) headers.Authorization = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
  const get = async (target, stage, method = 'GET') => {
    if (target.origin !== url.origin || target.username || target.password)
      throw new Error(`${stage}: refusing credentials outside the configured admin origin`);
    let response;
    try { response = await fetch(target, { method, redirect: 'error', signal: AbortSignal.timeout(5000), headers }); }
    catch { throw new Error(`${stage}: request failed (network, TLS, timeout or redirect)`); }
    if (!response.ok) {
      const hint = response.status === 401
        ? '; check BLOG_ADMIN_HTTP_USERNAME / BLOG_ADMIN_HTTP_PASSWORD Secrets for Nginx Basic Auth' : '';
      throw new Error(`${stage}: HTTP ${response.status}${hint}`);
    }
    return response;
  };
  return { url, get };
}

export async function checkSiteAccess(base, credentials) {
  const { url, get } = siteClient(base, credentials);
  const response = await get(new URL('/', url), 'admin access');
  await response.body?.cancel();
}

export async function healthy(base, id, api = base, credentials) {
  const { url, get } = siteClient(base, credentials);
  const marker = await get(new URL(`/deploy-version.txt?v=${id}`, url), 'release marker');
  if ((await marker.text()).trim() !== id) throw new Error('release marker: wrong admin release');
  const page = await get(new URL('/?deploy=' + id, url), 'admin page');
  const html = await page.text();
  const assets = [...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g)]
    .map((match) => new URL(match[1], url)).filter((asset) => asset.origin === url.origin);
  if (!assets.some((asset) => asset.pathname.endsWith('.js'))) throw new Error('Admin bundle missing');
  for (const asset of assets) {
    const response = await get(asset, `admin asset ${asset.pathname}`, 'HEAD');
    const type = response.headers.get('content-type') || '';
    const expectedType = asset.pathname.endsWith('.js') ? /javascript|ecmascript/i : /text\/css/i;
    if (!expectedType.test(type)) throw new Error(`admin asset ${asset.pathname}: unexpected Content-Type`);
  }
  await waitForApi(api, { attempts: 1 });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const check = args[0] === '--access-check'
    ? checkSiteAccess(args[1] || process.env.BLOG_ADMIN_SITE_URL || 'https://admin.xylxf.xyz')
    : healthy(...args);
  check.then(() => console.log(args[0] === '--access-check' ? 'Admin HTTP access verified' : 'Admin release and assets verified'))
    .catch((error) => { console.error(`Admin health check failed: ${error.message}`); process.exitCode = 1; });
}
