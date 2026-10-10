import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20';
import { json, jsonSafeError, requireAuth } from '../_shared/supabaseAuth.ts';

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
  'app-appearance-media',
  'platform-guide-media',
  'web-media',
  'push-template-images',
  'music-covers',
  'incident-media',
]);

const MAX_BYTES = 18 * 1024 * 1024;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true });
  if (req.method !== 'POST') return json({ error: 'Desteklenmeyen istek.' }, 405);

  try {
    const auth = await requireAuth(req);
    if (auth instanceof Response) return auth;

    const accountId = Deno.env.get('R2_ACCOUNT_ID');
    const bucket = Deno.env.get('R2_BUCKET');
    const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY');
    const publicBase = Deno.env.get('R2_PUBLIC_BASE')?.replace(/\/$/, '');
    if (!accountId || !bucket || !accessKeyId || !secretAccessKey || !publicBase) {
      return json({ error: 'Görsel deposu hazır değil.' }, 500);
    }

    const contentType = (req.headers.get('Content-Type') || 'image/jpeg').split(';')[0].trim().toLowerCase();
    if (!contentType.startsWith('image/')) return json({ error: 'Yalnızca resim yüklenebilir.' }, 415);

    const key = safeKey(req.headers.get('X-Object-Key') || '');
    if (!key) return json({ error: 'Geçersiz dosya yolu.' }, 400);

    const bytes = await req.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > MAX_BYTES) {
      return json({ error: 'Resim boyutu uygun değil.' }, 413);
    }

    const objectKey = key;
    const encoded = objectKey.split('/').map(encodeURIComponent).join('/');
    const client = new AwsClient({ accessKeyId, secretAccessKey, service: 's3', region: 'auto' });
    const stored = await client.fetch(
      `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${encoded}`,
      {
        method: 'PUT',
        body: bytes,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      },
    );
    if (!stored.ok) return json({ error: 'Görsel kaydedilemedi.' }, 502);

    return json({
      url: `${publicBase}/${encoded}`,
      key: objectKey,
      contentType,
    }, 201);
  } catch (error) {
    return jsonSafeError(error);
  }
});

function safeKey(raw: string): string | null {
  const key = raw.replace(/^\/+/, '');
  if (!key || key.length > 240 || key.includes('..')) return null;
  if (!/^[A-Za-z0-9][A-Za-z0-9_./-]*$/.test(key)) return null;
  const folder = key.split('/')[0];
  if (!FOLDERS.has(folder)) return null;
  return key;
}
