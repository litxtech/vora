import { readLocalFileBytes } from '@/lib/files/readLocalFile';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage, toUserFacingError } from '@/lib/errors';

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
