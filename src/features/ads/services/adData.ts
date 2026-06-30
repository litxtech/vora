import type { BusinessAd, CreateAdInput, RestartAdResult } from '@/features/ads/types';
import type { RegionId } from '@/constants/regions';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

type AdRow = {
  id: string;
  business_id: string | null;
  owner_id: string;
  title: string;
  description: string;
  image_url: string | null;
  cta_label: string | null;
  destination_url: string | null;
  ad_type: string;
  status: string;
  billing_mode: string;
  budget_cents: number;
  spent_cents: number;
  cpc_cents: number;
  target_region_id: string | null;
  target_region_ids: string[] | null;
  target_district: string | null;
  target_age_min: number | null;
  target_age_max: number | null;
  target_interests: string[];
  impressions: number;
  clicks: number;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
};

function mapAd(row: AdRow): BusinessAd {
  const regionIds = (row.target_region_ids?.length
    ? row.target_region_ids
    : row.target_region_id
      ? [row.target_region_id]
      : []) as RegionId[];

  return {
    id: row.id,
    businessId: row.business_id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url,
    ctaLabel: (row.cta_label as BusinessAd['ctaLabel']) ?? 'learn_more',
    destinationUrl: row.destination_url,
    adType: row.ad_type as BusinessAd['adType'],
    status: row.status as BusinessAd['status'],
    billingMode: (row.billing_mode as BusinessAd['billingMode']) ?? 'wallet_cpc',
    budgetCents: row.budget_cents,
    spentCents: row.spent_cents,
    cpcCents: row.cpc_cents ?? 0,
    targetRegionId: row.target_region_id,
    targetRegionIds: regionIds,
    targetDistrict: row.target_district,
    targetAgeMin: row.target_age_min,
    targetAgeMax: row.target_age_max,
    targetInterests: row.target_interests ?? [],
    impressions: row.impressions,
    clicks: row.clicks,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdAt: row.created_at,
  };
}

export async function expireBusinessAds(): Promise<void> {
  await supabase.rpc('expire_business_ads');
}

export async function fetchAdById(
  adId: string,
  ownerId: string,
): Promise<{ ad: BusinessAd | null; error: string | null }> {
  await expireBusinessAds();
  const { data, error } = await supabase
    .from('business_ads')
    .select('*')
    .eq('id', adId)
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (error) return { ad: null, error: supabaseErrorMessage(error)! };
  if (!data) return { ad: null, error: 'Reklam bulunamadı.' };
  return { ad: mapAd(data as AdRow), error: null };
}

export async function fetchMyAds(ownerId: string): Promise<BusinessAd[]> {
  await expireBusinessAds();
  const { data, error } = await supabase
    .from('business_ads')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return (data as AdRow[]).map(mapAd);
}

export async function createPremiumAd(
  ownerId: string,
  input: CreateAdInput,
  businessId?: string | null,
): Promise<{ ad: BusinessAd | null; error: string | null }> {
  if (businessId) {
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .eq('owner_id', ownerId)
      .maybeSingle();

    if (!business) return { ad: null, error: 'İşletme bulunamadı veya yetkiniz yok.' };
  }

  const primaryRegion = input.targetRegionIds[0] ?? null;

  const { data, error } = await supabase
    .from('business_ads')
    .insert({
      business_id: businessId ?? null,
      owner_id: ownerId,
      title: input.title.trim(),
      description: input.description.trim(),
      image_url: input.imageUrl ?? null,
      cta_label: input.ctaLabel ?? 'learn_more',
      destination_url: input.destinationUrl?.trim() || null,
      ad_type: input.adType,
      billing_mode: input.billingMode,
      budget_cents: input.budgetCents,
      cpc_cents: input.cpcCents,
      target_region_id: primaryRegion,
      target_region_ids: input.targetRegionIds,
      target_district: input.targetDistrict,
      target_age_min: input.targetAgeMin,
      target_age_max: input.targetAgeMax,
      target_interests: input.targetInterests,
      ends_at: input.endsAt,
      status: 'pending',
    })
    .select('*')
    .single();

  if (error || !data) {
    return { ad: null, error: supabaseErrorMessage(error) ?? 'Reklam oluşturulamadı.' };
  }
  return { ad: mapAd(data as AdRow), error: null };
}

/** @deprecated createPremiumAd kullanın */
export async function createBusinessAd(
  businessId: string,
  ownerId: string,
  input: CreateAdInput,
): Promise<{ ad: BusinessAd | null; error: string | null }> {
  return createPremiumAd(ownerId, input, businessId);
}

export async function updateAdStatus(
  adId: string,
  ownerId: string,
  status: BusinessAd['status'],
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('business_ads')
    .update({ status })
    .eq('id', adId)
    .eq('owner_id', ownerId);

  return { error: supabaseErrorMessage(error) };
}

export async function deleteAd(adId: string, ownerId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('business_ads').delete().eq('id', adId).eq('owner_id', ownerId);
  return { error: supabaseErrorMessage(error) };
}

export async function restartBusinessAd(
  adId: string,
): Promise<{ result: RestartAdResult | null; error: string | null }> {
  const { data, error } = await supabase.rpc('restart_business_ad', { p_ad_id: adId });

  if (error) return { result: null, error: supabaseErrorMessage(error)! };

  const row = data as {
    billing_mode?: string;
    ends_at?: string;
  } | null;

  if (!row?.ends_at) return { result: null, error: 'Yeniden başlatılamadı.' };

  return {
    result: {
      billingMode: 'wallet_cpc',
      endsAt: row.ends_at,
    },
    error: null,
  };
}

export type AdStats = {
  totalAds: number;
  activeAds: number;
  totalBudgetCents: number;
  totalImpressions: number;
  totalClicks: number;
};

export function computeAdStats(ads: BusinessAd[]): AdStats {
  return {
    totalAds: ads.length,
    activeAds: ads.filter((a) => a.status === 'active').length,
    totalBudgetCents: ads.reduce((s, a) => s + a.budgetCents, 0),
    totalImpressions: ads.reduce((s, a) => s + a.impressions, 0),
    totalClicks: ads.reduce((s, a) => s + a.clicks, 0),
  };
}
