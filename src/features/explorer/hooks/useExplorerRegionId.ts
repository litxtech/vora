import { DEFAULT_REGION_ID, type RegionId } from '@/constants/regions';
import { useFeedStore } from '@/features/feed/store/feedStore';
import { useAuth } from '@/providers/AuthProvider';

/** Harita ve profil ile uyumlu bölge — feed filtresi "tümü" iken profile düşer. */
export function useExplorerRegionId(): RegionId {
  const feedRegionId = useFeedStore((s) => s.regionId);
  const { profile } = useAuth();
  return feedRegionId ?? (profile?.region_id as RegionId | undefined) ?? DEFAULT_REGION_ID;
}
