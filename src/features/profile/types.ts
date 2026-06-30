import type { FeedAuthor, FeedItem } from '@/features/feed/types';
import type { GenderId } from '@/constants/registration';
import type { UserRole } from '@/types/database';

export type ProfileVisibility = 'public' | 'members' | 'friends';

export type BadgeType =
  | 'verified_account'
  | 'reporter'
  | 'trusted_contributor'
  | 'business'
  | 'moderator'
  | 'admin'
  | 'premium'
  | 'platform_supporter'
  | 'platform_charm'
  | 'pioneer';

export type ProfileTab =
  | 'posts'
  | 'reels'
  | 'quotes'
  | 'media'
  | 'liked'
  | 'saved'
  | 'badges';

export type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'friends';

export type AccountStatus = 'active' | 'frozen' | 'deletion_pending' | 'deleted';
export type DeletedBy = 'self' | 'platform';

export type PublicProfile = {
  id: string;
  username: string;
  /** Kullanıcılara görünen ad — işletmede işletme adı */
  displayName: string;
  /** Sahip / yetkili adı — evrak ve dahili kullanım */
  legalName: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  occupation: string | null;
  regionId: string | null;
  regionName: string | null;
  district: string | null;
  role: UserRole;
  isVerified: boolean;
  isBusinessVerified: boolean;
  businessId: string | null;
  businessCategory: string | null;
  businessCategoryLabel: string | null;
  isPlatformCharm: boolean;
  isPioneer: boolean;
  isPlatformSupporter: boolean;
  isPremium: boolean;
  /** İzdivaç topluluğu erişimi verilmiş — izdivaç tiki bu alana bağlıdır */
  izdivacAccessGranted: boolean;
  /** Kullanıcının profilinde gizlemeyi seçtiği tik anahtarları */
  hiddenBadges: string[];
  gender: GenderId | null;
  accountType: 'personal' | 'business';
  accountStatus: AccountStatus;
  deletedAt: string | null;
  deletedBy: DeletedBy | null;
  deletionRequestedAt: string | null;
  trustScore: number;
  reporterLevel: number;
  contributionScore: number;
  verifiedContentCount: number;
  profileVisibility: ProfileVisibility;
  showProfileViews: boolean;
  showLikedPosts: boolean;
  profileBoostedUntil: string | null;
  profileBoostMessage: string | null;
  createdAt: string;
};

export type ProfileStats = {
  followerCount: number;
  followingCount: number;
  friendCount: number;
  postCount: number;
  reelCount: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalQuotes: number;
  profileViewCount: number;
};

export type ProfileRelationship = {
  isFollowing: boolean;
  friendshipStatus: FriendshipStatus;
  pendingRequestId: string | null;
  isBlocked: boolean;
  blockedByMe: boolean;
  blockedByThem: boolean;
  isRestricted: boolean;
  isMuted: boolean;
};

export type UserBadge = {
  badgeType: BadgeType;
  earnedAt: string;
};

export type UserAchievement = {
  achievementKey: string;
  earnedAt: string;
};

export type FollowUser = FeedAuthor & {
  trustScore: number;
  isFollowing: boolean;
};

export type ProfileScreenData = {
  profile: PublicProfile;
  stats: ProfileStats;
  relationship: ProfileRelationship;
  badges: UserBadge[];
  achievements: UserAchievement[];
};

export type ProfileTabContent = {
  items: FeedItem[];
  loading: boolean;
};

export type ProfileLinkKind = 'social' | 'website';

export type ProfileSocialPlatform =
  | 'instagram'
  | 'x'
  | 'facebook'
  | 'youtube'
  | 'tiktok'
  | 'linkedin'
  | 'github'
  | 'whatsapp'
  | 'telegram'
  | 'snapchat'
  | 'pinterest'
  | 'spotify'
  | 'threads';

export type ProfileLink = {
  id: string;
  kind: ProfileLinkKind;
  platform: ProfileSocialPlatform | null;
  username: string | null;
  useCustomUrl: boolean;
  url: string;
  title: string | null;
  sortOrder: number;
};
