import { useCallback, useEffect, useRef, useState } from 'react';
import { searchProviders } from '@/features/vora-hizmetler/services/providerData';
import type { ProviderDiscoverItem, ServiceCategory } from '@/features/vora-hizmetler/types';

export function useProviderDiscover(params: {
  regionId: string | null;
  category?: ServiceCategory | null;
  query?: string;
}) {
  const [providers, setProviders] = useState<ProviderDiscoverItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const reloadProviders = useCallback(async () => {
    const isFirstLoad = !hasLoadedOnce.current;
    if (isFirstLoad) {
      setInitialLoading(true);
    } else {
      setSearching(true);
    }
    setError(null);

    const result = await searchProviders({
      regionId: params.regionId,
      category: params.category ?? undefined,
      query: params.query,
    });

    setProviders(result.providers);
    if (result.error) setError(result.error);
    hasLoadedOnce.current = true;
    setInitialLoading(false);
    setSearching(false);
  }, [params.regionId, params.category, params.query]);

  useEffect(() => {
    void reloadProviders();
  }, [reloadProviders]);

  return {
    providers,
    loading: initialLoading,
    searching,
    error,
    reloadProviders,
  };
};
