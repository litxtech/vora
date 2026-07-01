import * as VideoThumbnails from 'expo-video-thumbnails';
import { DEFAULT_REGION_ID, type RegionId } from '@/constants/regions';
import { uploadPostMedia } from '@/features/compose/services/postMediaUpload';
import { buildProcessingVideoUrl } from '@/lib/media/videoProcessingUrl';
import { getLocalFileSize, normalizeLocalFileUri } from '@/lib/files/readLocalFile';
import { prepareLocalVideoUri } from '@/lib/video/prepareLocalVideo';
import { shouldSkipVideoCompression } from '@/lib/video/compress';
import { VIDEO_PROGRESS } from '@/services/video/progressMessages';
import { reserveMuxVideo, type MuxVideoReservation } from '@/services/video/reserveMuxVideo';
import { uploadVideoFileToMux } from '@/services/video/uploadVideoFile';
import { toUserFacingError } from '@/lib/errors';

export type StoryVideoUploadProgress = {
  stage: 'preparing' | 'compressing' | 'uploading' | 'thumbnail';
  message: string;
};

export type StoryVideoReservation = MuxVideoReservation & {
  localUri: string;
  skipCompression: boolean;
};

export async function reserveStoryVideo(
  authorId: string,
  regionId: RegionId | string | null | undefined,
  localUri: string,
): Promise<StoryVideoReservation | { error: string }> {
  try {
    const reservation = await reserveMuxVideo({
      ownerId: authorId,
      regionId: (regionId ?? DEFAULT_REGION_ID) as RegionId,
      description: 'story',
    });

    return {
      ...reservation,
      localUri,
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

export async function uploadStoryVideoThumb(
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

/** Gönderi paylaşımıyla aynı Mux hattı: 1080p hedef, büyük dosyalarda akış yükleme, boyut sınırı yok. */
export async function uploadReservedStoryVideo(
  reservation: StoryVideoReservation,
  onProgress?: (progress: StoryVideoUploadProgress) => void,
): Promise<{ error: string | null }> {
  try {
    onProgress?.({ stage: 'preparing', message: VIDEO_PROGRESS.preparing });

    const preparedUri = await prepareLocalVideoUri(reservation.localUri);
    const fileSize = getLocalFileSize(preparedUri);
    const skipCompression =
      reservation.skipCompression || shouldSkipVideoCompression(fileSize, 'post');

    await uploadVideoFileToMux(
      reservation,
      preparedUri,
      (state) => {
        onProgress?.({
          stage: state.stage,
          message:
            state.stage === 'compressing'
              ? VIDEO_PROGRESS.compressing
              : VIDEO_PROGRESS.uploading,
        });
      },
      { profile: 'post', skipCompression },
    );

    return { error: null };
  } catch (err) {
    return {
      error: toUserFacingError(err instanceof Error ? err.message : String(err), {
        fallback: 'Video yüklenemedi.',
      }),
    };
  }
}

export function storyReservationMediaUrl(reservation: StoryVideoReservation): string {
  return buildProcessingVideoUrl(reservation.videoId);
}
