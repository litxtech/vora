import { STORY_MAX_VIDEO_SEC, STORY_TTL_HOURS } from '@/features/stories/constants';
import type { StoryStickerCategoryId } from '@/features/stories/constants';
import type { StoryFraming } from '@/features/stories/utils/storyFraming';
import {
  musicSelectionToManifest,
  serializeStoryManifest,
  type StoryLocationManifest,
  type StoryMusicManifest,
} from '@/features/stories/utils/storyManifest';
import {
  finishStoryVideoUpload,
  prepareStoryVideoUpload,
  uploadStoryMedia,
  type UploadStoryMediaProgress,
} from '@/features/stories/services/uploadStoryMedia';
import { resolveStoryMediaUrl, resolveStoryThumbUrl } from '@/features/stories/services/storyMediaUrl';
import {
  setCachedMuxPlaybackUrl,
} from '@/features/stories/services/storyMuxPlaybackCache';
import { parseProcessingVideoId } from '@/lib/media/videoProcessingUrl';
import { kickstartMuxSync, pollMuxUntilReady } from '@/services/video/muxPoll';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';
import type { MusicSelection } from '@/features/music/types';
import type { SelectedLocation } from '@/features/compose/components/LocationPicker';
import { probeVideoDuration } from '@/features/vora-studio/services/exportStudioVideo';

export type PublishStoryInput = {
  authorId: string;
  localUri: string;
  mediaType: 'image' | 'video';
  durationSec?: number;
  regionId?: string | null;
  stickerCategory?: StoryStickerCategoryId | null;
  framing?: StoryFraming | null;
  music?: MusicSelection | null;
  location?: SelectedLocation | null;
  /** Studio'da kırpıldıysa dosya süresi yerine bu değer kullanılır. */
  trimmedInStudio?: boolean;
  onUploadProgress?: (progress: UploadStoryMediaProgress) => void;
};

export type PublishStoryResult = {
  storyId: string | null;
  itemId: string | null;
  mediaUrl: string | null;
  error: string | null;
};

