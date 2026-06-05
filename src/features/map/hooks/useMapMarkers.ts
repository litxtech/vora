import { useCallback, useEffect, useState } from 'react';
import { fetchMapMarkers } from '@/features/map/services/mapData';
import type { MapMarker } from '@/features/map/types';

export function useMapMarkers() {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMapMarkers();
      setMarkers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Harita verileri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { markers, loading, error, refresh };
}
