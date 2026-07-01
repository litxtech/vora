import type { StoryStickerCategoryId } from '@/features/stories/constants';

export type StoryNavigation =
  | 'auto_forward'
  | 'tap_forward'
  | 'tap_back'
  | 'swipe_forward'
  | 'swipe_back'
  | 'manual_close';

export type StoryRing = {
  userId: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  storyId: string;
  itemCount: number;
  previewThumb: string | null;
  latestItemAt: string;
  hasUnseen: boolean;
  regionId: string | null;
};

export type StoryItem = {
  id: string;
  storyId: string;
  authorId: string;
  sortOrder: number;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  thumbUrl: string | null;
  durationSec: number | null;
  stickerCategory: StoryStickerCategoryId | null;
  createdAt: string;
  hasReacted: boolean;
};

export type StoryBundle = {
  storyId: string;
  authorId: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  items: StoryItem[];
};

export type StoryItemInsight = {
  itemId: string;
  sortOrder: number;
  thumbUrl: string | null;
  mediaType: 'image' | 'video';
  itemViews: number;
  avgWatchedSeconds: number;
  avgCompletion: number;
  tapForwardCount: number;
  tapBackCount: number;
  swipeForwardCount: number;
  swipeBackCount: number;
  autoForwardCount: number;
  exitedEarlyCount: number;
};

export type StoryInsights = {
  storyId: string;
  totalViews: number;
  uniqueViewers: number;
  items: StoryItemInsight[];
};

export type StoryViewerSession = {
  ringUserIds: string[];
  startUserId: string;
  startItemIndex?: number;
};
