import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Text } from '@/components/ui/Text';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import { navigateToPublicProfile } from '@/features/profile/services/profileNavigation';
import type { StoryReactionRow, StoryReplyRow } from '@/features/stories/services/fetchStoryEngagement';
import type { StoryViewerRow } from '@/features/stories/services/fetchStoryViewers';
import { formatStoryTime } from '@/features/stories/utils/formatStoryTime';
import { spacing, radius } from '@/constants/theme';

export const STORY_INSIGHTS = {
  sheet: '#1C1C1E',
  sheetBorder: 'rgba(255,255,255,0.08)',
  text: '#FFFFFF',
  muted: 'rgba(255,255,255,0.55)',
  faint: 'rgba(255,255,255,0.38)',
  divider: 'rgba(255,255,255,0.1)',
  card: 'rgba(255,255,255,0.06)',
  cardActive: 'rgba(255,255,255,0.1)',
  accent: '#5AC8FA',
  accentSoft: 'rgba(90,200,250,0.14)',
  like: '#FF375F',
  likeSoft: 'rgba(255,55,95,0.14)',
  reply: '#30D158',
  replySoft: 'rgba(48,209,88,0.14)',
  thumbBorder: '#FFFFFF',
  thumbInactive: 'rgba(255,255,255,0.35)',
  thumbSize: { w: 52, h: 72 },
} as const;

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type InsightTab = 'overview' | 'viewers' | 'reactions' | 'replies';

export const INSIGHT_TABS: { id: InsightTab; label: string; icon: IoniconName }[] = [
  { id: 'overview', label: 'Genel', icon: 'analytics-outline' },
  { id: 'viewers', label: 'İzleyenler', icon: 'eye-outline' },
  { id: 'reactions', label: 'Beğeniler', icon: 'heart-outline' },
  { id: 'replies', label: 'Yanıtlar', icon: 'chatbubble-outline' },
];

export function formatInsightCount(value: number): string {
  return new Intl.NumberFormat('tr-TR').format(Math.round(value));
}

export function formatWatchDuration(sec: number): string {
  if (sec < 1) return '<1 sn';
  if (sec < 60) return `${sec.toFixed(sec < 10 ? 1 : 0)} sn`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return s > 0 ? `${m} dk ${s} sn` : `${m} dk`;
}

