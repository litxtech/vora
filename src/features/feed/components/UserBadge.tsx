import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { FeedAuthorAvatar } from '@/features/feed/components/FeedAuthorAvatar';
import { BADGE_CONFIG } from '@/features/feed/constants';
import { VoraAIBadge } from '@/features/vora-ai/components/VoraAIBadge';
import { VORA_AI_USERNAME } from '@/features/vora-ai/constants';
import { PlatformCharmTick } from '@/features/platform-charm/components/PlatformCharmTick';
import { PioneerBadge } from '@/features/pioneer/components/PioneerBadge';
import { PlatformSupporterTick } from '@/features/platform-support/components/PlatformSupporterTick';
import { IzdivacBadgeChips } from '@/features/izdivac/components/IzdivacBadgeChips';
import { BusinessVerifiedTick } from '@/features/profile/components/BusinessVerifiedTick';
import {
  authorPublicName,
} from '@/features/profile/services/businessIdentity';
import { isBadgeHidden, roleBadgeKey } from '@/features/profile/services/badgeVisibility';
import { navigateToAuthorProfile } from '@/features/feed/services/feedNavigation';
import type { FeedAuthor } from '@/features/feed/types';
import { useUserCardOptional } from '@/providers/UserCardProvider';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type UserBadgeProps = {
  author: FeedAuthor;
  showUsername?: boolean;
  timeLabel?: string;
  tappable?: boolean;
  isFollowing?: boolean;
  /** true ise önizleme kartı yerine doğrudan profil sayfasına gider */
  linkToProfile?: boolean;
  /** Gönderi kartları için daha kompakt başlık düzeni */
  variant?: 'default' | 'post';
  /** Avatar ayrı kolonda gösteriliyorsa gizle */
  hideAvatar?: boolean;
  /** Profil / kullanıcı kartına gitmeden önce (ör. yorum sheet kapatma) */
  onBeforeNavigate?: () => void;
};

export function UserBadge({
  author,
  showUsername = true,
  timeLabel,
  tappable = true,
  isFollowing = false,
  linkToProfile = false,
  variant = 'default',
  hideAvatar = false,
  onBeforeNavigate,
}: UserBadgeProps) {
  const { colors } = useTheme();
  const userCard = useUserCardOptional();
  const hidden = author.hiddenBadges;
  const roleBadge = BADGE_CONFIG[author.role];
  const roleKey = roleBadgeKey(author.role);
  const showRoleBadge = Boolean(roleBadge) && !(roleKey ? isBadgeHidden(hidden, roleKey) : false);
  const showAiBadge = author.isAiAccount || author.username === VORA_AI_USERNAME;
  const displayName = authorPublicName(author);
  const showPersonalVerified =
    author.isVerified && !author.isBusinessVerified && !isBadgeHidden(hidden, 'verified');
  const showBusinessVerified = author.isBusinessVerified && !isBadgeHidden(hidden, 'business');
  const showPlatformCharm = author.isPlatformCharm && !isBadgeHidden(hidden, 'platform_charm');
  const showPioneer = author.isPioneer && !isBadgeHidden(hidden, 'pioneer');
  const showPlatformSupporter =
    author.isPlatformSupporter && !isBadgeHidden(hidden, 'platform_supporter');
  const visibleIzdivacBadges = (author.izdivacBadges ?? []).filter(
    (badge) => !isBadgeHidden(hidden, badge),
  );

  const openProfile = () => {
    if (!tappable || author.id.startsWith('demo-')) return;
    onBeforeNavigate?.();
    if (!linkToProfile && userCard) {
      userCard.openUserCard(author, isFollowing);
      return;
    }
    navigateToAuthorProfile(author);
  };

  const avatar = <FeedAuthorAvatar author={author} size={AVATAR_SIZE} />;

  const isPostVariant = variant === 'post';

  const content = (
    <View style={[styles.row, isPostVariant && styles.postRow, hideAvatar && styles.rowNoAvatar]}>
      {hideAvatar ? null : avatar}
      <View style={styles.meta}>
        <View style={isPostVariant ? styles.postNameRow : styles.nameRow}>
          <Text
            variant="label"
            numberOfLines={1}
            style={[isPostVariant && styles.postName, isPostVariant && styles.postNameText]}
          >
            {showUsername ? displayName : `@${author.username}`}
          </Text>
          {showBusinessVerified ? (
            <BusinessVerifiedTick size={14} />
          ) : showPersonalVerified ? (
            <Ionicons name="checkmark-circle" size={14} color={colors.primary} style={styles.inlineIcon} />
          ) : null}
          {showPlatformCharm ? <PlatformCharmTick gender={author.gender} /> : null}
          {showPioneer ? <PioneerBadge compact /> : null}
          {showPlatformSupporter ? <PlatformSupporterTick /> : null}
          {visibleIzdivacBadges.length > 0 ? (
            <IzdivacBadgeChips badges={visibleIzdivacBadges} iconOnly />
          ) : null}
          {showAiBadge ? <VoraAIBadge compact /> : null}
          {showRoleBadge && !showAiBadge ? (
            <View style={[styles.badge, styles.badgeInline, { backgroundColor: `${roleBadge.color}22` }]}>
              <Ionicons
                name={roleBadge.icon as keyof typeof Ionicons.glyphMap}
                size={10}
                color={roleBadge.color}
              />
              <Text variant="caption" style={{ color: roleBadge.color, fontSize: 10, fontWeight: '600' }}>
                {roleBadge.label}
              </Text>
            </View>
          ) : null}
          {!isPostVariant && timeLabel ? (
            <Text secondary variant="caption">
              · {timeLabel}
            </Text>
          ) : null}
        </View>
        {showUsername ? (
          <Text secondary variant="caption" numberOfLines={1}>
            @{author.username}
            {isPostVariant && timeLabel ? ` · ${timeLabel}` : ''}
          </Text>
        ) : isPostVariant && timeLabel ? (
          <Text secondary variant="caption">
            {timeLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (!tappable || author.id.startsWith('demo-')) return content;

  return (
    <Pressable onPress={openProfile} style={styles.pressable}>
      {content}
    </Pressable>
  );
}

const AVATAR_SIZE = 40;

const styles = StyleSheet.create({
  pressable: { flex: 1, minWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, flex: 1, minWidth: 0 },
  rowNoAvatar: { gap: 0 },
  postRow: { alignItems: 'flex-start' },
  meta: { flex: 1, minWidth: 0, gap: 2, paddingTop: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  postNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'nowrap',
    minWidth: 0,
  },
  postName: { fontSize: 15, fontWeight: '700', lineHeight: 18 },
  postNameText: { flexShrink: 1, minWidth: 0 },
  inlineIcon: { flexShrink: 0 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgeInline: { flexShrink: 0, alignSelf: 'center' },
});
