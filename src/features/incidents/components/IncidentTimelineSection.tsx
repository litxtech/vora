import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { formatFeedTime } from '@/features/feed/utils';
import { INCIDENT_ACCENT, INCIDENT_UPDATE_LABELS } from '@/features/incidents/constants';
import type { IncidentGraphTimelineEntry } from '@/features/incidents/types';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const UPDATE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  initial: 'megaphone-outline',
  update: 'chatbubble-ellipses-outline',
  photo: 'image-outline',
  video: 'videocam-outline',
  verification: 'shield-checkmark-outline',
};

type Props = {
  entries: IncidentGraphTimelineEntry[];
  onPressEntry: (incidentId: string) => void;
};

function TimelineRow({
  entry,
  index,
  isLast,
  onPress,
}: {
  entry: IncidentGraphTimelineEntry;
  index: number;
  isLast: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const icon = UPDATE_ICONS[entry.updateType] ?? 'ellipse-outline';
  const typeLabel = INCIDENT_UPDATE_LABELS[entry.updateType] ?? entry.updateType;
  const timeLabel = formatFeedTime(entry.createdAt);

  return (
    <Animated.View entering={FadeInUp.delay(Math.min(index * 40, 240)).springify()}>
      <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.92 }}>
        <View style={styles.row}>
          <View style={styles.timeCol}>
            <View style={[styles.timeIcon, { backgroundColor: `${INCIDENT_ACCENT}14` }]}>
              <Ionicons name={icon} size={16} color={INCIDENT_ACCENT} />
            </View>
            {!isLast ? <View style={[styles.connector, { backgroundColor: colors.border }]} /> : null}
          </View>

          <View style={[styles.content, !isLast && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
            <View style={styles.contentTop}>
              <View style={[styles.typeBadge, { backgroundColor: `${INCIDENT_ACCENT}12` }]}>
                <Text variant="caption" style={{ color: INCIDENT_ACCENT, fontWeight: '700' }}>
                  {typeLabel}
                </Text>
              </View>
              <Text variant="caption" secondary>
                {timeLabel}
              </Text>
            </View>

            <Text variant="label" numberOfLines={1} style={styles.incidentTitle}>
              {entry.incidentTitle}
            </Text>

            <Text variant="body" secondary numberOfLines={2} style={styles.excerpt}>
              {entry.content}
            </Text>

            <View style={styles.actionRow}>
              <Text variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
                Detayı gör
              </Text>
              <Ionicons name="arrow-forward" size={14} color={colors.primary} />
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function IncidentTimelineSection({ entries, onPressEntry }: Props) {
  if (entries.length === 0) return null;

  return (
    <GlassCard padded={false} style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="git-commit-outline" size={16} color={INCIDENT_ACCENT} />
        <Text variant="caption" secondary>
          En yeniden eskiye
        </Text>
      </View>

      {entries.map((entry, index) => (
        <TimelineRow
          key={entry.id}
          entry={entry}
          index={index}
          isLast={index === entries.length - 1}
          onPress={() => onPressEntry(entry.incidentId)}
        />
      ))}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  timeCol: {
    width: 36,
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  timeIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connector: {
    width: 2,
    flex: 1,
    minHeight: 16,
    marginTop: 4,
    borderRadius: 1,
  },
  content: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
  },
  contentTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  typeBadge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  incidentTitle: {
    marginTop: 2,
  },
  excerpt: {
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
});
