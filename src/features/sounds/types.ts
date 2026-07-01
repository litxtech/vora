import type { FeedAuthor } from '@/features/feed/types';

export type SoundPrivacy = 'public' | 'private';
export type SoundStatus = 'published' | 'hidden' | 'removed' | 'suspended';
export type SoundReportReason = 'copyright' | 'inappropriate' | 'spam' | 'misleading_title';

export type Sound = {
  id: string;
  authorId: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  audioUrl: string;
  durationSec: number;
  privacy: SoundPrivacy;
  status: SoundStatus;
  tags: string[];
  usageCount: number;
  listenCount: number;
  likeCount: number;
  favoriteCount: number;
  shareCount: number;
  trendScore: number;
  points: number;
  isTrending: boolean;
  isPopular: boolean;
  badgeTier: number;
  lastUsedAt: string | null;
  createdAt: string;
  author?: FeedAuthor;
};

export type SoundSelection = {
  soundId: string;
  title: string;
  audioUrl: string;
  durationSec: number;
  musicStartSec: number;
  musicEndSec: number;
  musicVolume: number;
  originalAudioVolume: number;
  authorUsername?: string;
};

export type SoundAuthorStats = {
  totalSounds: number;
  totalUsage: number;
  totalListens: number;
  totalLikes: number;
};

export type SoundDailyStat = {
  statDate: string;
  usageCount: number;
  listenCount: number;
  likeCount: number;
  favoriteCount: number;
  completeListenCount: number;
};

export type PublishSoundInput = {
  title: string;
  description?: string | null;
  privacy: SoundPrivacy;
  localAudioUri: string;
  durationSec: number;
  coverLocalUri?: string | null;
  tags?: string[];
};

export type SoundListTabId = 'trending' | 'new' | 'following' | 'saved' | 'mine';
