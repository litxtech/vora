import { buildProcessingVideoUrl } from '@/lib/media/videoProcessingUrl';
import { isLocalVideoUri } from '@/lib/media/isVideoUrl';
import { getLocalFileSize } from '@/lib/files/readLocalFile';
import { prepareLocalVideoUri } from '@/lib/video/prepareLocalVideo';
import { shouldSkipVideoCompression } from '@/lib/video/compress';
import { VIDEO_PROGRESS } from '@/services/video/progressMessages';
import { reserveMuxVideo, type MuxVideoReservation } from '@/services/video/reserveMuxVideo';
import { uploadVideoFileToMux } from '@/services/video/uploadVideoFile';
import { isUploadCancelledError } from '@/services/video/uploadCancelled';
import { toUserFacingError } from '@/lib/errors';

export type PostVideoReservation = MuxVideoReservation & {
  localUri: string;
  index: number;
  fileSizeBytes: number;
  skipCompression: boolean;
};

export type PostVideoUploadResult = {
  url: string | null;
  videoId: string | null;
  storagePath: string | null;
  sha256: string | null;
  processing: boolean;
  error: string | null;
  cancelled?: boolean;
};

export type PostVideoUploadProgress = {
  stage: 'preparing' | 'compressing' | 'uploading';
  progress: number;
  message: string;
  fileSizeBytes?: number;
};

/** Anında paylaşım: Mux slot + videoId — dosya kopyası/sıkıştırma yükleme aşamasında. */
export async function reservePostVideo(
  userId: string,
  regionId: string,
  localUri: string,
  index: number,
  description?: string | null,
): Promise<PostVideoReservation | { error: string }> {
  if (!isLocalVideoUri(localUri)) {
    return { error: 'Geçersiz video dosyası.' };
  }

  try {
    const reservation = await reserveMuxVideo({
      ownerId: userId,
      regionId,
      description: description ?? null,
    });

    return {
      ...reservation,
      localUri,
      index,
      fileSizeBytes: 0,
      skipCompression: false,
    };
  } catch (err) {
    return {
      error: toUserFacingError(err instanceof Error ? err.message : String(err), {
        fallback: 'Video hazırlanamadı.',
      }),
    };
  }
}

export function reservationToPostMedia(reservation: PostVideoReservation): {
  url: string;
  videoId: string;
  storagePath: string;
  sha256: string;
  assetIndex: number;
} {
  return {
    url: buildProcessingVideoUrl(reservation.videoId),
    videoId: reservation.videoId,
    storagePath: `mux/${reservation.videoId}/${reservation.index}`,
    sha256: `pending:${reservation.videoId}`,
    assetIndex: reservation.index,
  };
}

/** Gönderi yayında — video dosyasını arka planda Mux'a yükler. */
export async function uploadReservedPostVideo(
  reservation: PostVideoReservation,
  onProgress?: (state: PostVideoUploadProgress) => void,
  options: { skipCompression?: boolean; signal?: AbortSignal } = {},
): Promise<PostVideoUploadResult> {
  try {
    onProgress?.({
      stage: 'preparing',
      progress: 0,
      message: VIDEO_PROGRESS.preparing,
    });

    const preparedUri = await prepareLocalVideoUri(reservation.localUri);
    const fileSize = getLocalFileSize(preparedUri);
    const skipCompression =
      Boolean(options.skipCompression) ||
      reservation.skipCompression ||
      shouldSkipVideoCompression(fileSize, 'post');

    onProgress?.({
      stage: 'preparing',
      progress: 1,
      message: VIDEO_PROGRESS.preparing,
      fileSizeBytes: fileSize,
    });

    const { sha256 } = await uploadVideoFileToMux(
      reservation,
      preparedUri,
      (state) => {
        onProgress?.({
          stage: state.stage,
          progress: state.progress,
          message:
            state.stage === 'compressing'
              ? VIDEO_PROGRESS.compressing
              : VIDEO_PROGRESS.uploading,
          fileSizeBytes: fileSize,
        });
      },
      { profile: 'post', skipCompression, signal: options.signal },
    );

    return {
      url: buildProcessingVideoUrl(reservation.videoId),
      videoId: reservation.videoId,
      storagePath: `mux/${reservation.videoId}/${reservation.index}`,
      sha256,
      processing: true,
      error: null,
    };
  } catch (err) {
    if (isUploadCancelledError(err)) {
      return {
        url: null,
        videoId: reservation.videoId,
        storagePath: null,
        sha256: null,
        processing: false,
        error: null,
        cancelled: true,
      };
    }
    return {
      url: buildProcessingVideoUrl(reservation.videoId),
      videoId: reservation.videoId,
      storagePath: `mux/${reservation.videoId}/${reservation.index}`,
      sha256: null,
      processing: true,
      error: toUserFacingError(err instanceof Error ? err.message : String(err), {
        fallback: 'Video yüklenemedi. Gönderi yayında; tekrar denenecek.',
      }),
    };
  }
}

/** Eski tek-adım akış — geriye dönük uyumluluk (reels vb.). */
export async function uploadPostVideo(
  userId: string,
  regionId: string,
  localUri: string,
  index: number,
  description?: string | null,
  onProgress?: (state: PostVideoUploadProgress) => void,
  options: { skipCompression?: boolean; signal?: AbortSignal } = {},
): Promise<PostVideoUploadResult> {
  const reserved = await reservePostVideo(userId, regionId, localUri, index, description);
  if ('error' in reserved) {
    return {
      url: null,
      videoId: null,
      storagePath: null,
      sha256: null,
      processing: false,
      error: reserved.error,
    };
  }

  if (options.skipCompression) {
    reserved.skipCompression = true;
  }

  return uploadReservedPostVideo(reserved, onProgress, options);
}
