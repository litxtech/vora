import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StoryInsights } from '@/features/stories/types';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type StoryInsightsSheetProps = {
  visible: boolean;
  insights: StoryInsights | null;
  onClose: () => void;
};

export function StoryInsightsSheet({ visible, insights, onClose }: StoryInsightsSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, spacing.md) },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />
          <Text variant="title" style={{ marginBottom: spacing.sm }}>
            Hikaye İstatistikleri
          </Text>

          {insights ? (
            <>
              <View style={styles.summaryRow}>
                <Stat label="Görüntülenme" value={String(insights.totalViews)} />
                <Stat label="Benzersiz izleyici" value={String(insights.uniqueViewers)} />
              </View>

              <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                {insights.items.map((item) => (
                  <View key={item.itemId} style={[styles.itemCard, { borderColor: colors.border }]}>
                    <View style={styles.itemHead}>
                      <Image source={{ uri: item.thumbUrl ?? undefined }} style={styles.thumb} contentFit="cover" />
                      <View style={{ flex: 1 }}>
                        <Text variant="label">
                          Slayt {item.sortOrder + 1} · {item.mediaType === 'video' ? 'Video' : 'Foto'}
                        </Text>
                        <Text variant="caption" style={{ color: colors.textMuted }}>
                          {item.itemViews} görüntülenme
                        </Text>
                      </View>
                    </View>

                    <View style={styles.metricsGrid}>
                      <MiniStat label="Ort. süre" value={`${item.avgWatchedSeconds.toFixed(1)} sn`} />
                      <MiniStat label="Tamamlama" value={`${Math.round(item.avgCompletion * 100)}%`} />
                      <MiniStat label="İleri tap" value={String(item.tapForwardCount)} />
                      <MiniStat label="Geri tap" value={String(item.tapBackCount)} />
                      <MiniStat label="İleri kaydır" value={String(item.swipeForwardCount)} />
                      <MiniStat label="Geri kaydır" value={String(item.swipeBackCount)} />
                      <MiniStat label="Otomatik geçiş" value={String(item.autoForwardCount)} />
                      <MiniStat label="Erken çıkış" value={String(item.exitedEarlyCount)} />
                    </View>
                  </View>
                ))}
              </ScrollView>
            </>
          ) : (
            <Text variant="body" style={{ color: colors.textMuted }}>
              İstatistik yüklenemedi.
            </Text>
          )}

          <Pressable style={[styles.closeBtn, { backgroundColor: colors.primary }]} onPress={onClose}>
            <Text variant="label" style={{ color: '#fff' }}>
              Kapat
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="title">{value}</Text>
      <Text variant="caption">{label}</Text>
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text variant="caption" style={{ fontWeight: '700' }}>
        {value}
      </Text>
      <Text variant="caption">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    maxHeight: '82%',
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.15)',
    marginBottom: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  stat: {
    flex: 1,
    gap: 2,
  },
  list: {
    maxHeight: 420,
  },
  itemCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  itemHead: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  thumb: {
    width: 48,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#111',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  miniStat: {
    width: '47%',
    gap: 2,
  },
  closeBtn: {
    marginTop: spacing.md,
    borderRadius: 999,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
});
