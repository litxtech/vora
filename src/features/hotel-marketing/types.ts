export type HotelMarketingCampaignType =
  | 'weekend_youth'
  | 'event'
  | 'seasonal'
  | 'student_deal'
  | 'custom';

export type HotelMarketingCampaign = {
  campaignId: string;
  hotelId: string;
  campaignType: HotelMarketingCampaignType;
  headline: string;
  message: string;
  priority: number;
  platformWide: boolean;
  hotelName: string;
  coverUrl: string | null;
  regionId: string | null;
};

export type AdminHotelMarketingCampaign = {
  id: string;
  hotelId: string;
  hotelName: string;
  hotelCoverUrl: string | null;
  campaignType: HotelMarketingCampaignType;
  headline: string;
  message: string;
  regionScope: 'platform' | 'region';
  regionId: string | null;
  priority: number;
  platformWide: boolean;
  notifyUsers: boolean;
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
};

export type AdminHotelSearchResult = {
  id: string;
  name: string;
  regionId: string;
  district: string | null;
  coverUrl: string | null;
  status: string;
};
