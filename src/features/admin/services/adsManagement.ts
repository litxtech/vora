import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type BusinessAdRow = {
  id: string;
  business_id: string | null;
  business_name: string | null;
  title: string;
  description: string;
  image_url: string | null;
  cta_label: string;
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
  target_interests: string[] | null;
  impressions: number;
  clicks: number;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
  owner_id: string;
  owner_username: string;
  owner_full_name: string | null;
  owner_avatar_url: string | null;
};

export async function fetchBusinessAds(status: string = 'pending'): Promise<BusinessAdRow[]> {
  const { data, error } = await supabase.rpc('admin_list_business_ads', {
    p_status: status,
    p_limit: 50,
  });
  if (error || !data) return [];
  return data as BusinessAdRow[];
}

export async function reviewBusinessAd(
  adId: string,
  approve: boolean,
  note?: string,
): Promise<{ error: string | null }> {
  if (!approve) {
    const { error } = await supabase.rpc('admin_moderate_feed_content', {
      p_target_type: 'business_ad',
      p_target_id: adId,
      p_action: 'remove',
      p_reason: note ?? 'Reklam reddedildi',
    });
    return { error: supabaseErrorMessage(error) };
  }

  const { error } = await supabase.rpc('admin_review_business_ad', {
    p_ad_id: adId,
    p_approve: true,
    p_note: note ?? null,
  });
  return { error: supabaseErrorMessage(error) };
}

export async function removeBusinessAdFromFeed(
  adId: string,
  reason = 'Admin reklam kaldırma',
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_moderate_feed_content', {
    p_target_type: 'business_ad',
    p_target_id: adId,
    p_action: 'remove',
    p_reason: reason,
  });
  return { error: supabaseErrorMessage(error) };
}
