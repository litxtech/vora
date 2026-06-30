import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { AdminActionChip } from '@/features/admin/components/shared/AdminActionChip';
import { AdminEmptyState } from '@/features/admin/components/shared/AdminEmptyState';
import { AdminShell } from '@/features/admin/components/shared/AdminShell';
import { AnnouncementViewersSheet } from '@/features/announcements/components/AnnouncementViewersSheet';
import { fetchAdminAnnouncements } from '@/features/announcements/services/announcementsData';
import { deleteAnnouncement } from '@/features/announcements/services/manageAnnouncements';
import type { Announcement } from '@/features/announcements/types';
import { spacing } from '@/constants/theme';

const MEDIA_LABEL: Record<Announcement['mediaType'], string> = {
  none: 'Metin',
  image: 'Resim',
  video: 'Video',
};

export function AdminAnnouncementsScreen() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewersFor, setViewersFor] = useState<Announcement | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setItems(await fetchAdminAnnouncements());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = useCallback(
    (item: Announcement) => {
      Alert.alert('Duyuruyu sil', item.title, [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteAnnouncement(item.id);
            if (error) Alert.alert('Hata', error);
            else await load(true);
          },
        },
      ]);
    },
    [load],
  );

  return (
    <AdminShell
      title="Duyuru Panosu"
      subtitle="Feed üstündeki duyuruları yönetin"
      requireAdmin
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <AdminActionChip
        label="Yeni duyuru"
        icon="add-outline"
        tone="success"
        onPress={() => router.push('/announcements/create' as never)}
      />

      {loading ? (
        <AdminEmptyState loading />
      ) : items.length === 0 ? (
        <AdminEmptyState
          title="Duyuru yok"
          message="Henüz duyuru oluşturulmamış."
          icon="megaphone-outline"
        />
      ) : (
        items.map((item) => (
          <GlassCard key={item.id} style={styles.card}>
            <View style={styles.titleRow}>
              <View style={[styles.dot, { backgroundColor: item.accent }]} />
              <Text variant="label" style={{ flex: 1 }} numberOfLines={1}>
                {item.title}
              </Text>
              {item.isPinned ? <Text variant="caption" muted>📌</Text> : null}
            </View>
            <Text variant="caption" muted>
              {item.authorName ?? 'Vora'} · {MEDIA_LABEL[item.mediaType]} ·{' '}
              {item.isActive ? 'Aktif' : 'Pasif'} · {item.regionId ?? 'Tüm bölgeler'}
            </Text>
            <Text variant="caption" muted>
              👁 {item.viewCount} görüntüleme · 🔗 {item.ctaClickCount} tıklama
            </Text>
            {item.body?.trim() ? (
              <Text variant="body" secondary numberOfLines={2}>
                {item.body.trim()}
              </Text>
            ) : null}
            <View style={styles.actions}>
              <AdminActionChip
                label={`Okuyanlar (${item.viewCount})`}
                icon="eye-outline"
                onPress={() => setViewersFor(item)}
              />
              <AdminActionChip
                label="Düzenle"
                icon="create-outline"
                onPress={() => router.push(`/announcements/create?id=${item.id}` as never)}
              />
              <AdminActionChip label="Sil" icon="trash-outline" tone="danger" onPress={() => remove(item)} />
            </View>
          </GlassCard>
        ))
      )}

      <AnnouncementViewersSheet
        announcementId={viewersFor?.id ?? null}
        title={viewersFor?.title}
        onClose={() => setViewersFor(null)}
      />
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs, marginBottom: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 10, height: 10, borderRadius: 5 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
});
