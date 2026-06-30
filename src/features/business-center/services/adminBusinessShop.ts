import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type AdminBusinessShopRow = {
  id: string;
  name: string;
  owner_id: string;
  owner_username: string;
  commerce_mode: string;
  shop_published: boolean;
  shop_tagline: string | null;
  view_count: number;
  registration_status: string;
  active_boosts: number;
  created_at: string;
};

export type AdminBusinessShopBoostRow = {
  id: string;
  business_id: string;
  business_name: string;
  owner_username: string;
  package_tier: string;
  status: string;
  price_cents: number;
  impressions: number;
  shop_views: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

export async function fetchAdminBusinessShops(
  filter = 'all',
  limit = 50,
): Promise<AdminBusinessShopRow[]> {
  const { data, error } = await supabase.rpc('admin_list_business_shops', {
    p_filter: filter,
    p_limit: limit,
  });
  if (error || !data) return [];
  return data as AdminBusinessShopRow[];
}

export async function fetchAdminBusinessShopBoosts(limit = 50): Promise<AdminBusinessShopBoostRow[]> {
  const { data, error } = await supabase.rpc('admin_list_business_shop_boosts', { p_limit: limit });
  if (error || !data) return [];
  return data as AdminBusinessShopBoostRow[];
}

export async function adminSetBusinessShopPublished(
  businessId: string,
  published: boolean,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_set_business_shop_published', {
    p_business_id: businessId,
    p_published: published,
  });
  return { error: supabaseErrorMessage(error) };
}

export async function adminCancelBusinessShopBoost(boostId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_cancel_business_shop_boost', { p_boost_id: boostId });
  return { error: supabaseErrorMessage(error) };
}
