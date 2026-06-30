import { readLocalFileBytes, normalizeLocalFileUri } from '@/lib/files/readLocalFile';
import { uploadAsync, FileSystemUploadType } from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase/client';
import { toUserFacingError } from '@/lib/errors';

function guessContentType(uri: string, fallback?: string): string {
  if (fallback) return fallback;
  const ext = uri.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  if (ext === 'mp4' || ext === 'mov') return 'video/mp4';
  if (ext === 'm4a' || ext === 'aac') return 'audio/m4a';
  if (ext === 'mp3') return 'audio/mpeg';
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'doc') return 'application/msword';
  if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (ext === 'xls') return 'application/vnd.ms-excel';
  if (ext === 'xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (ext === 'zip') return 'application/zip';
  return 'image/jpeg';
}

function extensionFromUri(uri: string): string | undefined {
  const match = uri.match(/\.(mp4|mov|m4v|webm)(\?|$)/i);
  return match ? match[1].toLowerCase() : undefined;
}

function extensionForMime(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'audio/m4a': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/zip': 'zip',
  };
  return map[mime] ?? mime.split('/')[1] ?? 'bin';
}

function normalizeUploadError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('maximum allowed size') || lower.includes('exceed')) {
    return 'Video boyutu limiti aşıldı (en fazla 50 MB). Daha kısa bir video deneyin.';
  }
  return toUserFacingError(message, { fallback: 'Dosya yüklenemedi. Lütfen tekrar deneyin.' });
}

async function uploadVideoStream(
  path: string,
  localUri: string,
  contentType: string,
): Promise<{ error: string | null }> {
  const { data, error } = await supabase.storage.from('message-media').createSignedUploadUrl(path);
  if (error || !data?.signedUrl) {
    return { error: normalizeUploadError(error?.message ?? 'Yükleme adresi alınamadı.') };
  }

  const result = await uploadAsync(data.signedUrl, normalizeLocalFileUri(localUri), {
    httpMethod: 'PUT',
    uploadType: FileSystemUploadType.BINARY_CONTENT,
    headers: { 'Content-Type': contentType },
  });

  if (result.status < 200 || result.status >= 300) {
    return { error: 'Video yüklenemedi.' };
  }

  return { error: null };
}

export async function uploadMessageMedia(
  userId: string,
  localUri: string,
  kind: 'image' | 'video' | 'audio' | 'file' = 'image',
  mimeType?: string,
  fileName?: string,
): Promise<{ url: string | null; error: string | null }> {
  try {
    let contentType = guessContentType(localUri, mimeType);
    let ext = fileName?.split('.').pop() ?? extensionFromUri(localUri) ?? extensionForMime(contentType);

    if (kind === 'video') {
      ext = 'mp4';
      contentType = 'video/mp4';
    }

    const path = `${userId}/${Date.now()}_${kind}.${ext}`;

    if (kind === 'video') {
      const streamError = await uploadVideoStream(path, localUri, contentType);
      if (streamError.error) return { url: null, error: streamError.error };
    } else {
      const arrayBuffer = await readLocalFileBytes(localUri);
      const { error } = await supabase.storage.from('message-media').upload(path, arrayBuffer, {
        contentType,
        upsert: false,
      });
      if (error) return { url: null, error: normalizeUploadError(error.message) };
    }

    const { data } = supabase.storage.from('message-media').getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  } catch (err) {
    return { url: null, error: toUserFacingError(String(err), { fallback: 'Dosya yüklenemedi.' }) };
  }
}
