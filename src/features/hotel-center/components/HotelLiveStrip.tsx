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
import { HOTEL_ACCENT } from '@/features/hotel-center/constants';
import { useHotelLiveStats } from '@/features/hotel-center/hooks/useHotelLiveStats';
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

type Props = {
  regionId: string | null | undefined;
  regionLabel?: string | null;
  refreshNonce?: number;
};

export function HotelLiveStrip({ regionId, regionLabel, refreshNonce = 0 }: Props) {
  const { colors } = useTheme();
  const { stats, loading } = useHotelLiveStats(regionId, true, refreshNonce);

  const activeHotels = stats?.activeHotels ?? 0;
  const activeDiscounts = stats?.activeDiscounts ?? 0;
  const reviews24h = stats?.reviews24h ?? 0;

  return (
    <View style={[styles.strip, { backgroundColor: `${HOTEL_ACCENT}10`, borderColor: `${HOTEL_ACCENT}33` }]}>
      <PulseDot color={HOTEL_ACCENT} />
      <View style={styles.content}>
        <Text variant="caption" style={{ color: HOTEL_ACCENT, fontWeight: '700' }}>
          Canlı
        </Text>
        {loading && !stats ? (
          <ActivityIndicator size="small" color={HOTEL_ACCENT} />
        ) : (
          <Text secondary variant="caption" numberOfLines={2}>
            {activeHotels} otel
            {activeDiscounts > 0 ? ` · ${activeDiscounts} indirim` : ''}
            {reviews24h > 0 ? ` · ${reviews24h} yeni yorum` : ''}
            {regionLabel ? ` · ${regionLabel}` : ''}
          </Text>
        )}
      </View>
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
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  dotWrap: { width: 10, height: 10, alignItems: 'center', justifyContent: 'center' },
  dotPulse: { position: 'absolute', width: 10, height: 10, borderRadius: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  content: { flex: 1, gap: 2 },
});
