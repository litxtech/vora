import { readLocalFileBytes } from '@/lib/files/readLocalFile';
import { supabase } from '@/lib/supabase/client';

function guessContentType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.webp')) return 'image/webp';
  return 'image/jpeg';
}

export async function uploadRideVehiclePhotos(
  userId: string,
  uris: string[],
): Promise<{ urls: string[]; error: string | null }> {
  const urls: string[] = [];
  for (let i = 0; i < uris.length; i++) {
    try {
      const arrayBuffer = await readLocalFileBytes(uris[i]);
      const contentType = guessContentType(uris[i]);
      const ext = contentType.split('/')[1] ?? 'jpg';
      const path = `${userId}/${Date.now()}-${i}.${ext}`;

      const { error: uploadError } = await supabase.storage.from('ride-vehicles').upload(path, arrayBuffer, {
        contentType,
        upsert: false,
      });

      if (uploadError) return { urls, error: uploadError.message };
      const { data } = supabase.storage.from('ride-vehicles').getPublicUrl(path);
      urls.push(data.publicUrl);
    } catch (err) {
      return { urls, error: String(err) };
    }
  }
  return { urls, error: null };
}

export async function uploadRideLicensePhoto(
  userId: string,
  uri: string,
  kind: 'front' | 'back' | 'selfie',
): Promise<{ path: string | null; error: string | null }> {
  try {
    const arrayBuffer = await readLocalFileBytes(uri);
    const contentType = guessContentType(uri);
    const ext = contentType.split('/')[1] ?? 'jpg';
    const path = `${userId}/licenses/${kind}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from('ride-vehicles').upload(path, arrayBuffer, {
      contentType,
      upsert: false,
    });

    if (uploadError) return { path: null, error: uploadError.message };
    return { path, error: null };
  } catch (err) {
    return { path: null, error: String(err) };
  }
}
