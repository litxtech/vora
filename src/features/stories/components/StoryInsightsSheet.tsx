import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ListRenderItem,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import type { StoryInsights, StoryItemInsight } from '@/features/stories/types';
import { Text } from '@/components/ui/Text';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { spacing } from '@/constants/theme';

type StoryInsightsSheetProps = {
  visible: boolean;
  insights: StoryInsights | null;
  loading?: boolean;
  initialItemIndex?: number;
  onClose: () => void;
};

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const IG = {
  sheet: '#1C1C1E',
  sheetBorder: 'rgba(255,255,255,0.08)',
  text: '#FFFFFF',
  muted: 'rgba(255,255,255,0.55)',
  divider: 'rgba(255,255,255,0.1)',
  thumbBorder: '#FFFFFF',
  thumbInactive: 'rgba(255,255,255,0.35)',
  thumbSize: { w: 56, h: 78 },
} as const;

function formatCount(value: number): string {
  return new Intl.NumberFormat('tr-TR').format(Math.round(value));
}

function formatDuration(sec: number): string {
  if (sec < 1) return '<1 sn';
  if (sec < 60) return `${sec.toFixed(sec < 10 ? 1 : 0)} sn`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m} dk ${s} sn`;
}

export function StoryInsightsSheet({
  visible,
  insights,
  loading = false,
  initialItemIndex = 0,
  onClose,
}: StoryInsightsSheetProps) {
  const insets = useSafeAreaInsets();
  const thumbListRef = useRef<FlatList<StoryItemInsight>>(null);
  const [selectedIndex, setSelectedIndex] = useState(initialItemIndex);

  useEffect(() => {
    if (!visible) return;
    const safeIndex = Math.max(0, Math.min(initialItemIndex, (insights?.items.length ?? 1) - 1));
    setSelectedIndex(safeIndex);
    requestAnimationFrame(() => {
      thumbListRef.current?.scrollToIndex({ index: safeIndex, animated: false, viewPosition: 0.5 });
    });
  }, [visible, initialItemIndex, insights?.items.length]);

  const items = insights?.items ?? [];
  const selected = items[selectedIndex] ?? items[0] ?? null;

  const renderThumb: ListRenderItem<StoryItemInsight> = ({ item, index }) => {
    const active = index === selectedIndex;
    return (
      <Pressable
        onPress={() => setSelectedIndex(index)}
        style={[styles.thumbWrap, active && styles.thumbWrapActive]}
        accessibilityRole="button"
        accessibilityLabel={`Slayt ${index + 1}`}
      >
        <View style={[styles.thumbFrame, active ? styles.thumbFrameActive : styles.thumbFrameIdle]}>
          <OptimizedImage
            uri={item.thumbUrl}
            tier="thumb"
            style={styles.thumb}
            contentFit="cover"
            recyclingKey={item.itemId}
          />
          {item.mediaType === 'video' ? (
            <View style={styles.videoBadge}>
              <Ionicons name="play" size={10} color="#fff" />
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType={resolveModalAnimationType('slide')}
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Kapat" />

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerSide} />
            <Text variant="label" style={styles.headerTitle}>
              İstatistikler
            </Text>
            <Pressable onPress={onClose} hitSlop={12} style={styles.headerSide}>
              <Ionicons name="close" size={26} color={IG.text} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={IG.text} />
            </View>
          ) : insights && selected ? (
            <>
              <View style={styles.summaryRow}>
                <SummaryStat
                  icon="people-outline"
                  value={formatCount(insights.uniqueViewers)}
                  label="Ulaşılan hesaplar"
                />
                <View style={styles.summaryDivider} />
                <SummaryStat
                  icon="eye-outline"
                  value={formatCount(insights.totalViews)}
                  label="Görüntülenme"
                />
              </View>

              {items.length > 1 ? (
                <FlatList
                  ref={thumbListRef}
                  horizontal
                  data={items}
                  keyExtractor={(item) => item.itemId}
                  renderItem={renderThumb}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.thumbList}
                  onScrollToIndexFailed={(info) => {
                    thumbListRef.current?.scrollToOffset({
                      offset: info.averageItemLength * info.index,
                      animated: false,
                    });
                  }}
                />
              ) : null}

              <ScrollView style={styles.metricsScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.slideHeader}>
                  <Text variant="caption" style={styles.slideLabel}>
                    {items.length > 1 ? `Slayt ${selected.sortOrder + 1}` : 'Bu hikâye'}
                  </Text>
                  <Text variant="title" style={styles.slideViews}>
                    {formatCount(selected.itemViews)}
                  </Text>
                  <Text variant="caption" style={styles.slideViewsLabel}>
                    görüntülenme
                  </Text>
                </View>

                {selected.mediaType === 'video' ? (
                  <View style={styles.section}>
                    <SectionTitle title="İzlenme" />
                    <MetricRow
                      icon="time-outline"
                      label="Ortalama izlenme süresi"
                      value={formatDuration(selected.avgWatchedSeconds)}
                    />
                    <MetricRow
                      icon="pulse-outline"
                      label="Tamamlama oranı"
                      value={`${Math.round(selected.avgCompletion * 100)}%`}
                    />
                  </View>
                ) : null}

                <View style={styles.section}>
                  <SectionTitle title="Navigasyon" />
                  <MetricRow
                    icon="chevron-forward"
                    label="İleri dokunuşları"
                    value={formatCount(selected.tapForwardCount)}
                  />
                  <MetricRow
                    icon="chevron-back"
                    label="Geri dokunuşları"
                    value={formatCount(selected.tapBackCount)}
                  />
                  <MetricRow
                    icon="arrow-forward-outline"
                    label="Sonraki hikâye"
                    value={formatCount(selected.swipeForwardCount)}
                  />
                  <MetricRow
                    icon="arrow-back-outline"
                    label="Önceki hikâye"
                    value={formatCount(selected.swipeBackCount)}
                  />
                  <MetricRow
                    icon="play-skip-forward-outline"
                    label="Otomatik geçiş"
                    value={formatCount(selected.autoForwardCount)}
                  />
                  <MetricRow
                    icon="close-circle-outline"
                    label="Erken çıkış"
                    value={formatCount(selected.exitedEarlyCount)}
                    isLast
                  />
                </View>
              </ScrollView>
            </>
          ) : (
            <View style={styles.loadingBox}>
              <Ionicons name="analytics-outline" size={36} color={IG.muted} />
              <Text variant="body" style={styles.emptyText}>
                İstatistik bulunamadı
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function SummaryStat({
  icon,
  value,
  label,
}: {
  icon: IoniconName;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.summaryStat}>
      <Ionicons name={icon} size={22} color={IG.text} />
      <Text variant="title" style={styles.summaryValue}>
        {value}
      </Text>
      <Text variant="caption" style={styles.summaryLabel}>
        {label}
      </Text>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <Text variant="caption" style={styles.sectionTitle}>
      {title}
    </Text>
  );
}

function MetricRow({
  icon,
  label,
  value,
  isLast = false,
}: {
  icon: IoniconName;
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.metricRow, !isLast && styles.metricRowBorder]}>
      <View style={styles.metricLeft}>
        <Ionicons name={icon} size={20} color={IG.text} />
        <Text variant="body" style={styles.metricLabel}>
          {label}
        </Text>
      </View>
      <Text variant="label" style={styles.metricValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: IG.sheet,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: IG.sheetBorder,
    maxHeight: '88%',
    minHeight: 360,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.28)',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerSide: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: IG.text,
    fontWeight: '700',
    fontSize: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  summaryValue: {
    color: IG.text,
    fontSize: 22,
    fontWeight: '700',
  },
  summaryLabel: {
    color: IG.muted,
    textAlign: 'center',
    fontSize: 12,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: IG.divider,
  },
  thumbList: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  thumbWrap: {
    padding: 2,
  },
  thumbWrapActive: {
    transform: [{ scale: 1.02 }],
  },
  thumbFrame: {
    width: IG.thumbSize.w,
    height: IG.thumbSize.h,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  thumbFrameActive: {
    borderWidth: 2,
    borderColor: IG.thumbBorder,
  },
  thumbFrameIdle: {
    borderWidth: 1,
    borderColor: IG.thumbInactive,
    opacity: 0.72,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsScroll: {
    flexGrow: 0,
    maxHeight: 340,
  },
  slideHeader: {
    alignItems: 'center',
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: IG.divider,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  slideLabel: {
    color: IG.muted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontSize: 11,
    fontWeight: '600',
  },
  slideViews: {
    color: IG.text,
    fontSize: 28,
    fontWeight: '700',
  },
  slideViewsLabel: {
    color: IG.muted,
    marginTop: 2,
  },
  section: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: IG.muted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 11,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
  },
  metricRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: IG.divider,
  },
  metricLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    paddingRight: spacing.sm,
  },
  metricLabel: {
    color: IG.text,
    fontSize: 15,
  },
  metricValue: {
    color: IG.text,
    fontWeight: '700',
    fontSize: 15,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyText: {
    color: IG.muted,
  },
});
