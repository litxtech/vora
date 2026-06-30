import type { FeedItem } from '@/features/feed/types';
import type { RegionId } from '@/constants/regions';

export type CommunityMemberRole = 'owner' | 'admin' | 'moderator' | 'member';

export type CommunityCategory =
  | 'general'
  | 'sports'
  | 'news'
  | 'jobs'
  | 'tech'
  | 'tourism'
  | 'culture';

export type Community = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  iconUrl: string | null;
  regionId: string | null;
  category: CommunityCategory;
  visibility: 'public' | 'private';
  memberCount: number;
  postCount: number;
  createdBy: string;
  rulesSummary: string | null;
  conversationId: string | null;
  createdAt: string;
  myRole: CommunityMemberRole | null;
  isMember: boolean;
};

export type CommunityMember = {
  userId: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: CommunityMemberRole;
  joinedAt: string;
};

export type CommunityDetailTab = 'posts' | 'chat' | 'events' | 'members' | 'rules' | 'about';

export type CommunityRule = {
  id: string;
  title: string;
  content: string;
  sortOrder: number;
};

export type CommunityDetail = Community & {
  rules: CommunityRule[];
  posts: FeedItem[];
  members: CommunityMember[];
};

export type CreateCommunityInput = {
  name: string;
  description: string;
  regionId: RegionId | null;
  category: CommunityCategory;
  rulesSummary: string;
};

export type CommunityFeedItem = FeedItem & {
  community: {
    id: string;
    name: string;
    iconUrl: string | null;
  };
};

export type CommunityFeedScope = 'all' | 'mine';

export type CommunitiesScreenTab = 'feed' | 'discover' | 'mine';
