import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { fetchIzdivacPosts } from '@/features/izdivac/services/izdivacEcosystem';
import type { IzdivacPost } from '@/features/izdivac/types';
import { subscribeSupabaseChannel } from '@/lib/supabase/realtimeChannel';
import { supabase } from '@/lib/supabase/client';
import { deferBackgroundWork } from '@/lib/ui/deferUntilUiIdle';

export function useIzdivacWall() {
  const [posts, setPosts] = useState<IzdivacPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const refreshingRef = useRef(false);
  const pendingRef = useRef(false);

  const refresh = useCallback(async () => {
    // Aynı anda tek fetch; üst üste realtime tetiklerini birleştir
    if (refreshingRef.current) {
      pendingRef.current = true;
      return;
    }
    refreshingRef.current = true;
    const result = await fetchIzdivacPosts();
    refreshingRef.current = false;

    if (mountedRef.current) {
      setPosts(result.posts);
      setError(result.error);
      setLoading(false);
    }

    if (pendingRef.current) {
      pendingRef.current = false;
      void refresh();
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void refresh();

    let channel: RealtimeChannel | null = null;
    let cancelled = false;
    let debounce: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        void refresh();
      }, 350);
    };

    const start = async () => {
      try {
        const ch = await subscribeSupabaseChannel('izdivac-wall', (c) =>
          c.on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'izdivac_posts' },
            () => scheduleRefresh(),
          ),
        );
        if (cancelled) {
          await supabase.removeChannel(ch);
          return;
        }
        channel = ch;
      } catch {
        // Realtime kurulamazsa manuel yenileme çalışır
      }
    };

    const task = deferBackgroundWork(() => void start());

    return () => {
      mountedRef.current = false;
      cancelled = true;
      task.cancel();
      if (debounce) clearTimeout(debounce);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { posts, loading, error, refresh, setPosts };
}
