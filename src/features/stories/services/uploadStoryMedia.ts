import * as VideoThumbnails from 'expo-video-thumbnails';
import { uploadAsync, FileSystemUploadType } from 'expo-file-system/legacy';
import { cacheDirectory, copyAsync, getInfoAsync } from 'expo-file-system/legacy';
import { uploadPostMedia } from '@/features/compose/services/postMediaUpload';
import { normalizeLocalFileUri, readLocalFileBytes, getLocalFileSize } from '@/lib/files/readLocalFile';
import { toUserFacingError } from '@/lib/errors';
import { compressVideoForUpload, shouldSkipVideoCompression } from '@/lib/video/compress';
import { prepareLocalVideoUri } from '@/lib/video/prepareLocalVideo';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

const STORY_VIDEO_MAX_BYTES = 50 * 1024 * 1024;
const DIRECT_UPLOAD_MAX_BYTES = 18 * 1024 * 1024;

export type UploadStoryMediaProgress = {
  stage: 'preparing' | 'compressing' | 'uploading' | 'thumbnail';
  message: string;
};

export type UploadStoryMediaResult = {
  mediaUrl: string | null;
  thumbUrl: string | null;
  error: string | null;
};

function normalizeUploadError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('maximum allowed size') || lower.includes('exceed')) {
    return 'Video boyutu limiti aşıldı (en fazla 50 MB). Daha kısa bir video deneyin.';
  }
  if (lower.includes('mime') || lower.includes('not allowed')) {
    return 'Video formatı desteklenmiyor. Lütfen tekrar deneyin.';
  }
  if (lower.includes('dosya okunamadı') || lower.includes('not found')) {
    return 'Video dosyası bulunamadı. Lütfen tekrar çekin.';
  }
  return toUserFacingError(message, { fallback: 'Hikâye medyası yüklenemedi.' });
}

/** Kamera çıktısı uzantısız olabilir; yükleme için .mp4 yoluna kopyala. */
async function ensureStoryVideoUri(localUri: string): Promise<string> {
  const prepared = await prepareLocalVideoUri(localUri);
  const normalized = normalizeLocalFileUri(prepared);

  if (/\.(mp4|mov|m4v|webm)$/i.test(normalized)) {
    const info = await getInfoAsync(normalized);
    if (info.exists && (info.size ?? 0) > 0) return normalized;
  }

  const dest = `${cacheDirectory}story-video-${Date.now()}.mp4`;
  await copyAsync({ from: normalized, to: dest });
  const copied = await getInfoAsync(dest);
  if (!copied.exists || (copied.size ?? 0) <= 0) {
    throw new Error('Video dosyası okunamadı.');
  }
  return dest;
}

