import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { PERSONNEL_ACCENT } from '@/features/personnel-center/constants';
import { usePersonnelLiveStats } from '@/features/personnel-center/hooks/usePersonnelLiveStats';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

function PulseDot({ color }: { color: string }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.6, { duration: 1000, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 0 }),
      ),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.15, { duration: 1000, easing: Easing.out(Easing.ease) }),
        withTiming(0.5, { duration: 0 }),
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
    <View style={styles.dotWrap}>
      <Animated.View style={[styles.dotPulse, { backgroundColor: color }, pulseStyle]} />
      <View style={[styles.dot, { backgroundColor: color }]} />
    </View>
  );
}

type PersonnelLiveStripProps = {
  regionId: string | null | undefined;
  regionLabel?: string | null;
  pendingIncoming?: number;
  refreshNonce?: number;
};

export function PersonnelLiveStrip({
  regionId,
  regionLabel,
  pendingIncoming = 0,
  refreshNonce = 0,
}: PersonnelLiveStripProps) {
  const { colors } = useTheme();
  const { stats, loading } = usePersonnelLiveStats(regionId, true, refreshNonce);

  const activeJobs = stats?.activeJobs ?? 0;
  const jobOwners = stats?.jobOwnerCount ?? 0;
  const totalApplications = stats?.totalApplications ?? 0;

  return (
    <View
      style={[
        styles.strip,
        { backgroundColor: `${PERSONNEL_ACCENT}10`, borderColor: `${PERSONNEL_ACCENT}33` },
      ]}
    >
      <PulseDot color={PERSONNEL_ACCENT} />
      {loading && !stats ? (
        <ActivityIndicator size="small" color={PERSONNEL_ACCENT} style={styles.loader} />
      ) : (
        <Text variant="caption" style={[styles.text, { color: colors.textSecondary }]} numberOfLines={1}>
          <Text style={{ color: PERSONNEL_ACCENT, fontWeight: '700' }}>{activeJobs}</Text>
          {' aktif ilan'}
          {' · '}
          <Text style={{ color: PERSONNEL_ACCENT, fontWeight: '700' }}>{jobOwners}</Text>
          {' işveren'}
          {totalApplications > 0 ? (
            <>
              {' · '}
              <Text style={{ color: PERSONNEL_ACCENT, fontWeight: '700' }}>{totalApplications}</Text>
              {' başvuru'}
            </>
          ) : null}
          {regionLabel ? ` · ${regionLabel}` : ''}
          {pendingIncoming > 0 ? (
            <>
              {' · '}
              <Text style={{ color: colors.danger, fontWeight: '700' }}>{pendingIncoming}</Text>
              {' bekleyen'}
            </>
          ) : null}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  dotWrap: {
    width: 8,
    height: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotPulse: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  loader: {
    flex: 1,
    alignItems: 'flex-start',
  },
  text: {
    flex: 1,
    fontSize: 11,
    lineHeight: 14,
  },
});
