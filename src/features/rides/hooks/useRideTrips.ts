import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { fetchRideTrips } from '@/features/rides/services/tripData';
import type { RideFilters, RideTab, RideTrip } from '@/features/rides/types';

export function useRideTrips(
  tab: RideTab,
  regionId: string | null,
  userId: string | null,
  filters: RideFilters = {},
) {
  const [trips, setTrips] = useState<RideTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRideTrips(tab, regionId, userId, filters);
      setTrips(data);
    } catch (e) {
      setError(String(e));
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, [tab, regionId, userId, filters]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return { trips, loading, error, refresh, setTrips };
}
