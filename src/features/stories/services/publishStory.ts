import { STORY_MAX_VIDEO_SEC, STORY_TTL_HOURS } from '@/features/stories/constants';
import type { StoryStickerCategoryId } from '@/features/stories/constants';
import type { StoryFraming } from '@/features/stories/utils/storyFraming';
import {
  musicSelectionToManifest,
  serializeStoryManifest,
  type StoryLocationManifest,
  type StoryMusicManifest,
} from '@/features/stories/utils/storyManifest';
import type { StoryLinkManifest } from '@/features/stories/utils/storyLinks';
import {
  prepareStoryVideoUpload,
  runDeferredStoryVideoUpload,
  uploadStoryMedia,
  type UploadStoryMediaProgress,
} from '@/features/stories/services/uploadStoryMedia';
import { resolveStoryMediaUrl, resolveStoryThumbUrl } from '@/features/stories/services/storyMediaUrl';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';
import type { MusicSelection } from '@/features/music/types';
import { recordAudioUsage } from '@/features/sounds/services/recordSoundUsage';
import type { SelectedLocation } from '@/features/compose/components/LocationPicker';
import { probeVideoDuration } from '@/features/vora-studio/services/exportStudioVideo';
import { isUploadCancelledError, throwIfAborted } from '@/services/video/uploadCancelled';

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
  links?: StoryLinkManifest[];
  /** Studio'da kırpıldıysa dosya süresi yerine bu değer kullanılır. */
  trimmedInStudio?: boolean;
  /** Müzik yokken video orijinal ses seviyesi (0 = sessiz). */
  videoOriginalAudioVolume?: number;
  onUploadProgress?: (progress: UploadStoryMediaProgress) => void;
};

export type PublishStoryOptions = {
  signal?: AbortSignal;
  /**
   * Video hikâyelerde DB kaydı tamamlanınca çağrılır — dosya yüklemesi arka planda sürer.
   * UI anında başarı gösterebilir.
   */
  onPublished?: (result: { storyId: string; itemId: string; videoProcessing: boolean }) => void;
  onBackgroundComplete?: (result: { error: string | null; cancelled?: boolean }) => void;
};

