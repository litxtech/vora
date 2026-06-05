import { extractHashtags } from '@/features/feed/utils';
import { uploadPostMedia } from '@/features/compose/services/postMediaUpload';
import { supabase } from '@/lib/supabase/client';
import type { PostCategory } from '@/types/database';

export type CreatePostInput = {
  authorId: string;
  regionId: string;
  district?: string | null;
  locationLabel?: string | null;
  title?: string | null;
  content: string;
  category: PostCategory;
  mediaUris: string[];
  latitude?: number | null;
  longitude?: number | null;
};

async function syncHashtags(postId: string, content: string): Promise<void> {
  const tags = extractHashtags(content);
  if (tags.length === 0) return;

  for (const tag of tags) {
    const { data: existing } = await supabase.from('hashtags').select('id').eq('tag', tag).maybeSingle();

    let hashtagId = existing?.id;
    if (!hashtagId) {
      const { data: created } = await supabase.from('hashtags').insert({ tag }).select('id').single();
      hashtagId = created?.id;
    }

    if (hashtagId) {
      await supabase.from('post_hashtags').insert({ post_id: postId, hashtag_id: hashtagId });
      const { data } = await supabase.from('hashtags').select('post_count').eq('id', hashtagId).maybeSingle();
      if (data) {
        await supabase.from('hashtags').update({ post_count: (data.post_count ?? 0) + 1 }).eq('id', hashtagId);
      }
    }
  }
}

export async function createPost(
  input: CreatePostInput,
  onProgress?: (stage: string, progress: number) => void,
): Promise<{ postId: string | null; error: string | null }> {
  const mediaUrls: string[] = [];

  for (let i = 0; i < input.mediaUris.length; i++) {
    onProgress?.('uploading', i / input.mediaUris.length);
    const { url, error } = await uploadPostMedia(input.authorId, input.mediaUris[i], i);
    if (error) return { postId: null, error };
    if (url) mediaUrls.push(url);
  }

  onProgress?.('saving', 0.9);

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
      status: 'published',
    })
    .select('id')
    .single();

  if (error) return { postId: null, error: error.message };

  await syncHashtags(data.id, input.content);
  onProgress?.('done', 1);

  return { postId: data.id, error: null };
}
