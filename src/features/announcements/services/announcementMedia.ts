import { readLocalFileBytes } from '@/lib/files/readLocalFile';
import { supabase } from '@/lib/supabase/client';
import type { AnnouncementMediaItem, AnnouncementMediaType, DraftMediaItem } from '@/features/announcements/types';

const BUCKET = 'announcements';

function guessContentType(uri: string, mediaType: AnnouncementMediaType): string {
  const lower = uri.toLowerCase();
  if (mediaType === 'video') {
    if (lower.endsWith('.mov')) return 'video/quicktime';
    return 'video/mp4';
  }
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic';
  return 'image/jpeg';
}

function fileExtension(contentType: string): string {
  switch (contentType) {
    case 'video/quicktime':
      return 'mov';
    case 'video/mp4':
      return 'mp4';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/heic':
      return 'heic';
    default:
      return 'jpg';
  }
}

/** Tek bir yerel dosyayı yükler ve public URL döner. */
export async function uploadAnnouncementMedia(
  userId: string,
  localUri: string,
  mediaType: AnnouncementMediaType,
): Promise<{ url: string | null; error: string | null }> {
  if (localUri.startsWith('http')) {
    return { url: localUri, error: null };
  }

  try {
    const arrayBuffer = await readLocalFileBytes(localUri);
    const contentType = guessContentType(localUri, mediaType);
    const ext = fileExtension(contentType);
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, arrayBuffer, {
      contentType,
      upsert: true,
    });

    if (uploadError) return { url: null, error: uploadError.message };

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  } catch (err) {
    return { url: null, error: String(err) };
  }
}

/**
 * Taslak galeri öğelerini yükler. Yerel dosyalar yüklenir, zaten uzak olanlar
 * korunur. Videolar için yerel küçük resim (poster) de yüklenir.
 */
export async function uploadAnnouncementMediaItems(
  userId: string,
  items: DraftMediaItem[],
): Promise<{ media: AnnouncementMediaItem[]; error: string | null }> {
  const media: AnnouncementMediaItem[] = [];

  for (const item of items) {
    let url = item.url;

    if (!url && item.localUri) {
      const upload = await uploadAnnouncementMedia(userId, item.localUri, item.type);
      if (upload.error || !upload.url) {
        return { media: [], error: upload.error ?? 'Medya yüklenemedi.' };
      }
      url = upload.url;
    }

    if (!url) continue;

    let thumbnailUrl = item.thumbnailUrl;
    if (!thumbnailUrl && item.thumbnailLocalUri) {
      const thumbUpload = await uploadAnnouncementMedia(userId, item.thumbnailLocalUri, 'image');
      if (!thumbUpload.error && thumbUpload.url) {
        thumbnailUrl = thumbUpload.url;
      }
    }

    media.push({ type: item.type, url, thumbnailUrl: thumbnailUrl ?? null });
  }

  return { media, error: null };
}
