import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { fetchUserActivityTimeline, type UserActivityEvent } from '@/features/admin/services/emergencyModeration';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type AdminUserActivityTimelineProps = {
  userId: string;
};

const EVENT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  post_published: 'document-text-outline',
  reel_published: 'film-outline',
  content_removed: 'trash-outline',
  news_verification: 'shield-checkmark-outline',
  ban: 'ban-outline',
  warning: 'warning-outline',
  report_sent: 'flag-outline',
  quarantine: 'lock-closed-outline',
  remove: 'trash-outline',
  hide: 'eye-off-outline',
  warn: 'alert-circle-outline',
};

function formatTime(value: string) {
  return new Date(value).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AdminUserActivityTimeline({ userId }: AdminUserActivityTimelineProps) {
  const { colors } = useTheme();
  const [events, setEvents] = useState<UserActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchUserActivityTimeline(userId)
      .then(setEvents)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return <AdminEmptyState loading />;
  }

  if (events.length === 0) {
    return (
      <AdminEmptyState
        title="Aktivite yok"
        message="Bu kullanıcı için kayıtlı hareket bulunamadı."
        icon="time-outline"
      />
    );
  }

  return (
    <View style={styles.list}>
      {events.map((event, index) => {
        const icon = EVENT_ICONS[event.event_type] ?? 'ellipse-outline';
        return (
          <GlassCard key={`${event.event_type}-${event.created_at}-${index}`} style={styles.row}>
            <View style={styles.rowHeader}>
              <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}14` }]}>
                <Ionicons name={icon} size={16} color={colors.primary} />
              </View>
              <View style={styles.rowText}>
                <Text variant="label">{event.title}</Text>
                <Text variant="caption" secondary>
                  {formatTime(event.created_at)}
                </Text>
              </View>
            </View>
            {event.detail ? (
              <Text variant="caption" secondary numberOfLines={3}>
                {event.detail}
              </Text>
            ) : null}
          </GlassCard>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: { gap: spacing.xs },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
});
