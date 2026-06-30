import { useCallback, useEffect, useState } from 'react';
import { useIsFocused } from 'expo-router';
import type { RegionId } from '@/constants/regions';
import { fetchActiveIncidentCount } from '@/features/incidents/services/fetchIncidentGraph';

export function useActiveIncidentCount(regionId?: RegionId | null) {
  const isFocused = useIsFocused();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const next = await fetchActiveIncidentCount(regionId);
    setCount(next);
    setLoading(false);
  }, [regionId]);

  useEffect(() => {
    if (!isFocused) return;
    void refresh();
  }, [isFocused, refresh]);

  return { count, loading, refresh };
}
