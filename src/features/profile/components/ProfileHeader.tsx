import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { FullScreenMediaViewer } from '@/components/media/FullScreenMediaViewer';
import { Ionicons } from '@expo/vector-icons';
import { SafeLinearGradient } from '@/components/ui/SafeLinearGradient';
import { asGradientColors, themedAlphaHex } from '@/lib/ui/gradientColors';
import { shouldUsePlainScreenBackground } from '@/lib/device/androidPerfProfile';
import { Text } from '@/components/ui/Text';
import { isDeletedAccount } from '@/features/account-deletion/utils';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import { ProfileStatsRow } from '@/features/profile/components/ProfileStatsRow';
import { formatJoinDate } from '@/features/profile/constants';
import { ProfileHeaderDetails } from '@/features/profile/components/ProfileHeaderDetails';
import { ProfileLinksRow } from '@/features/profile/components/ProfileLinksRow';
import { BusinessVerifiedTick } from '@/features/profile/components/BusinessVerifiedTick';
import { BUSINESS_VERIFIED_COLOR } from '@/features/profile/services/businessIdentity';
import { PlatformSupporterPill } from '@/features/platform-support/components/PlatformSupporterPill';
import { PlatformSupporterTick } from '@/features/platform-support/components/PlatformSupporterTick';
import { PlatformCharmTick } from '@/features/platform-charm/components/PlatformCharmTick';
import { PioneerBadge } from '@/features/pioneer/components/PioneerBadge';
import { IzdivacBadgeChips, useIzdivacAppBadges } from '@/features/izdivac';
import { isBadgeHidden } from '@/features/profile/services/badgeVisibility';
import { isProfileBoosted } from '@/features/profile/services/profileBoost';
import { showPremiumBadge } from '@/features/profile/services/premiumAccess';
import type { ProfileStats, PublicProfile, UserBadge, ProfileLink } from '@/features/profile/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type ProfileHeaderProps = {
  profile: PublicProfile;
  stats: ProfileStats;
  badges: UserBadge[];
  links?: ProfileLink[];
  isOwnProfile?: boolean;
  /** Kendi profilinde meta/rozetler aksiyonların altına taşınır. */
  deferDetails?: boolean;
  onViewersPress?: () => void;
};

