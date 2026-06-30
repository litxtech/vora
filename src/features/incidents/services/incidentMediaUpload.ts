import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';
import { uploadAsync, FileSystemUploadType } from 'expo-file-system/legacy';
import {
  INCIDENT_MEDIA_BUCKET,
  INCIDENT_VIDEO_MAX_DURATION_SEC,
  INCIDENT_VIDEO_MAX_UPLOAD_BYTES,
} from '@/features/incidents/constants';
import { getLocalFileSize, normalizeLocalFileUri, readLocalFileBytes } from '@/lib/files/readLocalFile';
import { prepareLocalImageUri } from '@/lib/media/prepareLocalImage';
import { compressVideoForUpload, shouldSkipVideoCompression } from '@/lib/video/compress';
import { prepareLocalVideoUri } from '@/lib/video/prepareLocalVideo';
import { isAndroidTablet } from '@/lib/device/isAndroidTablet';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage, toUserFacingError } from '@/lib/errors';

const BUCKET = INCIDENT_MEDIA_BUCKET;

export type IncidentPendingMedia = {
  uri: string;
  kind: 'image' | 'video';
  mimeType?: string | null;
  durationMs?: number;
};

function guessContentType(uri: string, fallback?: string | null): string {
  if (fallback) return fallback;
  const ext = uri.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  if (ext === 'mp4' || ext === 'mov') return 'video/mp4';
  return 'image/jpeg';
}

async function compressImageForUpload(localUri: string, maxWidth: number): Promise<string> {
  try {
    const compressed = await manipulateAsync(
      localUri,
      [{ resize: { width: maxWidth } }],
      { compress: 0.82, format: SaveFormat.JPEG },
    );
    return compressed.uri;
  } catch {
    try {
      const normalized = await manipulateAsync(localUri, [], {
        compress: 0.82,
        format: SaveFormat.JPEG,
      });
      return normalized.uri;
    } catch {
      return localUri;
    }
  }
}

async function uploadImage(
  userId: string,
  localUri: string,
  index: number,
  mimeType?: string | null,
): Promise<{ url: string | null; error: string | null }> {
  try {
    const contentType = guessContentType(localUri, mimeType);
    const isImage = contentType.startsWith('image/') && contentType !== 'image/gif';

    let bytes: ArrayBuffer;
    let uploadType = contentType;
    let ext = contentType.split('/')[1] ?? 'jpg';

    if (isImage) {
      const stableUri = await prepareLocalImageUri(localUri, mimeType);
      const maxWidth = isAndroidTablet() ? 1600 : Platform.OS === 'android' ? 1920 : 2048;
      const compressedUri = await compressImageForUpload(stableUri, maxWidth);
      bytes = await readLocalFileBytes(compressedUri);
      uploadType = 'image/jpeg';
      ext = 'jpg';
    } else {
      bytes = await readLocalFileBytes(localUri);
    }

    const path = `${userId}/${Date.now()}_${index}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType: uploadType,
      upsert: false,
    });
    if (error) return { url: null, error: supabaseErrorMessage(error) };

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  } catch (err) {
    return { url: null, error: toUserFacingError(String(err), { fallback: 'Fotoğraf yüklenemedi.' }) };
  }
}

async function uploadVideo(
  userId: string,
  localUri: string,
  durationMs?: number,
): Promise<{ url: string | null; error: string | null }> {
  try {
    const durationSec = (durationMs ?? 0) / 1000;
    if (durationSec > INCIDENT_VIDEO_MAX_DURATION_SEC) {
      return {
        url: null,
        error: `Video en fazla ${Math.floor(INCIDENT_VIDEO_MAX_DURATION_SEC / 60)} dakika olabilir.`,
      };
    }

    const stableUri = await prepareLocalVideoUri(localUri);
    let uploadUri = stableUri;
    let uploadSize = getLocalFileSize(stableUri);
    if (uploadSize <= 0) {
      return { url: null, error: 'Video dosyası okunamadı.' };
    }

    if (!shouldSkipVideoCompression(uploadSize, 'messaging')) {
      try {
        uploadUri = await compressVideoForUpload(stableUri, { profile: 'messaging' });
        uploadSize = getLocalFileSize(uploadUri);
        if (uploadSize <= 0) {
          uploadUri = stableUri;
          uploadSize = getLocalFileSize(stableUri);
        }
      } catch (err) {
        if (__DEV__) console.warn('[incident-video] compress skipped', err);
      }
    }

    if (uploadSize > INCIDENT_VIDEO_MAX_UPLOAD_BYTES) {
      const limitMb = Math.floor(INCIDENT_VIDEO_MAX_UPLOAD_BYTES / (1024 * 1024));
      return { url: null, error: `Video çok büyük (en fazla ${limitMb} MB).` };
    }

    const path = `${userId}/${Date.now()}_video.mp4`;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data?.signedUrl) {
      return { url: null, error: supabaseErrorMessage(error) ?? 'Yükleme adresi alınamadı.' };
    }

    const result = await uploadAsync(data.signedUrl, normalizeLocalFileUri(uploadUri), {
      httpMethod: 'PUT',
      uploadType: FileSystemUploadType.BINARY_CONTENT,
      headers: { 'Content-Type': 'video/mp4' },
    });

    if (result.status < 200 || result.status >= 300) {
      return { url: null, error: 'Video yüklenemedi.' };
    }

    const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { url: publicData.publicUrl, error: null };
  } catch (err) {
    return {
      url: null,
      error: toUserFacingError(err instanceof Error ? err.message : String(err), {
        fallback: 'Video yüklenemedi.',
      }),
    };
  }
}

export async function uploadIncidentMediaBatch(
  userId: string,
  items: IncidentPendingMedia[],
): Promise<{ urls: string[]; error: string | null }> {
  const urls: string[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const result =
      item.kind === 'video'
        ? await uploadVideo(userId, item.uri, item.durationMs)
        : await uploadImage(userId, item.uri, i, item.mimeType);
    if (result.error || !result.url) {
      return { urls: [], error: result.error ?? 'Medya yüklenemedi.' };
    }
    urls.push(result.url);
  }
  return { urls, error: null };
}
