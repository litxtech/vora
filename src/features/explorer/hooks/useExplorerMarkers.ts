import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { EXPLORER_STALE_MS } from '@/features/explorer/constants';
import {
  fetchExplorers,
  mapPresencePayload,
} from '@/features/explorer/services/explorerPresence';
import { useExplorerRegionId } from '@/features/explorer/hooks/useExplorerRegionId';
import type { ExplorerMarker } from '@/features/explorer/types';
import { supabase } from '@/lib/supabase/client';

const REFRESH_DEBOUNCE_MS = 600;

function isFresh(marker: ExplorerMarker): boolean {
  return Date.now() - new Date(marker.updatedAt).getTime() < EXPLORER_STALE_MS;
}

export function useExplorerMarkers(enabled: boolean) {
  const regionId = useExplorerRegionId();
  const [markers, setMarkers] = useState<ExplorerMarker[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setMarkers([]);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchExplorers(regionId);
      setMarkers(data);
    } catch (err) {
      console.warn('[explorer] fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [enabled, regionId]);

  const scheduleRefresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void refresh();
    }, REFRESH_DEBOUNCE_MS);
  }, [refresh]);

  const upsertMarker = useCallback((marker: ExplorerMarker) => {
    setMarkers((prev) => {
      const next = prev.filter((item) => item.userId !== marker.userId);
      if (isFresh(marker)) return [...next, marker];
      return next;
    });
  }, []);

  const removeMarker = useCallback((userId: string) => {
    setMarkers((prev) => prev.filter((item) => item.userId !== userId));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) {
      setMarkers([]);
      return;
    }

    let cancelled = false;
    const channelName = `explorer-live-${regionId}`;

    const subscribe = async () => {
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      if (cancelled) return;

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'explorer_presence',
            filter: `region_id=eq.${regionId}`,
          },
          (payload) => {
            if (payload.eventType === 'DELETE') {
              const oldRow = payload.old as { user_id?: string };
              if (oldRow.user_id) removeMarker(oldRow.user_id);
              return;
            }

            const row = payload.new as Record<string, unknown>;
            const marker = mapPresencePayload(row);
            if (marker) {
              upsertMarker(marker);
            } else if (row.user_id) {
              removeMarker(String(row.user_id));
            } else {
              scheduleRefresh();
            }
          },
        )
        .subscribe();

      if (cancelled) {
        await supabase.removeChannel(channel);
        return;
      }

      channelRef.current = channel;
    };

    void subscribe();

    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, regionId, removeMarker, scheduleRefresh, upsertMarker]);

  useEffect(() => {
    if (!enabled || markers.length === 0) return;

    const interval = setInterval(() => {
      setMarkers((prev) => {
        const next = prev.filter(isFresh);
        return next.length === prev.length ? prev : next;
      });
    }, 30_000);

    return () => clearInterval(interval);
  }, [enabled, markers.length]);

  return { markers, loading, refresh };
}