async function uploadVideoDirect(
  userId: string,
  localUri: string,
  contentType: string,
): Promise<{ url: string | null; error: string | null }> {
  const bytes = await readLocalFileBytes(localUri);
  const path = `${userId}/${Date.now()}_story_video.mp4`;
  const { error } = await supabase.storage.from('post-media').upload(path, bytes, {
    contentType,
    upsert: false,
  });
  if (error) {
    return { url: null, error: normalizeUploadError(supabaseErrorMessage(error) ?? error.message) };
  }
  const { data } = supabase.storage.from('post-media').getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

async function uploadVideoStream(
  userId: string,
  localUri: string,
  contentType: string,
): Promise<{ url: string | null; error: string | null }> {
  const path = `${userId}/${Date.now()}_story_video.mp4`;

  const { data, error } = await supabase.storage.from('post-media').createSignedUploadUrl(path);
  if (error || !data?.signedUrl) {
    return { url: null, error: normalizeUploadError(error?.message ?? 'Yükleme adresi alınamadı.') };
  }

  const result = await uploadAsync(data.signedUrl, normalizeLocalFileUri(localUri), {
    httpMethod: 'PUT',
    uploadType: FileSystemUploadType.BINARY_CONTENT,
    headers: { 'Content-Type': contentType },
  });

  if (result.status < 200 || result.status >= 300) {
    return { url: null, error: `Video yüklenemedi (HTTP ${result.status}).` };
  }

  const { data: publicData } = supabase.storage.from('post-media').getPublicUrl(path);
  return { url: publicData.publicUrl, error: null };
}

async function uploadStoryVideoFile(
  userId: string,
  localUri: string,
): Promise<{ url: string | null; error: string | null }> {
  const contentType = 'video/mp4';
  const fileSize = getLocalFileSize(localUri);

  if (fileSize <= 0) {
    return { url: null, error: 'Video dosyası okunamadı.' };
  }
  if (fileSize > STORY_VIDEO_MAX_BYTES) {
    return { url: null, error: 'Video boyutu limiti aşıldı (en fazla 50 MB). Daha kısa bir video deneyin.' };
  }

  if (fileSize <= DIRECT_UPLOAD_MAX_BYTES) {
    const direct = await uploadVideoDirect(userId, localUri, contentType);
    if (!direct.error && direct.url) return direct;
    if (__DEV__) console.warn('[stories] direct video upload failed, trying stream:', direct.error);
  }

  const streamed = await uploadVideoStream(userId, localUri, contentType);
  if (!streamed.error && streamed.url) return streamed;

  if (fileSize <= DIRECT_UPLOAD_MAX_BYTES) {
    return streamed;
  }

  const direct = await uploadVideoDirect(userId, localUri, contentType);
  return direct.error ? streamed : direct;
}

async function uploadStoryVideoThumb(
  userId: string,
  videoUri: string,
): Promise<string | null> {
  try {
    const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(normalizeLocalFileUri(videoUri), {
      time: 400,
      quality: 0.82,
    });
    if (!thumbUri) return null;

    const upload = await uploadPostMedia(userId, thumbUri, 1);
    return upload.url;
  } catch (err) {
    if (__DEV__) console.warn('[stories] thumb failed:', err);
    return null;
  }
}

async function uploadStoryVideo(
  userId: string,
  localUri: string,
  onProgress?: (progress: UploadStoryMediaProgress) => void,
): Promise<UploadStoryMediaResult> {
  try {
    onProgress?.({ stage: 'preparing', message: 'Video hazırlanıyor…' });

    let uploadUri = await ensureStoryVideoUri(localUri);

    const originalSize = getLocalFileSize(uploadUri);
    if (originalSize <= 0) {
      return { mediaUrl: null, thumbUrl: null, error: 'Video dosyası okunamadı.' };
    }

    if (!shouldSkipVideoCompression(originalSize, 'messaging')) {
      onProgress?.({ stage: 'compressing', message: 'Video sıkıştırılıyor…' });
      try {
        const compressed = await compressVideoForUpload(uploadUri, { profile: 'messaging' });
        const compressedSize = getLocalFileSize(compressed);
        if (compressedSize > 0) {
          uploadUri = compressed;
        }
      } catch (err) {
        if (__DEV__) console.warn('[stories] compress skipped:', err);
      }
    }

    onProgress?.({ stage: 'uploading', message: 'Video yükleniyor…' });
    const uploaded = await uploadStoryVideoFile(userId, uploadUri);
    if (uploaded.error || !uploaded.url) {
      return { mediaUrl: null, thumbUrl: null, error: uploaded.error ?? 'Video yüklenemedi.' };
    }

    onProgress?.({ stage: 'thumbnail', message: 'Önizleme oluşturuluyor…' });
    const thumbUrl = await uploadStoryVideoThumb(userId, uploadUri);

    return {
      mediaUrl: uploaded.url,
      thumbUrl: thumbUrl ?? uploaded.url,
      error: null,
    };
  } catch (err) {
    return {
      mediaUrl: null,
      thumbUrl: null,
      error: normalizeUploadError(err instanceof Error ? err.message : String(err)),
    };
  }
}

async function uploadStoryImage(userId: string, localUri: string): Promise<UploadStoryMediaResult> {
  const upload = await uploadPostMedia(userId, localUri, 0);
  if (upload.error || !upload.url) {
    return {
      mediaUrl: null,
      thumbUrl: null,
      error: upload.error ?? 'Görsel yüklenemedi.',
    };
  }
  return { mediaUrl: upload.url, thumbUrl: upload.url, error: null };
}

export async function uploadStoryMedia(
  userId: string,
  localUri: string,
  mediaType: 'image' | 'video',
  options?: { onProgress?: (progress: UploadStoryMediaProgress) => void },
): Promise<UploadStoryMediaResult> {
  if (!localUri?.trim()) {
    return { mediaUrl: null, thumbUrl: null, error: 'Medya dosyası bulunamadı.' };
  }
  if (mediaType === 'video') {
    return uploadStoryVideo(userId, localUri, options?.onProgress);
  }
  return uploadStoryImage(userId, localUri);
}
