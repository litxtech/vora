import type { BusinessProfile } from '@/features/profile/services/businessProfile';
import type { ReelItem } from '@/features/reels/types';
import type { FeedItem } from '@/features/feed/types';
import type {
  ProfileRelationship,
  ProfileStats,
  ProfileTab,
  PublicProfile,
  UserAchievement,
  UserBadge,
  ProfileLink,
} from '@/features/profile/types';
import { LruMap } from '@/lib/cache/lruMap';

export type ProfileScreenBundle = {
  profile: PublicProfile;
  stats: ProfileStats;
  badges: UserBadge[];
  achievements: UserAchievement[];
  relationship: ProfileRelationship;
  business: BusinessProfile | null;
  links: ProfileLink[];
};

/** Oturum içi profil önbelleği — sınırsız büyümeyi engeller. */
const MAX_PROFILE_BUNDLES = 32;
const MAX_TAB_CACHE_ENTRIES = 48;

const profileBundles = new LruMap<string, ProfileScreenBundle>(MAX_PROFILE_BUNDLES);
const tabPosts = new LruMap<string, FeedItem[]>(MAX_TAB_CACHE_ENTRIES);
const tabReels = new LruMap<string, ReelItem[]>(MAX_TAB_CACHE_ENTRIES);
const usernameToUserId = new LruMap<string, string>(MAX_PROFILE_BUNDLES);

export function buildProfileBundleKey(userId: string, viewerId: string | null): string {
  return `${userId}:${viewerId ?? 'guest'}`;
}

export function buildProfileTabKey(userId: string, tab: ProfileTab, viewerId: string | null): string {
  return `${userId}:${tab}:${viewerId ?? 'guest'}`;
}

export function getCachedProfileBundle(
  userId: string,
  viewerId: string | null,
): ProfileScreenBundle | null {
  return profileBundles.get(buildProfileBundleKey(userId, viewerId)) ?? null;
}

export function setCachedProfileBundle(
  userId: string,
  viewerId: string | null,
  bundle: ProfileScreenBundle,
): void {
  profileBundles.set(buildProfileBundleKey(userId, viewerId), bundle);
  rememberUsernameId(bundle.profile.username, userId);
}

export function getCachedTabPosts(
  userId: string,
  tab: ProfileTab,
  viewerId: string | null,
): FeedItem[] | null {
  return tabPosts.get(buildProfileTabKey(userId, tab, viewerId)) ?? null;
}

export function setCachedTabPosts(
  userId: string,
  tab: ProfileTab,
  viewerId: string | null,
  items: FeedItem[],
): void {
  tabPosts.set(buildProfileTabKey(userId, tab, viewerId), items);
}

export function getCachedTabReels(userId: string, viewerId: string | null): ReelItem[] | null {
  return tabReels.get(buildProfileTabKey(userId, 'reels', viewerId)) ?? null;
}

export function setCachedTabReels(userId: string, viewerId: string | null, items: ReelItem[]): void {
  tabReels.set(buildProfileTabKey(userId, 'reels', viewerId), items);
}

export function getCachedUserIdByUsername(username: string): string | null {
  return usernameToUserId.get(username.trim().toLowerCase()) ?? null;
}

export function rememberUsernameId(username: string, userId: string): void {
  const key = username.trim().toLowerCase();
  if (!key || !userId) return;
  usernameToUserId.set(key, userId);
}

export function profileBundleFingerprint(bundle: ProfileScreenBundle): string {
  const { profile: p, stats } = bundle;
  return JSON.stringify({
    id: p.id,
    username: p.username,
    fullName: p.fullName,
    avatarUrl: p.avatarUrl,
    coverUrl: p.coverUrl,
    bio: p.bio,
    trustScore: p.trustScore,
    isPremium: p.isPremium,
    profileBoostedUntil: p.profileBoostedUntil,
    stats,
    badgeCount: bundle.badges.length,
    linkCount: bundle.links.length,
  });
}

function clearOwnProfileDiskCacheLazy(): void {
  void import('@/features/profile/services/profileDiskCache').then((mod) =>
    mod.clearOwnProfileDiskCache(),
  );
}

export function invalidateProfileSessionCache(userId?: string): void {
  if (!userId) {
    profileBundles.clear();
    tabPosts.clear();
    tabReels.clear();
    usernameToUserId.clear();
    clearOwnProfileDiskCacheLazy();
    return;
  }

  for (const key of profileBundles.keys()) {
    if (key.startsWith(`${userId}:`)) profileBundles.delete(key);
  }
  for (const key of tabPosts.keys()) {
    if (key.startsWith(`${userId}:`)) tabPosts.delete(key);
  }
  for (const key of tabReels.keys()) {
    if (key.startsWith(`${userId}:`)) tabReels.delete(key);
  }
  clearOwnProfileDiskCacheLazy();
}
