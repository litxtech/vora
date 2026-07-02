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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OptimizedImage } from '@/components/media/OptimizedImage';
import type { StoryInsights, StoryItem, StoryItemInsight } from '@/features/stories/types';
import {
  fetchStoryItemEngagement,
  type StoryItemEngagement,
} from '@/features/stories/services/fetchStoryEngagement';
import { fetchStoryItemViewers, type StoryViewerRow } from '@/features/stories/services/fetchStoryViewers';
import { resolveStoryThumbUrl } from '@/features/stories/services/storyMediaUrl';
import {
  BehaviorGrid,
  EngagementShortcut,
  formatInsightCount,
  formatWatchDuration,
  InsightEmptyState,
  InsightSectionHeader,
  InsightTabBar,
  MetricTile,
  ReactionList,
  ReplyList,
  STORY_INSIGHTS,
  SummaryStrip,
  ViewerList,
  type InsightTab,
} from '@/features/stories/components/insights/storyInsightsParts';
import { Text } from '@/components/ui/Text';
import { resolveModalAnimationType } from '@/lib/device/androidPerfProfile';
import { spacing, radius } from '@/constants/theme';

type StoryInsightsSheetProps = {
  visible: boolean;
  insights: StoryInsights | null;
  loading?: boolean;
  authorId?: string | null;
  storyItems?: StoryItem[];
  initialItemIndex?: number;
  onClose: () => void;
};

