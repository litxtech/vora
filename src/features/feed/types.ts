import type { UserRole } from '@/types/database';

export type FeedCategory =
  | 'all'
  | 'general'
  | 'news'
  | 'emergency'
  | 'traffic'
  | 'event'
  | 'job'
  | 'business'
  | 'lost_found'
  | 'reels'
  | 'following';

export type FeedSourceType = 'post' | 'incident' | 'event' | 'job' | 'business' | 'lost_found' | 'reel';

export type FeedAuthor = {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  isVerified: boolean;
};

export type QuotedPostPreview = {
  id: string;
  authorUsername: string;
  content: string;
  mediaUrls: string[];
};

export type FeedItem = {
  id: string;
  sourceType: FeedSourceType;
  sourceId: string;
  author: FeedAuthor;
  title: string | null;
  content: string;
  mediaUrls: string[];
  category: FeedCategory;
  regionId: string;
  district: string | null;
  locationLabel: string | null;
  latitude: number | null;
  longitude: number | null;
  likeCount: number;
  commentCount: number;
  quoteCount: number;
  saveCount: number;
  viewCount: number;
  createdAt: string;
  isLiked: boolean;
  isSaved: boolean;
  isFollowing: boolean;
  quotedPost: QuotedPostPreview | null;
  isDemo?: boolean;
};

export type FeedComment = {
  id: string;
  postId: string;
  author: FeedAuthor;
  content: string;
  likeCount: number;
  isLiked: boolean;
  isEdited: boolean;
  parentId: string | null;
  createdAt: string;
  replies?: FeedComment[];
};

export type FeedQuery = {
  regionId: string;
  district: string | null;
  category: FeedCategory;
  searchQuery: string;
  followingOnly: boolean;
  cursor: string | null;
  userId: string | null;
};
