import { supabase } from '@/lib/supabase/client';

const IMAGE_UPLOAD_URL = 'https://media.vorakaradeniz.com/api/upload';

export type PublicImageUpload = {
  url: string | null;
  storagePath: string | null;
  error: string | null;
};

export type ReservedImageUpload = {
  uploadUrl: string;
  url: string;
  key: string;
  headers?: Record<string, string>;
};

export async function reservePublicImageUpload(input: {
  folder: string;
  path: string;
  contentType: string;
}): Promise<{ ticket: ReservedImageUpload | null; error: string | null }> {
  try {
    if (!input.contentType.startsWith('image/')) {
      return { ticket: null, error: 'Yalnızca resim yüklenebilir.' };
    }
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return { ticket: null, error: 'Oturum gerekli.' };

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
      return { ticket: null, error: payload?.error ?? 'Görsel yüklenemedi.' };
    }
    return {
      ticket: {
        uploadUrl: payload.uploadUrl,
        url: payload.url,
        key: payload.key ?? key,
        headers: payload.headers,
      },
      error: null,
    };
  } catch (error) {
    return { ticket: null, error: error instanceof Error ? error.message : 'Görsel yüklenemedi.' };
  }
}

export async function completePublicImageUpload(
  ticket: ReservedImageUpload,
  bytes: ArrayBuffer,
): Promise<PublicImageUpload> {
  try {
    const stored = await fetch(ticket.uploadUrl, {
      method: 'PUT',
      headers: ticket.headers,
      body: bytes,
    });
    if (!stored.ok) return { url: null, storagePath: null, error: 'Görsel kaydedilemedi.' };
    return { url: ticket.url, storagePath: ticket.key, error: null };
  } catch (error) {
    return { url: null, storagePath: null, error: error instanceof Error ? error.message : 'Görsel yüklenemedi.' };
  }
}

export async function uploadPublicImage(input: {
  folder: string;
  path: string;
  bytes: ArrayBuffer;
  contentType: string;
}): Promise<PublicImageUpload> {
  const reserved = await reservePublicImageUpload(input);
  if (!reserved.ticket) return { url: null, storagePath: null, error: reserved.error };
  return completePublicImageUpload(reserved.ticket, input.bytes);
}
