import { STORY_MAX_VIDEO_SEC, STORY_TTL_HOURS } from '@/features/stories/constants';
import type { StoryStickerCategoryId } from '@/features/stories/constants';
import { uploadPostMedia } from '@/features/compose/services/postMediaUpload';
import { isVideoUrl } from '@/lib/media/isVideoUrl';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type PublishStoryInput = {
  authorId: string;
  localUri: string;
  mediaType: 'image' | 'video';
  durationSec?: number;
  regionId?: string | null;
  stickerCategory?: StoryStickerCategoryId | null;
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
  if (input.mediaType === 'video' && (input.durationSec ?? 0) > STORY_MAX_VIDEO_SEC) {
    return {
      storyId: null,
      itemId: null,
      mediaUrl: null,
      error: `Hikaye videosu en fazla ${STORY_MAX_VIDEO_SEC} saniye olabilir.`,
    };
  }

  const { storyId, error: storyError } = await getOrCreateActiveStory(
    input.authorId,
    input.regionId ?? null,
  );
  if (storyError || !storyId) {
    return { storyId: null, itemId: null, mediaUrl: null, error: storyError ?? 'Hikaye oluşturulamadı' };
  }

  const upload = await uploadPostMedia(input.authorId, input.localUri, 0);
  if (upload.error || !upload.url) {
    return { storyId, itemId: null, mediaUrl: null, error: upload.error ?? 'Medya yüklenemedi' };
  }

  const mediaType =
    input.mediaType === 'video' && isVideoUrl(upload.url) ? 'video' : 'image';

  const expiresAt = new Date(Date.now() + STORY_TTL_HOURS * 60 * 60 * 1000).toISOString();

  const { data: orderRow } = await supabase
    .from('story_items')
    .select('sort_order')
    .eq('story_id', storyId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = Number(orderRow?.sort_order ?? -1) + 1;

  const { data: item, error: itemError } = await supabase
    .from('story_items')
    .insert({
      story_id: storyId,
      author_id: input.authorId,
      sort_order: nextOrder,
      media_type: mediaType,
      media_url: upload.url,
      thumb_url: upload.url,
      duration_sec: mediaType === 'video' ? input.durationSec ?? null : null,
      sticker_category: input.stickerCategory ?? null,
      status: 'published',
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (itemError) {
    return {
      storyId,
      itemId: null,
      mediaUrl: upload.url,
      error: supabaseErrorMessage(itemError)!,
    };
  }

  await supabase
    .from('stories')
    .update({
      expires_at: expiresAt,
      region_id: input.regionId ?? null,
      item_count: nextOrder + 1,
      latest_thumb_url: upload.url,
      latest_item_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', storyId);

  return {
    storyId,
    itemId: item.id as string,
    mediaUrl: upload.url,
    error: null,
  };
}