export function ProfileHeader({
  profile,
  stats,
  badges,
  links = [],
  isOwnProfile,
  deferDetails = false,
  onViewersPress,
}: ProfileHeaderProps) {
  const { colors } = useTheme();
  const [viewerUrls, setViewerUrls] = useState<string[]>([]);
  const platformSupporterBadge = badges.find((b) => b.badgeType === 'platform_supporter');
  const platformCharmBadge = badges.find((b) => b.badgeType === 'platform_charm');
  const pioneerBadge = badges.find((b) => b.badgeType === 'pioneer');
  const boosted = isProfileBoosted(profile.profileBoostedUntil);
  const deleted = isDeletedAccount(profile.accountStatus);
  const premiumBadge = showPremiumBadge(profile.isPremium);
  const hidden = profile.hiddenBadges;
  const izdivacBadges = useIzdivacAppBadges(deleted ? null : profile.id);
  const visibleIzdivacBadges = izdivacBadges.filter((b) => !isBadgeHidden(hidden, b));
  const location = [profile.district, profile.regionName].filter(Boolean).join(', ');

  const handleAvatarPress = () => {
    if (deleted) return;
    if (profile.avatarUrl) {
      setViewerUrls([profile.avatarUrl]);
      return;
    }
    if (isOwnProfile) {
      router.push('/profile/edit' as never);
    }
  };

  const avatarPressable = !deleted && (profile.avatarUrl || isOwnProfile);

  return (
    <View style={styles.container}>
      <View style={styles.coverWrap}>
        {profile.coverUrl ? (
          <>
            <Pressable onPress={() => setViewerUrls([profile.coverUrl!])}>
              <Image source={{ uri: profile.coverUrl }} style={styles.cover} contentFit="cover" cachePolicy="memory-disk" recyclingKey={profile.coverUrl} />
            </Pressable>
            {shouldUsePlainScreenBackground() ? (
              <View
                style={[styles.coverOverlay, { backgroundColor: themedAlphaHex(colors.background, 'D9') }]}
                pointerEvents="none"
              />
            ) : (
              <SafeLinearGradient
                colors={['transparent', themedAlphaHex(colors.background, 'D9')]}
                style={styles.coverOverlay}
                pointerEvents="none"
              />
            )}
          </>
        ) : shouldUsePlainScreenBackground() ? (
          <View style={[styles.cover, { backgroundColor: colors.surfaceElevated }]} />
        ) : (
          <SafeLinearGradient
            colors={asGradientColors(
              premiumBadge || profile.isBusinessVerified
                ? ['#1A1508', '#2A2010', colors.background]
                : [
                    themedAlphaHex(colors.primary, '44'),
                    colors.surfaceElevated,
                    colors.background,
                  ],
            )}
            style={styles.cover}
          />
        )}

        {premiumBadge ? (
          <View style={styles.premiumRibbon}>
            <Ionicons name="diamond" size={12} color="#FFB300" />
            <Text variant="caption" style={styles.premiumText}>
              Premium
            </Text>
          </View>
        ) : null}

        {boosted ? (
          <View style={[styles.boostRibbon, { backgroundColor: colors.primary }]}>
            <Ionicons name="trending-up" size={12} color="#fff" />
            <Text variant="caption" style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
              Öne Çıkan
            </Text>
          </View>
        ) : null}

        <View style={styles.avatarOverlay}>
          <ProfileAvatar
            username={profile.username}
            avatarUrl={profile.avatarUrl}
            size={96}
            isPremium={deleted ? false : premiumBadge}
            isVerified={deleted ? false : profile.isVerified}
            isBusinessVerified={deleted ? false : profile.isBusinessVerified}
            displayInitial={profile.displayName}
            isDeleted={deleted}
            onPress={avatarPressable ? handleAvatarPress : undefined}
          />
        </View>
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text variant="h2" numberOfLines={1} style={styles.name}>
            {deleted ? 'Kullanıcı artık yok' : profile.displayName}
          </Text>
          {!deleted && profile.isBusinessVerified && !isBadgeHidden(hidden, 'business') ? (
            <BusinessVerifiedTick size={20} />
          ) : null}
          {!deleted && !profile.isBusinessVerified && profile.isVerified && !isBadgeHidden(hidden, 'verified') ? (
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          ) : null}
          {!deleted && (profile.isPlatformCharm || platformCharmBadge) && !isBadgeHidden(hidden, 'platform_charm') ? (
            <PlatformCharmTick earnedAt={platformCharmBadge?.earnedAt} gender={profile.gender} />
          ) : null}
          {!deleted && (profile.isPioneer || pioneerBadge) && !isBadgeHidden(hidden, 'pioneer') ? (
            <PioneerBadge earnedAt={pioneerBadge?.earnedAt} />
          ) : null}
          {!deleted && (profile.isPlatformSupporter || platformSupporterBadge) && !isBadgeHidden(hidden, 'platform_supporter') ? (
            <PlatformSupporterTick size={18} since={platformSupporterBadge?.earnedAt} />
          ) : null}
          {!deleted && premiumBadge && !isBadgeHidden(hidden, 'premium') ? (
            <Ionicons name="diamond" size={18} color="#FFB300" />
          ) : null}
          {!deleted && visibleIzdivacBadges.length > 0 ? (
            <IzdivacBadgeChips badges={visibleIzdivacBadges} size="md" />
          ) : null}
        </View>
        {!deleted ? (
          <Text secondary variant="caption">
            @{profile.username}
            {profile.isBusinessVerified && profile.businessCategoryLabel
              ? ` · ${profile.businessCategoryLabel}`
              : ''}
          </Text>
        ) : null}

        {!deleted ? (
          <View style={styles.identityMeta}>
            {location ? (
              <View style={styles.identityMetaSegment}>
                <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
                <Text secondary variant="caption">
                  {location}
                </Text>
              </View>
            ) : null}
            {location ? (
              <Text secondary variant="caption" style={styles.identityMetaDot}>
                ·
              </Text>
            ) : null}
            <View style={styles.identityMetaSegment}>
              <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
              <Text secondary variant="caption">
                Katılım: {formatJoinDate(profile.createdAt)}
              </Text>
            </View>
          </View>
        ) : null}

        {!deleted && profile.isBusinessVerified ? (
          <View style={[styles.businessPill, { borderColor: `${BUSINESS_VERIFIED_COLOR}44` }]}>
            <Ionicons name="storefront-outline" size={12} color={BUSINESS_VERIFIED_COLOR} />
            <Text variant="caption" style={{ color: BUSINESS_VERIFIED_COLOR, fontWeight: '700' }}>
              Kurumsal hesap
            </Text>
          </View>
        ) : null}

        {!deleted && platformSupporterBadge && !isBadgeHidden(hidden, 'platform_supporter') ? (
          <PlatformSupporterPill since={platformSupporterBadge.earnedAt} />
        ) : null}

        {!deleted && profile.bio ? (
          <Text style={styles.bio} variant="body">
            {profile.bio}
          </Text>
        ) : null}

        {!deleted && links.length > 0 ? <ProfileLinksRow links={links} /> : null}

        <ProfileStatsRow userId={profile.id} stats={stats} />

        {!deferDetails ? <ProfileHeaderDetails profile={profile} badges={badges} /> : null}
      </View>

      <FullScreenMediaViewer
        urls={viewerUrls}
        visible={viewerUrls.length > 0}
        onClose={() => setViewerUrls([])}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  coverWrap: { position: 'relative', marginBottom: 48 },
  cover: { width: '100%', height: 160, borderRadius: radius.xl },
  coverOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.xl,
  },
  premiumRibbon: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,179,0,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,179,0,0.4)',
  },
  premiumText: { color: '#FFB300', fontSize: 10, fontWeight: '700' },
  boostRibbon: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  avatarOverlay: { position: 'absolute', bottom: -48, left: spacing.md },
  info: { paddingTop: spacing.xs, paddingHorizontal: spacing.xs, gap: spacing.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  identityMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    rowGap: 2,
  },
  identityMetaSegment: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  identityMetaDot: { paddingHorizontal: 6 },
  name: { letterSpacing: -0.5, flexShrink: 1 },
  businessPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    backgroundColor: 'rgba(255,179,0,0.1)',
  },
  bio: { lineHeight: 20, fontSize: 14 },
});
