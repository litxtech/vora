import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { FlatList, ScrollView } from 'react-native-gesture-handler';
import { router, type Href, useIsFocused, useFocusEffect } from 'expo-router';
import { useMainTabPrefetchActive } from '@/features/navigation/hooks/useMainTabScreenActive';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { DetailLoadingShell } from '@/components/ui/DetailLoadingShell';
import { Text } from '@/components/ui/Text';
import { ProfileActionChip } from '@/features/profile/components/shared/ProfileActionChip';
import { ProfileEmptyState } from '@/features/profile/components/shared/ProfileEmptyState';
import { ProfileTabBar } from '@/features/profile/components/shared/ProfileTabBar';
import { ProfileViewsPill } from '@/features/profile/components/ProfileViewsPill';
import { ProfileInsightsPill } from '@/features/profile/components/ProfileInsightsPill';
import { BadgeGrid } from '@/features/profile/components/BadgeGrid';
import { BusinessCampaignsSection } from '@/features/profile/components/BusinessCampaignsSection';
import { BusinessListingsSection } from '@/features/profile/components/BusinessListingsSection';
import { SavedCollectionsToolbar, useSavedCollections } from '@/features/profile/components/SavedCollectionsTab';
import { BusinessProfileSection } from '@/features/profile/components/BusinessProfileSection';
import { openReelsViewer } from '@/features/reels/services/reelsNavigation';
import { BoostCampaignDisplay } from '@/features/profile/components/BoostCampaignDisplay';
import { ProfileHeader } from '@/features/profile/components/ProfileHeader';
import { ProfileReelGrid } from '@/features/profile/components/ProfileReelGrid';
import { ProfileHeaderDetails } from '@/features/profile/components/ProfileHeaderDetails';
import { ProfileDrawerShell } from '@/features/profile/components/ProfileRightDrawer';
import { TrustStatsCard } from '@/features/profile/components/TrustStatsCard';
import { SoundProfileStats } from '@/features/sounds/components/SoundProfileStats';
import { ProfileVerifyAccountNudge } from '@/features/profile/components/ProfileVerifyAccountNudge';
import { hasPremiumEntitlement } from '@/features/profile/services/premiumAccess';
import { ProfileShopSection } from '@/features/profile/components/ProfileShopSection';
import { ProfileVisitTopBar } from '@/features/profile/components/shared/ProfileVisitTopBar';
import { ProfilePostGrid } from '@/features/profile/components/ProfilePostGrid';
import {
  profileTabCounts,
  profileTabEmptyCopy,
  resolveActiveProfileTab,
  selectVisibleProfileTabs,
} from '@/features/profile/services/profileTabs';
import {
  buildOwnProfileSkeleton,
  isProfileSeedBundle,
  loadProfileEngagementStats,
  loadProfileScreenBundle,
  loadProfileTabContent,
  revalidateProfileBundleInBackground,
  revalidateProfileTabInBackground,
} from '@/features/profile/services/profileSessionLoad';
import {
  getCachedProfileBundle,
  getCachedTabPosts,
  getCachedTabReels,
  profileBundleFingerprint,
} from '@/features/profile/services/profileSessionCache';
import { fetchRelationship } from '@/features/profile/services/profileData';
import type { BusinessProfile } from '@/features/profile/services/businessProfile';
import type { ReelItem } from '@/features/reels/types';
import { isProfileBoosted } from '@/features/profile/services/profileBoost';
import { checkProfileAccess } from '@/features/profile/services/profileAccess';
import { recordProfileView } from '@/features/profile/services/profileViews';
import { DeletedAccountNotice } from '@/features/account-deletion';
import { isDeletedAccount } from '@/features/account-deletion/utils';
import { FollowButton } from '@/features/feed/components/FollowButton';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { PROFILE_FEATURE } from '@/features/profile/featureFlags';
import { FeedPostCard } from '@/features/feed/components/FeedPostCard';
import { blockUser, reportContent, unblockUser } from '@/features/feed/services/engagement';
import { alertBlockError } from '@/features/moderation/utils/blockErrors';
import { showProfileSafetyMenu } from '@/features/profile/utils/profileSafetyMenu';
import { getOrCreateDirectConversation } from '@/features/messaging/services/conversationData';
import { openChat } from '@/features/messaging/services/messagingNavigation';
import { REPORT_REASONS, REPORT_RESPONSE_NOTE } from '@/features/moderation/constants';
import { AdminUserQuickSheet } from '@/features/admin/components/shared/AdminUserQuickSheet';
import { canAdmin } from '@/constants/roles';
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
import { getFloatingTabBarReserve } from '@/constants/tabBar';
import { PROFILE_GRID_MAX_WIDTH } from '@/features/profile/services/profileGridMetrics';
import { spacing } from '@/constants/theme';
import { useStableTabBarInset } from '@/hooks/useStableTabBarInset';
import { useAuth } from '@/providers/AuthProvider';
import { useAccountSwitch } from '@/features/account-switch/providers/AccountSwitchProvider';
import { resolveActingProfile } from '@/features/account-switch/services/resolveActingProfile';
import { useTheme } from '@/providers/ThemeProvider';
import { ProviderProfileSection } from '@/features/vora-hizmetler/components/ProviderProfileSection';
import { ProviderWorksOnProfileSection } from '@/features/vora-hizmetler/components/ProviderWorksOnProfileSection';

