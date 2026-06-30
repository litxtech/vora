import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import { Text } from '@/components/ui/Text';
import { fetchAnnouncementViewers } from '@/features/announcements/services/announcementsData';
import type { AnnouncementViewer } from '@/features/announcements/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  announcementId: string | null;
  title?: string;
  onClose: () => void;
};

function formatViewedAt(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'az önce';
  if (min < 60) return `${min} dk önce`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün önce`;
  return new Date(iso).toLocaleDateString('tr-TR');
}

export function AnnouncementViewersSheet({ announcementId, title, onClose }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [viewers, setViewers] = useState<AnnouncementViewer[]>([]);

  useEffect(() => {
    if (!announcementId) return;
    let cancelled = false;
    setLoading(true);
    const load = async () => {
      const data = await fetchAnnouncementViewers(announcementId);
      if (!cancelled) {
        setViewers(data);
        setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [announcementId]);

  return (
    <Modal
      visible={Boolean(announcementId)}
      animationType="slide"
      transparent
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.background, paddingBottom: insets.bottom + spacing.md },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Ionicons name="eye-outline" size={18} color={colors.primary} />
            <Text variant="label" style={{ flex: 1 }} numberOfLines={1}>
              Okuyanlar{viewers.length ? ` · ${viewers.length}` : ''}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
          {title ? (
            <Text variant="caption" secondary numberOfLines={1} style={styles.subtitle}>
              {title}
            </Text>
          ) : null}

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.xl }} />
          ) : viewers.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="eye-off-outline" size={34} color={colors.textMuted} />
              <Text secondary style={{ marginTop: spacing.sm }}>
                Henüz kimse okumadı.
              </Text>
            </View>
          ) : (
            <FlatList
              data={viewers}
              keyExtractor={(item) => item.userId}
              style={styles.list}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  {item.avatarUrl ? (
                    <OptimizedImage uri={item.avatarUrl} style={styles.avatar} contentFit="cover" tier="thumb" />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.surfaceElevated }]}>
                      <Ionicons name="person" size={16} color={colors.textMuted} />
                    </View>
                  )}
                  <View style={styles.rowText}>
                    <Text numberOfLines={1} style={{ fontWeight: '600' }}>
                      {item.fullName?.trim() || item.username?.trim() || 'Kullanıcı'}
                    </Text>
                    {item.username ? (
                      <Text variant="caption" secondary numberOfLines={1}>
                        @{item.username}
                      </Text>
                    ) : null}
                  </View>
                  <Text variant="caption" secondary>
                    {formatViewedAt(item.viewedAt)}
                  </Text>
                </View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '80%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(127,127,127,0.4)',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  subtitle: {
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  list: {
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
});
