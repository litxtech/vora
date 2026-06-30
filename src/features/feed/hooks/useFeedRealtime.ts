import { useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getAndroidHeavyFeatureBootDelayMs } from '@/lib/device/androidPerfProfile';
import { deferBackgroundWork } from '@/lib/ui/deferUntilUiIdle';
import { subscribeSupabaseChannel } from '@/lib/supabase/realtimeChannel';
import { supabase } from '@/lib/supabase/client';
import { useFeedStore } from '@/features/feed/store/feedStore';

export function useFeedRealtime(enabled = true) {
  const regionId = useFeedStore((s) => s.regionId);
  const incrementNewPosts = useFeedStore((s) => s.incrementNewPosts);
  const onNewPostRef = useRef(incrementNewPosts);
  onNewPostRef.current = incrementNewPosts;
  const channelRef = useRef<RealtimeChannel | null>(null);
  const generationRef = useRef(0);

  useEffect(() => {
    if (!enabled || !regionId) return;

    const generation = ++generationRef.current;
    let cancelled = false;
    const channelName = `feed-posts-${regionId}-g${generation}`;

    const subscribe = async () => {
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      if (cancelled || generation !== generationRef.current) return;

      try {
        const channel = await subscribeSupabaseChannel(channelName, (ch) =>
          ch.on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'posts',
              filter: `region_id=eq.${regionId}`,
            },
            (payload) => {
              const communityId = (payload.new as { community_id?: string | null } | undefined)?.community_id;
              if (communityId) return;
              onNewPostRef.current();
            },
          ),
        );

        if (cancelled || generation !== generationRef.current) {
          await supabase.removeChannel(channel);
          return;
        }

        channelRef.current = channel;
      } catch {
        // Kanal kurulumu başarısız — akış yine de çalışır
      }
    };

    const bootDelayMs = getAndroidHeavyFeatureBootDelayMs();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let deferTask: { cancel: () => void } | null = null;

    const start = () => {
      void subscribe();
    };

    if (bootDelayMs > 0) {
      timer = setTimeout(start, bootDelayMs);
    } else {
      deferTask = deferBackgroundWork(start);
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      deferTask?.cancel();
      const channel = channelRef.current;
      channelRef.current = null;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [enabled, regionId]);
}
