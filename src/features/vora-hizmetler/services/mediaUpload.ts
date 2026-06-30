import { readLocalFileBytes } from '@/lib/files/readLocalFile';
import { supabase } from '@/lib/supabase/client';

function guessContentType(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  if (ext === 'pdf') return 'application/pdf';
  return 'image/jpeg';
}

function fileExtension(contentType: string): string {
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  if (contentType === 'application/pdf') return 'pdf';
  return 'jpg';
}

export async function uploadHizmetlerMedia(
  userId: string,
  localUri: string,
  folder: 'avatar' | 'cover' | 'portfolio' | 'certificates' | 'workplace',
): Promise<{ url: string | null; error: string | null }> {
  try {
    const arrayBuffer = await readLocalFileBytes(localUri);
    const contentType = guessContentType(localUri);
    const ext = fileExtension(contentType);
    const path = `${userId}/${folder}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from('vora-hizmetler').upload(path, arrayBuffer, {
      contentType,
      upsert: false,
    });

    if (uploadError) return { url: null, error: uploadError.message };

    const { data } = supabase.storage.from('vora-hizmetler').getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  } catch (err) {
    return { url: null, error: String(err) };
  }
}
