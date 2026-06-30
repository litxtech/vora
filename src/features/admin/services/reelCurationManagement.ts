import {
  listPinnedReels,
  pinReel,
  unpinReel,
  updateReelPin,
  type PinnedReelRow,
} from '@/features/reels/services/reelPinning';

export type { PinnedReelRow };

export async function fetchPinnedReelsAdmin(limit = 50) {
  return listPinnedReels(limit);
}

export async function adminPinReel(reelId: string, days: number | null, priority = 0) {
  return pinReel(reelId, days, priority);
}

export async function adminUnpinReel(reelId: string) {
  return unpinReel(reelId);
}

export async function adminUpdateReelPin(reelId: string, days: number | null, priority?: number) {
  return updateReelPin(reelId, days, priority);
}
