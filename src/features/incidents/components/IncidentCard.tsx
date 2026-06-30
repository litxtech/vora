import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { formatFeedTime } from '@/features/feed/utils';
import {
  INCIDENT_SEVERITY,
  INCIDENT_STATUS,
} from '@/features/incidents/constants';
import type { IncidentGraphItem } from '@/features/incidents/types';
import { regionNameById } from '@/constants/regions';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  item: IncidentGraphItem;
  index: number;
  onPress: () => void;
};

function InfoChip({
  label,
  color,
  icon,
}: {
  label: string;
  color: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={[styles.chip, { backgroundColor: `${color}14`, borderColor: `${color}30` }]}>
      {icon ? <Ionicons name={icon} size={11} color={color} /> : null}
      <Text variant="caption" numberOfLines={1} style={{ color, fontWeight: '600' }}>
        {label}
      </Text>
    </View>
  );
}

function Metric({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.metric, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
      <Ionicons name={icon} size={15} color={colors.textMuted} />
      <Text variant="label" numberOfLines={1} style={styles.metricValue}>
        {value}
      </Text>
      <Text variant="caption" secondary numberOfLines={1} style={styles.metricLabel}>
        {label}
      </Text>
    </View>
  );
}

export function IncidentCard({ item, index, onPress }: Props) {
  const { colors } = useTheme();
  const severity = INCIDENT_SEVERITY[item.severity] ?? INCIDENT_SEVERITY.medium;
  const status = INCIDENT_STATUS[item.status] ?? INCIDENT_STATUS.open;
  const regionLabel = regionNameById(item.regionId) ?? item.regionId;

  return (
    <Animated.View entering={FadeInUp.delay(Math.min(index * 50, 300)).springify()}>
      <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.94 }}>
        <GlassCard padded={false} style={[styles.card, { borderColor: `${severity.color}28` }]}>
          <LinearGradient
            colors={[`${severity.color}CC`, `${severity.color}55`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.accentStrip}
          />

          <View style={styles.body}>
            <View style={styles.header}>
              <View style={[styles.iconWrap, { backgroundColor: `${severity.color}16` }]}>
                <Ionicons name={severity.icon} size={20} color={severity.color} />
              </View>
              <View style={styles.headerCopy}>
                <Text variant="label" numberOfLines={2}>
                  {item.title}
                </Text>
                <Text variant="caption" secondary numberOfLines={2} style={styles.summary}>
                  {item.description}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>

            <View style={styles.chipRow}>
              <InfoChip label={severity.label} color={severity.color} icon={severity.icon} />
              <InfoChip label={status.label} color={status.color} />
              <InfoChip label={regionLabel} color={colors.primary} icon="location-outline" />
              {item.isDemo ? <InfoChip label="Örnek" color={colors.textMuted} icon="flask-outline" /> : null}
            </View>

            <View style={styles.metricsRow}>
              <Metric icon="shield-checkmark-outline" value={String(item.verificationCount)} label="Doğrulama" />
              <Metric icon="chatbubble-ellipses-outline" value={String(item.updateCount)} label="Gelişme" />
              <Metric
                icon="time-outline"
                value={formatFeedTime(item.latestUpdateAt ?? item.createdAt)}
                label="Son hareket"
              />
            </View>
          </View>
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderWidth: 1,
  },
  accentStrip: {
    height: 3,
  },
  body: {
    padding: spacing.md,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  summary: {
    lineHeight: 18,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  metric: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  metricValue: {
    fontWeight: '800',
    fontSize: 13,
    textAlign: 'center',
  },
  metricLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
});
