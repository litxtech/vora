import { DEFAULT_REGION_ID, type RegionId } from '@/constants/regions';
import {
  reserveStoryVideo,
  storyReservationMediaUrl,
  uploadReservedStoryVideo,
  uploadStoryVideoThumb,
  type StoryVideoReservation,
} from '@/features/stories/services/uploadStoryVideoMux';
import { uploadStoryImage } from '@/features/stories/services/uploadStoryImage';
import { parseProcessingVideoId } from '@/lib/media/videoProcessingUrl';
import { kickstartMuxSync, pollMuxUntilReady } from '@/services/video/muxPoll';
import { setCachedMuxPlaybackUrl } from '@/features/stories/services/storyMuxPlaybackCache';
import { resolveStoryThumbUrl } from '@/features/stories/services/storyMediaUrl';
import { supabase } from '@/lib/supabase/client';

export type UploadStoryMediaProgress = {
  stage: 'preparing' | 'compressing' | 'uploading' | 'thumbnail' | 'saving';
  message: string;
  /** 0–1 arası yükleme ilerlemesi (video). */
  progress?: number;
};

export type UploadStoryMediaResult = {
  mediaUrl: string | null;
  thumbUrl: string | null;
  error: string | null;
  /** Mux yüklemesi arka planda sürüyorsa true */
  processing?: boolean;
  reservation?: StoryVideoReservation;
};

/** Hikâye videosu: yalnızca Mux rezervasyonu (anında DB kaydı için). */
export async function prepareStoryVideoUpload(
  userId: string,
  localUri: string,
  regionId?: string | null,
  onProgress?: (progress: UploadStoryMediaProgress) => void,
): Promise<UploadStoryMediaResult> {
  onProgress?.({ stage: 'preparing', message: 'Video hazırlanıyor…' });

  const reserved = await reserveStoryVideo(userId, regionId as RegionId | null, localUri);
  if ('error' in reserved) {
    return { mediaUrl: null, thumbUrl: null, error: reserved.error };
  }

  return {
    mediaUrl: storyReservationMediaUrl(reserved),
    thumbUrl: null,
    error: null,
    processing: true,
    reservation: reserved,
  };
}

export async function finishStoryVideoUpload(
  reservation: StoryVideoReservation,
  onProgress?: (progress: UploadStoryMediaProgress) => void,
): Promise<{ error: string | null }> {
  return uploadReservedStoryVideo(reservation, (state) => {
    onProgress?.({
      stage: state.stage,
      message: state.message,
      progress: state.progress,
    });
  });
}

export type DeferredStoryVideoUploadInput = {
  reservation: StoryVideoReservation;
  authorId: string;
  storyId: string;
  itemId: string;
  localUri: string;
  onProgress?: (progress: UploadStoryMediaProgress) => void;
  onComplete?: (result: { error: string | null }) => void;
};

/** Video + önizleme arka planda yüklenir; başarısızlıkta slayt kaldırılır. */
export async function runDeferredStoryVideoUpload(
  input: DeferredStoryVideoUploadInput,
): Promise<void> {
  const { reservation, authorId, storyId, itemId, localUri, onProgress, onComplete } = input;

  const [uploaded, thumbUrl] = await Promise.all([
    finishStoryVideoUpload(reservation, onProgress),
    (async () => {
      onProgress?.({ stage: 'thumbnail', message: 'Önizleme oluşturuluyor…' });
      return uploadStoryVideoThumb(authorId, localUri);
    })(),
  ]);

  if (uploaded.error) {
    await supabase.from('story_items').update({ status: 'removed' }).eq('id', itemId);
    onComplete?.({ error: uploaded.error });
    return;
  }

  const resolvedThumb = resolveStoryThumbUrl(thumbUrl, storyReservationMediaUrl(reservation));
  if (resolvedThumb) {
    await Promise.all([
      supabase.from('story_items').update({ thumb_url: resolvedThumb }).eq('id', itemId),
      supabase.from('stories').update({ latest_thumb_url: resolvedThumb }).eq('id', storyId),
    ]);
  }

  const videoId = parseProcessingVideoId(storyReservationMediaUrl(reservation));
  if (videoId) {
    kickstartMuxSync(videoId);
    void pollMuxUntilReady(videoId, { maxWaitMs: 8_000 }).then((muxReady) => {
      if (muxReady.status === 'ready' && muxReady.playbackId) {
        setCachedMuxPlaybackUrl(videoId, muxReady.playbackId);
      }
    });
  }

  onComplete?.({ error: null });
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
    const upload = await uploadStoryImage(userId, localUri);
    return {
      mediaUrl: upload.mediaUrl,
      thumbUrl: upload.thumbUrl,
      error: upload.error,
    };
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

  const thumbUrl = await uploadStoryVideoThumb(userId, localUri);

  return {
    mediaUrl: prepared.mediaUrl,
    thumbUrl: resolveStoryThumbUrl(thumbUrl, prepared.mediaUrl),
    error: null,
    processing: true,
    reservation: prepared.reservation,
  };
}
