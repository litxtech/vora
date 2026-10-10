import { CACHE_CONTROL, objectUrl, r2Client, r2Config, safeKey } from '../lib/images.js';

export const config = { runtime: 'edge' };

export default async function handler(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Desteklenmeyen istek.', { status: 405 });
  }
  const key = safeKey(new URL(request.url).searchParams.get('key') || '');
  const settings = r2Config();
  if (!key || !settings) {
    return new Response('Vora görselleri', {
      status: key ? 400 : 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  const upstream = await r2Client(settings).fetch(objectUrl(settings, key), { method: 'GET' });
  if (!upstream.ok) {
    return new Response('Görsel bulunamadı.', { status: upstream.status === 404 ? 404 : 502 });
  }

  const headers = new Headers();
  headers.set('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream');
  headers.set('Cache-Control', upstream.headers.get('cache-control') || CACHE_CONTROL);
  headers.set('Access-Control-Allow-Origin', '*');
  return new Response(request.method === 'HEAD' ? null : upstream.body, { status: 200, headers });
}
