import { useEffect, useState } from 'react';
import { fetchIzdivacAppBadges } from '@/features/izdivac/services/adminIzdivac';
import type { IzdivacSpecialBadgeType } from '@/features/izdivac/types';

/**
 * Bir kullanıcının uygulama genelinde görünür özel tiklerini (jigolo, tilki,
 * finansman) getirir. Bu tikler normal tiktir; İzdivaç erişiminden bağımsızdır.
 */
export function useIzdivacAppBadges(userId: string | undefined | null): IzdivacSpecialBadgeType[] {
  const [badges, setBadges] = useState<IzdivacSpecialBadgeType[]>([]);

  useEffect(() => {
    if (!userId) {
      setBadges([]);
      return;
    }
    let cancelled = false;
    void fetchIzdivacAppBadges(userId).then((result) => {
      if (!cancelled) setBadges(result);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return badges;
}
