import { json, presignPut, r2Config, requireUser, safeKey } from '../lib/images.js';

export const config = { runtime: 'edge' };

export default async function handler(request) {
  if (request.method === 'OPTIONS') return json({ ok: true });
  if (request.method !== 'POST') return json({ error: 'Desteklenmeyen istek.' }, 405);

  try {
    const allowed = await requireUser(request);
    if (!allowed) return json({ error: 'Oturum gerekli.' }, 401);

    const settings = r2Config();
    if (!settings) return json({ error: 'Görsel deposu hazır değil.' }, 500);

    const body = await request.json().catch(() => null);
    const contentType = String(body?.contentType || '').split(';')[0].trim().toLowerCase();
    if (!contentType.startsWith('image/')) return json({ error: 'Yalnızca resim yüklenebilir.' }, 415);

    const key = safeKey(body?.key);
    if (!key) return json({ error: 'Geçersiz dosya yolu.' }, 400);

    const signed = await presignPut(settings, key, contentType);
    return json(signed, 201);
  } catch {
    return json({ error: 'Görsel kaydedilemedi.' }, 500);
  }
}
