import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { IncidentPulseDot } from '@/features/incidents/components/IncidentPulseDot';
import {
  INCIDENT_GRAPH_SLOGAN,
  INCIDENT_GRAPH_SUBTITLE,
  INCIDENT_GRAPH_TITLE,
  INCIDENT_HERO_GRADIENT,
  INCIDENT_SEVERITY,
} from '@/features/incidents/constants';
import { useCountUp } from '@/features/incidents/hooks/useCountUp';
import type { IncidentGraphItem } from '@/features/incidents/types';
import { radius, spacing } from '@/constants/theme';

type Props = {
  activeCount: number;
  timelineCount: number;
  incidents: IncidentGraphItem[];
  compact?: boolean;
};

function KpiTile({
  icon,
  value,
  label,
  hint,
  delay,
  compact,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
  hint: string;
  delay: number;
  compact?: boolean;
}) {
  const display = useCountUp(value);

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify()}
      style={[styles.kpi, compact && styles.kpiCompact]}
    >
      <View style={styles.kpiIconRow}>
        <Ionicons name={icon} size={compact ? 12 : 14} color="rgba(255,255,255,0.92)" />
        <Text variant="caption" numberOfLines={1} style={[styles.kpiLabel, compact && styles.kpiLabelCompact]}>
          {label}
        </Text>
      </View>
      <Text variant="label" style={[styles.kpiValue, compact && styles.kpiValueCompact]}>
        {display.toLocaleString('tr-TR')}
      </Text>
      {hint ? (
        <Text variant="caption" style={styles.kpiHint}>
          {hint}
        </Text>
      ) : null}
    </Animated.View>
  );
}

export function IncidentGraphHero({ activeCount, timelineCount, incidents, compact = false }: Props) {
  const criticalCount = incidents.filter((i) => i.severity === 'critical').length;
  const verifiedCount = incidents.filter((i) => i.status === 'verified').length;

  return (
    <Animated.View entering={FadeInDown.duration(400).springify()}>
      <LinearGradient
        colors={[...INCIDENT_HERO_GRADIENT]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, compact && styles.heroCompact]}
      >
        <View style={styles.glowOrbA} />
        <View style={styles.glowOrbB} />

        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <View style={styles.heroBadge}>
              <IncidentPulseDot color="#fff" size={9} />
              <Text variant="caption" style={styles.heroBadgeText}>
                {INCIDENT_GRAPH_TITLE}
              </Text>
            </View>
            <Text variant="h2" numberOfLines={2} style={styles.heroTitle}>
              {INCIDENT_GRAPH_SLOGAN}
            </Text>
            {!compact ? (
              <Text variant="caption" style={styles.heroSubtitle}>
                {INCIDENT_GRAPH_SUBTITLE}
              </Text>
            ) : null}
          </View>
          <View style={styles.heroIcon}>
            <Ionicons name="pulse" size={compact ? 20 : 24} color="rgba(255,255,255,0.92)" />
          </View>
        </View>

        <View style={[styles.grid, compact && styles.gridCompact]}>
          <KpiTile
            icon="warning-outline"
            value={activeCount}
            label="Aktif"
            hint={compact ? '' : 'Açık ve doğrulanmış'}
            delay={100}
            compact={compact}
          />
          <KpiTile
            icon="git-commit-outline"
            value={timelineCount}
            label="Gelişme"
            hint={compact ? '' : 'Kronolojik akış'}
            delay={160}
            compact={compact}
          />
          <KpiTile
            icon={INCIDENT_SEVERITY.critical.icon}
            value={criticalCount}
            label="Kritik"
            hint={compact ? '' : 'Acil müdahale'}
            delay={220}
            compact={compact}
          />
          <KpiTile
            icon="shield-checkmark-outline"
            value={verifiedCount}
            label="Doğrulandı"
            hint={compact ? '' : 'Topluluk onayı'}
            delay={280}
            compact={compact}
          />
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
  },
  heroCompact: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  glowOrbA: {
    position: 'absolute',
    top: -48,
    right: -24,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  glowOrbB: {
    position: 'absolute',
    bottom: -36,
    left: -16,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  heroCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  heroBadgeText: {
    color: '#fff',
    fontWeight: '700',
  },
  heroTitle: {
    color: '#fff',
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.86)',
    lineHeight: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  gridCompact: {
    flexWrap: 'nowrap',
    gap: spacing.xs,
  },
  kpi: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.lg,
    padding: spacing.sm,
    gap: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  kpiCompact: {
    flex: 1,
    width: undefined,
    minWidth: 0,
    padding: spacing.xs,
  },
  kpiIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  kpiLabel: {
    color: 'rgba(255,255,255,0.88)',
    fontWeight: '600',
    flexShrink: 1,
  },
  kpiLabelCompact: {
    fontSize: 10,
  },
  kpiValue: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 20,
  },
  kpiValueCompact: {
    fontSize: 16,
  },
  kpiHint: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
  },
});
