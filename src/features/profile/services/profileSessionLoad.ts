import { enrichPublicProfile } from '@/features/profile/services/businessIdentity';
import { fetchBusinessByOwner } from '@/features/profile/services/businessProfile';
import { writeOwnProfileDiskCache } from '@/features/profile/services/profileDiskCache';
import { fetchProfileLinks } from '@/features/profile/services/profileLinks';
import { ensureCurrentUserProfile } from '@/features/profile/services/ensureProfile';
import {
  fetchProfileById,
  fetchProfileByUsername,
  fetchProfileEngagementTotals,
  fetchProfileStatsCore,
  fetchRelationship,
  fetchUserAchievements,
  fetchUserBadges,
  fetchUserPosts,
  fetchUserReels,
  mapStoredProfileToPublic,
} from '@/features/profile/services/profileData';
import {
  getCachedProfileBundle,
  getCachedTabPosts,
  getCachedTabReels,
  getCachedUserIdByUsername,
  invalidateProfileSessionCache,
  profileBundleFingerprint,
  rememberUsernameId,
  setCachedProfileBundle,
  setCachedTabPosts,
  setCachedTabReels,
  type ProfileScreenBundle,
} from '@/features/profile/services/profileSessionCache';
import type { ProfileRelationship, ProfileStats, ProfileTab } from '@/features/profile/types';
import type { FeedItem } from '@/features/feed/types';
import type { ReelItem } from '@/features/reels/types';
import type { Database } from '@/types/database';

type StoredProfile = Database['public']['Tables']['profiles']['Row'];

type LoadProfileOptions = {
  force?: boolean;
  isOwnProfile?: boolean;
  authUserId?: string | null;
  authProfile?: StoredProfile | null;
};

const EMPTY_OWN_RELATIONSHIP: ProfileRelationship = {
  isFollowing: false,
  friendshipStatus: 'none',
  pendingRequestId: null,
  isBlocked: false,
  blockedByMe: false,
  blockedByThem: false,
  isRestricted: false,
  isMuted: false,
};

const EMPTY_STATS: ProfileStats = {
  followerCount: 0,
  followingCount: 0,
  friendCount: 0,
  postCount: 0,
  reelCount: 0,
  totalViews: 0,
  totalLikes: 0,
  totalComments: 0,
  totalQuotes: 0,
  profileViewCount: 0,
};

export function buildOwnProfileSkeleton(authProfile: StoredProfile): ProfileScreenBundle {
  return {
    profile: mapStoredProfileToPublic(authProfile),
    stats: EMPTY_STATS,
    badges: [],
    achievements: [],
    relationship: EMPTY_OWN_RELATIONSHIP,
    business: null,
    links: [],
  };
}

function persistOwnProfileBundle(
  userId: string,
  viewerId: string | null,
  bundle: ProfileScreenBundle,
): void {
  if (viewerId !== userId) return;
  const posts = getCachedTabPosts(userId, 'posts', viewerId) ?? [];
  void writeOwnProfileDiskCache(userId, bundle, posts);
}

