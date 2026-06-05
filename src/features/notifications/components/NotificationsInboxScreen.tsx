import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Text } from '@/components/ui/Text';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/features/notifications/services/notificationData';
import { NOTIFICATION_EVENT_TYPES } from '@/constants/notifications';
import type { AppNotification } from '@/lib/notifications/types';
import { formatFeedTime } from '@/features/feed/utils';
import { canAdmin } from '@/constants/roles';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useNotifications } from '@/providers/NotificationProvider';

const EVENT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  like: 'heart',
  comment: 'chatbubble',
  follow: 'person-add',
  message: 'mail',
  friend_request: 'people',
  emergency: 'warning',
};

export function NotificationsInboxScreen() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const { refreshUnread } = useNotifications();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const data = await fetchNotifications(user.id);
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const handleRead = async (item: AppNotification) => {
    if (!item.readAt) {
      await markNotificationRead(item.id);
      await refreshUnread();
      setItems((prev) =>
        prev.map((n) =>
          n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n,
        ),
      );
    }
  };

  const handleReadAll = async () => {
    if (!user) return;
    await markAllNotificationsRead(user.id);
    await refreshUnread();
    await load();
  };

  const label = (type: string) =>
    NOTIFICATION_EVENT_TYPES.find((e) => e.id === type)?.label ?? type;

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.page}>
        <AuthHeader title="Bildirimler" subtitle="Beğeni, yorum, mesaj ve daha fazlası" />

        <View style={styles.topActions}>
          <Button title="Tümünü okundu işaretle" variant="outline" onPress={handleReadAll} fullWidth={false} />
          {profile?.role && canAdmin(profile.role) ? (
            <Pressable
              style={[styles.adminBtn, { borderColor: colors.primary }]}
              onPress={() => router.push('/admin/notification-sounds' as never)}
            >
              <Ionicons name="musical-notes-outline" size={16} color={colors.primary} />
              <Text variant="caption" style={{ color: colors.primary }}>
                Ses ayarları
              </Text>
            </Pressable>
          ) : null}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : items.length === 0 ? (
          <GlassCard>
            <Text secondary>Henüz bildirim yok.</Text>
          </GlassCard>
        ) : (
          items.map((item) => (
            <Pressable key={item.id} onPress={() => handleRead(item)}>
              <GlassCard
                style={[
                  styles.item,
                  !item.readAt && { borderColor: colors.primary, borderWidth: 1 },
                ]}
              >
                <View style={styles.itemRow}>
                  <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}18` }]}>
                    <Ionicons
                      name={EVENT_ICONS[item.eventType] ?? 'notifications'}
                      size={18}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.itemBody}>
                    <Text variant="caption" style={{ color: colors.primary }}>
                      {label(item.eventType)}
                    </Text>
                    <Text variant="label">{item.title}</Text>
                    <Text secondary variant="caption">
                      {item.body}
                    </Text>
                    <Text secondary variant="caption">
                      {formatFeedTime(item.createdAt)}
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </Pressable>
          ))
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  topActions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', flexWrap: 'wrap' },
  adminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  item: { gap: spacing.sm },
  itemRow: { flexDirection: 'row', gap: spacing.md },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: { flex: 1, gap: 2 },
});
