import { useCallback, useEffect, useState } from 'react';
import {
  fetchCityElectionDetail,
  refreshCityElectionStatus,
} from '@/features/city-governance/services/cityElections';
import type { CityElectionDetail } from '@/features/city-governance/types';

export function useCityElection(electionId: string | null | undefined, viewerUserId: string | null) {
  const [detail, setDetail] = useState<CityElectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!electionId) {
      setDetail(null);
      setLoading(false);
      return;
    }

    setError(null);
    try {
      if (electionId) {
        await refreshCityElectionStatus(electionId).catch(() => undefined);
      }
      setDetail(await fetchCityElectionDetail(electionId, viewerUserId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Seçim yüklenemedi');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [electionId, viewerUserId]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  return { detail, loading, error, reload };
}
