import { useCallback, useEffect, useState } from 'react';
import { fetchIzdivacSpaces } from '@/features/izdivac/services/izdivacEcosystem';
import type { IzdivacSpace } from '@/features/izdivac/types';

export function useIzdivacSpaces() {
  const [spaces, setSpaces] = useState<IzdivacSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await fetchIzdivacSpaces();
    setSpaces(result.spaces);
    setError(result.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { spaces, loading, error, refresh };
}
