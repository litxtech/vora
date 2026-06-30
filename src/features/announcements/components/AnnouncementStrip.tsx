import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { AnnouncementCard } from '@/features/announcements/components/AnnouncementCard';
import { AnnouncementDetailSheet } from '@/features/announcements/components/AnnouncementDetailSheet';
import { fetchActiveAnnouncements } from '@/features/announcements/services/announcementsData';
import { ANNOUNCEMENT_STRIP_LIMIT } from '@/features/announcements/constants';
import type { Announcement } from '@/features/announcements/types';
import { useFeedStore } from '@/features/feed/store/feedStore';
import { useFeatureVisible } from '@/features/feature-flags/hooks/useFeatureVisible';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

export function AnnouncementStrip() {
  const visible = useFeatureVisible('announcements');
  const { colors } = useTheme();
  const regionId = useFeedStore((s) => s.regionId);
  const [items, setItems] = useState<Announcement[]>([]);
  const [selected, setSelected] = useState<Announcement | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const load = async () => {
      const data = await fetchActiveAnnouncements(regionId);
      if (!cancelled) setItems(data.slice(0, ANNOUNCEMENT_STRIP_LIMIT));
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [visible, regionId]);

  const renderItem = useCallback(
    ({ item }: { item: Announcement }) => (
      <AnnouncementCard announcement={item} onPress={setSelected} />
    ),
    [],
  );

  if (!visible || items.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Ionicons name="megaphone" size={15} color={colors.primary} />
        <Text variant="label" style={styles.headerText}>
          Duyurular
        </Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={Separator}
      />

      <AnnouncementDetailSheet announcement={selected} onClose={() => setSelected(null)} />
    </View>
  );
}

function Separator() {
  return <View style={{ width: spacing.sm }} />;
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerText: {
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  listContent: {
    paddingVertical: 2,
  },
});
