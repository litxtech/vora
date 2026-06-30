import { readLocalFileBytes } from '@/lib/files/readLocalFile';
import { supabase } from '@/lib/supabase/client';

function guessContentType(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  return 'image/jpeg';
}

export async function uploadAdCreativeImage(
  userId: string,
  localUri: string,
): Promise<{ url: string | null; error: string | null }> {
  try {
    const arrayBuffer = await readLocalFileBytes(localUri);
    const contentType = guessContentType(localUri);
    const ext = contentType.split('/')[1] ?? 'jpg';
    const path = `${userId}/ads/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from('covers').upload(path, arrayBuffer, {
      contentType,
      upsert: false,
    });

    if (uploadError) return { url: null, error: uploadError.message };

    const { data } = supabase.storage.from('covers').getPublicUrl(path);
    return { url: `${data.publicUrl}?t=${Date.now()}`, error: null };
  } catch (err) {
    return { url: null, error: String(err) };
  }
}
