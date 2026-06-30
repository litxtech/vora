import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  fetchStripeAdminSnapshot,
  type StripeAdminSnapshot,
} from '@/features/admin/services/stripeAdmin';
import { toUserFacingError } from '@/lib/errors';

const POLL_INTERVAL_MS = 30_000;

export function useAdminStripePoll(enabled: boolean) {
  const [snapshot, setSnapshot] = useState<StripeAdminSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const initializedRef = useRef(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!enabled) return;
      if (isRefresh) setRefreshing(true);
      else if (!initializedRef.current) setLoading(true);

      try {
        const data = await fetchStripeAdminSnapshot();
        setSnapshot(data);
        setLastUpdatedAt(new Date());
        setError(null);
        initializedRef.current = true;
      } catch (err) {
        setError(toUserFacingError(err instanceof Error ? err.message : null, {
          fallback: 'Veriler yüklenemedi',
        }));
      }

      setLoading(false);
      setRefreshing(false);
    },
    [enabled],
  );

  useEffect(() => {
    if (!enabled) return;

    void load();

    const interval = setInterval(() => {
      void load(true);
    }, POLL_INTERVAL_MS);

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void load(true);
    });

    return () => {
      clearInterval(interval);
      appStateSub.remove();
    };
  }, [enabled, load]);

  return {
    snapshot,
    loading,
    refreshing,
    error,
    lastUpdatedAt,
    refresh: () => load(true),
  };
}
