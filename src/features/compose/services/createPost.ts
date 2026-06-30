import { extractHashtags } from '@/features/feed/utils';
import { uploadPostMedia } from '@/features/compose/services/postMediaUpload';
import {
  reservePostVideo,
  reservationToPostMedia,
  uploadReservedPostVideo,
  type PostVideoReservation,
} from '@/features/compose/services/postVideoUpload';
import {
  mapBackgroundVideoProgress,
  mapPublishedProgress,
} from '@/features/compose/services/postUploadProgress';
import { publishPostAsReel } from '@/features/compose/services/publishPostAsReel';
import { attestPostContent } from '@/features/vcts/services/attestation';
import { resolvePostLocationCoords } from '@/features/compose/services/resolvePostLocation';
import { finalizePublishedVideo } from '@/services/video/finalizeVideo';
import { getProfileLabel } from '@/lib/notifications/helpers';
import { notifyMentionedUsers } from '@/lib/notifications/mentions';
import { buildNotificationData } from '@/lib/notifications/notificationPayload';
import { supabase } from '@/lib/supabase/client';
import type { RegionId } from '@/constants/regions';
import type { PostAudience } from '@/features/profile/services/audienceFilter';
import type { PostCategory } from '@/types/database';
import { VIDEO_PROGRESS } from '@/services/video/progressMessages';
import { throwIfAborted } from '@/services/video/uploadCancelled';
import { isLocalVideoUri, isVideoUrl } from '@/lib/media/isVideoUrl';
import type { MusicSelection } from '@/features/music/types';
import { editManifestToDbField, getMusicPersistenceError, musicSelectionToDbFields, recordMusicUsage } from '@/features/music/services/recordUsage';
import type { MapLocationSource } from '@/features/map/types';
import { isValidPostCoordinate } from '@/features/map/utils/geoBounds';
import type { PublishedEditManifest } from '@/features/vora-studio/types';
import { supabaseErrorMessage } from '@/lib/errors';
import { trackReferralEvent } from '@/features/referral-earnings/services/referralTracking';

export type CreatePostInput = {
  authorId: string;
  regionId: string;
  district?: string | null;
  locationLabel?: string | null;
  locationSource?: MapLocationSource;
  locationGeocodeHint?: string | null;
  locationSuggestionRegionId?: RegionId;
  locationMapboxId?: string | null;
  locationSessionToken?: string | null;
  title?: string | null;
  content: string;
  category: PostCategory;
  mediaUris: string[];
  latitude?: number | null;
  longitude?: number | null;
  audience?: PostAudience;
  communityId?: string | null;
  music?: MusicSelection | null;
  editManifest?: PublishedEditManifest | null;
};

async function syncHashtags(postId: string, content: string): Promise<void> {
  const tags = extractHashtags(content);
  if (tags.length === 0) return;

  const { error } = await supabase.rpc('sync_post_hashtags', {
    p_post_id: postId,
    p_tags: tags,
  });

  if (error) {
    console.warn('[createPost] sync_post_hashtags failed:', error.message);
  }
}

export type CreatePostOptions = {
  signal?: AbortSignal;
  /** Gönderi DB'ye yazıldığında — video yüklemesi arka planda sürerken UI anında başarı gösterebilir. */
  onPublished?: (result: { postId: string; videoProcessing: boolean }) => void;
};

type PreparedMediaSlot =
  | { kind: 'video'; reservation: PostVideoReservation }
  | { kind: 'image'; url: string; storagePath: string; sha256: string; assetIndex: number };

async function runDeferredPostSideEffects(
  input: CreatePostInput,
  postId: string,
  combinedText: string,
  publishStatus: string,
): Promise<void> {
  let mapLatitude = input.latitude ?? null;
  let mapLongitude = input.longitude ?? null;

  if ((mapLatitude == null || mapLongitude == null) && input.locationLabel?.trim()) {
    const resolved = await resolvePostLocationCoords({
      label: input.locationLabel,
      regionId: input.regionId as RegionId,
      suggestionRegionId: input.locationSuggestionRegionId,
      latitude: mapLatitude,
      longitude: mapLongitude,
      source: input.locationSource,
      geocodeHint: input.locationGeocodeHint,
      mapboxId: input.locationMapboxId,
      sessionToken: input.locationSessionToken,
    });
    if (resolved) {
      mapLatitude = resolved.latitude;
      mapLongitude = resolved.longitude;
    }
  }

  const locationRegion = input.locationSuggestionRegionId ?? (input.regionId as RegionId);
  if (
    mapLatitude != null &&
    mapLongitude != null &&
    isValidPostCoordinate(mapLatitude, mapLongitude, locationRegion)
  ) {
    const { error: locationError } = await supabase.rpc('set_post_location', {
      p_post_id: postId,
      lng: mapLongitude,
      lat: mapLatitude,
    });
    if (locationError) {
      console.warn('[createPost] set_post_location failed:', locationError.message);
    }
  }

  await syncHashtags(postId, input.content);

  if (publishStatus === 'published') {
    const actor = await getProfileLabel(input.authorId);
    await notifyMentionedUsers(
      combinedText,
      input.authorId,
      'Senden bahsetti',
      `${actor}: ${input.content.trim().slice(0, 80)}`,
      buildNotificationData({ postId }),
    );
  }
}

