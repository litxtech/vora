const FOLDERS = new Set([
  'avatars',
  'covers',
  'post-media',
  'marketplace-listings',
  'hotel-listings',
  'job-listings',
  'lost-items',
  'ride-vehicles',
  'vora-hizmetler',
  'vora-needs',
  'message-media',
  'announcements',
  'caps',
  'izdivac-media',
  'trust-promo',
  'platform-guide',
  'web-media',
  'push-template-images',
  'music-covers',
  'incident-media',
  'app-appearance-media',
  'platform-guide-media',
]);

const MAX_BYTES = 18 * 1024 * 1024;
const WEBP_QUALITY = 90;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Object-Key',
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/upload') {
      return upload(request, env);
    }
    if (request.method === 'GET' || request.method === 'HEAD') {
      return serve(request, env, ctx, url);
    }
    return json({ error: 'Desteklenmeyen istek.' }, 405);
  },
};

async function upload(request, env) {
  const userId = await authenticatedUserId(request, env);
  if (!userId) return json({ error: 'Oturum gerekli.' }, 401);

  const rawKey = request.headers.get('X-Object-Key') || '';
  const contentType = (request.headers.get('Content-Type') || 'image/jpeg').split(';')[0].trim().toLowerCase();
  if (!contentType.startsWith('image/')) return json({ error: 'Yalnızca resim yüklenebilir.' }, 415);

  const key = safeKey(rawKey);
  if (!key) return json({ error: 'Geçersiz dosya yolu.' }, 400);

  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > MAX_BYTES) {
    return json({ error: 'Resim boyutu uygun değil.' }, 413);
  }

  const stored = await encodeImage(env, bytes, contentType);
  const objectKey = withExtension(key, stored.contentType);
  await env.BUCKET.put(objectKey, stored.bytes, {
    httpMetadata: {
      contentType: stored.contentType,
      cacheControl: 'public, max-age=31536000, immutable',
    },
  });

  return json({
    url: publicUrl(request, objectKey),
    key: objectKey,
    contentType: stored.contentType,
  }, 201);
}

async function serve(request, env, ctx, url) {
  const key = safeKey(decodeURIComponent(url.pathname.replace(/^\/+/, '')));
  if (!key) return json({ error: 'Bulunamadı.' }, 404);

  const cacheKey = new Request(url.origin + '/' + key, { method: 'GET' });
  const cache = caches.default;
  if (request.method === 'GET') {
    const hit = await cache.match(cacheKey);
    if (hit) return withCors(hit);
  }

  const object = await env.BUCKET.get(key);
  if (!object) return json({ error: 'Bulunamadı.' }, 404);

  const headers = new Headers(CORS);
  object.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('ETag', object.httpEtag);
  const response = new Response(request.method === 'HEAD' ? null : object.body, { headers });
  if (request.method === 'GET') ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

async function encodeImage(env, bytes, contentType) {
  if (contentType === 'image/gif' || contentType === 'image/webp' || !env.IMAGES) {
    return { bytes, contentType };
  }
  try {
    const output = await env.IMAGES.input(bytes).output({ format: 'image/webp', quality: WEBP_QUALITY });
    const response = output.response();
    return { bytes: await response.arrayBuffer(), contentType: 'image/webp' };
  } catch {
    return { bytes, contentType };
  }
}

async function authenticatedUserId(request, env) {
  const header = request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: env.SUPABASE_ANON_KEY,
    },
  });
  if (!response.ok) return null;
  const body = await response.json();
  return typeof body?.id === 'string' ? body.id : null;
}

function safeKey(raw) {
  const key = String(raw || '').replace(/^\/+/, '');
  if (!key || key.length > 240 || key.includes('..')) return null;
  if (!/^[A-Za-z0-9][A-Za-z0-9_./-]*$/.test(key)) return null;
  const folder = key.split('/')[0];
  if (!FOLDERS.has(folder)) return null;
  return key;
}

function withExtension(key, contentType) {
  const ext = contentType === 'image/webp'
    ? 'webp'
    : contentType === 'image/png'
      ? 'png'
      : contentType === 'image/gif'
        ? 'gif'
        : 'jpg';
  const stem = key.replace(/\.[A-Za-z0-9]+$/, '');
  return `${stem}.${ext}`;
}

function publicUrl(request, key) {
  const origin = new URL(request.url).origin;
  return `${origin}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function withCors(response) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(CORS)) headers.set(name, value);
  return new Response(response.body, { status: response.status, headers });
}
