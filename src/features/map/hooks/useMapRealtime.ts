import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useFeedStore } from '@/features/feed/store/feedStore';
import { MAP_REALTIME_TABLES } from '@/features/map/services/mapMarkerIds';
import { resolveMarkerIdFromRealtimePayload } from '@/features/map/services/mapMarkerRealtime';
import { subscribeSupabaseChannel } from '@/lib/supabase/realtimeChannel';
import { supabase } from '@/lib/supabase/client';

const REALTIME_EVENTS = ['INSERT', 'UPDATE', 'DELETE'] as const;

export type MapRealtimeChange = {
  markerId?: string;
};

export function useMapRealtime(onChange: (change: MapRealtimeChange) => void) {
  const regionId = useFeedStore((s) => s.regionId);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const channelRef = useRef<RealtimeChannel | null>(null);
  const generationRef = useRef(0);

  const handlePayload = useCallback((payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
    const markerId = resolveMarkerIdFromRealtimePayload(payload);
    onChangeRef.current(markerId ? { markerId } : {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      const generation = ++generationRef.current;
      let cancelled = false;
      const channelName = `map-live-${regionId}-g${generation}`;

      const subscribe = async () => {
        if (channelRef.current) {
          await supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }

        if (cancelled || generation !== generationRef.current) return;

        try {
          const channel = await subscribeSupabaseChannel(channelName, (ch) => {
            let bound = ch;
            for (const table of MAP_REALTIME_TABLES) {
              for (const event of REALTIME_EVENTS) {
                bound = bound.on(
                  'postgres_changes',
                  {
                    event,
                    schema: 'public',
                    table,
                    filter: `region_id=eq.${regionId}`,
                  },
                  handlePayload,
                );
              }
            }
            return bound;
          });

          if (cancelled || generation !== generationRef.current) {
            await supabase.removeChannel(channel);
            return;
          }

          channelRef.current = channel;
        } catch {
          // Harita canlı güncellemesi başarısız — statik veri yine yüklenir
        }
      };

      void subscribe();

      return () => {
        cancelled = true;
        const channel = channelRef.current;
        channelRef.current = null;
        if (channel) void supabase.removeChannel(channel);
      };
    }, [handlePayload, regionId]),
  );
}
