import type { RegionId } from '@/constants/regions';

export type ChannelType = 'news' | 'municipality' | 'emergency' | 'business';

export type Channel = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  channelType: ChannelType;
  regionId: string | null;
  businessId: string | null;
  ownerId: string;
  avatarUrl: string | null;
  subscriberCount: number;
  postCount: number;
  isVerified: boolean;
  isSubscribed: boolean;
  notifyEnabled: boolean;
  canPost: boolean;
  createdAt: string;
};

export type ChannelPost = {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  mediaUrl: string | null;
  viewCount: number;
  createdAt: string;
};

export type CreateChannelInput = {
  name: string;
  description: string;
  channelType: ChannelType;
  regionId: RegionId | null;
};

export type CreateChannelPostInput = {
  content: string;
  mediaUrl?: string | null;
};
