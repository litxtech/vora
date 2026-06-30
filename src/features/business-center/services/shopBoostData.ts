import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { openUrl } from '@/lib/linking/openUrl';
import type {
  BusinessShopBoostActive,
  ShopBoostScope,
  ShopBoostSlotsInfo,
  ShopBoostStatus,
  ShopBoostTier,
} from '@/features/business-center/types';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

function checkoutReturnUrl(result: 'success' | 'cancelled'): string {
  return Linking.createURL('business-center/shop-boost', { queryParams: { checkout: result } });
}

type BoostRow = {
  boost_id: string;
  business_id: string;
  package_tier: ShopBoostTier;
  region_scope: ShopBoostScope;
  ends_at: string;
  showcase_snapshot: unknown;
  business_name: string;
  business_category: string;
  logo_url: string | null;
  cover_url: string | null;
  shop_tagline: string | null;
  shop_accent: string | null;
  commerce_mode: string;
  is_verified: boolean;
  district: string | null;
};

function mapActiveBoost(row: BoostRow): BusinessShopBoostActive {
  const snapshot = Array.isArray(row.showcase_snapshot) ? row.showcase_snapshot : [];
  return {
    boostId: row.boost_id,
    businessId: row.business_id,
    packageTier: row.package_tier,
    regionScope: row.region_scope,
    endsAt: row.ends_at,
    showcaseItems: snapshot.map((item: Record<string, unknown>) => ({
      kind: item.kind as 'product' | 'hotel',
      id: String(item.id ?? ''),
      title: String(item.title ?? ''),
      priceCents: typeof item.priceCents === 'number' ? item.priceCents : null,
      imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl : null,
    })),
    name: row.business_name,
    category: row.business_category,
    logoUrl: row.logo_url,
    coverUrl: row.cover_url,
    shopTagline: row.shop_tagline,
    shopAccent: row.shop_accent,
    commerceMode: row.commerce_mode as BusinessShopBoostActive['commerceMode'],
    isVerified: row.is_verified,
    district: row.district,
  };
}

export async function fetchActiveShopBoosts(
  regionId: string,
  limit = 6,
): Promise<BusinessShopBoostActive[]> {
  const { data, error } = await supabase.rpc('get_active_business_shop_boosts', {
    p_region_id: regionId,
    p_limit: limit,
  });
  if (error || !data?.length) return [];
  return (data as BoostRow[]).map(mapActiveBoost);
}

export async function fetchShopBoostSlots(
  scope: ShopBoostScope,
  regionId: string | null,
): Promise<ShopBoostSlotsInfo> {
  const { data, error } = await supabase.rpc('shop_boost_slots_available', {
    p_scope: scope,
    p_region_id: regionId,
  });
  if (error || !data) {
    return { regionKey: regionId ?? '__all__', used: 0, max: 3, available: 3 };
  }
  const row = data as { region_key: string; used: number; max: number; available: number };
  return {
    regionKey: row.region_key,
    used: row.used,
    max: row.max,
    available: row.available,
  };
}

export async function fetchBusinessShopBoostStatus(businessId: string): Promise<ShopBoostStatus> {
  const { data, error } = await supabase.rpc('get_business_shop_boost_status', {
    p_business_id: businessId,
  });
  if (error || !data) return { active: false };
  const row = data as Record<string, unknown>;
  if (row.active !== true) return { active: false };
  return {
    active: true,
    boostId: String(row.boost_id ?? ''),
    packageTier: row.package_tier as ShopBoostTier,
    regionScope: row.region_scope as ShopBoostScope,
    startsAt: String(row.starts_at ?? ''),
    endsAt: String(row.ends_at ?? ''),
    impressions: Number(row.impressions ?? 0),
    shopViews: Number(row.shop_views ?? 0),
  };
}

export async function startShopBoostCheckout(
  packageTier: ShopBoostTier,
  regionScope: ShopBoostScope,
): Promise<{ error: string | null }> {
  const successUrl = checkoutReturnUrl('success');
  const cancelUrl = checkoutReturnUrl('cancelled');

  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(
    'stripe-create-shop-boost-checkout',
    { body: { packageTier, regionScope, successUrl, cancelUrl } },
  );

  if (error) return { error: supabaseErrorMessage(error)! };
  if (data?.error) return { error: data.error };
  if (!data?.url) return { error: 'Ödeme sayfası oluşturulamadı.' };

  try {
    await WebBrowser.openAuthSessionAsync(data.url, successUrl);
  } catch {
    await openUrl(data.url);
  }

  return { error: null };
}

export async function recordShopBoostImpression(boostId: string): Promise<void> {
  await supabase.rpc('record_shop_boost_impression', { p_boost_id: boostId });
}

export async function recordShopBoostShopView(boostId: string): Promise<void> {
  await supabase.rpc('record_shop_boost_shop_view', { p_boost_id: boostId });
}
