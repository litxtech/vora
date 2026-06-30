import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { BADGE_CONFIG as ROLE_BADGE } from '@/features/feed/constants';
import { BADGE_CONFIG } from '@/features/profile/constants';
import { isBadgeHidden, roleBadgeKey } from '@/features/profile/services/badgeVisibility';
import type { BadgeType, PublicProfile, UserBadge } from '@/features/profile/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type ProfileHeaderDetailsProps = {
  profile: PublicProfile;
  badges: UserBadge[];
};

/** Profil meta rozet satırından gizlenen tipler (ayrı bileşenlerle / rol rozetiyle gösterilir). */
const EXCLUDED_PROFILE_BADGE_TYPES: BadgeType[] = [
  'platform_supporter',
  'platform_charm',
  'pioneer',
  'admin',
  'moderator',
  'reporter',
];

export function ProfileHeaderDetails({ profile, badges }: ProfileHeaderDetailsProps) {
  const { colors } = useTheme();
  const roleKey = roleBadgeKey(profile.role);
  const roleBadgeHidden = roleKey ? isBadgeHidden(profile.hiddenBadges, roleKey) : false;
  const roleBadge = roleBadgeHidden ? null : ROLE_BADGE[profile.role];
  // Rol rozetiyle aynı anlama gelen user_badges kayıtlarını dışla (çift tik engellenir).
  const profileBadges = badges.filter(
    (b) => !EXCLUDED_PROFILE_BADGE_TYPES.includes(b.badgeType),
  );

  if (!profile.occupation && !roleBadge && profileBadges.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {profile.occupation ? (
        <View style={styles.metaRow}>
          <Ionicons name="briefcase-outline" size={14} color={colors.textSecondary} />
          <Text secondary variant="caption">
            {profile.occupation}
          </Text>
        </View>
      ) : null}

      {roleBadge || profileBadges.length > 0 ? (
        <View style={styles.badgeRow}>
          {roleBadge ? (
            <View style={[styles.badge, { backgroundColor: `${roleBadge.color}22` }]}>
              <Ionicons name={roleBadge.icon as keyof typeof Ionicons.glyphMap} size={12} color={roleBadge.color} />
              <Text variant="caption" style={{ color: roleBadge.color, fontSize: 11, fontWeight: '600' }}>
                {roleBadge.label}
              </Text>
            </View>
          ) : null}
          {profileBadges.slice(0, 3).map((b) => {
            const cfg = BADGE_CONFIG[b.badgeType];
            if (!cfg) return null;
            return (
              <View key={b.badgeType} style={[styles.badge, { backgroundColor: `${cfg.color}22` }]}>
                <Ionicons name={cfg.icon as keyof typeof Ionicons.glyphMap} size={12} color={cfg.color} />
                <Text variant="caption" style={{ color: cfg.color, fontSize: 11, fontWeight: '600' }}>
                  {cfg.label}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
});
