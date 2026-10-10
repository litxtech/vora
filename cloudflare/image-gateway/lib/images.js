import { AwsClient } from 'aws4fetch';

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

export const CACHE_CONTROL = 'public, max-age=31536000, immutable';

export function safeKey(raw) {
  const key = String(raw || '').replace(/^\/+/, '');
  if (!key || key.length > 240 || key.includes('..')) return null;
  if (!/^[A-Za-z0-9][A-Za-z0-9_./-]*$/.test(key)) return null;
  const folder = key.split('/')[0];
  if (!FOLDERS.has(folder)) return null;
  return key;
}

export function encodeKey(key) {
  return key.split('/').map(encodeURIComponent).join('/');
}

function envValue(name) {
  return (process.env[name] || '').trim();
}

export function r2Config() {
  const accountId = envValue('R2_ACCOUNT_ID');
  const bucket = envValue('R2_BUCKET');
  const accessKeyId = envValue('R2_ACCESS_KEY_ID');
  const secretAccessKey = envValue('R2_SECRET_ACCESS_KEY');
  const publicBase = (envValue('IMAGE_PUBLIC_BASE') || envValue('R2_PUBLIC_BASE')).replace(/\/$/, '');
  if (!accountId || !bucket || !accessKeyId || !secretAccessKey || !publicBase) return null;
  return { accountId, bucket, accessKeyId, secretAccessKey, publicBase };
}

export function r2Client(config) {
  return new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: 's3',
    region: 'auto',
  });
}

export function objectUrl(config, key) {
  return `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}/${encodeKey(key)}`;
}

export async function presignPut(config, key, contentType) {
  const client = r2Client(config);
  const target = new URL(objectUrl(config, key));
  target.searchParams.set('X-Amz-Expires', '120');
  const signed = await client.sign(
    new Request(target, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Cache-Control': CACHE_CONTROL,
      },
    }),
    { aws: { signQuery: true, allHeaders: true } },
  );
  return {
    uploadUrl: signed.url,
    url: `${config.publicBase}/${encodeKey(key)}`,
    key,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': CACHE_CONTROL,
    },
  };
}

export async function requireUser(request) {
  const supabaseUrl = envValue('SUPABASE_URL').replace(/\/$/, '');
  const anonKey = envValue('SUPABASE_ANON_KEY');
  const authorization = request.headers.get('Authorization') || '';
  if (!supabaseUrl || !anonKey || !authorization.toLowerCase().startsWith('bearer ')) {
    return false;
  }
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: authorization, apikey: anonKey },
  });
  return response.ok;
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Cache-Control': 'no-store',
    },
  });
}
