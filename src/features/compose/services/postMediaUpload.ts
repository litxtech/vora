import { supabase } from '@/lib/supabase/client';

function guessContentType(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  return 'image/jpeg';
}

export async function uploadPostMedia(
  userId: string,
  localUri: string,
  index: number,
): Promise<{ url: string | null; error: string | null }> {
  try {
    const response = await fetch(localUri);
    const arrayBuffer = await response.arrayBuffer();
    const contentType = guessContentType(localUri);
    const ext = contentType.split('/')[1] ?? 'jpg';
    const path = `${userId}/${Date.now()}_${index}.${ext}`;

    const { error } = await supabase.storage.from('post-media').upload(path, arrayBuffer, {
      contentType,
      upsert: false,
    });

    if (error) return { url: null, error: error.message };

    const { data } = supabase.storage.from('post-media').getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  } catch (err) {
    return { url: null, error: String(err) };
  }
}
