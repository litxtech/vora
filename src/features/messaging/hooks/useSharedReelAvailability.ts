import { useEffect, useState } from 'react';
import { fetchSharedReelAvailability } from '../services/sharedReelAvailability';

export function useSharedReelAvailability(reelId: string | undefined) {
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (!reelId) {
      setAvailable(null);
      return;
    }

    let cancelled = false;
    void fetchSharedReelAvailability(reelId).then((isAvailable) => {
      if (!cancelled) setAvailable(isAvailable);
    });

    return () => {
      cancelled = true;
    };
  }, [reelId]);

  return {
    available,
    isRemoved: available === false,
    checking: available === null && Boolean(reelId),
  };
}
