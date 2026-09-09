import { useCallback, useEffect, useState } from 'react';
import type { RegionId } from '@/constants/regions';
import { fetchCityOverview } from '@/features/city-governance/services/cityData';
import type { CityOverview } from '@/features/city-governance/types';

export function useCityOverview(slug: string | null | undefined, viewerUserId: string | null) {
  const [overview, setOverview] = useState<CityOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!slug) {
      setOverview(null);
      setLoading(false);
      return;
    }

    setError(null);
    try {
      setOverview(await fetchCityOverview(slug, viewerUserId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Şehir yüklenemedi');
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [slug, viewerUserId]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  return { overview, loading, error, reload, setOverview };
}

export function useCityMembershipActions(
  regionId: RegionId | null,
  reload: () => Promise<void>,
) {
  const [busy, setBusy] = useState(false);

  const join = useCallback(async () => {
    if (!regionId) return;
    setBusy(true);
    try {
      const { joinCity } = await import('@/features/city-governance/services/cityData');
      await joinCity(regionId);
      await reload();
    } finally {
      setBusy(false);
    }
  }, [regionId, reload]);

  const leave = useCallback(async () => {
    if (!regionId) return;
    setBusy(true);
    try {
      const { leaveCity } = await import('@/features/city-governance/services/cityData');
      await leaveCity(regionId);
      await reload();
    } finally {
      setBusy(false);
    }
  }, [regionId, reload]);

  return { busy, join, leave };
}
