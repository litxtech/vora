import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Text } from '@/components/ui/Text';
import { PERSONNEL_ACCENT, PERSONNEL_GRADIENT } from '@/features/personnel-center/constants';
import { usePersonnelLiveStats } from '@/features/personnel-center/hooks/usePersonnelLiveStats';
import type { PersonnelCenterStats } from '@/features/personnel-center/services/personnelStats';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

const LIVE_STATS_POLL_SEC = 20;

function useCountUp(target: number, durationMs = 1100) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target <= 0) {
      setValue(0);
      return;
    }

    const steps = 32;
    const stepMs = durationMs / steps;
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      const eased = 1 - (1 - step / steps) ** 2;
      const next = Math.min(target, Math.round(target * eased));
      setValue(next);
      if (step >= steps) clearInterval(timer);
    }, stepMs);

    return () => clearInterval(timer);
  }, [target, durationMs]);

  return value;
}

function PulseDot({ color, size = 8 }: { color: string; size?: number }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.8, { duration: 1200, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 0 }),
      ),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.12, { duration: 1200, easing: Easing.out(Easing.ease) }),
        withTiming(0.6, { duration: 0 }),
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
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
          pulseStyle,
        ]}
      />
      <View
        style={{
          width: size * 0.55,
          height: size * 0.55,
          borderRadius: size,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

function HeroStatCard({
  icon,
  value,
  title,
  subtitle,
  accent,
  delay,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  title: string;
  subtitle: string;
  accent: string;
  delay: number;
}) {
  const { colors, isDark } = useTheme();
  const display = useCountUp(value);

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <LinearGradient
        colors={
          isDark
            ? ([`${accent}35`, `${accent}12`, 'transparent'] as const)
            : ([`${accent}28`, `${accent}10`, 'transparent'] as const)
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.heroCard, { borderColor: `${accent}44` }]}
      >
        <View style={styles.heroTop}>
          <View style={[styles.heroIcon, { backgroundColor: `${accent}22` }]}>
            <Ionicons name={icon} size={22} color={accent} />
          </View>
          {value > 0 ? <PulseDot color={accent} size={10} /> : null}
        </View>
        <Text style={[styles.heroValue, { color: accent }]}>{display.toLocaleString('tr-TR')}</Text>
        <Text variant="label" style={styles.heroTitle}>
          {title}
        </Text>
        <Text secondary variant="caption" style={styles.heroSubtitle}>
          {subtitle}
        </Text>
        <View style={[styles.heroGlow, { backgroundColor: `${accent}10` }]} />
        <View style={[styles.heroFooterLine, { backgroundColor: colors.border }]} />
      </LinearGradient>
    </Animated.View>
  );
}

