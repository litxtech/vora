import { useEffect, useState } from 'react';
import type { RegionId } from '@/constants/regions';
import { fetchDiscoverUserSuggestions } from '@/features/discovery/services/userSuggestions';
import type { DiscoveryScope, DiscoveryUserResult } from '@/features/discovery/types';

export function useDiscoveryUserSuggestions(
  enabled: boolean,
  regionId: RegionId,
  scope: DiscoveryScope,
  userId: string | undefined,
) {
  const [suggestions, setSuggestions] = useState<DiscoveryUserResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !userId) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void fetchDiscoverUserSuggestions(regionId, scope, {
      excludeUserId: userId,
    })
      .then((items) => {
        if (!cancelled) setSuggestions(items);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, regionId, scope, userId]);

  return { suggestions, loading };
}
