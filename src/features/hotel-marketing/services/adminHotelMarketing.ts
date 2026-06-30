import type {
  AdminHotelMarketingCampaign,
  AdminHotelSearchResult,
  HotelMarketingCampaignType,
} from '@/features/hotel-marketing/types';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

type CampaignListRow = {
  id: string;
  hotel_id: string;
  hotel_name: string;
  hotel_cover_url: string | null;
  campaign_type: HotelMarketingCampaignType;
  headline: string;
  message: string;
  region_scope: 'platform' | 'region';
  region_id: string | null;
  priority: number;
  platform_wide: boolean;
  notify_users: boolean;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
};

type HotelSearchRow = {
  id: string;
  name: string;
  region_id: string;
  district: string | null;
  cover_url: string | null;
  status: string;
};

function mapCampaign(row: CampaignListRow): AdminHotelMarketingCampaign {
  return {
    id: row.id,
    hotelId: row.hotel_id,
    hotelName: row.hotel_name,
    hotelCoverUrl: row.hotel_cover_url,
    campaignType: row.campaign_type,
    headline: row.headline,
    message: row.message,
    regionScope: row.region_scope,
    regionId: row.region_id,
    priority: row.priority,
    platformWide: row.platform_wide,
    notifyUsers: row.notify_users,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export async function adminListHotelMarketingCampaigns(): Promise<AdminHotelMarketingCampaign[]> {
  const { data, error } = await supabase.rpc('admin_list_hotel_marketing_campaigns', { p_limit: 50 });
  if (error || !data) {
    console.warn('[admin] admin_list_hotel_marketing_campaigns', error?.message);
    return [];
  }
  return (data as CampaignListRow[]).map(mapCampaign);
}

export async function adminSearchHotelsForMarketing(query: string): Promise<AdminHotelSearchResult[]> {
  const { data, error } = await supabase.rpc('admin_search_hotels_for_marketing', {
    p_query: query.trim(),
    p_limit: 20,
  });
  if (error || !data) return [];
  return (data as HotelSearchRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    regionId: row.region_id,
    district: row.district,
    coverUrl: row.cover_url,
    status: row.status,
  }));
}

export type CreateHotelMarketingInput = {
  hotelId: string;
  campaignType: HotelMarketingCampaignType;
  headline: string;
  message: string;
  regionScope: 'platform' | 'region';
  regionId?: string | null;
  priority?: number;
  platformWide?: boolean;
  notifyUsers?: boolean;
  days?: number | null;
};

export async function adminCreateHotelMarketingCampaign(
  input: CreateHotelMarketingInput,
): Promise<{ campaignId: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('admin_create_hotel_marketing_campaign', {
    p_hotel_id: input.hotelId,
    p_campaign_type: input.campaignType,
    p_headline: input.headline.trim(),
    p_message: input.message.trim(),
    p_region_scope: input.regionScope,
    p_region_id: input.regionScope === 'region' ? input.regionId ?? null : null,
    p_priority: input.priority ?? 0,
    p_platform_wide: input.platformWide ?? true,
    p_notify_users: input.notifyUsers ?? false,
    p_days: input.days ?? null,
  });

  if (error) return { campaignId: null, error: supabaseErrorMessage(error) };
  return { campaignId: (data as string) ?? null, error: null };
}

export async function adminPreviewHotelMarketingRecipients(
  regionScope: 'platform' | 'region',
  regionId?: string | null,
): Promise<number> {
  const { data, error } = await supabase.rpc('admin_preview_hotel_marketing_recipients', {
    p_region_scope: regionScope,
    p_region_id: regionScope === 'region' ? regionId ?? null : null,
  });
  if (error) {
    console.warn('[admin] admin_preview_hotel_marketing_recipients', error.message);
    return 0;
  }
  return typeof data === 'number' ? data : 0;
}

export async function adminEndHotelMarketingCampaign(campaignId: string): Promise<{ error: string | null }> {
  const { data, error } = await supabase.rpc('admin_end_hotel_marketing_campaign', {
    p_campaign_id: campaignId,
  });
  if (error) return { error: supabaseErrorMessage(error) };
  if (!data) return { error: 'Kampanya sonlandırılamadı.' };
  return { error: null };
}