export function InsightTabBar({
  active,
  counts,
  onChange,
}: {
  active: InsightTab;
  counts: { viewers: number; reactions: number; replies: number };
  onChange: (tab: InsightTab) => void;
}) {
  return (
    <View style={styles.tabBar}>
      {INSIGHT_TABS.map((tab) => {
        const selected = active === tab.id;
        const badge =
          tab.id === 'viewers'
            ? counts.viewers
            : tab.id === 'reactions'
              ? counts.reactions
              : tab.id === 'replies'
                ? counts.replies
                : null;

        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={[styles.tab, selected && styles.tabActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            <Ionicons name={tab.icon} size={16} color={selected ? STORY_INSIGHTS.text : STORY_INSIGHTS.muted} />
            <Text variant="caption" style={[styles.tabLabel, selected && styles.tabLabelActive]}>
              {tab.label}
            </Text>
            {badge != null && badge > 0 ? (
              <View style={styles.tabBadge}>
                <Text variant="caption" style={styles.tabBadgeText}>
                  {badge > 99 ? '99+' : badge}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function SummaryStrip({
  uniqueViewers,
  totalViews,
}: {
  uniqueViewers: number;
  totalViews: number;
}) {
  return (
    <View style={styles.summaryStrip}>
      <SummaryPill icon="people-outline" value={formatInsightCount(uniqueViewers)} label="Ulaşılan hesap" />
      <View style={styles.summaryDivider} />
      <SummaryPill icon="eye-outline" value={formatInsightCount(totalViews)} label="Toplam görüntülenme" />
    </View>
  );
}

function SummaryPill({
  icon,
  value,
  label,
}: {
  icon: IoniconName;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.summaryPill}>
      <View style={styles.summaryIconWrap}>
        <Ionicons name={icon} size={18} color={STORY_INSIGHTS.accent} />
      </View>
      <Text variant="h3" style={styles.summaryValue}>
        {value}
      </Text>
      <Text variant="caption" style={styles.summaryLabel}>
        {label}
      </Text>
    </View>
  );
}

export function MetricTile({
  icon,
  label,
  value,
  tint = STORY_INSIGHTS.accent,
  tintSoft = STORY_INSIGHTS.accentSoft,
  style,
}: {
  icon: IoniconName;
  label: string;
  value: string;
  tint?: string;
  tintSoft?: string;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.metricTile, { backgroundColor: tintSoft }, style]}>
      <View style={[styles.metricTileIcon, { backgroundColor: `${tint}22` }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text variant="h3" style={styles.metricTileValue}>
        {value}
      </Text>
      <Text variant="caption" style={styles.metricTileLabel}>
        {label}
      </Text>
    </View>
  );
}

export function EngagementShortcut({
  icon,
  label,
  count,
  tint,
  tintSoft,
  onPress,
}: {
  icon: IoniconName;
  label: string;
  count: number;
  tint: string;
  tintSoft: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.shortcut, { backgroundColor: tintSoft }]}>
      <Ionicons name={icon} size={20} color={tint} />
      <Text variant="label" style={styles.shortcutCount}>
        {formatInsightCount(count)}
      </Text>
      <Text variant="caption" style={styles.shortcutLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

export function BehaviorGrid({
  rows,
}: {
  rows: { icon: IoniconName; label: string; value: string }[];
}) {
  return (
    <View style={styles.behaviorGrid}>
      {rows.map((row) => (
        <View key={row.label} style={styles.behaviorCell}>
          <Ionicons name={row.icon} size={16} color={STORY_INSIGHTS.muted} />
          <Text variant="caption" style={styles.behaviorValue}>
            {row.value}
          </Text>
          <Text variant="caption" style={styles.behaviorLabel} numberOfLines={2}>
            {row.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function InsightSectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text variant="label" style={styles.sectionTitle}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="caption" style={styles.sectionSubtitle}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function InsightEmptyState({
  icon,
  title,
  message,
}: {
  icon: IoniconName;
  title: string;
  message: string;
}) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name={icon} size={28} color={STORY_INSIGHTS.muted} />
      </View>
      <Text variant="label" style={styles.emptyTitle}>
        {title}
      </Text>
      <Text variant="caption" style={styles.emptyMessage}>
        {message}
      </Text>
    </View>
  );
}

export function ViewerListItem({
  row,
  onNavigate,
}: {
  row: StoryViewerRow;
  onNavigate: () => void;
}) {
  const completion = Math.round(row.watchCompletion * 100);
  const displayName = row.fullName?.trim() || row.username;

  return (
    <Pressable style={styles.personRow} onPress={onNavigate}>
      <ProfileAvatar username={row.username} avatarUrl={row.avatarUrl} size={44} />
      <View style={styles.personMeta}>
        <Text variant="label" style={styles.personName} numberOfLines={1}>
          {displayName}
        </Text>
        <Text variant="caption" style={styles.personSub} numberOfLines={1}>
          @{row.username}
        </Text>
        <View style={styles.watchMeta}>
          <Text variant="caption" style={styles.watchMetaText}>
            {formatWatchDuration(row.watchedSeconds)}
            {completion > 0 ? ` · %${completion} izlendi` : ''}
          </Text>
          {completion > 0 ? (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(100, completion)}%` }]} />
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.personTrailing}>
        <Text variant="caption" style={styles.personTime}>
          {formatStoryTime(row.viewedAt)}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={STORY_INSIGHTS.faint} />
      </View>
    </Pressable>
  );
}

export function ViewerList({
  viewers,
  onClose,
}: {
  viewers: StoryViewerRow[];
  onClose: () => void;
}) {
  if (!viewers.length) {
    return (
      <InsightEmptyState
        icon="eye-off-outline"
        title="Henüz izleyen yok"
        message="Hikâyeniz görüntülendiğinde kişiler burada listelenir."
      />
    );
  }

  return (
    <View style={styles.listWrap}>
      {viewers.map((row) => (
        <ViewerListItem
          key={`${row.userId}-${row.viewedAt}`}
          row={row}
          onNavigate={() => {
            onClose();
            navigateToPublicProfile({ userId: row.userId });
          }}
        />
      ))}
    </View>
  );
}

export function ReactionListItem({ row }: { row: StoryReactionRow }) {
  const displayName = row.fullName?.trim() || row.username;

  return (
    <View style={styles.personRow}>
      <ProfileAvatar username={row.username} avatarUrl={row.avatarUrl} size={44} />
      <View style={styles.personMeta}>
        <Text variant="label" style={styles.personName} numberOfLines={1}>
          {displayName}
        </Text>
        <Text variant="caption" style={styles.personSub} numberOfLines={1}>
          @{row.username}
        </Text>
      </View>
      <View style={styles.reactionBubble}>
        <Text style={styles.reactionEmoji}>{row.emoji}</Text>
      </View>
    </View>
  );
}

export function ReactionList({ reactions }: { reactions: StoryReactionRow[] }) {
  if (!reactions.length) {
    return (
      <InsightEmptyState
        icon="heart-outline"
        title="Henüz beğeni yok"
        message="İzleyiciler tepki verdiğinde burada görünür."
      />
    );
  }

  return (
    <View style={styles.listWrap}>
      {reactions.map((row) => (
        <ReactionListItem key={`${row.userId}-${row.createdAt}`} row={row} />
      ))}
    </View>
  );
}

export function ReplyListItem({ row }: { row: StoryReplyRow }) {
  const displayName = row.fullName?.trim() || row.username;

  return (
    <View style={styles.replyRow}>
      <ProfileAvatar username={row.username} avatarUrl={row.avatarUrl} size={36} />
      <View style={styles.replyBubble}>
        <View style={styles.replyHeader}>
          <Text variant="caption" style={styles.replyAuthor}>
            {displayName}
          </Text>
          <Text variant="caption" style={styles.replyTime}>
            {formatStoryTime(row.createdAt)}
          </Text>
        </View>
        <Text variant="body" style={styles.replyContent}>
          {row.content}
        </Text>
      </View>
    </View>
  );
}

export function ReplyList({ replies }: { replies: StoryReplyRow[] }) {
  if (!replies.length) {
    return (
      <InsightEmptyState
        icon="chatbubble-outline"
        title="Henüz yanıt yok"
        message="İzleyiciler mesaj gönderdiğinde burada görünür."
      />
    );
  }

  return (
    <View style={styles.listWrap}>
      {replies.map((row) => (
        <ReplyListItem key={row.messageId} row={row} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: 4,
    borderRadius: radius.lg,
    backgroundColor: STORY_INSIGHTS.card,
    gap: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: 2,
    borderRadius: radius.md,
    gap: 2,
    minHeight: 52,
  },
  tabActive: {
    backgroundColor: STORY_INSIGHTS.cardActive,
  },
  tabLabel: {
    color: STORY_INSIGHTS.muted,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  tabLabelActive: {
    color: STORY_INSIGHTS.text,
  },
  tabBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: STORY_INSIGHTS.accent,
  },
  tabBadgeText: {
    color: '#0A0E14',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 12,
  },
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: STORY_INSIGHTS.card,
  },
  summaryPill: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  summaryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: STORY_INSIGHTS.accentSoft,
  },
  summaryValue: {
    color: STORY_INSIGHTS.text,
    fontSize: 24,
    fontWeight: '800',
  },
  summaryLabel: {
    color: STORY_INSIGHTS.muted,
    textAlign: 'center',
    fontSize: 12,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: STORY_INSIGHTS.divider,
    marginVertical: spacing.xs,
  },
  metricTile: {
    flex: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  metricTileIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricTileValue: {
    color: STORY_INSIGHTS.text,
    fontSize: 20,
    fontWeight: '800',
  },
  metricTileLabel: {
    color: STORY_INSIGHTS.muted,
    textAlign: 'center',
    fontSize: 11,
  },
  shortcut: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  shortcutCount: {
    color: STORY_INSIGHTS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  shortcutLabel: {
    color: STORY_INSIGHTS.muted,
    fontSize: 11,
    textAlign: 'center',
  },
  behaviorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  behaviorCell: {
    width: '31%',
    flexGrow: 1,
    borderRadius: radius.md,
    backgroundColor: STORY_INSIGHTS.card,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 4,
    minWidth: 96,
  },
  behaviorValue: {
    color: STORY_INSIGHTS.text,
    fontWeight: '700',
    fontSize: 14,
  },
  behaviorLabel: {
    color: STORY_INSIGHTS.muted,
    textAlign: 'center',
    fontSize: 10,
    lineHeight: 13,
  },
  sectionHeader: {
    marginBottom: spacing.sm,
    gap: 2,
  },
  sectionTitle: {
    color: STORY_INSIGHTS.text,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: STORY_INSIGHTS.muted,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: STORY_INSIGHTS.card,
  },
  emptyTitle: {
    color: STORY_INSIGHTS.text,
    textAlign: 'center',
  },
  emptyMessage: {
    color: STORY_INSIGHTS.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  listWrap: {
    gap: 2,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
  },
  personMeta: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  personName: {
    color: STORY_INSIGHTS.text,
  },
  personSub: {
    color: STORY_INSIGHTS.muted,
  },
  personTrailing: {
    alignItems: 'flex-end',
    gap: 4,
  },
  personTime: {
    color: STORY_INSIGHTS.accent,
    fontWeight: '600',
    fontSize: 11,
  },
  watchMeta: {
    marginTop: 4,
    gap: 4,
  },
  watchMetaText: {
    color: STORY_INSIGHTS.muted,
    fontSize: 11,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: STORY_INSIGHTS.divider,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: STORY_INSIGHTS.accent,
  },
  reactionBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: STORY_INSIGHTS.likeSoft,
  },
  reactionEmoji: {
    fontSize: 22,
    lineHeight: 26,
  },
  replyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  replyBubble: {
    flex: 1,
    backgroundColor: STORY_INSIGHTS.card,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  replyAuthor: {
    color: STORY_INSIGHTS.muted,
    fontWeight: '600',
    flex: 1,
  },
  replyTime: {
    color: STORY_INSIGHTS.faint,
    fontSize: 11,
  },
  replyContent: {
    color: STORY_INSIGHTS.text,
    lineHeight: 20,
  },
});
