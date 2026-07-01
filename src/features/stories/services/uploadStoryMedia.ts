import * as VideoThumbnails from 'expo-video-thumbnails';
import { uploadAsync, FileSystemUploadType } from 'expo-file-system/legacy';
import { uploadPostMedia } from '@/features/compose/services/postMediaUpload';
import { normalizeLocalFileUri, readLocalFileBytes, getLocalFileSize } from '@/lib/files/readLocalFile';
import { isLocalVideoUri } from '@/lib/media/isVideoUrl';
import { toUserFacingError } from '@/lib/errors';
import { compressVideoForUpload, shouldSkipVideoCompression } from '@/lib/video/compress';
import { prepareLocalVideoUri } from '@/lib/video/prepareLocalVideo';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

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
  return toUserFacingError(message, { fallback: 'Hikâye medyası yüklenemedi.' });
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
    return { url: null, error: 'Video yüklenemedi.' };
  }

  const { data: publicData } = supabase.storage.from('post-media').getPublicUrl(path);
  return { url: publicData.publicUrl, error: null };
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
  } catch {
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

    const preparedUri = await prepareLocalVideoUri(localUri);
    if (!isLocalVideoUri(preparedUri)) {
      return { mediaUrl: null, thumbUrl: null, error: 'Geçersiz video dosyası.' };
    }

    let uploadUri = preparedUri;
    const fileSize = getLocalFileSize(preparedUri);

    if (!shouldSkipVideoCompression(fileSize, 'messaging')) {
      onProgress?.({ stage: 'compressing', message: 'Video sıkıştırılıyor…' });
      uploadUri = await compressVideoForUpload(preparedUri, { profile: 'messaging' });
    }

    onProgress?.({ stage: 'uploading', message: 'Video yükleniyor…' });
    const uploaded = await uploadVideoStream(userId, uploadUri, 'video/mp4');
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
  if (mediaType === 'video' || isLocalVideoUri(localUri)) {
    return uploadStoryVideo(userId, localUri, options?.onProgress);
  }
  return uploadStoryImage(userId, localUri);
}
