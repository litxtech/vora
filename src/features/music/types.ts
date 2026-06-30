import type { FeedAuthor } from '@/features/feed/types';

export type MusicTrendPeriod = '24h' | '7d' | '30d';

export type MusicLicenseStatus = 'licensed' | 'pending' | 'unlicensed';
export type MusicPublicationStatus = 'active' | 'hidden' | 'blocked';

export type MusicCategory = {
  id: string;
  slug: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
};

export type MusicTrack = {
  id: string;
  title: string;
  displayTitle: string;
  artist: string;
  album: string | null;
  categoryId: string | null;
  categorySlug: string | null;
  categoryLabel: string | null;
  coverUrl: string | null;
  audioUrl: string;
  durationSec: number;
  licenseStatus: MusicLicenseStatus;
  licenseInfo: string | null;
  publicationStatus: MusicPublicationStatus;
  isTrending: boolean;
  isFeatured: boolean;
  isEditorPick: boolean;
  sortOrder: number;
  usageCount: number;
  viewCount: number;
  lastUsedAt: string | null;
  createdAt: string;
};

export type MusicSelection = {
  trackId: string;
  displayTitle: string;
  artist: string;
  audioUrl: string;
  durationSec: number;
  musicStartSec: number;
  musicEndSec: number;
  musicVolume: number;
  originalAudioVolume: number;
};

export type MusicAttribution = {
  trackId: string;
  displayTitle: string;
  artist: string;
};

/** Reels / feed oynatıcısında videoyla senkron müzik */
export type MusicPlaybackConfig = {
  audioUrl: string;
  musicStartSec: number;
  musicEndSec: number;
  musicVolume: number;
  originalAudioVolume: number;
};

export type MusicTrackAdminRow = MusicTrack & {
  audioStoragePath: string | null;
  coverStoragePath: string | null;
};

export type MusicCategoryAdminRow = MusicCategory;

export type MusicUsageKind = 'reel' | 'post';

/** Müzik sayfasında gösterilen reel veya gönderi önizlemesi */
export type MusicUsageContentPreview = {
  id: string;
  kind: MusicUsageKind;
  thumbnailUrl: string | null;
  previewUrl: string | null;
  caption: string;
  author: FeedAuthor;
  viewCount: number;
  likeCount: number;
  createdAt: string;
};

/** Bu müziği kullanan hesap özeti */
export type MusicUsageCreatorPreview = {
  author: FeedAuthor;
  usageCount: number;
  latestAt: string;
};

export type MusicTrackDiscovery = {
  track: MusicTrack | null;
  creators: MusicUsageCreatorPreview[];
  items: MusicUsageContentPreview[];
  nextCursor: string | null;
};
