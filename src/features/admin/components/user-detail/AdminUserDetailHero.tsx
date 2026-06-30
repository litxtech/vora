import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import type { AdminUserPresence } from '@/features/admin/services/userManagement';
import {
  formatAdminDateTime,
  formatAdminLastEntry,
  formatAdminRegistrationDate,
  formatAdminRelativeAgo,
  isUserCurrentlyOnline,
} from '@/features/admin/utils/userPresence';
import { usePresenceClock } from '@/features/messaging/hooks/usePresenceClock';
import { PlatformCharmTick } from '@/features/platform-charm/components/PlatformCharmTick';
import { PioneerBadge } from '@/features/pioneer/components/PioneerBadge';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import { TRUST_SCORE_MAX } from '@/features/profile/constants';
import { ROLE_LABELS } from '@/constants/roles';
import type { GenderId } from '@/constants/registration';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import type { UserRole } from '@/types/database';

type AdminUserDetailHeroProps = {
  user: Record<string, unknown>;
  presence: AdminUserPresence | null;
  reportsAgainstCount: number;
  regionLabel: string;
  statusLabel: string;
  statusAccent: string;
  isDeleted: boolean;
  isPlatformCharm: boolean;
  isPioneer: boolean;
  showAdminActions: boolean;
  onViewProfile: () => void;
  onEditProfile?: () => void;
  onMessage: () => void;
  onLifecycle?: () => void;
};