type ProfileScreenProps = {
  userId: string;
  isOwnProfile?: boolean;
  /** Tab bar altında gösterildiğinde gönderi grid'inin kesilmemesi için ek alt boşluk. */
  reserveTabBarInset?: boolean;
};

/**
 * Etkileşim toplamları (görüntülenme/beğeni/yorum/alıntı) çekirdek bundle'da 0 gelir
 * ve sonradan ayrı yüklenir. Yeni bundle bu alanları 0 verdiğinde, ekranda zaten
 * bilinen değer varsa onu koru — sayaç anlık olarak sıfıra düşmesin.
 */
function preserveEngagementTotals(
  prev: ProfileStats | null,
  next: ProfileStats,
): ProfileStats {
  if (!prev) return next;
  const nextHasEngagement =
    next.totalViews > 0 ||
    next.totalLikes > 0 ||
    next.totalComments > 0 ||
    next.totalQuotes > 0;
  if (nextHasEngagement) return next;
  const prevHasEngagement =
    prev.totalViews > 0 ||
    prev.totalLikes > 0 ||
    prev.totalComments > 0 ||
    prev.totalQuotes > 0;
  if (!prevHasEngagement) return next;
  return {
    ...next,
    totalViews: prev.totalViews,
    totalLikes: prev.totalLikes,
    totalComments: prev.totalComments,
    totalQuotes: prev.totalQuotes,
  };
}

function readWarmProfileEntry(userId: string, viewerId: string | null) {
  const cached = getCachedProfileBundle(userId, viewerId);
  if (!cached?.profile || !cached.stats || !cached.relationship) return null;
  return {
    bundle: cached,
    tabItems: getCachedTabPosts(userId, 'posts', viewerId) ?? [],
  };
}

