import type { FeedItem } from '@/features/feed/types';
import type { ReelItem } from '@/features/reels/types';
import type { EventListing } from '@/features/events/types';
import type { PersonnelListing } from '@/features/personnel-center/types';
import type { HotelListing } from '@/features/hotel-center/types';
import type { RegionId } from '@/constants/regions';

export type DiscoveryTab = 'posts' | 'reels' | 'news' | 'events' | 'businesses' | 'jobs' | 'hotels';

export type DiscoveryScope = 'region' | 'karadeniz';

export type DiscoveryPeriod = '24h' | '7d' | '30d';

export type TrendBusiness = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  regionId: string;
  district: string | null;
  logoUrl: string | null;
  isVerified: boolean;
  viewCount: number;
  followerCount: number;
  trendScore: number;
  createdAt: string;
};

export type DiscoveryQuery = {
  tab: DiscoveryTab;
  scope: DiscoveryScope;
  period: DiscoveryPeriod;
  regionId: RegionId;
  userId: string | null;
  cursor: string | null;
};

export type DiscoveryResult =
  | { tab: 'posts' | 'news'; items: FeedItem[]; nextCursor: string | null }
  | { tab: 'reels'; items: ReelItem[]; nextCursor: string | null }
  | { tab: 'events'; items: EventListing[]; nextCursor: string | null }
  | { tab: 'businesses'; items: TrendBusiness[]; nextCursor: string | null }
  | { tab: 'jobs'; items: PersonnelListing[]; nextCursor: string | null }
  | { tab: 'hotels'; items: HotelListing[]; nextCursor: string | null };

export type DiscoveryUserResult = {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  isBusinessVerified?: boolean;
};
