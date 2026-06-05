import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useFeedStore } from '@/features/feed/store/feedStore';

export function useFeedRealtime() {
  const regionId = useFeedStore((s) => s.regionId);
  const incrementNewPosts = useFeedStore((s) => s.incrementNewPosts);

  useEffect(() => {
    const channel = supabase
      .channel(`feed-posts-${regionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
          filter: `region_id=eq.${regionId}`,
        },
        () => {
          incrementNewPosts();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [regionId, incrementNewPosts]);
}
