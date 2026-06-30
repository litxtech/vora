import { useCallback, useEffect, useState } from 'react';
import {
  fetchProviderByUserId,
  fetchProviderPortfolio,
} from '@/features/vora-hizmetler/services/providerData';
import type { ProviderPortfolioItem, ServiceProviderProfile } from '@/features/vora-hizmetler/types';

export function useUserServiceProvider(userId: string | null) {
  const [provider, setProvider] = useState<ServiceProviderProfile | null>(null);
  const [portfolio, setPortfolio] = useState<ProviderPortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  const reloadProvider = useCallback(async () => {
    if (!userId) {
      setProvider(null);
      setPortfolio([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const profileRes = await fetchProviderByUserId(userId);
    const nextProvider = profileRes.provider;

    if (!nextProvider) {
      setProvider(null);
      setPortfolio([]);
      setLoading(false);
      return;
    }

    const portfolioRes = await fetchProviderPortfolio(nextProvider.id);
    setProvider(nextProvider);
    setPortfolio(portfolioRes.items);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void reloadProvider();
  }, [reloadProvider]);

  return { provider, portfolio, loading, reloadProvider };
}