export function ProfileScreen({
  userId,
  isOwnProfile = false,
  reserveTabBarInset = false,
}: ProfileScreenProps) {
  const isFocused = useIsFocused();
  const isScreenActive = useMainTabPrefetchActive('profile');
  const { user, profile: authProfile, isGuest, isLoading: authLoading } = useAuth();
  const { actingAs, refreshSwitchState } = useAccountSwitch();
  const { colors } = useTheme();
  const showFollow = useFeatureVisible(PROFILE_FEATURE.follow);
  const showMessage = useFeatureVisible(PROFILE_FEATURE.message);
  const tabBarBottomInset = useStableTabBarInset();
  const scrollBottomInset = reserveTabBarInset
    ? getFloatingTabBarReserve(tabBarBottomInset) + spacing.md
    : spacing.xxl;
  const viewerId = user?.id ?? null;
  const cacheViewerId = isOwnProfile ? userId : viewerId;
  const warmEntry = readWarmProfileEntry(userId, cacheViewerId);

  const [profile, setProfile] = useState<PublicProfile | null>(() => warmEntry?.bundle.profile ?? null);
  const [stats, setStats] = useState<ProfileStats | null>(() => warmEntry?.bundle.stats ?? null);
  const [badges, setBadges] = useState<UserBadge[]>(() => warmEntry?.bundle.badges ?? []);
  const [achievements, setAchievements] = useState<UserAchievement[]>(
    () => warmEntry?.bundle.achievements ?? [],
  );
  const [isFollowing, setIsFollowing] = useState(
    () => warmEntry?.bundle?.relationship?.isFollowing ?? false,
  );
  const [tab, setTab] = useState<ProfileTab>('posts');
  const [tabError, setTabError] = useState(false);
  const [tabReloadKey, setTabReloadKey] = useState(0);
  const [tabItems, setTabItems] = useState<FeedItem[]>(() => warmEntry?.tabItems ?? []);
  const [reelItems, setReelItems] = useState<ReelItem[]>([]);
  const [business, setBusiness] = useState<BusinessProfile | null>(() => warmEntry?.bundle.business ?? null);
  const [profileLinks, setProfileLinks] = useState<ProfileLink[]>(() => warmEntry?.bundle.links ?? []);
  const [relationship, setRelationship] = useState<ProfileRelationship | null>(
    () => warmEntry?.bundle.relationship ?? null,
  );
  const [reelViewerIndex, setReelViewerIndex] = useState<number | null>(null);
  const [adminSheetOpen, setAdminSheetOpen] = useState(false);
  const [soundStatsOpen, setSoundStatsOpen] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [loading, setLoading] = useState(
    () => !(warmEntry?.bundle?.profile && warmEntry?.bundle?.stats),
  );
  // Ziyarette boş "içerik yok" flash'ı olmasın — cache yoksa yükleniyor göster.
  const [tabLoading, setTabLoading] = useState(() => !(warmEntry?.tabItems?.length));
  const savedCollections = useSavedCollections(userId, { enabled: isOwnProfile });
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const forceTabLoadRef = useRef(false);
  const profileUserRef = useRef(userId);
  const authProfileRef = useRef(authProfile);
  authProfileRef.current = authProfile;
  const bundleFingerprintRef = useRef<string | null>(
    warmEntry ? profileBundleFingerprint(warmEntry.bundle) : null,
  );

  const applyProfileBundle = useCallback(
    (bundle: NonNullable<Awaited<ReturnType<typeof loadProfileScreenBundle>>>) => {
      const nextFingerprint = profileBundleFingerprint(bundle);
      if (bundleFingerprintRef.current === nextFingerprint) return;
      bundleFingerprintRef.current = nextFingerprint;
      setProfile(bundle.profile);
      setStats((prev) => preserveEngagementTotals(prev, bundle.stats));
      setBadges(bundle.badges);
      setAchievements(bundle.achievements);
      setIsFollowing(bundle.relationship.isFollowing);
      setRelationship(bundle.relationship);
      setBusiness(bundle.business);
      setProfileLinks(bundle.links ?? []);
    },
    [],
  );

  const loadProfile = useCallback(
    async (force = false) => {
      const currentViewerId = user?.id ?? null;
      const currentAuthProfile = authProfileRef.current;
      const loadOptions = {
        force,
        isOwnProfile,
        authUserId: user?.id ?? null,
        authProfile: currentAuthProfile,
      };

      let showedInstantData = false;

      const applyPosts = (posts: { kind: 'posts' | 'reels'; items: FeedItem[] | ReelItem[] }) => {
        if (posts.kind !== 'posts' || tabRef.current !== 'posts') return;
        setTabItems(posts.items as FeedItem[]);
        setTabError(false);
        setTabLoading(false);
      };

      if (!force) {
        const cached = getCachedProfileBundle(userId, currentViewerId);
        if (cached) {
          applyProfileBundle(cached);
          const cachedPosts = getCachedTabPosts(userId, 'posts', currentViewerId);
          if (cachedPosts) {
            setTabItems(cachedPosts);
            setTabLoading(false);
          } else {
            setTabLoading(true);
          }
          setLoading(false);
          showedInstantData = true;

          // Seed: gönderileri bundle'ı beklemeden hemen çek — grid boş kalmasın.
          if (isProfileSeedBundle(userId, currentViewerId)) {
            void loadProfileTabContent(userId, 'posts', currentViewerId, loadOptions).then(applyPosts);
            void loadProfileScreenBundle(userId, currentViewerId, loadOptions).then((bundle) => {
              if (bundle) applyProfileBundle(bundle);
            });
            if (!isOwnProfile && user) void recordProfileView(userId);
            void loadProfileEngagementStats(userId, currentViewerId).then((nextStats) => {
              if (nextStats) setStats(nextStats);
            });
            return;
          }

          void revalidateProfileBundleInBackground(userId, currentViewerId, loadOptions, applyProfileBundle);
          if (tabRef.current === 'posts') {
            if (cachedPosts) {
              void revalidateProfileTabInBackground(userId, 'posts', currentViewerId, (items, kind) => {
                if (kind === 'posts') setTabItems(items as FeedItem[]);
              });
            } else {
              void loadProfileTabContent(userId, 'posts', currentViewerId, loadOptions).then(applyPosts);
            }
          }
          return;
        }

        if (isOwnProfile && currentAuthProfile?.id === userId) {
          applyProfileBundle(buildOwnProfileSkeleton(currentAuthProfile));
          setLoading(false);
          showedInstantData = true;
        }
      }

      if (!showedInstantData) setLoading(true);
      if (!getCachedTabPosts(userId, 'posts', currentViewerId)) {
        setTabLoading(true);
      }

      // Gönderiler header'ı beklemesin — paralel ve bağımsız.
      void loadProfileTabContent(userId, 'posts', currentViewerId, loadOptions).then(applyPosts);

      try {
        const bundle = await loadProfileScreenBundle(userId, currentViewerId, loadOptions);

        if (!bundle) {
          return;
        }

        applyProfileBundle(bundle);
        setLoading(false);

        if (!isOwnProfile && user) {
          void recordProfileView(userId);
        }

        void loadProfileEngagementStats(userId, currentViewerId).then((nextStats) => {
          if (nextStats) setStats(nextStats);
        });
      } finally {
        setLoading(false);
      }
    },
    [userId, user?.id, isOwnProfile, applyProfileBundle, user],
  );

  const loadProfileRef = useRef(loadProfile);
  loadProfileRef.current = loadProfile;

  useEffect(() => {
    bundleFingerprintRef.current = null;
  }, [userId, viewerId, isOwnProfile]);

  useFocusEffect(
    useCallback(() => {
      if (isOwnProfile) {
        void refreshSwitchState();
      }
    }, [isOwnProfile, refreshSwitchState]),
  );

  useEffect(() => {
    if (!isScreenActive) return;
    const hasWarmData =
      Boolean(getCachedProfileBundle(userId, isOwnProfile ? userId : viewerId)) ||
      (isOwnProfile && authProfileRef.current?.id === userId);
    if (authLoading && !hasWarmData) return;
    void loadProfileRef.current(false);
  }, [authLoading, isScreenActive, userId, viewerId, isOwnProfile, authProfile?.id]);

  useEffect(() => {
    if (profileUserRef.current === userId) return;
    profileUserRef.current = userId;
    setTab('posts');
    setTabItems([]);
    setReelItems([]);
    setTabError(false);
    setTabLoading(true);
  }, [userId]);

  useEffect(() => {
    if (!profile?.id || authLoading || !isScreenActive) return;
    const likesHidden = tab === 'liked' && !isOwnProfile && !profile.showLikedPosts;
    const savesHidden = tab === 'saved' && !isOwnProfile;
    if (tab === 'badges' || likesHidden || savesHidden || (tab === 'saved' && isOwnProfile)) return;

    const viewerId = user?.id ?? null;
    const force = forceTabLoadRef.current;
    forceTabLoadRef.current = false;
    let cancelled = false;

    void (async () => {
      try {
        if (!force && tab === 'reels') {
          const cachedReels = getCachedTabReels(userId, viewerId);
          if (cachedReels) {
            setReelItems(cachedReels);
            setTabError(false);
            setTabLoading(false);
            void revalidateProfileTabInBackground(userId, tab, viewerId, (items, kind) => {
              if (!cancelled && kind === 'reels' && tabRef.current === 'reels') setReelItems(items as ReelItem[]);
            }).catch(() => undefined);
            return;
          }
        } else if (!force) {
          const cachedPosts = getCachedTabPosts(userId, tab, viewerId);
          if (cachedPosts) {
            setTabItems(cachedPosts);
            setTabError(false);
            setTabLoading(false);
            void revalidateProfileTabInBackground(userId, tab, viewerId, (items, kind) => {
              if (!cancelled && kind === 'posts' && tabRef.current === tab) setTabItems(items as FeedItem[]);
            }).catch(() => undefined);
            return;
          }
        }

        setTabError(false);
        setTabLoading(true);
        if (tab === 'reels') setReelItems([]);
        else setTabItems([]);

        const result = await loadProfileTabContent(userId, tab, viewerId, { force });
        if (cancelled || tabRef.current !== tab) return;

        if (result.kind === 'reels') setReelItems(result.items);
        else setTabItems(result.items);
        setTabLoading(false);
      } catch {
        if (cancelled || tabRef.current !== tab) return;
        setTabLoading(false);
        setTabError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tab, tabReloadKey, userId, user?.id, profile?.id, profile?.showLikedPosts, isOwnProfile, authLoading, isScreenActive]);

  const visibleTabs = selectVisibleProfileTabs({
    isOwnProfile,
    showLikedPosts: Boolean(profile?.showLikedPosts),
  });
  const activeTab = resolveActiveProfileTab(tab, visibleTabs);

  useEffect(() => {
    if (activeTab === tab) return;
    setTabItems([]);
    setReelItems([]);
    setTabError(false);
    setTabLoading(true);
    setTab(activeTab);
  }, [activeTab, tab]);

  const retryActiveTab = () => {
    forceTabLoadRef.current = true;
    setTabError(false);
    setTabLoading(true);
    setTabReloadKey((key) => key + 1);
  };

  const handleReport = () => {
    if (!user || !profile) return;
    Alert.alert('Profili Şikayet Et', 'Şikayet nedenini seçin', [
      ...REPORT_REASONS.map((r) => ({
        text: r.label,
        onPress: async () => {
          const { error } = await reportContent(user.id, 'profile', profile.id, r.id as never);
          if (!error) Alert.alert('Teşekkürler', `Şikayetiniz alındı. ${REPORT_RESPONSE_NOTE}`);
        },
      })),
      { text: 'İptal', style: 'cancel' },
    ]);
  };

  const handleBlock = async () => {
    if (!user || !profile) return;
    Alert.alert('Engelle', `@${profile.username} kullanıcısını engellemek istediğinize emin misiniz?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Engelle',
        style: 'destructive',
        onPress: async () => {
          await blockUser(user.id, profile.id);
          router.back();
        },
      },
    ]);
  };

  const handleUnblock = async () => {
    if (!user || !profile) return;
    Alert.alert('Engeli Kaldır', `@${profile.username} engeli kaldırılsın mı?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Engeli Kaldır',
        onPress: async () => {
          const { error } = await unblockUser(user.id, profile.id);
          if (error) Alert.alert('Hata', error);
          else void loadProfile(true);
        },
      },
    ]);
  };

  const handleRestrict = async () => {
    if (!user || !profile) return;
    Alert.alert('Kısıtla', `@${profile.username} kısıtlanacak. Paylaşımları akışınızda az görünür.`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Kısıtla',
        onPress: async () => {
          await blockUser(user.id, profile.id, true);
          Alert.alert('Kısıtlandı', 'Kullanıcı kısıtlandı.');
          void loadProfile(true);
        },
      },
    ]);
  };

  const openSafetyMenu = () => {
    if (!profile) return;
    const blockedByMe =
      relationship?.blockedByMe ??
      false;
    showProfileSafetyMenu({
      username: profile.username,
      blockedByMe,
      onRestrict: handleRestrict,
      onBlock: handleBlock,
      onUnblock: handleUnblock,
      onReport: handleReport,
    });
  };

  const updateTabItem = (id: string, patch: Partial<FeedItem>) => {
    setTabItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeTabItem = (id: string) => {
    setTabItems((prev) => prev.filter((item) => item.id !== id));
    if (stats) {
      setStats({ ...stats, postCount: Math.max(0, stats.postCount - 1) });
    }
  };

  const handleViewersPress = useCallback(() => {
    router.push('/settings/insights' as Href);
  }, []);

  const toggleSoundStats = useCallback(() => {
    setSoundStatsOpen((current) => !current);
  }, []);

  const renderOwnProfile = (node: ReactNode) =>
    isOwnProfile ? (
      <ProfileDrawerShell
        isPremium={Boolean(profile?.isPremium)}
        onInsightsPress={handleViewersPress}
        onSoundStatsPress={toggleSoundStats}
        soundStatsActive={soundStatsOpen}
      >
        {node}
      </ProfileDrawerShell>
    ) : (
      node
    );

  const handleMessage = async () => {
    if (!user || !profile || relationship?.isBlocked) return;
    setMessaging(true);
    const { conversationId, error } = await getOrCreateDirectConversation(profile.id);
    setMessaging(false);
    if (error) {
      Alert.alert('Mesaj gönderilemedi', alertBlockError(error));
      return;
    }
    if (conversationId) openChat(conversationId);
  };

  const handleFollowToggle = useCallback(
    async (next: boolean) => {
      setIsFollowing(next);
      if (!user) return;

      const rel = await fetchRelationship(user.id, userId);
      setRelationship(rel);
      if (rel.friendshipStatus === 'friends') {
        void loadProfile(true);
      }
    },
    [user, userId, loadProfile],
  );

  if (loading) {
    return renderOwnProfile(<DetailLoadingShell gradient showBack={!isOwnProfile} />);
  }

  if (!profile || !stats) {
    return renderOwnProfile(
      <GradientBackground>
        <View style={styles.centered}>
          <ProfileEmptyState
            title="Profil bulunamadı"
            message={isOwnProfile ? 'Profiliniz yüklenemedi. Tekrar deneyin.' : 'Bu kullanıcı profili mevcut değil.'}
            icon="person-outline"
          />
          {isOwnProfile ? (
            <Button title="Yeniden Dene" onPress={() => void loadProfile(true)} style={{ marginTop: spacing.md }} />
          ) : null}
        </View>
      </GradientBackground>,
    );
  }

  const relationshipState =
    relationship ??
    ({
      isFollowing: false,
      friendshipStatus: 'none',
      pendingRequestId: null,
      isBlocked: false,
      blockedByMe: false,
      blockedByThem: false,
      isRestricted: false,
      isMuted: false,
    } satisfies ProfileRelationship);

  const isDeletedProfile = isDeletedAccount(profile.accountStatus);
  const isAdminUser = authProfile?.role ? canAdmin(authProfile.role) : false;
  const showVerifyNudge =
    isOwnProfile &&
    !isDeletedProfile &&
    !isGuest &&
    actingAs === 'personal' &&
    profile.accountType === 'personal' &&
    !profile.isVerified;

  const displayProfile = isOwnProfile
    ? resolveActingProfile(profile, business, actingAs)
    : profile;

  const access = checkProfileAccess(displayProfile, user?.id ?? null, isGuest, relationshipState, isOwnProfile);
  const showRestrictedFollow =
    !isOwnProfile && profile.profileVisibility === 'friends' && showFollow;

  if (!access.allowed) {
    return renderOwnProfile(
      <GradientBackground>
        {!isOwnProfile ? (
          <View style={styles.restrictedTopBar}>
            <ProfileVisitTopBar onMenuPress={openSafetyMenu} />
          </View>
        ) : null}
        <View style={styles.centered}>
          <GlassCard style={styles.restrictedCard}>
            <View style={[styles.lockIcon, { backgroundColor: `${colors.textMuted}22` }]}>
              <Ionicons name="lock-closed" size={32} color={colors.textMuted} />
            </View>
            <Text variant="h3">Profil Gizli</Text>
            <Text secondary style={styles.restrictedText}>
              {access.reason}
            </Text>
            {showRestrictedFollow ? (
              <FollowButton
                authorId={profile.id}
                businessId={profile.businessId}
                username={profile.username}
                isFollowing={isFollowing}
                onToggle={handleFollowToggle}
              />
            ) : null}
          </GlassCard>
        </View>
      </GradientBackground>,
    );
  }

  const profileHeader = (
    <>
      {!isOwnProfile ? <ProfileVisitTopBar onMenuPress={openSafetyMenu} /> : null}

      {isOwnProfile && !isDeletedProfile ? <View style={styles.menuSpacer} /> : null}

      <ProfileHeader
        profile={displayProfile}
        stats={stats}
        badges={badges}
        links={profileLinks}
        isOwnProfile={isOwnProfile}
        deferDetails={isOwnProfile}
        onViewersPress={isOwnProfile ? handleViewersPress : undefined}
      />

      {isOwnProfile && !isDeletedProfile && soundStatsOpen ? (
        <SoundProfileStats userId={profile.id} />
      ) : null}

      {showVerifyNudge ? <ProfileVerifyAccountNudge /> : null}

      {isOwnProfile && !isDeletedProfile ? (
        <ProfileHeaderDetails profile={displayProfile} badges={badges} />
      ) : null}

      {!isDeletedProfile &&
      isProfileBoosted(displayProfile.profileBoostedUntil) &&
      displayProfile.profileBoostMessage ? (
        <BoostCampaignDisplay message={displayProfile.profileBoostMessage} />
      ) : null}

      {isDeletedProfile ? (
        <DeletedAccountNotice
          accountStatus={profile.accountStatus}
          deletedAt={profile.deletedAt}
          deletedBy={profile.deletedBy}
        />
      ) : null}

      {!isOwnProfile && !isDeletedProfile ? (
        <View style={styles.actions}>
          {showFollow ? (
            <FollowButton
              authorId={profile.id}
              businessId={profile.businessId}
              username={profile.username}
              isFollowing={isFollowing}
              onToggle={handleFollowToggle}
            />
          ) : null}
          {showMessage && !relationshipState.isBlocked ? (
            <ProfileActionChip
              label={messaging ? 'Açılıyor...' : 'Mesaj'}
              icon="chatbubble-outline"
              tone="primary"
              onPress={handleMessage}
            />
          ) : null}
          {isAdminUser ? (
            <ProfileActionChip
              label="Admin"
              icon="shield-checkmark-outline"
              tone="primary"
              onPress={() => setAdminSheetOpen(true)}
            />
          ) : null}
        </View>
      ) : null}

      {!isDeletedProfile && !isOwnProfile ? (
        <>
          <ProviderProfileSection userId={userId} />
          <ProfileShopSection
            profileUserId={userId}
            accountType={profile.accountType}
            isOwnProfile={false}
            actingAs={actingAs}
            variant="action"
          />
        </>
      ) : null}

      {!isDeletedProfile && isOwnProfile && actingAs === 'business' && !business ? (
        <Pressable onPress={() => router.push('/business-center/pending' as Href)}>
          <GlassCard style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Ionicons name="hourglass-outline" size={20} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text variant="label">Kurumsal onay bekleniyor</Text>
              <Text secondary variant="caption">
                Başvurunuz inceleniyor — durumu görüntüleyin
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </GlassCard>
        </Pressable>
      ) : null}

      {!isDeletedProfile && business && (!isOwnProfile || actingAs === 'business') ? (
        <>
          <BusinessProfileSection business={business} compact={displayProfile.isBusinessVerified} />
          <BusinessListingsSection businessId={business.id} organizerId={userId} />
          <BusinessCampaignsSection businessId={business.id} isOwnBusiness={isOwnProfile} />
        </>
      ) : null}

      {!isDeletedProfile && isOwnProfile ? (
        <ProfileShopSection
          profileUserId={userId}
          accountType={profile.accountType}
          isOwnProfile={isOwnProfile}
          actingAs={actingAs}
          variant="section"
        />
      ) : null}

      {!isDeletedProfile && !isOwnProfile ? <TrustStatsCard profile={profile} /> : null}

      {!isDeletedProfile ? (
        <ProfileTabBar
          tabs={visibleTabs}
          value={activeTab}
          onChange={setTab}
          counts={profileTabCounts({
            stats,
            isOwnProfile,
            showLikedPosts: profile.showLikedPosts,
            badgeCount: badges.length + achievements.length,
          })}
          trailing={
            isOwnProfile ? (
              <View style={styles.tabTrailing}>
                <ProfileInsightsPill onPress={handleViewersPress} />
                <ProfileViewsPill value={stats.totalViews} onPress={handleViewersPress} />
              </View>
            ) : (
              <ProfileViewsPill value={stats.totalViews} />
            )
          }
        />
      ) : null}

      {!isDeletedProfile && !isOwnProfile ? (
        <ProviderWorksOnProfileSection userId={userId} />
      ) : null}
    </>
  );

  if (isOwnProfile && !isDeletedProfile && activeTab === 'saved') {
    return renderOwnProfile(
      <GradientBackground>
        <FlatList
          style={styles.scroller}
          data={savedCollections.posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FeedPostCard item={item} onUpdate={(patch) => savedCollections.updatePost(item.id, patch)} />
          )}
          contentContainerStyle={[styles.page, { paddingBottom: scrollBottomInset, flexGrow: 0 }]}
          showsVerticalScrollIndicator={false}
          directionalLockEnabled
          initialNumToRender={5}
          windowSize={9}
          removeClippedSubviews
          ListHeaderComponent={
            <View style={styles.tabContent}>
              {profileHeader}
              {savedCollections.loading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <SavedCollectionsToolbar
                  collections={savedCollections.collections}
                  selectedId={savedCollections.selectedId}
                  onSelect={savedCollections.setSelectedId}
                  showInput={savedCollections.showInput}
                  onToggleInput={() => savedCollections.setShowInput((v) => !v)}
                  collectionName={savedCollections.collectionName}
                  onCollectionNameChange={savedCollections.setCollectionName}
                  onCreate={() => void savedCollections.handleCreate()}
                />
              )}
            </View>
          }
          ListEmptyComponent={
            savedCollections.postsLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
            ) : (
              <Text secondary style={styles.savedEmpty}>
                Bu koleksiyonda kayıtlı gönderi yok.
              </Text>
            )
          }
        />
      </GradientBackground>,
    );
  }

  return renderOwnProfile(
    <GradientBackground>
    <ScrollView
      style={styles.scroller}
      contentContainerStyle={[styles.page, { paddingBottom: scrollBottomInset, flexGrow: 0 }]}
      showsVerticalScrollIndicator={false}
      directionalLockEnabled
    >
      {profileHeader}

      {!isDeletedProfile ? (
      <View style={styles.tabContent}>
        {activeTab !== tab || tabLoading ? (
          <ProfileEmptyState loading />
        ) : tabError ? (
          <ProfileEmptyState
            title="İçerik yüklenemedi"
            message="Bağlantını kontrol edip tekrar dene."
            icon="cloud-offline-outline"
            onRetry={retryActiveTab}
          />
        ) : activeTab === 'badges' ? (
          <BadgeGrid badges={badges} achievements={achievements} />
        ) : activeTab === 'reels' ? (
          reelItems.length === 0 ? (
            <ProfileEmptyState {...profileTabEmptyCopy('reels', isOwnProfile)} />
          ) : (
            <ProfileReelGrid
              reels={reelItems}
              showStats={isOwnProfile && hasPremiumEntitlement(profile.isPremium)}
              onPressReel={(reel) => {
                const index = reelItems.findIndex((r) => r.id === reel.id);
                if (index >= 0) openReelsViewer(reelItems, index);
              }}
            />
          )
        ) : tabItems.length === 0 ? (
          <ProfileEmptyState {...profileTabEmptyCopy(activeTab, isOwnProfile)} />
        ) : (
          <ProfilePostGrid
            items={tabItems}
            onUpdate={updateTabItem}
            onDeleted={removeTabItem}
          />
        )}
      </View>
      ) : null}

      {isAdminUser && !isOwnProfile && profile ? (
        <AdminUserQuickSheet
          visible={adminSheetOpen}
          onClose={() => setAdminSheetOpen(false)}
          userId={profile.id}
          username={profile.username}
          onActionComplete={() => void loadProfile(true)}
        />
      ) : null}
    </ScrollView>
    </GradientBackground>,
  );
}

const styles = StyleSheet.create({
  scroller: { flex: 1 },
  page: {
    padding: spacing.lg,
    gap: spacing.md,
    width: '100%',
    maxWidth: PROFILE_GRID_MAX_WIDTH,
    alignSelf: 'center',
    flexGrow: 0,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  restrictedTopBar: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  menuSpacer: {
    height: 40,
    marginBottom: spacing.xs,
  },
  tabContent: { gap: spacing.md, minHeight: 120 },
  tabTrailing: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  savedEmpty: { textAlign: 'center', paddingVertical: spacing.lg },
  restrictedCard: { alignItems: 'center', gap: spacing.md, padding: spacing.xl, maxWidth: 320 },
  restrictedText: { textAlign: 'center' },
  lockIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
