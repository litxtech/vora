import { readLocalFileBytes } from '@/lib/files/readLocalFile';
import { supabase } from '@/lib/supabase/client';

function guessContentType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.webp')) return 'image/webp';
  if (lower.includes('.heic') || lower.includes('.heif')) return 'image/heic';
  return 'image/jpeg';
}

function fileExtension(contentType: string): string {
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  if (contentType === 'image/heic') return 'heic';
  return 'jpg';
}

export async function uploadJobWorkplaceImage(
  userId: string,
  localUri: string,
  index: number,
): Promise<{ url: string | null; error: string | null }> {
  try {
    const arrayBuffer = await readLocalFileBytes(localUri);
    const contentType = guessContentType(localUri);
    const ext = fileExtension(contentType);
    const path = `${userId}/${Date.now()}-${index}.${ext}`;

    const { error: uploadError } = await supabase.storage.from('job-listings').upload(path, arrayBuffer, {
      contentType,
      upsert: false,
    });

    if (uploadError) return { url: null, error: uploadError.message };

    const { data } = supabase.storage.from('job-listings').getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  } catch (err) {
    return { url: null, error: String(err) };
  }
}

export async function uploadJobWorkplaceImages(userId: string, uris: string[]): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < uris.length; i++) {
    const uri = uris[i];
    if (uri.startsWith('http')) {
      urls.push(uri);
      continue;
    }
    const { url } = await uploadJobWorkplaceImage(userId, uri, i);
    if (url) urls.push(url);
  }
  return urls;
}
