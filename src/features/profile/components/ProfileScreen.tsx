import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, type Href, useIsFocused, useFocusEffect } from 'expo-router';
import { useMainTabPrefetchActive } from '@/features/navigation/hooks/useMainTabScreenActive';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
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
import { SoundProfileStats } from '@/features/sounds/components/SoundProfileStats';
import { ProfileHeaderDetails } from '@/features/profile/components/ProfileHeaderDetails';
import { ProfileOwnActionsBar } from '@/features/profile/components/ProfileOwnActionsBar';
import { ProfileVerifyAccountNudge } from '@/features/profile/components/ProfileVerifyAccountNudge';
import { hasPremiumEntitlement } from '@/features/profile/services/premiumAccess';
import { ProfileShopSection } from '@/features/profile/components/ProfileShopSection';
import { ProfileVisitTopBar } from '@/features/profile/components/shared/ProfileVisitTopBar';
import { ProfilePostGrid } from '@/features/profile/components/ProfilePostGrid';
import { PROFILE_TABS } from '@/features/profile/constants';
import {
  buildOwnProfileSkeleton,
  loadProfileEngagementStats,
  loadProfileInitialVisit,
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
import { radius, spacing } from '@/constants/theme';
import { useStableTabBarInset } from '@/hooks/useStableTabBarInset';
import { useAuth } from '@/providers/AuthProvider';
import { AccountSwitchBar } from '@/features/account-switch/components/AccountSwitchBar';
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
  const { actingAs, refreshSwitchState, linkedSibling, outgoingPendingUsername } = useAccountSwitch();
  const { colors } = useTheme();
  const showFollow = useFeatureVisible(PROFILE_FEATURE.follow);
  const showMessage = useFeatureVisible(PROFILE_FEATURE.message);
  const showSettingsGear = useFeatureVisible(PROFILE_FEATURE.settingsGear);
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
  const [tabItems, setTabItems] = useState<FeedItem[]>(() => warmEntry?.tabItems ?? []);
  const [reelItems, setReelItems] = useState<ReelItem[]>([]);
  const [business, setBusiness] = useState<BusinessProfile | null>(() => warmEntry?.bundle.business ?? null);
  const [profileLinks, setProfileLinks] = useState<ProfileLink[]>(() => warmEntry?.bundle.links ?? []);
  const [relationship, setRelationship] = useState<ProfileRelationship | null>(
    () => warmEntry?.bundle.relationship ?? null,
  );
  const [reelViewerIndex, setReelViewerIndex] = useState<number | null>(null);
  const [adminSheetOpen, setAdminSheetOpen] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [loading, setLoading] = useState(
    () => !(warmEntry?.bundle?.profile && warmEntry?.bundle?.stats),
  );
  const [tabLoading, setTabLoading] = useState(false);
  const savedCollections = useSavedCollections(userId, { enabled: isOwnProfile });
  const tabRef = useRef(tab);
  tabRef.current = tab;
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

      if (!force) {
        const cached = getCachedProfileBundle(userId, currentViewerId);
        if (cached) {
          applyProfileBundle(cached);
          const cachedPosts = getCachedTabPosts(userId, 'posts', currentViewerId);
          if (cachedPosts) setTabItems(cachedPosts);
          setLoading(false);
          showedInstantData = true;

          void revalidateProfileBundleInBackground(userId, currentViewerId, loadOptions, applyProfileBundle);
          if (tabRef.current === 'posts') {
            void revalidateProfileTabInBackground(userId, 'posts', currentViewerId, (items, kind) => {
              if (kind === 'posts') setTabItems(items as FeedItem[]);
            });
          }
          return;
        }

        if (isOwnProfile && currentAuthProfile?.id === userId) {
          applyProfileBundle(buildOwnProfileSkeleton(currentAuthProfile));
          setLoading(false);
          showedInstantData = true;
        }
      }

      if (force) {
        if (!showedInstantData) setLoading(true);
      } else if (!showedInstantData) {
        setLoading(true);
      }

      try {
        const visit = await loadProfileInitialVisit(userId, currentViewerId, loadOptions);

        if (!visit) {
          return;
        }

        applyProfileBundle(visit.bundle);
        setTabItems(visit.initialTab.items);

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
    [userId, user?.id, isOwnProfile, applyProfileBundle],
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
    if (!profile?.id || authLoading || !isScreenActive) return;
    if (tab === 'badges' || (tab === 'saved' && isOwnProfile)) return;

    const viewerId = user?.id ?? null;
    let cancelled = false;

    void (async () => {
      if (tab === 'reels') {
        const cachedReels = getCachedTabReels(userId, viewerId);
        if (cachedReels) {
          setReelItems(cachedReels);
          setTabLoading(false);
          void revalidateProfileTabInBackground(userId, tab, viewerId, (items, kind) => {
            if (!cancelled && kind === 'reels') setReelItems(items as ReelItem[]);
          });
          return;
        }
      } else {
        const cachedPosts = getCachedTabPosts(userId, tab, viewerId);
        if (cachedPosts) {
          setTabItems(cachedPosts);
          setTabLoading(false);
          void revalidateProfileTabInBackground(userId, tab, viewerId, (items, kind) => {
            if (!cancelled && kind === 'posts') setTabItems(items as FeedItem[]);
          });
          return;
        }
      }

      setTabLoading(true);

      const result = await loadProfileTabContent(userId, tab, viewerId);
      if (cancelled) return;

      if (result.kind === 'reels') setReelItems(result.items);
      else setTabItems(result.items);
      setTabLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [tab, userId, user?.id, profile?.id, isOwnProfile, authLoading, isScreenActive]);

  const visibleTabs = PROFILE_TABS.filter((t) => {
    if (t.privateOnly && !isOwnProfile) return false;
    if (t.id === 'liked' && !isOwnProfile && !profile?.showLikedPosts) return false;
    return true;
  });

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

  const handleViewersPress = () => {
    router.push('/settings/insights' as Href);
  };

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
    return (
      <GradientBackground>
        <View style={styles.centered}>
          <ProfileEmptyState loading />
        </View>
      </GradientBackground>
    );
  }

  if (!profile || !stats) {
    return (
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
      </GradientBackground>
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

  const showProfileAccountSwitch =
    isOwnProfile && !isDeletedProfile && Boolean(linkedSibling || outgoingPendingUsername);

  const displayProfile = isOwnProfile
    ? resolveActingProfile(profile, business, actingAs)
    : profile;

  const access = checkProfileAccess(displayProfile, user?.id ?? null, isGuest, relationshipState, isOwnProfile);

  if (!access.allowed) {
    return (
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
            {!isOwnProfile && profile.profileVisibility === 'friends' && showFollow ? (
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
      </GradientBackground>
    );
  }

  const profileHeader = (
    <>
      {!isOwnProfile ? <ProfileVisitTopBar onMenuPress={openSafetyMenu} /> : null}

      {isOwnProfile && !isDeletedProfile ? (
        <View style={styles.ownTopActions}>
          {showProfileAccountSwitch ? <AccountSwitchBar /> : null}
          {showSettingsGear ? (
            <Pressable
              onPress={() => router.push('/settings' as Href)}
              hitSlop={8}
              style={({ pressed }) => [
                styles.settingsButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons name="settings-outline" size={20} color={colors.text} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <ProfileHeader
        profile={displayProfile}
        stats={stats}
        badges={badges}
        links={profileLinks}
        isOwnProfile={isOwnProfile}
        deferDetails={isOwnProfile}
        onViewersPress={isOwnProfile ? handleViewersPress : undefined}
      />

      {isOwnProfile && !isDeletedProfile ? (
        <View style={styles.ownActions}>
          <ProfileOwnActionsBar
            isPremium={profile.isPremium}
            onInsightsPress={handleViewersPress}
          />
        </View>
      ) : null}

      {isOwnProfile && !isDeletedProfile ? (
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
          value={tab}
          onChange={setTab}
          counts={{
            posts: stats.postCount,
            reels: stats.reelCount,
            quotes: stats.totalQuotes,
          }}
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

  if (isOwnProfile && !isDeletedProfile && tab === 'saved') {
    return (
      <GradientBackground>
        <FlatList
          data={savedCollections.posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FeedPostCard item={item} onUpdate={(patch) => savedCollections.updatePost(item.id, patch)} />
          )}
          contentContainerStyle={[styles.page, { paddingBottom: scrollBottomInset }]}
          showsVerticalScrollIndicator={false}
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
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
    <ScrollView
      contentContainerStyle={[styles.page, { paddingBottom: scrollBottomInset }]}
      showsVerticalScrollIndicator={false}
    >
      {profileHeader}

      {!isDeletedProfile ? (
      <View style={styles.tabContent}>
        {tab === 'badges' ? (
          <BadgeGrid badges={badges} achievements={achievements} />
        ) : tab === 'reels' ? (
          tabLoading ? (
            <ProfileEmptyState loading />
          ) : reelItems.length === 0 ? (
            <ProfileEmptyState title="Reel yok" message="Henüz paylaşılmış reel bulunmuyor." icon="play-circle-outline" />
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
        ) : tabLoading ? (
          <ProfileEmptyState loading />
        ) : tabItems.length === 0 ? (
          <ProfileEmptyState
            title="İçerik yok"
            message="Bu sekmede henüz paylaşım bulunmuyor."
            icon="documents-outline"
          />
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
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, gap: spacing.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  restrictedTopBar: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  ownActions: { gap: spacing.sm },
  ownTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  settingsButton: {
    marginLeft: 'auto',
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
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
