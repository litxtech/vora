import { readLocalFileBytes, normalizeLocalFileUri, getLocalFileSize } from '@/lib/files/readLocalFile';
import { supabase } from '@/lib/supabase/client';
import { MAX_SOUND_UPLOAD_BYTES, SOUNDS_BUCKET } from '@/features/sounds/constants';
import {
  isSoundUploadSizeError,
  mapSoundUploadError,
  prepareSoundAudioForUpload,
  type PrepareSoundOptions,
} from '@/features/sounds/services/prepareSoundAudioForUpload';

function storageExtension(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase()?.split('?')[0];
  if (ext && ['mp3', 'm4a', 'aac', 'wav', 'ogg', 'mp4'].includes(ext)) return ext;
  return 'm4a';
}

function guessAudioContentType(uri: string): string {
  const ext = storageExtension(uri);
  if (ext === 'wav') return 'audio/wav';
  if (ext === 'ogg') return 'audio/ogg';
  if (ext === 'aac') return 'audio/aac';
  if (ext === 'mp3') return 'audio/mpeg';
  if (ext === 'm4a') return 'audio/m4a';
  return 'audio/mp4';
}

function guessImageContentType(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

async function uploadPreparedAudio(
  userId: string,
  uploadUri: string,
): Promise<{ path: string; url: string; error: string | null }> {
  const normalized = normalizeLocalFileUri(uploadUri);
  const arrayBuffer = await readLocalFileBytes(normalized);
  const contentType = guessAudioContentType(normalized);
  const ext = storageExtension(normalized);
  const path = `${userId}/audio/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(SOUNDS_BUCKET).upload(path, arrayBuffer, {
    contentType,
    upsert: false,
  });

  if (error) return { path: '', url: '', error: mapSoundUploadError(error.message) };

  const { data } = supabase.storage.from(SOUNDS_BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl, error: null };
}

async function tryDirectUpload(
  userId: string,
  localUri: string,
): Promise<{ path: string; url: string; error: string | null } | null> {
  const normalized = normalizeLocalFileUri(localUri);
  const size = getLocalFileSize(normalized);
  if (size <= 0 || size > MAX_SOUND_UPLOAD_BYTES) return null;

  try {
    const upload = await uploadPreparedAudio(userId, normalized);
    return upload.error ? null : upload;
  } catch {
    return null;
  }
}

export async function uploadSoundAudio(
  userId: string,
  localUri: string,
  options?: PrepareSoundOptions,
): Promise<{ path: string; url: string; error: string | null }> {
  try {
    options?.onProgress?.('preparing', 'Ses hazırlanıyor…');

    const direct = await tryDirectUpload(userId, localUri);
    if (direct) return direct;

    const modes: Array<'normal' | 'aggressive'> = ['normal', 'aggressive'];
    let lastError: string | null = null;

    for (const mode of modes) {
      const prepared = await prepareSoundAudioForUpload(localUri, {
        ...options,
        mode,
      });

      if (!prepared.ok) {
        lastError = prepared.error;
        continue;
      }

      try {
        const upload = await uploadPreparedAudio(userId, prepared.uri);
        if (!upload.error) return upload;

        lastError = upload.error;
        if (!isSoundUploadSizeError(upload.error)) return upload;
      } catch (err) {
        lastError = mapSoundUploadError(String(err));
      }
    }

    const fallback = await tryDirectUpload(userId, localUri);
    if (fallback) return fallback;

    return { path: '', url: '', error: lastError ?? 'Ses yüklenemedi.' };
  } catch (err) {
    return { path: '', url: '', error: mapSoundUploadError(String(err)) };
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
