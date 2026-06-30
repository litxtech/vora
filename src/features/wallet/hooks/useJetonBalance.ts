import { useCallback, useEffect, useState } from 'react';
import { fetchJetonSummary } from '@/features/wallet/services/jetonData';
import { useAuth } from '@/providers/AuthProvider';

export function useJetonBalance() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setBalance(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    const summary = await fetchJetonSummary(user.id);
    setBalance(summary.balance);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { balance, loading, refresh };
}