export async function createPost(
  input: CreatePostInput,
  onProgress?: (stage: string, progress: number, message?: string, etaSec?: number | null) => void,
  options: CreatePostOptions = {},
): Promise<{
  postId: string | null;
  trustCode: string | null;
  reelId: string | null;
  error: string | null;
  pendingReview?: boolean;
  videoProcessing?: boolean;
  cancelled?: boolean;
}> {
  const { signal } = options;
  const combinedText = `${input.title ?? ''} ${input.content}`.trim();
  const publishStatus = 'published';
  const caption = `${input.title ?? ''}\n${input.content}`.trim();

  const musicPersistenceError = getMusicPersistenceError(input.music);
  if (musicPersistenceError) {
    return { postId: null, trustCode: null, reelId: null, error: musicPersistenceError };
  }

  const mediaCount = input.mediaUris.length;
  const preparedSlots: PreparedMediaSlot[] = new Array(mediaCount);
  let hasVideo = false;
  let firstVideoId: string | null = null;
  let firstVideoIndex = -1;
  const videoStillProcessing = input.mediaUris.some((uri) => isLocalVideoUri(uri));

  onProgress?.('preparing', 0.05, VIDEO_PROGRESS.preparing, null);

  try {
    await Promise.all(
      input.mediaUris.map(async (uri, i) => {
        throwIfAborted(signal);

        if (isLocalVideoUri(uri)) {
          onProgress?.('preparing', 0.1 + (i / Math.max(mediaCount, 1)) * 0.15, VIDEO_PROGRESS.preparing, null);
          const reserved = await reservePostVideo(
            input.authorId,
            input.regionId,
            uri,
            i,
            caption || null,
          );
          if ('error' in reserved) {
            throw new Error(reserved.error);
          }
          if (input.editManifest) {
            reserved.skipCompression = true;
          }
          preparedSlots[i] = { kind: 'video', reservation: reserved };
          return;
        }

        onProgress?.(
          'uploading',
          0.25 + (i / Math.max(mediaCount, 1)) * 0.35,
          'Medyalar yükleniyor...',
          null,
        );
        const { url, storagePath, sha256, error } = await uploadPostMedia(input.authorId, uri, i);
        if (error || !url || !storagePath || !sha256) {
          throw new Error(error ?? 'Medya yüklenemedi.');
        }
        preparedSlots[i] = { kind: 'image', url, storagePath, sha256, assetIndex: i };
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Medya hazırlanamadı.';
    return { postId: null, trustCode: null, reelId: null, error: message };
  }

  const mediaUrls: string[] = [];
  const mediaAssets: Array<{
    url: string;
    storagePath: string;
    sha256: string;
    assetIndex: number;
  }> = [];

  for (let i = 0; i < preparedSlots.length; i++) {
    const slot = preparedSlots[i];
    if (!slot) continue;

    if (slot.kind === 'video') {
      const mapped = reservationToPostMedia(slot.reservation);
      mediaUrls.push(mapped.url);
      mediaAssets.push({
        url: mapped.url,
        storagePath: mapped.storagePath,
        sha256: mapped.sha256,
        assetIndex: mapped.assetIndex,
      });
      hasVideo = true;
      if (!firstVideoId) {
        firstVideoId = mapped.videoId;
        firstVideoIndex = mediaUrls.length - 1;
      }
      continue;
    }

    mediaUrls.push(slot.url);
    mediaAssets.push({
      url: slot.url,
      storagePath: slot.storagePath,
      sha256: slot.sha256,
      assetIndex: slot.assetIndex,
    });
    if (isVideoUrl(slot.url)) hasVideo = true;
  }

  throwIfAborted(signal);
  onProgress?.('saving', 0.62, 'Gönderi kaydediliyor...', null);

  const { data, error } = await supabase
    .from('posts')
    .insert({
      author_id: input.authorId,
      region_id: input.regionId,
      district: input.district ?? null,
      location_label: input.locationLabel ?? null,
      title: input.title ?? null,
      content: input.content.trim(),
      category: input.category,
      media_urls: mediaUrls,
      audience: input.audience ?? 'public',
      status: publishStatus,
      requires_moderation: false,
      community_id: input.communityId ?? null,
      ...musicSelectionToDbFields(input.music ?? null),
      ...editManifestToDbField(input.editManifest ?? null),
    })
    .select('id')
    .single();

  if (error) return { postId: null, trustCode: null, reelId: null, error: supabaseErrorMessage(error)! };

  const published = mapPublishedProgress();
  onProgress?.('published', published.progress, published.message, null);
  options.onPublished?.({ postId: data.id, videoProcessing: videoStillProcessing });

  void runDeferredPostSideEffects(input, data.id, combinedText, publishStatus);

  const videoSlots = preparedSlots
    .map((slot, index) => (slot?.kind === 'video' ? { slot, index } : null))
    .filter(Boolean) as Array<{ slot: Extract<PreparedMediaSlot, { kind: 'video' }>; index: number }>;

  for (const { slot, index: slotIndex } of videoSlots) {
    throwIfAborted(signal);
    const videoIndex = videoSlots.findIndex((v) => v.index === slotIndex);

    const uploadResult = await uploadReservedPostVideo(
      slot.reservation,
      (state) => {
        if (state.stage === 'preparing') return;
        const mapped = mapBackgroundVideoProgress(
          videoIndex,
          videoSlots.length,
          state.stage,
          state.progress,
          state.fileSizeBytes,
        );
        onProgress?.('uploading', mapped.progress, mapped.message, mapped.etaSec);
      },
      {
        skipCompression: Boolean(input.editManifest),
        signal,
      },
    );

    if (uploadResult.cancelled) {
      return {
        postId: data.id,
        trustCode: null,
        reelId: null,
        error: null,
        cancelled: true,
        videoProcessing: videoStillProcessing,
      };
    }

    if (uploadResult.error) {
      console.warn('[createPost] background video upload failed:', uploadResult.error);
    }

    if (uploadResult.sha256 && uploadResult.storagePath) {
      const asset = mediaAssets.find((a) => a.assetIndex === slot.reservation.index);
      if (asset) {
        asset.sha256 = uploadResult.sha256;
      }
    }
  }

  throwIfAborted(signal);
  onProgress?.('attestation', 0.96, 'Doğrulanıyor...', null);
  const combinedContent = `${input.title ?? ''}\n${input.content}`.trim();
  const { trustCode, error: attestError } = await attestPostContent(
    data.id,
    input.authorId,
    combinedContent,
    mediaAssets,
    hasVideo,
  );

  if (attestError) {
    console.warn('[VCTS] Attestation failed:', attestError);
  }

  let reelId: string | null = null;
  const shouldPublishReel =
    hasVideo && firstVideoId && publishStatus === 'published' && !input.communityId;

  if (shouldPublishReel && videoStillProcessing && firstVideoIndex >= 0 && firstVideoId) {
    void finalizePublishedVideo({
      postId: data.id,
      videoId: firstVideoId,
      mediaIndex: firstVideoIndex,
      authorId: input.authorId,
      regionId: input.regionId,
      caption,
      publishReel: true,
    });
  } else if (shouldPublishReel && firstVideoId && !videoStillProcessing) {
    onProgress?.('reel', 0.96, 'Reels\'e ekleniyor...', null);
    const reelResult = await publishPostAsReel({
      authorId: input.authorId,
      regionId: input.regionId,
      videoId: firstVideoId,
      postId: data.id,
      caption,
      music: input.music ?? null,
      editManifest: input.editManifest ?? null,
    });
    if (reelResult.error) {
      console.warn('[createPost] Reel auto-publish failed:', reelResult.error);
    } else {
      reelId = reelResult.reelId;
      if (input.music && reelId) {
        await recordMusicUsage(input.music, { postId: data.id, reelId });
      }
    }
  }

  if (input.music && !reelId) {
    await recordMusicUsage(input.music, { postId: data.id });
  }

  onProgress?.('done', 1, 'Paylaşıldı', null);

  void trackReferralEvent('share');

  return {
    postId: data.id,
    trustCode,
    reelId,
    error: null,
    pendingReview: false,
    videoProcessing: videoStillProcessing,
  };
}
