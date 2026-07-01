import { DEFAULT_REGION_ID, type RegionId } from '@/constants/regions';
import { uploadPostMedia } from '@/features/compose/services/postMediaUpload';
import {
  reserveStoryVideo,
  storyReservationMediaUrl,
  uploadReservedStoryVideo,
  uploadStoryVideoThumb,
  type StoryVideoReservation,
} from '@/features/stories/services/uploadStoryVideoMux';

export type UploadStoryMediaProgress = {
  stage: 'preparing' | 'compressing' | 'uploading' | 'thumbnail' | 'saving';
  message: string;
};

export type UploadStoryMediaResult = {
  mediaUrl: string | null;
  thumbUrl: string | null;
  error: string | null;
  /** Mux yüklemesi arka planda sürüyorsa true */
  processing?: boolean;
  reservation?: StoryVideoReservation;
};

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

/** Hikâye videosu: Mux rezervasyonu + küçük önizleme; dosya yükleme ayrı adımda. */
export async function prepareStoryVideoUpload(
  userId: string,
  localUri: string,
  regionId?: string | null,
  onProgress?: (progress: UploadStoryMediaProgress) => void,
): Promise<UploadStoryMediaResult> {
  onProgress?.({ stage: 'preparing', message: 'Video hazırlanıyor…' });

  const [reserved, thumbUrl] = await Promise.all([
    reserveStoryVideo(userId, regionId as RegionId | null, localUri),
    (async () => {
      onProgress?.({ stage: 'thumbnail', message: 'Önizleme oluşturuluyor…' });
      return uploadStoryVideoThumb(userId, localUri);
    })(),
  ]);

  if ('error' in reserved) {
    return { mediaUrl: null, thumbUrl: null, error: reserved.error };
  }

  return {
    mediaUrl: storyReservationMediaUrl(reserved),
    thumbUrl,
    error: null,
    processing: true,
    reservation: reserved,
  };
}

export async function finishStoryVideoUpload(
  reservation: StoryVideoReservation,
  onProgress?: (progress: UploadStoryMediaProgress) => void,
): Promise<{ error: string | null }> {
  return uploadReservedStoryVideo(reservation, onProgress);
}

/** Görsel: doğrudan yükle. Video: prepare + finish birlikte (geri uyumluluk). */
export async function uploadStoryMedia(
  userId: string,
  localUri: string,
  mediaType: 'image' | 'video',
  options?: {
    regionId?: string | null;
    onProgress?: (progress: UploadStoryMediaProgress) => void;
  },
): Promise<UploadStoryMediaResult> {
  if (!localUri?.trim()) {
    return { mediaUrl: null, thumbUrl: null, error: 'Medya dosyası bulunamadı.' };
  }

  if (mediaType === 'image') {
    return uploadStoryImage(userId, localUri);
  }

  const prepared = await prepareStoryVideoUpload(
    userId,
    localUri,
    options?.regionId ?? DEFAULT_REGION_ID,
    options?.onProgress,
  );
  if (prepared.error || !prepared.reservation) {
    return prepared;
  }

  const finished = await finishStoryVideoUpload(prepared.reservation, options?.onProgress);
  if (finished.error) {
    return {
      mediaUrl: prepared.mediaUrl,
      thumbUrl: prepared.thumbUrl,
      error: finished.error,
      processing: true,
      reservation: prepared.reservation,
    };
  }

  return {
    mediaUrl: prepared.mediaUrl,
    thumbUrl: prepared.thumbUrl,
    error: null,
    processing: true,
    reservation: prepared.reservation,
  };
}
