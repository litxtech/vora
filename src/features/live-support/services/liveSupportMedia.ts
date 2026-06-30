import { getLocalFileSize, readLocalFileBytes } from '@/lib/files/readLocalFile';
import { compressVideoForUpload } from '@/lib/video/compress';
import { prepareLocalVideoUri } from '@/lib/video/prepareLocalVideo';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage, toUserFacingError } from '@/lib/errors';
import {
  LIVE_SUPPORT_VIDEO_MAX_DURATION_SEC,
  LIVE_SUPPORT_VIDEO_MAX_UPLOAD_BYTES,
} from '@/features/live-support/constants';

function guessImageContentType(uri: string, fallback?: string): string {
  if (fallback) return fallback;
  const ext = uri.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  return 'image/jpeg';
}

function normalizeUploadError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('maximum allowed size') || lower.includes('exceed')) {
    return 'Video boyutu limiti aşıldı. Daha kısa bir video deneyin.';
  }
  return toUserFacingError(message, { fallback: 'Dosya yüklenemedi. Lütfen tekrar deneyin.' });
}

export async function uploadLiveSupportImage(
  userId: string,
  localUri: string,
  mimeType?: string,
): Promise<{ url: string | null; error: string | null }> {
  try {
    const arrayBuffer = await readLocalFileBytes(localUri);
    const contentType = guessImageContentType(localUri, mimeType);
    const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
    const path = `${userId}/live-support/${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from('message-media').upload(path, arrayBuffer, {
      contentType,
      upsert: false,
    });

    if (error) return { url: null, error: supabaseErrorMessage(error)! };

    const { data } = supabase.storage.from('message-media').getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  } catch (err) {
    return {
      url: null,
      error: toUserFacingError(err instanceof Error ? err.message : String(err), {
        fallback: 'Görsel yüklenemedi',
      }),
    };
  }
}

export async function uploadLiveSupportVideo(
  userId: string,
  localUri: string,
  options?: { durationSec?: number; mimeType?: string },
): Promise<{ url: string | null; error: string | null }> {
  try {
    const durationSec = options?.durationSec ?? 0;
    if (durationSec > LIVE_SUPPORT_VIDEO_MAX_DURATION_SEC + 0.35) {
      return {
        url: null,
        error: `Video en fazla ${LIVE_SUPPORT_VIDEO_MAX_DURATION_SEC} saniye olabilir.`,
      };
    }

    const stableUri = await prepareLocalVideoUri(localUri);
    const originalSize = getLocalFileSize(stableUri);
    if (originalSize <= 0) {
      return { url: null, error: 'Video dosyası okunamadı.' };
    }

    let uploadUri = stableUri;
    try {
      uploadUri = await compressVideoForUpload(stableUri, { profile: 'messaging' });
    } catch (err) {
      if (__DEV__) console.warn('[live-support-video] compress skipped', err);
    }

    const uploadSize = getLocalFileSize(uploadUri);
    if (uploadSize > LIVE_SUPPORT_VIDEO_MAX_UPLOAD_BYTES) {
      return { url: null, error: 'Video çok büyük. Daha kısa bir video deneyin.' };
    }

    const arrayBuffer = await readLocalFileBytes(uploadUri);
    const path = `${userId}/live-support/${Date.now()}.mp4`;

    const { error } = await supabase.storage.from('message-media').upload(path, arrayBuffer, {
      contentType: 'video/mp4',
      upsert: false,
    });

    if (error) return { url: null, error: normalizeUploadError(error.message) };

    const { data } = supabase.storage.from('message-media').getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  } catch (err) {
    return {
      url: null,
      error: toUserFacingError(err instanceof Error ? err.message : String(err), {
        fallback: 'Video yüklenemedi',
      }),
    };
  }
}
