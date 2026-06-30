import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchHotelCenterStats } from '@/features/hotel-center/services/hotelData';
import type { HotelCenterStats } from '@/features/hotel-center/types';

const LIVE_STATS_POLL_MS = 20_000;

export function useHotelLiveStats(
  regionId: string | null | undefined,
  enabled: boolean,
  refreshNonce = 0,
) {
  const [stats, setStats] = useState<HotelCenterStats | null>(null);
  const [loading, setLoading] = useState(true);
  const tickRef = useRef(0);

  const refresh = useCallback(async () => {
    const next = await fetchHotelCenterStats(regionId ?? null);
    setStats(next);
    setLoading(false);
    tickRef.current += 1;
    return next;
  }, [regionId]);

  useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    void refresh();
    const timer = setInterval(() => void refresh(), LIVE_STATS_POLL_MS);
    return () => clearInterval(timer);
  }, [enabled, refresh, refreshNonce]);

  return { stats, loading, refresh, tick: tickRef.current };
}
