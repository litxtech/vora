import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PlatformCharmTick } from '@/features/platform-charm/components/PlatformCharmTick';
import { PioneerBadge } from '@/features/pioneer/components/PioneerBadge';
import { PlatformSupporterTick } from '@/features/platform-support/components/PlatformSupporterTick';
import { IzdivacBadgeChips } from '@/features/izdivac/components/IzdivacBadgeChips';
import { fetchIzdivacAppBadges } from '@/features/izdivac/services/adminIzdivac';
import type { IzdivacSpecialBadgeType } from '@/features/izdivac/types';
import { Text } from '@/components/ui/Text';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import { BADGE_CONFIG as ROLE_BADGE } from '@/features/feed/constants';
import { BADGE_CONFIG, getTrustScoreColor, REPORTER_LEVELS } from '@/features/profile/constants';
import { navigateToAuthorProfile } from '@/features/feed/services/feedNavigation';
import { isBadgeHidden, roleBadgeKey } from '@/features/profile/services/badgeVisibility';
import type { FeedAuthor } from '@/features/feed/types';
import type { BadgeType } from '@/features/profile/types';
import { FollowButton } from '@/features/feed/components/FollowButton';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export type UserCardStats = {
  trustScore: number;
  reporterLevel: number;
  verifiedContentCount: number;
  eventsAttended: number;
  badges: BadgeType[];
};

type UserCardProps = {
  author: FeedAuthor;
  stats: UserCardStats;
  isFollowing: boolean;
  visible: boolean;
  onClose: () => void;
  onFollowToggle: (next: boolean) => void;
};

export function UserCard({
  author,
  stats,
  isFollowing,
  visible,
  onClose,
  onFollowToggle,
}: UserCardProps) {
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const maxCardHeight = screenHeight - insets.top - insets.bottom - spacing.lg * 2;
  const hidden = author.hiddenBadges;
  const roleBadge = ROLE_BADGE[author.role];
  const roleKey = roleBadgeKey(author.role);
  const showRoleBadge = Boolean(roleBadge) && !(roleKey ? isBadgeHidden(hidden, roleKey) : false);
  const showVerified = author.isVerified && !isBadgeHidden(hidden, 'verified');
  const showPlatformCharm = author.isPlatformCharm && !isBadgeHidden(hidden, 'platform_charm');
  const showPioneer = author.isPioneer && !isBadgeHidden(hidden, 'pioneer');
  const showPlatformSupporter =
    author.isPlatformSupporter && !isBadgeHidden(hidden, 'platform_supporter');
  const trustColor = getTrustScoreColor(stats.trustScore);
  const reporterLevel = REPORTER_LEVELS[stats.reporterLevel] ?? REPORTER_LEVELS[1];

  const [izdivacBadges, setIzdivacBadges] = useState<IzdivacSpecialBadgeType[]>([]);
  const visibleIzdivacBadges = izdivacBadges.filter((badge) => !isBadgeHidden(hidden, badge));
  useEffect(() => {
    if (!visible || !author.id) {
      setIzdivacBadges([]);
      return;
    }
    let active = true;
    void fetchIzdivacAppBadges(author.id).then((badges) => {
      if (active) setIzdivacBadges(badges);
    });
    return () => {
      active = false;
    };
  }, [visible, author.id]);

  const openProfile = () => {
    onClose();
    navigateToAuthorProfile(author);
  };

  const statItems = [
    { icon: 'shield-checkmark' as const, label: 'Güven', value: String(stats.trustScore), color: trustColor },
    { icon: 'checkmark-done' as const, label: 'Doğrulanan', value: String(stats.verifiedContentCount), color: colors.primary },
    { icon: 'calendar' as const, label: 'Etkinlik', value: String(stats.eventsAttended), color: colors.accent },
    { icon: 'mic' as const, label: 'Seviye', value: String(stats.reporterLevel), color: colors.warning },
  ];

  return (
    <Modal visible={visible} transparent animationType={resolveModalAnimationType('fade')} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, maxHeight: maxCardHeight }]}
          onPress={(e) => e.stopPropagation()}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.cardScroll}
          >
          <View style={styles.cardBody}>
          <Pressable onPress={openProfile} style={styles.profileLink}>
            <ProfileAvatar username={author.username} avatarUrl={author.avatarUrl} size={72} />
            <View style={styles.meta}>
              <View style={styles.nameRow}>
                <Text variant="h3" numberOfLines={1}>
                  {author.fullName ?? author.username}
                </Text>
                {showVerified ? <Ionicons name="checkmark-circle" size={16} color={colors.primary} /> : null}
                {showPlatformCharm ? <PlatformCharmTick gender={author.gender} /> : null}
                {showPioneer ? <PioneerBadge compact /> : null}
                {showPlatformSupporter ? <PlatformSupporterTick size={16} /> : null}
                {visibleIzdivacBadges.length > 0 ? <IzdivacBadgeChips badges={visibleIzdivacBadges} size="sm" /> : null}
              </View>
              <Text secondary variant="caption">@{author.username}</Text>
              {showRoleBadge ? (
                <View style={[styles.roleBadge, { backgroundColor: `${roleBadge.color}22` }]}>
                  <Ionicons name={roleBadge.icon as keyof typeof Ionicons.glyphMap} size={10} color={roleBadge.color} />
                  <Text variant="caption" style={{ color: roleBadge.color, fontSize: 10 }}>{roleBadge.label}</Text>
                </View>
              ) : null}
            </View>
          </Pressable>

          <View style={styles.statsGrid}>
            {statItems.map((item) => (
              <View key={item.label} style={[styles.statItem, { borderColor: colors.border }]}>
                <Ionicons name={item.icon} size={16} color={item.color} />
                <Text variant="label" style={{ color: item.color }}>{item.value}</Text>
                <Text secondary variant="caption" style={{ fontSize: 9 }}>{item.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.reporterRow}>
            <Ionicons name="mic" size={14} color={colors.accent} />
            <Text variant="caption">{reporterLevel.label}</Text>
          </View>

          {stats.badges.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badges}>
              {stats.badges.slice(0, 5).map((badge) => {
                const cfg = BADGE_CONFIG[badge];
                return (
                  <View key={badge} style={[styles.badgeChip, { backgroundColor: `${cfg.color}22` }]}>
                    <Ionicons name={cfg.icon as keyof typeof Ionicons.glyphMap} size={12} color={cfg.color} />
                    <Text variant="caption" style={{ color: cfg.color, fontSize: 10 }}>{cfg.label}</Text>
                  </View>
                );
              })}
            </ScrollView>
          ) : null}

          <FollowButton
            authorId={author.id}
            businessId={author.businessId}
            username={author.username}
            isFollowing={isFollowing}
            onToggle={onFollowToggle}
          />
          <Pressable onPress={openProfile} style={styles.viewProfile}>
            <Text variant="caption" style={{ color: colors.primary }}>Profili Görüntüle</Text>
          </Pressable>
          </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  cardScroll: {
    flexGrow: 1,
  },
  cardBody: {
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: 'center',
  },
  profileLink: { alignItems: 'center', gap: spacing.sm, width: '100%' },
  meta: { alignItems: 'center', gap: spacing.xs },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, width: '100%' },
  statItem: {
    flex: 1,
    minWidth: '22%',
    alignItems: 'center',
    gap: 2,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  reporterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  badges: { maxHeight: 32 },
  badgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginRight: spacing.xs,
  },
  viewProfile: { paddingVertical: spacing.xs },
});
