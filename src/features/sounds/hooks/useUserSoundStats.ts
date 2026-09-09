import { useEffect, useState } from 'react';
import { fetchUserSoundStats } from '@/features/sounds/services/soundData';
import type { SoundAuthorStats } from '@/features/sounds/types';

export function useUserSoundStats(userId: string | null | undefined) {
  const [stats, setStats] = useState<SoundAuthorStats | null>(null);

  useEffect(() => {
    if (!userId) {
      setStats(null);
      return;
    }
    void fetchUserSoundStats(userId).then(setStats);
  }, [userId]);

  return stats;
}
