import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchPersonnelCenterStats,
  type PersonnelCenterStats,
} from '@/features/personnel-center/services/personnelStats';

const LIVE_STATS_POLL_MS = 20_000;

export function usePersonnelLiveStats(
  regionId: string | null | undefined,
  enabled: boolean,
  refreshNonce = 0,
) {
  const [stats, setStats] = useState<PersonnelCenterStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const tickRef = useRef(0);

  const refresh = useCallback(async () => {
    const next = await fetchPersonnelCenterStats(regionId ?? null);
    setStats(next);
    setLastUpdatedAt(Date.now());
    setLoading(false);
    tickRef.current += 1;
    return next;
  }, [regionId]);

  useEffect(() => {
    if (!enabled) return;

    setLoading(true);
    void refresh();

    const timer = setInterval(() => {
      void refresh();
    }, LIVE_STATS_POLL_MS);

    return () => clearInterval(timer);
  }, [enabled, refresh, refreshNonce]);

  return { stats, loading, lastUpdatedAt, refresh, tick: tickRef.current };
}
