import type { FeedAuthor } from '@/features/feed/types';

export type ReelItem = {
  id: string;
  playbackId: string | null;
  thumbnailUrl: string | null;
  caption: string;
  author: FeedAuthor;
  regionId: string;
  district: string | null;
  locationLabel: string | null;
  category: string | null;
  likeCount: number;
  viewCount: number;
  commentCount: number;
  createdAt: string;
  isLiked: boolean;
  isFollowing: boolean;
  isDemo?: boolean;
};