function StatTile({
  icon,
  label,
  value,
  sub,
  accent,
  live,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  sub?: string | null;
  accent?: string;
  live?: boolean;
}) {
  const { colors } = useTheme();
  const tone = accent ?? colors.primary;

  return (
    <View style={[styles.statTile, { borderColor: `${tone}33`, backgroundColor: `${tone}0D` }]}>
      <View style={styles.statTileTop}>
        <Ionicons name={icon} size={14} color={tone} />
        <Text variant="caption" muted style={styles.statLabel}>
          {label}
        </Text>
        {live ? <View style={[styles.liveDot, { backgroundColor: colors.success }]} /> : null}
      </View>
      <Text variant="label" numberOfLines={2} style={{ color: tone }}>
        {value}
      </Text>
      {sub ? (
        <Text variant="caption" muted numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

export function AdminUserDetailHero({
  user,
  presence,
  reportsAgainstCount,
  regionLabel,
  statusLabel,
  statusAccent,
  isDeleted,
  isPlatformCharm,
  isPioneer,
  showAdminActions,
  onViewProfile,
  onEditProfile,
  onMessage,
  onLifecycle,
}: AdminUserDetailHeroProps) {
  const { colors } = useTheme();
  const presenceClock = usePresenceClock();
  void presenceClock;

  const lastSeenAt = (presence?.last_seen_at ?? user.last_seen_at) as string | null;
  const lastActiveAt = (presence?.last_active_at ?? user.last_active_at) as string | null;
  const isOnlineFlag = presence?.is_online ?? Boolean(user.is_online);
  const isOnline = isUserCurrentlyOnline(isOnlineFlag, lastActiveAt);
  const lastEntryLabel = formatAdminLastEntry(lastSeenAt, isOnlineFlag, lastActiveAt);
  const createdAt = String(user.created_at);
  const trustScore = Number(user.trust_score ?? 0);
  const reportSent = Number(user.report_count ?? 0);

  return (
    <GlassCard style={styles.card}>
      <View style={[styles.statusBanner, { backgroundColor: `${statusAccent}14`, borderColor: `${statusAccent}44` }]}>
        <Ionicons name="person-circle-outline" size={18} color={statusAccent} />
        <Text variant="label" style={{ color: statusAccent, flex: 1 }}>
          {statusLabel}
        </Text>
        {isOnline ? (
          <View style={[styles.onlinePill, { backgroundColor: `${colors.success}18`, borderColor: `${colors.success}44` }]}>
            <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
            <Text variant="caption" style={{ color: colors.success, fontWeight: '700' }}>
              Canlı
            </Text>
          </View>
        ) : null}
        <Text variant="caption" muted>
          {ROLE_LABELS[user.role as UserRole]}
        </Text>
      </View>

      <View style={styles.heroRow}>
        <View style={styles.avatarWrap}>
          <ProfileAvatar
            username={user.username as string}
            avatarUrl={(user.avatar_url as string | null) ?? null}
            size={80}
            isPremium={Boolean(user.is_premium)}
            isVerified={Boolean(user.is_verified)}
            isDeleted={isDeleted}
          />
          {isOnline ? (
            <View style={[styles.avatarDot, { backgroundColor: colors.success, borderColor: colors.surface }]} />
          ) : null}
        </View>
        <View style={styles.heroCopy}>
          <View style={styles.heroNameRow}>
            <Text variant="h3" numberOfLines={2} style={styles.heroName}>
              {(user.full_name as string) ?? `@${user.username as string}`}
            </Text>
            {!isDeleted && isPlatformCharm ? (
              <PlatformCharmTick gender={(user.gender as GenderId | null) ?? null} />
            ) : null}
            {!isDeleted && isPioneer ? <PioneerBadge /> : null}
          </View>
          <Text secondary variant="caption">
            @{user.username as string}
          </Text>
          {user.email ? (
            <Text secondary variant="caption" numberOfLines={1}>
              {String(user.email)}
            </Text>
          ) : null}
          {user.bio ? (
            <Text secondary variant="caption" numberOfLines={2} style={styles.bio}>
              {String(user.bio)}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatTile
          icon="calendar-outline"
          label="Kayıt"
          value={formatAdminRegistrationDate(createdAt)}
          sub={formatAdminRelativeAgo(createdAt) ?? formatAdminDateTime(createdAt)}
        />
        <StatTile
          icon="time-outline"
          label="Son giriş"
          value={lastEntryLabel}
          sub={lastActiveAt ? formatAdminDateTime(lastActiveAt) : lastSeenAt ? formatAdminDateTime(lastSeenAt) : 'Veri yok'}
          accent={isOnline ? colors.success : undefined}
          live={isOnline}
        />
        <StatTile icon="shield-checkmark-outline" label="Güven" value={`${trustScore}/${TRUST_SCORE_MAX}`} accent={colors.primary} />
        <StatTile icon="flag-outline" label="Şikayet" value={String(reportsAgainstCount)} accent={reportsAgainstCount > 0 ? colors.danger : colors.textMuted} />
      </View>

      <View style={styles.miniStats}>
        <MiniPill label="Premium" value={user.is_premium ? 'Evet' : 'Hayır'} />
        <MiniPill label="Doğrulama" value={user.is_verified ? 'Evet' : 'Hayır'} />
        <MiniPill label="Bölge" value={regionLabel} />
        <MiniPill
          label="Şikayet"
          value={`${reportSent} gönderdi · ${reportsAgainstCount} aldı`}
          danger={reportsAgainstCount > 0}
        />
      </View>

      <View style={styles.quickLinks}>
        <AdminActionChip compact label="Profili gör" icon="open-outline" tone="primary" onPress={onViewProfile} />
        {showAdminActions && onEditProfile ? (
          <AdminActionChip compact label="Düzenle" icon="create-outline" tone="primary" onPress={onEditProfile} />
        ) : null}
        <AdminActionChip compact label="Mesaj" icon="mail-outline" tone="primary" onPress={onMessage} />
        {showAdminActions && onLifecycle ? (
          <AdminActionChip compact label="Yaşam döngüsü" icon="sync-outline" tone="warning" onPress={onLifecycle} />
        ) : null}
      </View>
    </GlassCard>
  );
}

function MiniPill({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.miniPill, { borderColor: colors.border, backgroundColor: `${colors.surface}88` }]}>
      <Text variant="caption" muted style={{ fontSize: 10 }}>
        {label}
      </Text>
      <Text
        variant="caption"
        numberOfLines={1}
        style={{ fontWeight: '700', color: danger ? colors.danger : colors.text, fontSize: 11 }}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarWrap: {
    flexShrink: 0,
    position: 'relative',
  },
  avatarDot: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 14,
    height: 14,
    borderRadius: radius.full,
    borderWidth: 2,
  },
  heroCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 0,
  },
  heroName: {
    flexShrink: 1,
    minWidth: 0,
  },
  bio: {
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statTile: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: '45%',
    gap: 4,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  statTileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    flex: 1,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  miniStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  miniPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    gap: 1,
    maxWidth: '100%',
  },
  quickLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
});
