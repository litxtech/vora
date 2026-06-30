import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { AnnouncementViewersSheet } from '@/features/announcements/components/AnnouncementViewersSheet';
import { fetchMyAnnouncements } from '@/features/announcements/services/announcementsData';
import { deleteAnnouncement } from '@/features/announcements/services/manageAnnouncements';
import { ANNOUNCEMENTS_FEATURE } from '@/features/announcements/featureFlags';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import type { Announcement } from '@/features/announcements/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const MEDIA_ICON: Record<Announcement['mediaType'], keyof typeof Ionicons.glyphMap> = {
  none: 'document-text-outline',
  image: 'image-outline',
  video: 'videocam-outline',
};

export function AnnouncementsManageScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewersFor, setViewersFor] = useState<Announcement | null>(null);
  const showManageCreate = useFeatureVisible(ANNOUNCEMENTS_FEATURE.manageCreate);
  const showManageDelete = useFeatureVisible(ANNOUNCEMENTS_FEATURE.manageDelete);
  const showManageViewers = useFeatureVisible(ANNOUNCEMENTS_FEATURE.manageViewers);

  const load = useCallback(async () => {
    const data = await fetchMyAnnouncements();
    setItems(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

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
            else await load();
          },
        },
      ]);
    },
    [load],
  );

  return (
    <GradientBackground>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text variant="h3">Duyurularım</Text>
        {showManageCreate ? (
        <Pressable
          onPress={() => router.push('/announcements/create' as never)}
          hitSlop={10}
          style={styles.iconBtn}
        >
          <Ionicons name="add" size={26} color={colors.primary} />
        </Pressable>
        ) : (
        <View style={styles.iconBtn} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="megaphone-outline" size={44} color={colors.textMuted} />
            <Text variant="h3" style={{ marginTop: spacing.md }}>
              Henüz duyurun yok
            </Text>
            <Text secondary style={{ textAlign: 'center', marginTop: spacing.xs }}>
              Akışın üstünde görünecek ilk duyurunu oluştur.
            </Text>
            {showManageCreate ? (
            <Button
              title="Yeni duyuru"
              style={{ marginTop: spacing.lg }}
              onPress={() => router.push('/announcements/create' as never)}
            />
            ) : null}
          </View>
        ) : (
          items.map((item) => (
            <View
              key={item.id}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.cardTop}>
                {item.thumbnailUrl ?? item.mediaUrl ? (
                  <Image
                    source={{ uri: (item.thumbnailUrl ?? item.mediaUrl)! }}
                    style={styles.thumb}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={[styles.thumb, { backgroundColor: item.accent, alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name={MEDIA_ICON[item.mediaType]} size={20} color="#fff" />
                  </View>
                )}
                <View style={styles.cardInfo}>
                  <Text variant="label" numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text variant="caption" secondary numberOfLines={1}>
                    {item.isActive ? 'Aktif' : 'Pasif'} · {item.regionId ?? 'Tüm bölgeler'}
                  </Text>
                  <View style={styles.statRow}>
                    <Ionicons name="eye-outline" size={13} color={colors.textMuted} />
                    <Text variant="caption" secondary>
                      {item.viewCount}
                    </Text>
                    <Ionicons name="open-outline" size={13} color={colors.textMuted} style={{ marginLeft: spacing.sm }} />
                    <Text variant="caption" secondary>
                      {item.ctaClickCount}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.cardActions}>
                {showManageViewers ? (
                <Pressable style={styles.action} onPress={() => setViewersFor(item)}>
                  <Ionicons name="people-outline" size={16} color={colors.primary} />
                  <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
                    Okuyanlar
                  </Text>
                </Pressable>
                ) : null}
                {showManageCreate ? (
                <Pressable
                  style={styles.action}
                  onPress={() => router.push(`/announcements/create?id=${item.id}` as never)}
                >
                  <Ionicons name="create-outline" size={16} color={colors.text} />
                  <Text variant="caption" style={{ fontWeight: '600' }}>
                    Düzenle
                  </Text>
                </Pressable>
                ) : null}
                {showManageDelete ? (
                <Pressable style={styles.action} onPress={() => remove(item)}>
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  <Text variant="caption" style={{ color: colors.danger, fontWeight: '600' }}>
                    Sil
                  </Text>
                </Pressable>
                ) : null}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {showManageViewers ? (
      <AnnouncementViewersSheet
        announcementId={viewersFor?.id ?? null}
        title={viewersFor?.title}
        onClose={() => setViewersFor(null)}
      />
      ) : null}
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTop: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(127,127,127,0.2)',
    paddingTop: spacing.sm,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
