import type { FeedAuthor } from '@/features/feed/types';
import type { MusicAttribution, MusicPlaybackConfig } from '@/features/music/types';
import type { PublishedEditManifest } from '@/features/vora-studio/types';

export type ReelComment = {
  id: string;
  reelId: string;
  author: FeedAuthor;
  content: string;
  likeCount: number;
  isLiked: boolean;
  isEdited: boolean;
  parentId: string | null;
  createdAt: string;
  replies?: ReelComment[];
};

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
  shareCount: number;
  saveCount: number;
  completionRate: number;
  commentCount: number;
  createdAt: string;
  isLiked: boolean;
  isSaved: boolean;
  isFollowing: boolean;
  isSensitive?: boolean;
  isDemo?: boolean;
  music?: MusicAttribution | null;
  musicPlayback?: MusicPlaybackConfig | null;
  editManifest?: PublishedEditManifest | null;
};
