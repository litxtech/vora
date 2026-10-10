import type { SupabaseClient } from '@supabase/supabase-js';

const IMAGE_UPLOAD_URL = 'https://media.vorakaradeniz.com/api/upload';

export async function uploadPublicImage(
  supabase: SupabaseClient,
  input: { folder: string; path: string; bytes: ArrayBuffer; contentType: string },
): Promise<{ url: string | null; storagePath: string | null; error: string | null }> {
  if (!input.contentType.startsWith('image/')) {
    return { url: null, storagePath: null, error: 'Yalnızca resim yüklenebilir.' };
  }
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { url: null, storagePath: null, error: 'Oturum gerekli.' };

  const key = `${input.folder}/${input.path.replace(/^\/+/, '')}`;
  const response = await fetch(IMAGE_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ key, contentType: input.contentType }),
  });
  const payload = (await response.json().catch(() => null)) as {
    url?: string;
    key?: string;
    uploadUrl?: string;
    headers?: Record<string, string>;
    error?: string;
  } | null;
  if (!response.ok || !payload?.uploadUrl || !payload.url) {
    return { url: null, storagePath: null, error: payload?.error ?? 'Görsel yüklenemedi.' };
  }

  const stored = await fetch(payload.uploadUrl, {
    method: 'PUT',
    headers: payload.headers,
    body: input.bytes,
  });
  if (!stored.ok) return { url: null, storagePath: null, error: 'Görsel kaydedilemedi.' };
  return { url: payload.url, storagePath: payload.key ?? key, error: null };
}
