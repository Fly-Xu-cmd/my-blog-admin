import { pathToFileURL } from 'node:url';
import { waitForApi } from './check-api-compatibility.mjs';
export async function healthy(base, id, api = base) {
  const url = new URL(base);
  const get = (target, method = 'GET') => fetch(target, { method, redirect: 'error', signal: AbortSignal.timeout(5000), headers: { 'Cache-Control': 'no-cache' } });
  const marker = await get(new URL(`/deploy-version.txt?v=${id}`, url));
  if (!marker.ok || (await marker.text()).trim() !== id) throw new Error('Wrong admin release');
  const page = await get(new URL('/?deploy=' + id, url));
  if (!page.ok) throw new Error('Admin page unavailable');
  const html = await page.text();
  const assets = [...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g)]
    .map((match) => new URL(match[1], url)).filter((asset) => asset.origin === url.origin);
  if (!assets.some((asset) => asset.pathname.endsWith('.js'))) throw new Error('Admin bundle missing');
  for (const asset of assets) {
    const response = await get(asset, 'HEAD');
    const type = response.headers.get('content-type') || '';
    const expectedType = asset.pathname.endsWith('.js') ? /javascript|ecmascript/i : /text\/css/i;
    if (!response.ok || !expectedType.test(type)) throw new Error('Admin asset unavailable');
  }
  await waitForApi(api, { attempts: 1 });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  healthy(...process.argv.slice(2)).catch(() => { console.error('Admin health check failed'); process.exitCode = 1; });
