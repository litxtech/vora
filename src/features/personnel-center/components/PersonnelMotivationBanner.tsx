import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { PERSONNEL_ACCENT, PERSONNEL_GRADIENT } from '@/features/personnel-center/constants';
import type { PersonnelCenterStats } from '@/features/personnel-center/services/personnelStats';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

function useCountUp(target: number, durationMs = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target <= 0) {
      setValue(0);
      return;
    }

    const steps = 28;
    const stepMs = durationMs / steps;
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      const next = Math.min(target, Math.round((target * step) / steps));
      setValue(next);
      if (step >= steps) clearInterval(timer);
    }, stepMs);

    return () => clearInterval(timer);
  }, [target, durationMs]);

  return value;
}

function PulseDot({ color }: { color: string }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.45, { duration: 1100, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 0 }),
      ),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.15, { duration: 1100, easing: Easing.out(Easing.ease) }),
        withTiming(0.55, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, [opacity, scale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.pulseWrap}>
      <Animated.View style={[styles.pulseRing, pulseStyle, { backgroundColor: color }]} />
      <View style={[styles.pulseCore, { backgroundColor: color }]} />
    </View>
  );
}

function StatCell({
  icon,
  value,
  label,
  accent,
  highlight,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
  accent: string;
  highlight?: boolean;
}) {
  const { colors } = useTheme();
  const display = useCountUp(value);

  return (
    <View
      style={[
        styles.statCell,
        {
          backgroundColor: highlight ? `${accent}14` : `${colors.surface}AA`,
          borderColor: highlight ? `${accent}44` : colors.border,
        },
      ]}
    >
      <View style={[styles.statIcon, { backgroundColor: `${accent}20` }]}>
        <Ionicons name={icon} size={16} color={accent} />
      </View>
      <Text variant="h3" style={[styles.statValue, { color: accent }]}>
        {display.toLocaleString('tr-TR')}
      </Text>
      <Text secondary variant="caption" style={styles.statLabel} numberOfLines={2}>
        {label}
      </Text>
      {highlight && value > 0 ? <PulseDot color={accent} /> : null}
    </View>
  );
}

type Props = {
  stats: PersonnelCenterStats;
  compact?: boolean;
};

export function PersonnelMotivationBanner({ stats, compact }: Props) {
  const { colors, isDark } = useTheme();
  const hasActivity = stats.jobOwnerCount > 0 || stats.businessesWithHires > 0;

  return (
    <LinearGradient
      colors={
        isDark
          ? ([`${PERSONNEL_ACCENT}30`, `${PERSONNEL_GRADIENT[1]}18`, 'transparent'] as const)
          : ([`${PERSONNEL_ACCENT}22`, `${PERSONNEL_GRADIENT[1]}12`, 'transparent'] as const)
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.wrap, { borderColor: `${PERSONNEL_ACCENT}33` }]}
    >
      <View style={styles.header}>
        <View style={[styles.liveBadge, { backgroundColor: `${colors.success}18` }]}>
          <PulseDot color={colors.success} />
          <Text variant="caption" style={{ color: colors.success, fontWeight: '700' }}>
            Canlı ağ
          </Text>
        </View>
        {!compact ? (
          <Text secondary variant="caption">
            Bölgenizde işe alım hareketi
          </Text>
        ) : null}
      </View>

      <View style={styles.grid}>
        <StatCell
          icon="briefcase-outline"
          value={stats.jobOwnerCount}
          label="iş sahibi oldu"
          accent={PERSONNEL_ACCENT}
          highlight={hasActivity}
        />
        <StatCell
          icon="storefront-outline"
          value={stats.businessesWithHires}
          label="işletme personel buldu"
          accent={colors.success}
          highlight={stats.businessesWithHires > 0}
        />
        <StatCell
          icon="briefcase-outline"
          value={stats.activeJobs}
          label="aktif ilan"
          accent={colors.warning}
        />
      </View>

      {stats.totalApplications > 0 ? (
        <View style={[styles.footer, { backgroundColor: `${PERSONNEL_ACCENT}10` }]}>
          <Ionicons name="paper-plane-outline" size={14} color={PERSONNEL_ACCENT} />
          <Text variant="caption" style={{ color: PERSONNEL_ACCENT, fontWeight: '600', flex: 1 }}>
            {stats.totalApplications.toLocaleString('tr-TR')} başvuru gönderildi — siz de ilan verin, doğru adayı bulun.
          </Text>
        </View>
      ) : (
        <Text secondary variant="caption" style={styles.cta}>
          İlk ilanı verenlerden biri olun — işletmenizi büyütün, doğru personeli bulun.
        </Text>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    position: 'relative',
    overflow: 'hidden',
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { fontWeight: '800', letterSpacing: -0.5, fontSize: 22 },
  statLabel: { textAlign: 'center', fontSize: 10, lineHeight: 13 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  cta: { textAlign: 'center', lineHeight: 18 },
  pulseWrap: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pulseCore: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
});