export type PublishStoryResult = {
  storyId: string | null;
  itemId: string | null;
  mediaUrl: string | null;
  error: string | null;
  cancelled?: boolean;
  /** Video arka planda yükleniyorsa true */
  videoProcessing?: boolean;
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

type InsertStoryItemInput = {
  storyId: string;
  authorId: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  thumbUrl: string | null;
  durationSec: number | null;
  stickerCategory?: StoryStickerCategoryId | null;
  framing?: StoryFraming | null;
  music?: MusicSelection | null;
  location?: SelectedLocation | null;
  links?: StoryLinkManifest[];
  regionId?: string | null;
  videoOriginalAudioVolume?: number;
};

async function insertStoryItemRecord(
  input: InsertStoryItemInput,
): Promise<{ itemId: string | null; error: string | null }> {
  const expiresAt = new Date(Date.now() + STORY_TTL_HOURS * 60 * 60 * 1000).toISOString();

  const { data: orderRow } = await supabase
    .from('story_items')
    .select('sort_order')
    .eq('story_id', input.storyId)
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
    links: input.links ?? [],
    originalAudioVolume:
      input.mediaType === 'video' && !musicManifest
        ? (input.videoOriginalAudioVolume ?? 1)
        : undefined,
  });

  const resolvedMediaUrl = resolveStoryMediaUrl(input.mediaUrl) ?? input.mediaUrl;
  const resolvedThumbUrl = resolveStoryThumbUrl(input.thumbUrl, input.mediaUrl);

  const { data: item, error: itemError } = await supabase
    .from('story_items')
    .insert({
      story_id: input.storyId,
      author_id: input.authorId,
      sort_order: nextOrder,
      media_type: input.mediaType,
      media_url: resolvedMediaUrl,
      thumb_url: resolvedThumbUrl,
      duration_sec: input.mediaType === 'video' ? input.durationSec : null,
      sticker_category: input.stickerCategory ?? null,
      stickers_json: stickersJson,
      status: 'published',
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (itemError) {
    return { itemId: null, error: supabaseErrorMessage(itemError)! };
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
    .eq('id', input.storyId);

  if (input.music) {
    void recordAudioUsage(input.music, { storyItemId: item.id as string });
  }

  return { itemId: item.id as string, error: null };
}

export async function publishStory(
  input: PublishStoryInput,
  options: PublishStoryOptions = {},
): Promise<PublishStoryResult> {
  const { signal } = options;

  try {
    return await publishStoryInner(input, options);
  } catch (err) {
    if (isUploadCancelledError(err)) {
      return { storyId: null, itemId: null, mediaUrl: null, error: null, cancelled: true };
    }
    throw err;
  }
}

async function publishStoryInner(
  input: PublishStoryInput,
  options: PublishStoryOptions = {},
): Promise<PublishStoryResult> {
  const { signal } = options;
  const isVideo = input.mediaType === 'video';

  throwIfAborted(signal);

  if (!input.localUri?.trim()) {
    return { storyId: null, itemId: null, mediaUrl: null, error: 'Medya dosyası bulunamadı.' };
  }

  let durationSec = input.durationSec ?? null;

  if (isVideo && (durationSec ?? 0) > STORY_MAX_VIDEO_SEC) {
    return {
      storyId: null,
      itemId: null,
      mediaUrl: null,
      error: `Hikaye videosu en fazla ${STORY_MAX_VIDEO_SEC} saniye olabilir. Uzun videolarda paylaşmadan önce 30 saniyelik bölüm seçin.`,
    };
  }

  if (isVideo && !input.trimmedInStudio && (durationSec == null || durationSec <= 0)) {
    throwIfAborted(signal);
    const probed = await probeVideoDuration(input.localUri);
    if (probed > STORY_MAX_VIDEO_SEC) {
      return {
        storyId: null,
        itemId: null,
        mediaUrl: null,
        error: `Hikaye videosu en fazla ${STORY_MAX_VIDEO_SEC} saniye olabilir. Uzun videolarda paylaşmadan önce 30 saniyelik bölüm seçin.`,
      };
    }
    if (probed > 0) durationSec = probed;
  }

  throwIfAborted(signal);

  const { storyId, error: storyError } = await getOrCreateActiveStory(
    input.authorId,
    input.regionId ?? null,
  );
  if (storyError || !storyId) {
    return { storyId: null, itemId: null, mediaUrl: null, error: storyError ?? 'Hikaye oluşturulamadı' };
  }

  if (isVideo) {
    input.onUploadProgress?.({ stage: 'preparing', message: 'Hikaye paylaşılıyor…' });

    const prepared = await prepareStoryVideoUpload(
      input.authorId,
      input.localUri,
      input.regionId,
      input.onUploadProgress,
      signal,
    );
    if (prepared.error || !prepared.mediaUrl || !prepared.reservation) {
      return { storyId, itemId: null, mediaUrl: null, error: prepared.error ?? 'Video hazırlanamadı' };
    }

    const mediaUrl = resolveStoryMediaUrl(prepared.mediaUrl) ?? prepared.mediaUrl;

    const { itemId, error: insertError } = await insertStoryItemRecord({
      storyId,
      authorId: input.authorId,
      mediaType: 'video',
      mediaUrl,
      thumbUrl: prepared.thumbUrl,
      durationSec,
      stickerCategory: input.stickerCategory,
      framing: input.framing,
      music: input.music,
      location: input.location,
      links: input.links,
      regionId: input.regionId,
      videoOriginalAudioVolume: input.videoOriginalAudioVolume,
    });

    if (insertError || !itemId) {
      return { storyId, itemId: null, mediaUrl, error: insertError ?? 'Hikaye kaydedilemedi' };
    }

    options.onPublished?.({ storyId, itemId, videoProcessing: true });

    void runDeferredStoryVideoUpload({
      reservation: prepared.reservation,
      authorId: input.authorId,
      storyId,
      itemId,
      localUri: input.localUri,
      signal,
      onProgress: input.onUploadProgress,
      onComplete: options.onBackgroundComplete,
    });

    return {
      storyId,
      itemId,
      mediaUrl,
      error: null,
      videoProcessing: true,
    };
  }

  throwIfAborted(signal);

  const upload = await uploadStoryMedia(input.authorId, input.localUri, 'image', {
    regionId: input.regionId,
    onProgress: input.onUploadProgress,
    signal,
  });
  if (upload.error || !upload.mediaUrl) {
    return { storyId, itemId: null, mediaUrl: null, error: upload.error ?? 'Medya yüklenemedi' };
  }

  const mediaUrl = resolveStoryMediaUrl(upload.mediaUrl) ?? upload.mediaUrl;
  const thumbUrl = resolveStoryThumbUrl(upload.thumbUrl, upload.mediaUrl);

  const { itemId, error: insertError } = await insertStoryItemRecord({
    storyId,
    authorId: input.authorId,
    mediaType: 'image',
    mediaUrl,
    thumbUrl,
    durationSec: null,
    stickerCategory: input.stickerCategory,
    framing: input.framing,
    music: input.music,
    location: input.location,
    links: input.links,
    regionId: input.regionId,
  });

  if (insertError || !itemId) {
    return { storyId, itemId: null, mediaUrl, error: insertError ?? 'Hikaye kaydedilemedi' };
  }

  options.onPublished?.({ storyId, itemId, videoProcessing: false });

  return {
    storyId,
    itemId,
    mediaUrl,
    error: null,
    videoProcessing: false,
  };
}
