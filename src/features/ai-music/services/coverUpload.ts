import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { SOUNDS_BUCKET } from '@/features/sounds/constants';
import { readLocalFileBytes } from '@/lib/files/readLocalFile';
import { supabase } from '@/lib/supabase/client';

export async function uploadAiMusicCover(
  userId: string,
  localUri: string,
): Promise<{ path: string; url: string; error: string | null }> {
  try {
    const prepared = await manipulateAsync(localUri, [{ resize: { width: 1080 } }], {
      compress: 0.85,
      format: SaveFormat.JPEG,
    });
    const bytes = await readLocalFileBytes(prepared.uri);
    const path = `${userId}/covers/${Date.now()}.jpg`;
    const { error } = await supabase.storage.from(SOUNDS_BUCKET).upload(path, bytes, {
      contentType: 'image/jpeg',
      upsert: false,
    });
    if (error) return { path: '', url: '', error: error.message };

    const { data } = supabase.storage.from(SOUNDS_BUCKET).getPublicUrl(path);
    return { path, url: data.publicUrl, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Kapak yüklenemedi.';
    return { path: '', url: '', error: message };
  }
}
