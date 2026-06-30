import { useCallback, useEffect, useState } from 'react';
import { fetchOffersForRequest } from '@/features/vora-hizmetler/services/offerData';
import type { ServiceOfferListing } from '@/features/vora-hizmetler/types';

export function useServiceOffers(requestId: string | null, center?: { latitude: number; longitude: number }) {
  const [offers, setOffers] = useState<ServiceOfferListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reloadOffers = useCallback(async () => {
    if (!requestId) return;
    setLoading(true);
    setError(null);
    const result = await fetchOffersForRequest(requestId, center);
    setOffers(result.offers);
    if (result.error) setError(result.error);
    setLoading(false);
  }, [requestId, center]);

  useEffect(() => {
    void reloadOffers();
  }, [reloadOffers]);

  return { offers, loading, error, reloadOffers };
}
