import type { AdType } from '@/features/ads/types';
import type { RegionId } from '@/constants/regions';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type ServedBusinessAd = {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  ctaLabel: string;
  destinationUrl: string | null;
  adType: AdType;
  ownerId: string;
};

type ServedAdRow = {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  cta_label: string | null;
  destination_url: string | null;
  ad_type: string;
  owner_id: string;
  spent_cents: number;
  budget_cents: number;
  ends_at: string | null;
  target_region_id: string | null;
  target_region_ids: string[] | null;
};

function mapServedAd(row: ServedAdRow): ServedBusinessAd {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url,
    ctaLabel: row.cta_label ?? 'learn_more',
    destinationUrl: row.destination_url,
    adType: row.ad_type as AdType,
    ownerId: row.owner_id,
  };
}

function matchesAdRegion(
  ad: Pick<ServedAdRow, 'target_region_ids' | 'target_region_id'>,
  regionId: RegionId | string | null,
): boolean {
  const ids = ad.target_region_ids?.length
    ? ad.target_region_ids
    : ad.target_region_id
      ? [ad.target_region_id]
      : [];
  if (ids.length === 0) return true;
  if (!regionId) return true;
  return ids.includes(regionId);
}

function isAdEligible(row: ServedAdRow, regionId: RegionId | string | null, viewedIds: Set<string>): boolean {
  if (viewedIds.has(row.id)) return false;
  if (row.spent_cents >= row.budget_cents) return false;
  if (row.ends_at && new Date(row.ends_at).getTime() <= Date.now()) return false;
  return matchesAdRegion(row, regionId);
}

/** Kullanıcıya daha önce gösterilmemiş uygun bir aktif reklam seçer. */
export async function pickBusinessAdForUser(
  adType: AdType,
  regionId?: RegionId | null,
): Promise<{ ad: ServedBusinessAd | null; error: string | null }> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) return { ad: null, error: supabaseErrorMessage(authError) };
  if (!user) return { ad: null, error: null };

  void supabase.rpc('expire_business_ads');

  const [adsResult, viewsResult] = await Promise.all([
    supabase
      .from('business_ads')
      .select(
        'id, title, description, image_url, cta_label, destination_url, ad_type, owner_id, spent_cents, budget_cents, ends_at, target_region_id, target_region_ids',
      )
      .eq('status', 'active')
      .eq('ad_type', adType)
      .neq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('business_ad_user_views').select('ad_id').eq('user_id', user.id),
  ]);

  if (adsResult.error) {
    return { ad: null, error: supabaseErrorMessage(adsResult.error) };
  }

  const viewedIds = new Set((viewsResult.data ?? []).map((row) => row.ad_id));
  const row = (adsResult.data as ServedAdRow[] | null)?.find((candidate) =>
    isAdEligible(candidate, regionId ?? null, viewedIds),
  );

  if (!row?.id) return { ad: null, error: null };

  return { ad: mapServedAd(row), error: null };
}

/** Tekil gösterim kaydı — aynı kullanıcıya ikinci kez sayılmaz. */
export async function recordAdImpression(adId: string): Promise<{ counted: boolean; error: string | null }> {
  const { data, error } = await supabase.rpc('record_ad_impression', { p_ad_id: adId });

  if (error) return { counted: false, error: supabaseErrorMessage(error)! };

  const result = data as { counted?: boolean } | null;
  return { counted: result?.counted ?? false, error: null };
}

export async function recordAdClick(
  adId: string,
): Promise<{ error: string | null; charged: boolean }> {
  const { data, error } = await supabase.rpc('record_ad_click', { p_ad_id: adId });
  if (error) return { error: supabaseErrorMessage(error), charged: false };

  const result = data as { charged?: boolean } | null;
  return { error: null, charged: result?.charged === true };
}