export function StoryInsightsSheet({
  visible,
  insights,
  loading = false,
  authorId = null,
  storyItems = [],
  initialItemIndex = 0,
  onClose,
}: StoryInsightsSheetProps) {
  const insets = useSafeAreaInsets();
  const thumbListRef = useRef<FlatList<StoryItemInsight>>(null);
  const [selectedIndex, setSelectedIndex] = useState(initialItemIndex);
  const [activeTab, setActiveTab] = useState<InsightTab>('overview');
  const [engagement, setEngagement] = useState<StoryItemEngagement | null>(null);
  const [engagementLoading, setEngagementLoading] = useState(false);
  const [viewers, setViewers] = useState<StoryViewerRow[]>([]);
  const [viewersLoading, setViewersLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const safeIndex = Math.max(0, Math.min(initialItemIndex, (insights?.items.length ?? 1) - 1));
    setSelectedIndex(safeIndex);
    setActiveTab('overview');
    requestAnimationFrame(() => {
      thumbListRef.current?.scrollToIndex({ index: safeIndex, animated: false, viewPosition: 0.5 });
    });
  }, [visible, initialItemIndex, insights?.items.length]);

  const items = insights?.items ?? [];
  const selected = items[selectedIndex] ?? items[0] ?? null;

  useEffect(() => {
    if (!visible || !authorId || !selected?.itemId) {
      setEngagement(null);
      setViewers([]);
      return;
    }
    let cancelled = false;
    setEngagementLoading(true);
    setViewersLoading(true);

    void fetchStoryItemEngagement(authorId, selected.itemId).then((data) => {
      if (!cancelled) {
        setEngagement(data);
        setEngagementLoading(false);
      }
    });

    void fetchStoryItemViewers(authorId, selected.itemId).then((data) => {
      if (!cancelled) {
        setViewers(data);
        setViewersLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [authorId, selected?.itemId, visible]);

  const tabLoading =
    activeTab === 'viewers' ? viewersLoading : activeTab !== 'overview' ? engagementLoading : false;

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
            uri={resolveStoryThumbUrl(item.thumbUrl, null)}
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
        {items.length > 1 ? (
          <Text variant="caption" style={[styles.thumbIndex, active && styles.thumbIndexActive]}>
            {index + 1}
          </Text>
        ) : null}
      </Pressable>
    );
  };

  const renderOverview = () => {
    if (!insights || !selected) return null;

    const selectedStoryItem = storyItems.find((item) => item.id === selected.itemId);
    const linkRows = (selected.linkStats ?? []).map((stat) => {
      const manifestLink = selectedStoryItem?.links?.find((link) => link.id === stat.linkId);
      const parts: string[] = [];
      if (stat.tapCount > 0) parts.push(`${formatInsightCount(stat.tapCount)} dokunma`);
      if (stat.swipeUpCount > 0) parts.push(`${formatInsightCount(stat.swipeUpCount)} kaydırma`);
      return {
        icon: 'link-outline' as const,
        label: `${manifestLink?.label ?? 'Bağlantı'}${parts.length ? ` · ${parts.join(' · ')}` : ''}`,
        value: formatInsightCount(stat.tapCount + stat.swipeUpCount),
      };
    });

    const behaviorRows = [
      { icon: 'chevron-forward' as const, label: 'İleri', value: formatInsightCount(selected.tapForwardCount) },
      { icon: 'chevron-back' as const, label: 'Geri', value: formatInsightCount(selected.tapBackCount) },
      { icon: 'arrow-forward-outline' as const, label: 'Sonraki hikâye', value: formatInsightCount(selected.swipeForwardCount) },
      { icon: 'arrow-back-outline' as const, label: 'Önceki hikâye', value: formatInsightCount(selected.swipeBackCount) },
      { icon: 'play-skip-forward-outline' as const, label: 'Otomatik geçiş', value: formatInsightCount(selected.autoForwardCount) },
      { icon: 'close-circle-outline' as const, label: 'Erken çıkış', value: formatInsightCount(selected.exitedEarlyCount) },
    ];

    return (
      <View style={styles.tabContent}>
        <View style={styles.slideHero}>
          <Text variant="caption" style={styles.slideHeroLabel}>
            {items.length > 1 ? `Slayt ${selected.sortOrder + 1}` : 'Bu hikâye'}
          </Text>
          <Text variant="h2" style={styles.slideHeroValue}>
            {formatInsightCount(selected.itemViews)}
          </Text>
          <Text variant="caption" style={styles.slideHeroSub}>
            görüntülenme
          </Text>
        </View>

        {selected.mediaType === 'video' ? (
          <View style={styles.metricRow}>
            <MetricTile
              icon="time-outline"
              label="Ort. izlenme"
              value={formatWatchDuration(selected.avgWatchedSeconds)}
            />
            <MetricTile
              icon="pulse-outline"
              label="Tamamlama"
              value={`%${Math.round(selected.avgCompletion * 100)}`}
              tint={STORY_INSIGHTS.reply}
              tintSoft={STORY_INSIGHTS.replySoft}
            />
          </View>
        ) : null}

        <InsightSectionHeader title="Etkileşim" subtitle="Detay için sekmelere geçin" />
        <View style={styles.shortcutRow}>
          <EngagementShortcut
            icon="eye-outline"
            label="İzleyenler"
            count={viewers.length}
            tint={STORY_INSIGHTS.accent}
            tintSoft={STORY_INSIGHTS.accentSoft}
            onPress={() => setActiveTab('viewers')}
          />
          <EngagementShortcut
            icon="heart"
            label="Beğeniler"
            count={engagement?.reactions.length ?? 0}
            tint={STORY_INSIGHTS.like}
            tintSoft={STORY_INSIGHTS.likeSoft}
            onPress={() => setActiveTab('reactions')}
          />
          <EngagementShortcut
            icon="chatbubble-ellipses-outline"
            label="Yanıtlar"
            count={engagement?.replies.length ?? 0}
            tint={STORY_INSIGHTS.reply}
            tintSoft={STORY_INSIGHTS.replySoft}
            onPress={() => setActiveTab('replies')}
          />
        </View>

        <InsightSectionHeader
          title="İzleme davranışı"
          subtitle="İzleyicilerin hikâyeyle nasıl etkileştiği"
        />
        <BehaviorGrid rows={behaviorRows} />

        {selected.linkTapCount + selected.linkSwipeUpCount > 0 ? (
          <>
            <InsightSectionHeader
              title="Link etkileşimleri"
              subtitle={`${formatInsightCount(selected.linkTapCount + selected.linkSwipeUpCount)} toplam işlem`}
            />
            <View style={styles.linkSummaryRow}>
              <MetricTile
                icon="hand-left-outline"
                label="Dokunma"
                value={formatInsightCount(selected.linkTapCount)}
                tint={STORY_INSIGHTS.accent}
                tintSoft={STORY_INSIGHTS.accentSoft}
              />
              <MetricTile
                icon="chevron-up-outline"
                label="Yukarı kaydır"
                value={formatInsightCount(selected.linkSwipeUpCount)}
                tint={STORY_INSIGHTS.reply}
                tintSoft={STORY_INSIGHTS.replySoft}
              />
            </View>
            {linkRows.length > 0 ? <BehaviorGrid rows={linkRows} /> : null}
          </>
        ) : null}
      </View>
    );
  };

  const renderTabBody = () => {
    if (tabLoading) {
      return (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={STORY_INSIGHTS.text} />
          <Text variant="caption" style={styles.loadingText}>
            Yükleniyor…
          </Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'viewers':
        return (
          <View style={styles.tabContent}>
            <InsightSectionHeader
              title={`${viewers.length} izleyen`}
              subtitle="Kimlerin hikâyenizi izlediği"
            />
            <ViewerList viewers={viewers} onClose={onClose} />
          </View>
        );
      case 'reactions':
        return (
          <View style={styles.tabContent}>
            <InsightSectionHeader
              title={`${engagement?.reactions.length ?? 0} beğeni`}
              subtitle="Verilen tepkiler"
            />
            <ReactionList reactions={engagement?.reactions ?? []} />
          </View>
        );
      case 'replies':
        return (
          <View style={styles.tabContent}>
            <InsightSectionHeader
              title={`${engagement?.replies.length ?? 0} yanıt`}
              subtitle="Gelen mesajlar"
            />
            <ReplyList replies={engagement?.replies ?? []} />
          </View>
        );
      default:
        return null;
    }
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
              <Ionicons name="close" size={26} color={STORY_INSIGHTS.text} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={STORY_INSIGHTS.text} />
            </View>
          ) : insights && selected ? (
            <>
              <SummaryStrip uniqueViewers={insights.uniqueViewers} totalViews={insights.totalViews} />

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

              <InsightTabBar
                active={activeTab}
                counts={{
                  viewers: viewers.length,
                  reactions: engagement?.reactions.length ?? 0,
                  replies: engagement?.replies.length ?? 0,
                }}
                onChange={setActiveTab}
              />

              <ScrollView
                style={styles.bodyScroll}
                contentContainerStyle={styles.bodyScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {renderTabBody()}
              </ScrollView>
            </>
          ) : (
            <InsightEmptyState
              icon="analytics-outline"
              title="İstatistik bulunamadı"
              message="Bu hikâye için henüz veri toplanmamış olabilir."
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
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: STORY_INSIGHTS.sheet,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STORY_INSIGHTS.sheetBorder,
    maxHeight: '92%',
    minHeight: 420,
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
    color: STORY_INSIGHTS.text,
    fontWeight: '700',
    fontSize: 16,
  },
  thumbList: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  thumbWrap: {
    alignItems: 'center',
    gap: 4,
    padding: 2,
  },
  thumbWrapActive: {
    transform: [{ scale: 1.03 }],
  },
  thumbFrame: {
    width: STORY_INSIGHTS.thumbSize.w,
    height: STORY_INSIGHTS.thumbSize.h,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  thumbFrameActive: {
    borderWidth: 2,
    borderColor: STORY_INSIGHTS.thumbBorder,
  },
  thumbFrameIdle: {
    borderWidth: 1,
    borderColor: STORY_INSIGHTS.thumbInactive,
    opacity: 0.75,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbIndex: {
    color: STORY_INSIGHTS.muted,
    fontSize: 10,
    fontWeight: '600',
  },
  thumbIndexActive: {
    color: STORY_INSIGHTS.text,
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
  bodyScroll: {
    flexGrow: 0,
    maxHeight: 380,
  },
  bodyScrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  tabContent: {
    gap: spacing.md,
  },
  slideHero: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: STORY_INSIGHTS.card,
    gap: 2,
  },
  slideHeroLabel: {
    color: STORY_INSIGHTS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontSize: 11,
    fontWeight: '600',
  },
  slideHeroValue: {
    color: STORY_INSIGHTS.text,
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
  },
  slideHeroSub: {
    color: STORY_INSIGHTS.muted,
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  shortcutRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  linkSummaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  loadingText: {
    color: STORY_INSIGHTS.muted,
  },
});
