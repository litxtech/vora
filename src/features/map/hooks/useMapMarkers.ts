import { useCallback, useEffect, useRef, useState } from 'react';
import { useMapAutoRefresh } from '@/features/map/hooks/useMapAutoRefresh';
import { useMapRealtime } from '@/features/map/hooks/useMapRealtime';
import { fetchMapMarkers } from '@/features/map/services/mapData';
import { subscribeMapMarkerRemovals } from '@/features/map/services/mapMarkerSync';
import type { MapMarker } from '@/features/map/types';
import { resolveRealtimeRefreshDebounceMs, shouldRefreshInBackground } from '@/lib/ui/listRefresh';
import { toUserFacingError } from '@/lib/errors';

function sameMarkerSnapshot(a: MapMarker[], b: MapMarker[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i];
    const right = b[i];
    if (
      left.id !== right.id ||
      left.latitude !== right.latitude ||
      left.longitude !== right.longitude ||
      left.title !== right.title
    ) {
      return false;
    }
  }
  return true;
}

function withoutMarker(markers: MapMarker[], markerId: string): MapMarker[] {
  if (!markers.some((marker) => marker.id === markerId)) return markers;
  return markers.filter((marker) => marker.id !== markerId);
}

export function useMapMarkers(enabled = true) {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markersRef = useRef(markers);
  markersRef.current = markers;

  const removeMarkerById = useCallback((markerId: string) => {
    setMarkers((prev) => withoutMarker(prev, markerId));
  }, []);

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    const silent =
      options?.silent ?? shouldRefreshInBackground(markersRef.current.length > 0);
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await fetchMapMarkers();
      setMarkers((prev) => (sameMarkerSnapshot(prev, data) ? prev : data));
    } catch (err) {
      setError(toUserFacingError(err instanceof Error ? err.message : null, {
        fallback: 'Harita verileri yüklenemedi.',
      }));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const scheduleSilentRefresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void refresh({ silent: true });
    }, resolveRealtimeRefreshDebounceMs());
  }, [refresh]);

  const handleRealtimeChange = useCallback(
    ({ markerId }: { markerId?: string }) => {
      if (markerId) removeMarkerById(markerId);
      scheduleSilentRefresh();
    },
    [removeMarkerById, scheduleSilentRefresh],
  );

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [enabled, refresh]);

  useEffect(() => subscribeMapMarkerRemovals(removeMarkerById), [removeMarkerById]);

  useMapRealtime(handleRealtimeChange);
  useMapAutoRefresh(refresh);

  return { markers, loading, error, refresh };
}
