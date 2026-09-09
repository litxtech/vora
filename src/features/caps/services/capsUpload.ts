import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { getVideoMetaData } from 'react-native-compressor';
import { getLocalFileSize, normalizeLocalFileUri, readLocalFileBytes } from '@/lib/files/readLocalFile';
import { compressVideoForUpload } from '@/lib/video/compress';
import { prepareLocalVideoUri } from '@/lib/video/prepareLocalVideo';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';
import {
  CAP_IMAGE_MAX_SIZE,
  CAPS_BUCKET,
  MAX_CAP_UPLOAD_BYTES,
} from '@/features/caps/constants';
import {
  isCapDurationAllowed,
  normalizeVideoDurationMs,
  resolveCapDurationMs,
} from '@/features/caps/services/capDuration';

export type CapUploadResult = {
  url: string | null;
  storagePath: string | null;
  thumbUrl: string | null;
  videoUrl: string | null;
  durationMs: number | null;
  width: number | null;
  height: number | null;
  error: string | null;
};

async function uploadBytes(
  path: string,
  bytes: ArrayBuffer,
  contentType: string,
): Promise<{ url: string | null; error: string | null }> {
  const { error } = await supabase.storage.from(CAPS_BUCKET).upload(path, bytes, {
    contentType,
    upsert: false,
  });
  if (error) {
    return { url: null, error: supabaseErrorMessage(error) };
  }
  const { data } = supabase.storage.from(CAPS_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

export async function uploadCapImage(
  userId: string,
  localUri: string,
): Promise<CapUploadResult> {
  try {
    const square = await manipulateAsync(
      localUri,
      [{ resize: { width: CAP_IMAGE_MAX_SIZE } }],
      { compress: 0.88, format: SaveFormat.JPEG },
    );

    const bytes = await readLocalFileBytes(square.uri);
    const path = `${userId}/${Date.now()}.jpg`;
    const uploaded = await uploadBytes(path, bytes, 'image/jpeg');
    if (uploaded.error || !uploaded.url) {
      return {
        url: null,
        storagePath: null,
        thumbUrl: null,
        videoUrl: null,
        durationMs: null,
        width: null,
        height: null,
        error: uploaded.error ?? 'Yükleme başarısız',
      };
    }

    return {
      url: uploaded.url,
      storagePath: path,
      thumbUrl: uploaded.url,
      videoUrl: null,
      durationMs: null,
      width: square.width ?? CAP_IMAGE_MAX_SIZE,
      height: square.height ?? CAP_IMAGE_MAX_SIZE,
      error: null,
    };
  } catch (err) {
    return {
      url: null,
      storagePath: null,
      thumbUrl: null,
      videoUrl: null,
      durationMs: null,
      width: null,
      height: null,
      error: String(err),
    };
  }
}

/** Videodan 3 sn caps: sıkıştır + poster üret + yükle. */
export async function uploadCapVideo(
  userId: string,
  localUri: string,
  knownDurationMs?: number | null,
): Promise<CapUploadResult> {
  try {
    const stableUri = await prepareLocalVideoUri(normalizeLocalFileUri(localUri));
    const meta = await getVideoMetaData(stableUri);
    const probedMs = normalizeVideoDurationMs(Number(meta?.duration ?? 0));
    const durationMs = resolveCapDurationMs(knownDurationMs, probedMs);

    if (durationMs <= 0) {
      return {
        url: null,
        storagePath: null,
        thumbUrl: null,
        videoUrl: null,
        durationMs: null,
        width: null,
        height: null,
        error: 'Video süresi okunamadı',
      };
    }

    if (!isCapDurationAllowed(durationMs)) {
      return {
        url: null,
        storagePath: null,
        thumbUrl: null,
        videoUrl: null,
        durationMs,
        width: null,
        height: null,
        error: 'Caps videosu en fazla 3 saniye olabilir. Videoyu kırpın.',
      };
    }

    let uploadUri = stableUri;
    try {
      uploadUri = await compressVideoForUpload(stableUri, { profile: 'story' });
    } catch {
      uploadUri = stableUri;
    }

    const videoSize = getLocalFileSize(uploadUri);
    if (videoSize <= 0) {
      return {
        url: null,
        storagePath: null,
        thumbUrl: null,
        videoUrl: null,
        durationMs,
        width: null,
        height: null,
        error: 'Video dosyası okunamadı',
      };
    }
    if (videoSize > MAX_CAP_UPLOAD_BYTES) {
      return {
        url: null,
        storagePath: null,
        thumbUrl: null,
        videoUrl: null,
        durationMs,
        width: null,
        height: null,
        error: 'Video çok büyük. Daha kısa / düşük çözünürlüklü bir klip seçin.',
      };
    }

    const stamp = Date.now();
    const videoPath = `${userId}/${stamp}.mp4`;
    const videoBytes = await readLocalFileBytes(uploadUri);
    const videoUploaded = await uploadBytes(videoPath, videoBytes, 'video/mp4');
    if (videoUploaded.error || !videoUploaded.url) {
      return {
        url: null,
        storagePath: null,
        thumbUrl: null,
        videoUrl: null,
        durationMs,
        width: null,
        height: null,
        error: videoUploaded.error ?? 'Video yüklenemedi',
      };
    }

    let thumbUrl: string | null = null;
    let width: number | null = Number(meta?.width) || null;
    let height: number | null = Number(meta?.height) || null;

    try {
      const thumb = await VideoThumbnails.getThumbnailAsync(stableUri, {
        time: Math.min(400, Math.max(0, Math.floor(durationMs / 2))),
        quality: 0.85,
      });
      const resized = await manipulateAsync(
        thumb.uri,
        [{ resize: { width: CAP_IMAGE_MAX_SIZE } }],
        { compress: 0.88, format: SaveFormat.JPEG },
      );
      width = resized.width ?? width;
      height = resized.height ?? height;
      const thumbPath = `${userId}/${stamp}_thumb.jpg`;
      const thumbBytes = await readLocalFileBytes(resized.uri);
      const thumbUploaded = await uploadBytes(thumbPath, thumbBytes, 'image/jpeg');
      thumbUrl = thumbUploaded.url;
    } catch {
      // poster opsiyonel; video_url yeterli
    }

    return {
      url: thumbUrl ?? videoUploaded.url,
      storagePath: videoPath,
      thumbUrl,
      videoUrl: videoUploaded.url,
      durationMs,
      width,
      height,
      error: null,
    };
  } catch (err) {
    return {
      url: null,
      storagePath: null,
      thumbUrl: null,
      videoUrl: null,
      durationMs: null,
      width: null,
      height: null,
      error: String(err),
    };
  }
}