function MiniStat({
  icon,
  value,
  label,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
  accent: string;
}) {
  const { colors } = useTheme();
  const display = useCountUp(value, 800);

  return (
    <View style={[styles.miniStat, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
      <Ionicons name={icon} size={16} color={accent} />
      <Text variant="h3" style={{ color: accent, fontWeight: '800' }}>
        {display.toLocaleString('tr-TR')}
      </Text>
      <Text secondary variant="caption" style={styles.miniLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

function formatUpdatedAt(ts: number | null): string {
  if (!ts) return 'Güncelleniyor…';
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 8) return 'Az önce güncellendi';
  if (diffSec < 60) return `${diffSec} sn önce güncellendi`;
  return `${Math.floor(diffSec / 60)} dk önce güncellendi`;
}

type Props = {
  regionId: string | null | undefined;
  regionLabel?: string;
  refreshNonce?: number;
  onCreateJob?: () => void;
  onCreateStaff?: () => void;
  onGoSeeking?: () => void;
};

export function PersonnelLiveStatsPanel({
  regionId,
  regionLabel,
  refreshNonce = 0,
  onCreateJob,
  onCreateStaff,
  onGoSeeking,
}: Props) {
  const { colors } = useTheme();
  const { stats, loading, lastUpdatedAt } = usePersonnelLiveStats(regionId, true, refreshNonce);
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((v) => v + 1), 5000);
    return () => clearInterval(timer);
  }, []);

  if (loading && !stats) {
    return (
      <GlassCard style={styles.loadingCard}>
        <ActivityIndicator color={PERSONNEL_ACCENT} />
        <Text secondary>Canlı ağ verileri yükleniyor…</Text>
      </GlassCard>
    );
  }

  const data: PersonnelCenterStats = stats ?? {
    employerCount: 0,
    jobOwnerCount: 0,
    businessesWithHires: 0,
    activeJobs: 0,
    successfulHires: 0,
    totalApplications: 0,
  };

  const hasActivity =
    data.jobOwnerCount > 0 || data.businessesWithHires > 0 || data.successfulHires > 0;

  return (
    <Animated.View entering={FadeIn.duration(280)} style={styles.wrap}>
      <GlassCard style={[styles.liveHeader, { borderColor: `${colors.success}33` }]}>
        <View style={styles.liveHeaderRow}>
          <View style={[styles.liveBadge, { backgroundColor: `${colors.success}16` }]}>
            <PulseDot color={colors.success} />
            <Text variant="caption" style={{ color: colors.success, fontWeight: '700' }}>
              Canlı
            </Text>
          </View>
          <Text secondary variant="caption">
            {formatUpdatedAt(lastUpdatedAt)} · {LIVE_STATS_POLL_SEC}s
          </Text>
        </View>
        <Text variant="h3" style={styles.liveTitle}>
          Personel ağında neler oluyor?
        </Text>
        <Text secondary variant="caption">
          {regionLabel
            ? `${regionLabel} bölgesinde işe alım hareketi`
            : 'Bölgenizdeki işe alım hareketi anlık güncellenir.'}
        </Text>
      </GlassCard>

      <View style={styles.heroGrid}>
        <HeroStatCard
          icon="briefcase-outline"
          value={data.jobOwnerCount}
          title="kişi iş sahibi oldu"
          subtitle="İş veya personel ilanı vererek işveren oldu"
          accent={PERSONNEL_ACCENT}
          delay={0}
        />
        <HeroStatCard
          icon="storefront-outline"
          value={data.businessesWithHires}
          title="işletme personel buldu"
          subtitle="Başvuru kabulü veya ilan doldurma ile ekip kurdu"
          accent={colors.success}
          delay={80}
        />
      </View>

      <View style={styles.miniGrid}>
        <MiniStat icon="people-outline" value={data.successfulHires} label="kişi işe yerleşti" accent={colors.accent} />
        <MiniStat icon="newspaper-outline" value={data.activeJobs} label="aktif ilan" accent={colors.warning} />
        <MiniStat
          icon="paper-plane-outline"
          value={data.totalApplications}
          label="toplam başvuru"
          accent={PERSONNEL_GRADIENT[1]}
        />
      </View>

      {hasActivity ? (
        <GlassCard style={[styles.insightCard, { borderColor: `${PERSONNEL_ACCENT}22` }]}>
          <Ionicons name="trending-up-outline" size={18} color={PERSONNEL_ACCENT} />
          <Text variant="caption" style={{ flex: 1, lineHeight: 18 }}>
            {data.businessesWithHires > 0
              ? `${data.businessesWithHires.toLocaleString('tr-TR')} işletme doğru personeli buldu — sıra sizde.`
              : `${data.jobOwnerCount.toLocaleString('tr-TR')} kişi ilan verdi — ağ büyüyor.`}
          </Text>
        </GlassCard>
      ) : (
        <GlassCard style={styles.insightCard}>
          <Ionicons name="sparkles-outline" size={18} color={colors.textMuted} />
          <Text secondary variant="caption" style={{ flex: 1, lineHeight: 18 }}>
            İlk ilanı verenlerden biri olun; canlı istatistikler burada görünecek.
          </Text>
        </GlassCard>
      )}

      <View style={styles.ctaBlock}>
        {onCreateJob ? <Button title="İş İlanı Ver" onPress={onCreateJob} /> : null}
        {onCreateStaff ? (
          <Button title="Personel Talebi Oluştur" variant="outline" onPress={onCreateStaff} />
        ) : null}
        {onGoSeeking ? (
          <Button title="İş İlanlarına Bak" variant="secondary" onPress={onGoSeeking} />
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  loadingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  liveHeader: {
    gap: spacing.xs,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  liveHeaderRow: {
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
  liveTitle: { letterSpacing: -0.3 },
  heroGrid: { gap: spacing.sm },
  heroCard: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.xs,
    overflow: 'hidden',
    position: 'relative',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroValue: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1.5,
    lineHeight: 46,
    marginTop: spacing.xs,
  },
  heroTitle: { fontSize: 16 },
  heroSubtitle: { lineHeight: 18 },
  heroGlow: {
    position: 'absolute',
    right: -24,
    top: -24,
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  heroFooterLine: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    opacity: 0.5,
  },
  miniGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  miniStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  miniLabel: { textAlign: 'center', fontSize: 10, lineHeight: 13 },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
  },
  ctaBlock: { gap: spacing.sm },
});