async function fetchProfileScreenBundleFromNetwork(
  userId: string,
  viewerId: string | null,
  options: LoadProfileOptions = {},
): Promise<ProfileScreenBundle | null> {
  const [fetchedProfile, stats, badges, achievements, relationship, links] = await Promise.all([
    fetchProfileById(userId),
    fetchProfileStatsCore(userId),
    fetchUserBadges(userId),
    fetchUserAchievements(userId),
    fetchRelationship(viewerId, userId),
    fetchProfileLinks(userId),
  ]);

  let resolvedProfile = fetchedProfile;

  if (!resolvedProfile && options.isOwnProfile && options.authUserId === userId) {
    await ensureCurrentUserProfile();
    resolvedProfile = await fetchProfileById(userId);
  }

  if (!resolvedProfile && options.isOwnProfile && options.authProfile?.id === userId) {
    resolvedProfile = mapStoredProfileToPublic(options.authProfile);
  }

  if (!resolvedProfile) return null;

  const shouldLoadBusiness =
    resolvedProfile.accountType === 'business' ||
    (options.isOwnProfile === true && options.authUserId === userId);

  const business = shouldLoadBusiness ? await fetchBusinessByOwner(userId) : null;

  const profile =
    resolvedProfile.accountType === 'business'
      ? enrichPublicProfile(resolvedProfile, business)
      : resolvedProfile;

  // `fetchProfileStatsCore` etkileşim toplamlarını (görüntülenme/beğeni/yorum/alıntı)
  // 0 döndürür; gerçek değerler `loadProfileEngagementStats` ile ayrıca yüklenir.
  // Yeniden doğrulama sırasında sayaç sıfıra düşmesin diye son bilinen değerleri taşı.
  const cachedStats = getCachedProfileBundle(userId, viewerId)?.stats;
  const mergedStats: ProfileStats = cachedStats
    ? {
        ...stats,
        totalViews: stats.totalViews || cachedStats.totalViews,
        totalLikes: stats.totalLikes || cachedStats.totalLikes,
        totalComments: stats.totalComments || cachedStats.totalComments,
        totalQuotes: stats.totalQuotes || cachedStats.totalQuotes,
      }
    : stats;

  return {
    profile,
    stats: mergedStats,
    badges,
    achievements,
    relationship,
    business,
    links,
  };
}

export async function loadProfileScreenBundle(
  userId: string,
  viewerId: string | null,
  options: LoadProfileOptions = {},
): Promise<ProfileScreenBundle | null> {
  if (options.force) {
    invalidateProfileSessionCache(userId);
  } else {
    const cached = getCachedProfileBundle(userId, viewerId);
    if (cached) return cached;
  }

  const bundle = await fetchProfileScreenBundleFromNetwork(userId, viewerId, options);
  if (!bundle) return null;

  setCachedProfileBundle(userId, viewerId, bundle);
  persistOwnProfileBundle(userId, viewerId, bundle);
  return bundle;
}

export async function loadProfileEngagementStats(
  userId: string,
  viewerId: string | null,
): Promise<ProfileScreenBundle['stats'] | null> {
  const cached = getCachedProfileBundle(userId, viewerId);
  if (!cached) return null;

  const engagement = await fetchProfileEngagementTotals(userId);
  const stats = { ...cached.stats, ...engagement };
  const nextBundle = { ...cached, stats };
  setCachedProfileBundle(userId, viewerId, nextBundle);
  persistOwnProfileBundle(userId, viewerId, nextBundle);
  return stats;
}

export type ProfileInitialVisit = {
  bundle: ProfileScreenBundle;
  initialTab: { kind: 'posts'; items: FeedItem[] };
};

export async function loadProfileInitialVisit(
  userId: string,
  viewerId: string | null,
  options: LoadProfileOptions = {},
): Promise<ProfileInitialVisit | null> {
  const cachedPosts = options.force ? null : getCachedTabPosts(userId, 'posts', viewerId);

  const [bundle, initialTab] = await Promise.all([
    loadProfileScreenBundle(userId, viewerId, options),
    cachedPosts
      ? Promise.resolve({ kind: 'posts' as const, items: cachedPosts })
      : loadProfileTabContent(userId, 'posts', viewerId, options),
  ]);

  if (!bundle || initialTab.kind !== 'posts') return null;

  if (viewerId === userId) {
    persistOwnProfileBundle(userId, viewerId, bundle);
  }

  return { bundle, initialTab };
}

export async function loadProfileTabContent(
  userId: string,
  tab: ProfileTab,
  viewerId: string | null,
  options: { force?: boolean } = {},
): Promise<{ kind: 'posts'; items: FeedItem[] } | { kind: 'reels'; items: ReelItem[] }> {
  if (!options.force) {
    if (tab === 'reels') {
      const cachedReels = getCachedTabReels(userId, viewerId);
      if (cachedReels) return { kind: 'reels', items: cachedReels };
    } else {
      const cachedPosts = getCachedTabPosts(userId, tab, viewerId);
      if (cachedPosts) return { kind: 'posts', items: cachedPosts };
    }
  }

  if (tab === 'reels') {
    const items = await fetchUserReels(userId, viewerId);
    setCachedTabReels(userId, viewerId, items);
    return { kind: 'reels', items };
  }

  const items = await fetchUserPosts(userId, tab, viewerId);
  setCachedTabPosts(userId, tab, viewerId, items);

  if (viewerId === userId && tab === 'posts') {
    const bundle = getCachedProfileBundle(userId, viewerId);
    if (bundle) persistOwnProfileBundle(userId, viewerId, bundle);
  }

  return { kind: 'posts', items };
}

