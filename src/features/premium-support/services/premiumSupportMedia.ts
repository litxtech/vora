import { readLocalFileBytes } from '@/lib/files/readLocalFile';
import { uploadPublicImage } from '@/lib/media-cloud/uploadPublicImage';
import { toUserFacingError } from '@/lib/errors';

function guessContentType(uri: string, fallback?: string): string {
  if (fallback) return fallback;
  const ext = uri.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  return 'image/jpeg';
}

export async function uploadPremiumSupportImage(
  userId: string,
  localUri: string,
  mimeType?: string,
): Promise<{ url: string | null; error: string | null }> {
  try {
    const arrayBuffer = await readLocalFileBytes(localUri);
    const contentType = guessContentType(localUri, mimeType);
    const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
    const path = `${userId}/premium-support/${Date.now()}.${ext}`;
    const uploaded = await uploadPublicImage({
      folder: 'message-media',
      path,
      bytes: arrayBuffer,
      contentType,
    });
    if (uploaded.error || !uploaded.url) return { url: null, error: uploaded.error ?? 'Görsel yüklenemedi.' };
    return { url: uploaded.url, error: null };
  } catch (err) {
    return {
      url: null,
      error: toUserFacingError(err instanceof Error ? err.message : String(err), {
        fallback: 'Görsel yüklenemedi',
      }),
    };
  }
}
