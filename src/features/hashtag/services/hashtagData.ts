import { DEMO_FEED_ITEMS } from '@/features/feed/constants';
import { fetchFeedPostsForHashtag } from '@/features/feed/services/feedData';
import { extractHashtags, normalizeHashtagTag } from '@/features/feed/utils';
import type { FeedItem } from '@/features/feed/types';
import { isDemoDataEnabled } from '@/lib/demo/demoData';
import { supabase } from '@/lib/supabase/client';

export async function fetchPopularHashtags(limit = 20): Promise<string[]> {
  const { data, error } = await supabase
    .from('hashtags')
    .select('tag')
    .eq('is_hidden', false)
    .gt('post_count', 0)
    .order('post_count', { ascending: false })
    .limit(limit);

  if (error || !data?.length) return [];
  return data.map((row) => row.tag);
}

export async function fetchHashtagPosts(
  tag: string,
  viewerId: string | null = null,
): Promise<{
  tag: string;
  postCount: number;
  items: FeedItem[];
}> {
  const normalized = normalizeHashtagTag(tag);
  if (!normalized) {
    return { tag: '', postCount: 0, items: [] };
  }

  const result = await fetchFeedPostsForHashtag(normalized, viewerId);
  if (result.items.length > 0) {
    return result;
  }

  if (isDemoDataEnabled()) {
    const demo = DEMO_FEED_ITEMS.filter((item) => extractHashtags(item.content).includes(normalized));
    return { tag: normalized, postCount: demo.length, items: demo };
  }

  return result;
}
