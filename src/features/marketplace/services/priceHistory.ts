import { mpSupabase } from '@/features/marketplace/services/mpSupabase';
import type { MarketplacePricePoint } from '@/features/marketplace/types';

type HistoryRow = {
  day: string;
  price: number | null;
  listing_type: string;
};

export async function fetchMarketplacePriceHistory(
  listingId: string,
  days = 21,
): Promise<MarketplacePricePoint[]> {
  const { data, error } = await mpSupabase.rpc('marketplace_price_history', {
    p_listing_id: listingId,
    p_days: days,
  });

  if (error || !data) return [];

  return (data as HistoryRow[]).map((row) => ({
    day: row.day,
    price: row.price,
    listingType: row.listing_type as MarketplacePricePoint['listingType'],
  }));
}

export function computePriceTrend(points: MarketplacePricePoint[]): {
  changePct: number | null;
  direction: 'up' | 'down' | 'flat';
  minPrice: number | null;
  maxPrice: number | null;
} {
  const prices = points
    .map((p) => p.price)
    .filter((p): p is number => p != null && p > 0);

  if (prices.length < 2) {
    return {
      changePct: null,
      direction: 'flat',
      minPrice: prices[0] ?? null,
      maxPrice: prices[0] ?? null,
    };
  }

  const first = prices[0];
  const last = prices[prices.length - 1];
  const changePct = first > 0 ? ((last - first) / first) * 100 : null;
  const direction = changePct == null || Math.abs(changePct) < 0.5 ? 'flat' : changePct > 0 ? 'up' : 'down';

  return {
    changePct,
    direction,
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
  };
}
