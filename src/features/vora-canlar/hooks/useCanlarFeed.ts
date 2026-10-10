import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { CANLAR_EMPTY_FEED, loadListingState, type CanlarHomeFeed, type CanlarListingFlag } from '@/features/vora-canlar/services/api';
import { peekCanlarHome, refreshCanlarHome } from '@/features/vora-canlar/services/sessionCache';

function applyListingFlag<T extends { campaign_id?: string | null }>(post: T, flag?: CanlarListingFlag): T {
  if (!flag) return post;
  return {
    ...post,
    outcome: flag.outcome,
    donation_open: flag.donation_open,
    campaign_id: flag.campaign_id ?? post.campaign_id,
    author_id: flag.author_id,
    donation_note: flag.donation_note,
    raised_minor: flag.raised_minor,
  };
}

export function useCanlarFeed() {
  const cached = peekCanlarHome();
  const [feed, setFeed] = useState<CanlarHomeFeed>(cached ?? CANLAR_EMPTY_FEED);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (options?: { silent?: boolean; pull?: boolean }) => {
    if (options?.pull) setRefreshing(true);
    const result = await refreshCanlarHome();
    if (result.error) setError(result.error);
    else setError(null);
    const flags = await loadListingState(result.feed.posts.map((post) => post.id));
    const byId = new Map((flags.data ?? []).map((flag) => [flag.id, flag]));
    setFeed({
      ...result.feed,
      posts: result.feed.posts.map((post) => applyListingFlag(post, byId.get(post.id))),
    });
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return { feed, loading, refreshing, error, load };
}
