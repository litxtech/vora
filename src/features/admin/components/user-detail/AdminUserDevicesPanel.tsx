import { Alert, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminSectionHeader } from '@/features/admin/components/shared/AdminSectionHeader';
import { revokeUserSession, type UserSessionRow } from '@/features/admin/services/phase2Management';
import {
  deviceTypeIcon,
  formatAdminDateTime,
  formatAdminSessionActivity,
} from '@/features/admin/utils/userPresence';
import { usePresenceClock } from '@/features/messaging/hooks/usePresenceClock';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type AdminUserDevicesPanelProps = {
  sessions: UserSessionRow[];
  loading?: boolean;
  canRevoke?: boolean;
  onSessionsChange?: () => void;
  embedded?: boolean;
};

function deviceLabel(session: UserSessionRow): string {
  const name = session.device_name?.trim();
  const type = session.device_type?.trim();
  if (name && type) return `${name} · ${type.toUpperCase()}`;
  return name ?? type ?? 'Bilinmeyen cihaz';
}

function DeviceSessionCard({
  session,
  canRevoke,
  onRevoke,
}: {
  session: UserSessionRow;
  canRevoke?: boolean;
  onRevoke?: () => void;
}) {
  const { colors } = useTheme();
  const icon = deviceTypeIcon(session.device_type);
  const activeLabel = formatAdminSessionActivity(session.is_current, session.last_active_at);

  return (
    <View style={[styles.deviceCard, { borderColor: colors.border, backgroundColor: `${colors.surface}66` }]}>
      <View style={[styles.deviceIcon, { backgroundColor: `${colors.primary}14` }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.deviceCopy}>
        <View style={styles.deviceTop}>
          <Text variant="label" numberOfLines={1} style={styles.deviceName}>
            {deviceLabel(session)}
          </Text>
          {session.is_current ? (
            <View style={[styles.activeBadge, { backgroundColor: `${colors.success}18`, borderColor: `${colors.success}44` }]}>
              <View style={[styles.activeDot, { backgroundColor: colors.success }]} />
              <Text variant="caption" style={{ color: colors.success, fontWeight: '700', fontSize: 10 }}>
                Bu cihaz
              </Text>
            </View>
          ) : null}
        </View>
        <Text secondary variant="caption" numberOfLines={1}>
          {activeLabel}
        </Text>
        <Text secondary variant="caption" numberOfLines={1}>
          IP: {session.ip_address ?? '—'} · {formatAdminDateTime(session.last_active_at)}
        </Text>
      </View>
      {canRevoke ? (
        <AdminActionChip
          compact
          label="Kapat"
          icon="log-out-outline"
          tone="danger"
          onPress={onRevoke}
        />
      ) : null}
    </View>
  );
}

export function AdminUserDevicesPanel({
  sessions,
  loading = false,
  canRevoke = false,
  onSessionsChange,
  embedded = false,
}: AdminUserDevicesPanelProps) {
  const { colors } = useTheme();
  const presenceClock = usePresenceClock();
  void presenceClock;

  const currentCount = sessions.filter((s) => s.is_current).length;
  const hint = loading
    ? 'Yükleniyor…'
    : `${sessions.length} kayıt${currentCount > 0 ? ` · ${currentCount} aktif` : ''} · 30 sn'de yenilenir`;

  const handleRevoke = (session: UserSessionRow) => {
    Alert.alert('Oturumu kapat', `${deviceLabel(session)} oturumu sonlandırılsın mı?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kapat',
        style: 'destructive',
        onPress: async () => {
          const { error } = await revokeUserSession(session.id);
          if (error) Alert.alert('Hata', error);
          else onSessionsChange?.();
        },
      },
    ]);
  };

  return (
    <>
      {embedded ? (
        <Text secondary variant="caption" style={styles.embeddedHint}>
          {hint}
        </Text>
      ) : (
        <AdminSectionHeader title="Cihazlar ve oturumlar" hint={hint} />
      )}
      {loading && sessions.length === 0 ? (
        <AdminEmptyState loading />
      ) : sessions.length === 0 ? (
        <GlassCard>
          <View style={styles.emptyWrap}>
            <Ionicons name="phone-portrait-outline" size={28} color={colors.textMuted} />
            <Text variant="label">Kayıtlı cihaz yok</Text>
            <Text secondary variant="caption">
              Kullanıcı henüz uygulamaya giriş yapmamış veya oturum kaydı oluşmamış.
            </Text>
          </View>
        </GlassCard>
      ) : (
        <GlassCard style={styles.panel}>
          {sessions.map((session) => (
            <DeviceSessionCard
              key={session.id}
              session={session}
              canRevoke={canRevoke}
              onRevoke={() => handleRevoke(session)}
            />
          ))}
        </GlassCard>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  embeddedHint: {
    marginBottom: spacing.xs,
  },
  panel: {
    gap: spacing.sm,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  deviceIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  deviceCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  deviceTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  deviceName: {
    flexShrink: 1,
    minWidth: 0,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    flexShrink: 0,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
  },
  emptyWrap: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
});