async function getOrCreateActiveStory(
  authorId: string,
  regionId: string | null,
): Promise<{ storyId: string | null; error: string | null }> {
  const expiresAt = new Date(Date.now() + STORY_TTL_HOURS * 60 * 60 * 1000).toISOString();

  const { data: existing } = await supabase
    .from('stories')
    .select('id')
    .eq('author_id', authorId)
    .eq('status', 'published')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    return { storyId: existing.id, error: null };
  }

  const { data, error } = await supabase
    .from('stories')
    .insert({
      author_id: authorId,
      region_id: regionId,
      audience: 'public',
      status: 'published',
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (error) return { storyId: null, error: supabaseErrorMessage(error)! };
  return { storyId: data.id as string, error: null };
}

export async function publishStory(input: PublishStoryInput): Promise<PublishStoryResult> {
  const isVideo = input.mediaType === 'video';

  if (!input.localUri?.trim()) {
    return { storyId: null, itemId: null, mediaUrl: null, error: 'Medya dosyası bulunamadı.' };
  }

  if (isVideo && (input.durationSec ?? 0) > STORY_MAX_VIDEO_SEC) {
    return {
      storyId: null,
      itemId: null,
      mediaUrl: null,
      error: `Hikaye videosu en fazla ${STORY_MAX_VIDEO_SEC} saniye olabilir. Uzun videolarda paylaşmadan önce 30 saniyelik bölüm seçin.`,
    };
  }

  if (
    isVideo &&
    !input.trimmedInStudio &&
    (input.durationSec == null || input.durationSec <= 0)
  ) {
    const probed = await probeVideoDuration(input.localUri);
    if (probed > STORY_MAX_VIDEO_SEC) {
      return {
        storyId: null,
        itemId: null,
        mediaUrl: null,
        error: `Hikaye videosu en fazla ${STORY_MAX_VIDEO_SEC} saniye olabilir. Uzun videolarda paylaşmadan önce 30 saniyelik bölüm seçin.`,
      };
    }
  }

  const { storyId, error: storyError } = await getOrCreateActiveStory(
    input.authorId,
    input.regionId ?? null,
  );
  if (storyError || !storyId) {
    return { storyId: null, itemId: null, mediaUrl: null, error: storyError ?? 'Hikaye oluşturulamadı' };
  }

  let mediaUrl: string | null = null;
  let thumbUrl: string | null = null;
  let videoReservation: Awaited<ReturnType<typeof prepareStoryVideoUpload>>['reservation'];

  if (isVideo) {
    input.onUploadProgress?.({ stage: 'preparing', message: 'Video hazırlanıyor…' });
    const prepared = await prepareStoryVideoUpload(
      input.authorId,
      input.localUri,
      input.regionId,
      input.onUploadProgress,
    );
    if (prepared.error || !prepared.mediaUrl) {
      return { storyId, itemId: null, mediaUrl: null, error: prepared.error ?? 'Video hazırlanamadı' };
    }
    mediaUrl = prepared.mediaUrl;
    thumbUrl = prepared.thumbUrl;
    videoReservation = prepared.reservation;

    if (videoReservation) {
      input.onUploadProgress?.({ stage: 'uploading', message: 'Video yükleniyor…' });
      const uploaded = await finishStoryVideoUpload(videoReservation, input.onUploadProgress);
      if (uploaded.error) {
        return { storyId, itemId: null, mediaUrl: null, error: uploaded.error };
      }

      const videoId = parseProcessingVideoId(mediaUrl);
      if (videoId) {
        kickstartMuxSync(videoId);
        input.onUploadProgress?.({ stage: 'saving', message: 'Video işleniyor…' });
        const muxReady = await pollMuxUntilReady(videoId, { maxWaitMs: 25_000 });
        if (muxReady.status === 'ready' && muxReady.playbackId) {
          mediaUrl = setCachedMuxPlaybackUrl(videoId, muxReady.playbackId);
        }
      }
    }
  } else {
    const upload = await uploadStoryMedia(input.authorId, input.localUri, 'image', {
      regionId: input.regionId,
      onProgress: input.onUploadProgress,
    });
    if (upload.error || !upload.mediaUrl) {
      return { storyId, itemId: null, mediaUrl: null, error: upload.error ?? 'Medya yüklenemedi' };
    }
    mediaUrl = resolveStoryMediaUrl(upload.mediaUrl) ?? upload.mediaUrl;
    thumbUrl = resolveStoryThumbUrl(upload.thumbUrl, upload.mediaUrl);
  }

  const resolvedMediaUrl = resolveStoryMediaUrl(mediaUrl) ?? mediaUrl;
  const resolvedThumbUrl = resolveStoryThumbUrl(thumbUrl, mediaUrl);
  const mediaType: 'image' | 'video' = isVideo ? 'video' : 'image';

  let durationSec = input.durationSec ?? null;
  if (mediaType === 'video' && (durationSec == null || durationSec <= 0) && !input.trimmedInStudio) {
    const probed = await probeVideoDuration(input.localUri);
    if (probed > 0) durationSec = probed;
  }

  const expiresAt = new Date(Date.now() + STORY_TTL_HOURS * 60 * 60 * 1000).toISOString();

  const { data: orderRow } = await supabase
    .from('story_items')
    .select('sort_order')
    .eq('story_id', storyId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = Number(orderRow?.sort_order ?? -1) + 1;

  const musicManifest: StoryMusicManifest | null = musicSelectionToManifest(input.music ?? null);
  const locationManifest: StoryLocationManifest | null = input.location?.label?.trim()
    ? { label: input.location.label.trim() }
    : null;

  const stickersJson = serializeStoryManifest({
    framing: input.framing ?? null,
    music: musicManifest,
    location: locationManifest,
  });

  const { data: item, error: itemError } = await supabase
    .from('story_items')
    .insert({
      story_id: storyId,
      author_id: input.authorId,
      sort_order: nextOrder,
      media_type: mediaType,
      media_url: resolvedMediaUrl,
      thumb_url: resolvedThumbUrl,
      duration_sec: mediaType === 'video' ? durationSec : null,
      sticker_category: input.stickerCategory ?? null,
      stickers_json: stickersJson,
      status: 'published',
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (itemError) {
    return {
      storyId,
      itemId: null,
      mediaUrl,
      error: supabaseErrorMessage(itemError)!,
    };
  }

  await supabase
    .from('stories')
    .update({
      expires_at: expiresAt,
      region_id: input.regionId ?? null,
      item_count: nextOrder + 1,
      latest_thumb_url: resolvedThumbUrl ?? resolvedMediaUrl,
      latest_item_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', storyId);

  return {
    storyId,
    itemId: item.id as string,
    mediaUrl: resolvedMediaUrl,
    error: null,
  };
}
