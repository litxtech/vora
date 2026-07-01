import { readLocalFileBytes } from '@/lib/files/readLocalFile';
import { supabase } from '@/lib/supabase/client';
import { SOUNDS_BUCKET } from '@/features/sounds/constants';

function guessAudioContentType(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  if (ext === 'wav') return 'audio/wav';
  if (ext === 'ogg') return 'audio/ogg';
  if (ext === 'aac') return 'audio/aac';
  if (ext === 'm4a') return 'audio/m4a';
  return 'audio/mp4';
}

function guessImageContentType(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

export async function uploadSoundAudio(
  userId: string,
  localUri: string,
): Promise<{ path: string; url: string; error: string | null }> {
  try {
    const arrayBuffer = await readLocalFileBytes(localUri);
    const contentType = guessAudioContentType(localUri);
    const ext = contentType.split('/')[1] ?? 'm4a';
    const path = `${userId}/audio/${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from(SOUNDS_BUCKET).upload(path, arrayBuffer, {
      contentType,
      upsert: false,
    });

    if (error) return { path: '', url: '', error: error.message };

    const { data } = supabase.storage.from(SOUNDS_BUCKET).getPublicUrl(path);
    return { path, url: data.publicUrl, error: null };
  } catch (err) {
    return { path: '', url: '', error: String(err) };
  }
}

export async function uploadSoundCover(
  userId: string,
  localUri: string,
): Promise<{ path: string; url: string; error: string | null }> {
  try {
    const arrayBuffer = await readLocalFileBytes(localUri);
    const contentType = guessImageContentType(localUri);
    const ext = contentType.split('/')[1] ?? 'jpg';
    const path = `${userId}/covers/${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from(SOUNDS_BUCKET).upload(path, arrayBuffer, {
      contentType,
      upsert: false,
    });

    if (error) return { path: '', url: '', error: error.message };

    const { data } = supabase.storage.from(SOUNDS_BUCKET).getPublicUrl(path);
    return { path, url: data.publicUrl, error: null };
  } catch (err) {
    return { path: '', url: '', error: String(err) };
  }
}
