import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { regionNameById } from '@/constants/regions';
import { ROLE_LABELS } from '@/constants/roles';
import type { AdminUserRow } from '@/features/admin/types';
import {
  formatAdminLastEntry,
  formatAdminRegistrationDate,
  isUserCurrentlyOnline,
} from '@/features/admin/utils/userPresence';
import { usePresenceClock } from '@/features/messaging/hooks/usePresenceClock';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

function accountStatusMeta(
  status: AdminUserRow['account_status'],
  colors: ReturnType<typeof useTheme>['colors'],
) {
  switch (status) {
    case 'quarantined':
      return { label: 'Acil kilit', color: colors.danger };
    case 'frozen':
      return { label: 'Askıda', color: colors.warning };
    case 'deletion_pending':
      return { label: 'Silme bekliyor', color: colors.warning };
    case 'deleted':
      return { label: 'Silinmiş', color: colors.textMuted };
    default:
      return { label: 'Aktif', color: colors.success };
  }
}

type AdminUserListRowProps = {
  user: AdminUserRow;
  onPress: () => void;
};

export function AdminUserListRow({ user, onPress }: AdminUserListRowProps) {
  const { colors } = useTheme();
  const presenceClock = usePresenceClock();
  const status = accountStatusMeta(user.account_status, colors);
  const regionLabel = regionNameById(user.region_id) ?? null;
  const isDeleted = user.account_status === 'deleted';
  void presenceClock;
  const isOnline = isUserCurrentlyOnline(user.is_online, user.last_active_at);
  const lastEntryLabel = formatAdminLastEntry(user.last_seen_at, user.is_online, user.last_active_at);

  return (
    <Pressable onPress={onPress}>
      <GlassCard style={styles.card}>
        <View style={styles.row}>
          <View style={styles.avatarWrap}>
            <ProfileAvatar
              username={user.username}
              avatarUrl={user.avatar_url}
              size={48}
              isPremium={user.is_premium}
              isVerified={Boolean(user.is_verified)}
              isDeleted={isDeleted}
            />
            {isOnline ? (
              <View style={[styles.onlineDot, { backgroundColor: colors.success, borderColor: colors.surface }]} />
            ) : null}
          </View>
          <View style={styles.copy}>
            <View style={styles.titleRow}>
              <Text variant="label" numberOfLines={1} style={styles.username}>
                @{user.username}
              </Text>
              {user.is_premium ? (
                <Ionicons name="diamond" size={14} color={colors.warning} />
              ) : null}
            </View>
            {user.full_name ? (
              <Text secondary variant="caption" numberOfLines={1}>
                {user.full_name}
              </Text>
            ) : null}
            <View style={styles.metaRow}>
              <View style={[styles.badge, { backgroundColor: `${colors.primary}14`, borderColor: `${colors.primary}33` }]}>
                <Text variant="caption" style={{ color: colors.primary, fontWeight: '600', fontSize: 11 }}>
                  {ROLE_LABELS[user.role]}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: `${status.color}14`, borderColor: `${status.color}33` }]}>
                <Text variant="caption" style={{ color: status.color, fontWeight: '600', fontSize: 11 }}>
                  {status.label}
                </Text>
              </View>
              {regionLabel ? (
                <Text secondary variant="caption" numberOfLines={1} style={styles.region}>
                  {regionLabel}
                </Text>
              ) : null}
            </View>
            <View style={styles.activityRow}>
              <Text secondary variant="caption" numberOfLines={1}>
                Kayıt: {formatAdminRegistrationDate(user.created_at)}
              </Text>
              <Text
                variant="caption"
                numberOfLines={1}
                style={isOnline ? { color: colors.success, fontWeight: '600' } : undefined}
                secondary={!isOnline}
              >
                {lastEntryLabel}
              </Text>
            </View>
          </View>
          <View style={styles.trailing}>
            <Text variant="caption" style={{ color: colors.textSecondary, fontWeight: '700' }}>
              {user.trust_score}
            </Text>
            <Text variant="caption" muted style={{ fontSize: 10 }}>
              güven
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={styles.chevron} />
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatarWrap: {
    flexShrink: 0,
    position: 'relative',
  },
  onlineDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: radius.full,
    borderWidth: 2,
  },
  activityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  username: {
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  badge: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  region: {
    flexShrink: 1,
  },
  trailing: {
    alignItems: 'flex-end',
    gap: 0,
  },
  chevron: {
    marginTop: spacing.xs,
  },
});
