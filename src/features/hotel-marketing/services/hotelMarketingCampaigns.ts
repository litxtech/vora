import type { HotelMarketingCampaign, HotelMarketingCampaignType } from '@/features/hotel-marketing/types';
import { supabase } from '@/lib/supabase/client';

type CampaignRow = {
  campaign_id: string;
  hotel_id: string;
  campaign_type: HotelMarketingCampaignType;
  headline: string;
  message: string;
  priority: number;
  platform_wide: boolean;
  hotel_name: string;
  cover_url: string | null;
  region_id: string | null;
};

function mapCampaign(row: CampaignRow): HotelMarketingCampaign {
  return {
    campaignId: row.campaign_id,
    hotelId: row.hotel_id,
    campaignType: row.campaign_type,
    headline: row.headline,
    message: row.message,
    priority: row.priority,
    platformWide: row.platform_wide,
    hotelName: row.hotel_name,
    coverUrl: row.cover_url,
    regionId: row.region_id,
  };
}

export async function fetchActiveHotelMarketingCampaigns(
  regionId: string | null,
): Promise<HotelMarketingCampaign[]> {
  const { data, error } = await supabase.rpc('get_active_hotel_marketing_campaigns', {
    p_region_id: regionId,
  });

  if (error || !data) {
    console.warn('[hotel-marketing] fetchActiveHotelMarketingCampaigns', error?.message);
    return [];
  }

  return (data as CampaignRow[]).map(mapCampaign);
}

export function campaignsByHotelId(campaigns: HotelMarketingCampaign[]): Map<string, HotelMarketingCampaign> {
  const map = new Map<string, HotelMarketingCampaign>();
  for (const campaign of campaigns) {
    if (!map.has(campaign.hotelId)) map.set(campaign.hotelId, campaign);
  }
  return map;
}

export function sortHotelsWithCampaigns<T extends { id: string }>(
  items: T[],
  campaignMap: Map<string, HotelMarketingCampaign>,
): T[] {
  return [...items].sort((a, b) => {
    const aScore = campaignMap.get(a.id)?.priority ?? -1;
    const bScore = campaignMap.get(b.id)?.priority ?? -1;
    if (aScore !== bScore) return bScore - aScore;
    return 0;
  });
}
