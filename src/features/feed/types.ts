import type { GenderId } from '@/constants/registration';
import type { MusicAttribution, MusicPlaybackConfig } from '@/features/music/types';
import type { IzdivacSpecialBadgeType } from '@/features/izdivac/types';
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
  | 'entertainment'
  | 'daily'
  | 'reels'
  | 'following';

export type FeedSourceType = 'post' | 'incident' | 'event' | 'job' | 'business' | 'lost_found' | 'reel' | 'business_ad';

export type FeedAuthor = {
  id: string;
  username: string;
  fullName: string | null;
  displayName?: string | null;
  avatarUrl: string | null;
  role: UserRole;
  isVerified: boolean;
  isBusinessVerified?: boolean;
  businessId?: string | null;
  accountType?: 'personal' | 'business';
  isPlatformCharm?: boolean;
  isPioneer?: boolean;
  /** Ödeme yapan platform destekçisi — yeşil destekçi tiki */
  isPlatformSupporter?: boolean;
  /** İzdivaç özel tikleri (jigolo, tilki, finansman) — yalnızca app/both görünürlük */
  izdivacBadges?: IzdivacSpecialBadgeType[];
  /** Kullanıcının profilinde gizlediği tik anahtarları (verified, premium, role vb.) */
  hiddenBadges?: string[];
  gender?: GenderId | null;
  isAiAccount?: boolean;
  accountStatus?: 'active' | 'frozen' | 'deletion_pending' | 'deleted';
};

export type QuotedPostPreview = {
  id: string;
  authorId: string;
  authorUsername: string;
  authorFullName: string | null;
  authorAvatarUrl: string | null;
  authorIsVerified: boolean;
  authorIsBusinessVerified?: boolean;
  title: string | null;
  content: string;
  mediaUrls: string[];
  createdAt: string;
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
  endsAt?: string | null;
  isLiked: boolean;
  isSaved: boolean;
  isFollowing: boolean;
  quotedPost: QuotedPostPreview | null;
  isSensitive?: boolean;
  isDemo?: boolean;
  isFeatured?: boolean;
  isAuthorBoosted?: boolean;
  isSponsored?: boolean;
  isPinned?: boolean;
  pinnedAt?: string | null;
  pinnedUntil?: string | null;
  pinPriority?: number;
  vctsTrustCode?: string | null;
  vctsStatus?: string | null;
  music?: MusicAttribution | null;
  musicPlayback?: MusicPlaybackConfig | null;
  lostItemType?: 'lost' | 'found';
  lostItemCategory?: string;
  jobType?: string;
  jobSalaryRange?: string | null;
  jobIsUrgent?: boolean;
  jobHousingProvided?: boolean;
  jobMealProvided?: boolean;
  businessName?: string | null;
  /** business_ad kaynaklı feed reklamı */
  businessAdId?: string;
  /** Yorum/beğeni için gizli etkileşim gönderisi */
  engagementPostId?: string | null;
  adCtaLabel?: string;
  adDestinationUrl?: string | null;
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

export type LikeUser = FeedAuthor & {
  isFollowing: boolean;
  likedAt: string;
};

export type FeedQuery = {
  /** null = tüm iller (Karadeniz geneli) */
  regionId: string | null;
  district: string | null;
  category: FeedCategory;
  searchQuery: string;
  followingOnly: boolean;
  cursor: string | null;
  userId: string | null;
};
