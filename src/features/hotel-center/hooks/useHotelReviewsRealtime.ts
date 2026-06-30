import { useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { removeSupabaseChannelsByPrefix, subscribeSupabaseChannel } from '@/lib/supabase/realtimeChannel';

/** Yalnızca yorum değişikliklerini dinler — view_count güncellemesi döngüye yol açmaz. */
export function useHotelReviewsRealtime(hotelId: string | null, onChange: () => void) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!hotelId) return;

    let cancelled = false;
    const channelName = `hotel-reviews-${hotelId}`;
    let channel: RealtimeChannel | null = null;

    void (async () => {
      try {
        channel = await subscribeSupabaseChannel(channelName, (ch) =>
          ch.on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'hotel_reviews',
              filter: `hotel_id=eq.${hotelId}`,
            },
            () => {
              if (!cancelled) onChangeRef.current();
            },
          ),
        );
      } catch {
        // Realtime isteğe bağlı.
      }
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
      void removeSupabaseChannelsByPrefix(channelName);
    };
  }, [hotelId]);
}