/** Önbellek gösterildikten sonra arka planda güncelle; yalnızca veri değiştiyse callback çağır. */
export async function revalidateProfileBundleInBackground(
  userId: string,
  viewerId: string | null,
  options: LoadProfileOptions,
  onUpdated: (bundle: ProfileScreenBundle) => void,
): Promise<void> {
  const previous = getCachedProfileBundle(userId, viewerId);
  const previousFingerprint = previous ? profileBundleFingerprint(previous) : null;

  const fresh = await fetchProfileScreenBundleFromNetwork(userId, viewerId, options);
  if (!fresh) return;

  const nextFingerprint = profileBundleFingerprint(fresh);
  setCachedProfileBundle(userId, viewerId, fresh);
  persistOwnProfileBundle(userId, viewerId, fresh);

  if (nextFingerprint !== previousFingerprint) {
    onUpdated(fresh);
  }

  void loadProfileEngagementStats(userId, viewerId).then((stats) => {
    if (!stats) return;
    const cached = getCachedProfileBundle(userId, viewerId);
    if (!cached) return;
    const withEngagement = { ...cached, stats };
    if (profileBundleFingerprint(withEngagement) !== profileBundleFingerprint(cached)) {
      setCachedProfileBundle(userId, viewerId, withEngagement);
      persistOwnProfileBundle(userId, viewerId, withEngagement);
      onUpdated(withEngagement);
    }
  });
}

function tabContentFingerprint(items: FeedItem[] | ReelItem[]): string {
  return items.map((item) => item.id).join('\u0001');
}

/** Sekme içeriğini arka planda yenile. */
export async function revalidateProfileTabInBackground(
  userId: string,
  tab: ProfileTab,
  viewerId: string | null,
  onUpdated: (items: FeedItem[] | ReelItem[], kind: 'posts' | 'reels') => void,
): Promise<void> {
  const previous =
    tab === 'reels'
      ? getCachedTabReels(userId, viewerId)
      : getCachedTabPosts(userId, tab, viewerId);
  const previousFingerprint = previous ? tabContentFingerprint(previous) : null;

  const result = await loadProfileTabContent(userId, tab, viewerId, { force: true });
  const nextFingerprint = tabContentFingerprint(result.items);
  if (nextFingerprint === previousFingerprint) return;

  if (result.kind === 'reels') onUpdated(result.items, 'reels');
  else onUpdated(result.items, 'posts');
}

export async function resolveUsernameToUserId(
  username: string,
  options: { force?: boolean } = {},
): Promise<string | null> {
  const clean = username.replace(/^@/, '').trim();
  if (!clean) return null;

  if (!options.force) {
    const cachedId = getCachedUserIdByUsername(clean);
    if (cachedId) return cachedId;
  }

  const profile = await fetchProfileByUsername(clean);
  if (!profile) return null;

  rememberUsernameId(profile.username, profile.id);
  return profile.id;
}

/** Profil ekranına girmeden önce bundle önbelleğe al. */
export function prefetchProfileBundle(userId: string, viewerId: string | null): void {
  if (getCachedProfileBundle(userId, viewerId)) return;
  void loadProfileScreenBundle(userId, viewerId).catch(() => undefined);
}

/** Kendi profil sekmesi için bundle + gönderiler önbelleğe al. */
export function prefetchOwnProfileScreen(userId: string): void {
  prefetchProfileBundle(userId, userId);
  if (!getCachedTabPosts(userId, 'posts', userId)) {
    void loadProfileTabContent(userId, 'posts', userId).catch(() => undefined);
  }
}
