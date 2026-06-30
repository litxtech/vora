import { getLocalFileSize } from '@/lib/files/readLocalFile';
import { compressVideoForUpload, shouldSkipVideoCompression } from '@/lib/video/compress';
import { prepareLocalVideoUri } from '@/lib/video/prepareLocalVideo';
import { CHAT_VIDEO_MAX_DURATION_SEC, CHAT_VIDEO_MAX_UPLOAD_BYTES } from '../constants';
import type { MediaUploadStage } from '../types';
import { uploadMessageMedia } from './messageMediaUpload';
import { toUserFacingError } from '@/lib/errors';

export type MessageVideoUploadProgress = {
  stage: MediaUploadStage;
  progress: number;
  etaSec: number;
};

type UploadOptions = {
  durationSec?: number;
  mimeType?: string;
  onProgress?: (state: MessageVideoUploadProgress) => void;
};

function estimateEtaSec(fileSizeBytes: number, stage: MediaUploadStage, stageProgress: number): number {
  const compressSec = Math.max(3, Math.ceil(fileSizeBytes / 2_000_000));
  const uploadBytesPerSec = 750_000;
  const sendBase = 1;

  if (stage === 'compressing') {
    return Math.max(2, Math.ceil(compressSec * (1 - Math.min(stageProgress, 1))));
  }

  const uploadRemaining =
    stage === 'uploading'
      ? (fileSizeBytes / uploadBytesPerSec) * (1 - Math.min(stageProgress, 1))
      : fileSizeBytes / uploadBytesPerSec;

  if (stage === 'uploading') return Math.max(1, Math.ceil(uploadRemaining + sendBase));
  return Math.max(1, Math.ceil(fileSizeBytes / uploadBytesPerSec + compressSec + sendBase));
}

function tooLargeError(): string {
  const limitMb = Math.floor(CHAT_VIDEO_MAX_UPLOAD_BYTES / (1024 * 1024));
  return `Video çok büyük (en fazla ${limitMb} MB). Daha kısa bir video seçin.`;
}

async function resolveUploadUri(
  stableUri: string,
  originalSize: number,
  report: (stage: MediaUploadStage, progress: number, fileSizeBytes?: number) => void,
): Promise<{ uri: string; size: number } | { error: string }> {
  let uploadUri = stableUri;
  let uploadSize = originalSize;

  report('compressing', 0, originalSize);

  if (shouldSkipVideoCompression(originalSize, 'messaging')) {
    report('compressing', 1, originalSize);
    return { uri: stableUri, size: originalSize };
  }

  try {
    uploadUri = await compressVideoForUpload(stableUri, {
      profile: 'messaging',
      onProgress: (progress) => report('compressing', progress, originalSize),
    });
    uploadSize = getLocalFileSize(uploadUri);
    if (uploadSize <= 0) {
      uploadUri = stableUri;
      uploadSize = originalSize;
    }
  } catch (err) {
    if (__DEV__) console.warn('[message-video] compress skipped', err);
  }

  report('compressing', 1, uploadSize);

  if (uploadSize > CHAT_VIDEO_MAX_UPLOAD_BYTES) {
    return { error: tooLargeError() };
  }

  return { uri: uploadUri, size: uploadSize };
}

/** Videoyu sıkıştırıp message-media bucket'ına yükler. */
export async function uploadMessageVideo(
  userId: string,
  localUri: string,
  options: UploadOptions = {},
): Promise<{ url: string | null; error: string | null }> {
  const report = (stage: MediaUploadStage, progress: number, fileSizeBytes = 0) => {
    options.onProgress?.({
      stage,
      progress,
      etaSec: estimateEtaSec(fileSizeBytes, stage, progress),
    });
  };

  try {
    const stableUri = await prepareLocalVideoUri(localUri);

    const durationSec = options.durationSec ?? 0;
    if (durationSec > CHAT_VIDEO_MAX_DURATION_SEC) {
      return {
        url: null,
        error: `Video en fazla ${Math.floor(CHAT_VIDEO_MAX_DURATION_SEC / 60)} dakika olabilir.`,
      };
    }

    const originalSize = getLocalFileSize(stableUri);
    if (originalSize <= 0) {
      return { url: null, error: 'Video dosyası okunamadı.' };
    }

    const prepared = await resolveUploadUri(stableUri, originalSize, report);
    if ('error' in prepared) {
      return { url: null, error: prepared.error };
    }

    const { uri: uploadUri, size: fileSize } = prepared;

    report('uploading', 0, fileSize);

    const uploadStarted = Date.now();
    const { url, error } = await uploadMessageMedia(
      userId,
      uploadUri,
      'video',
      'video/mp4',
    );

    if (error || !url) return { url: null, error: error ?? 'Yükleme başarısız.' };

    const elapsed = (Date.now() - uploadStarted) / 1000;
    options.onProgress?.({
      stage: 'uploading',
      progress: 0.98,
      etaSec: Math.max(1, Math.ceil(elapsed)),
    });

    report('uploading', 1, fileSize);
    return { url, error: null };
  } catch (err) {
    return {
      url: null,
      error: toUserFacingError(err instanceof Error ? err.message : String(err), {
        fallback: 'Video yüklenemedi.',
      }),
    };
  }
}

/** Seçim anında kaba ETA tahmini (sn). */
export function estimateInitialVideoEtaSec(fileSizeBytes?: number, durationMs?: number): number {
  const durationSec = durationMs ? durationMs / 1000 : 30;
  const size = fileSizeBytes ?? durationSec * 1_500_000;
  return estimateEtaSec(size, 'compressing', 0);
}
