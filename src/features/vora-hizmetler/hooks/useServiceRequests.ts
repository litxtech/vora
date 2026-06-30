import { useCallback, useEffect, useState } from 'react';
import { fetchServiceRequests } from '@/features/vora-hizmetler/services/requestData';
import type { ServiceCategory, ServiceRequestListing } from '@/features/vora-hizmetler/types';

export function useServiceRequests(params: {
  regionId?: string | null;
  category?: ServiceCategory;
  requesterId?: string;
  center?: { latitude: number; longitude: number };
  radiusKm?: number;
}) {
  const [listings, setListings] = useState<ServiceRequestListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reloadListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await fetchServiceRequests(params);
    setListings(result.listings);
    if (result.error) setError(result.error);
    setLoading(false);
  }, [params.regionId, params.category, params.requesterId, params.center, params.radiusKm]);

  useEffect(() => {
    void reloadListings();
  }, [reloadListings]);

  return { listings, loading, error, reloadListings };
}
