import { useEffect, useState } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { VORA_AI_ACCENT } from '@/features/vora-ai/constants';
import type { VoraAiMapOverlayPoint } from '@/features/vora-ai/types';
import { radius } from '@/constants/theme';

const TYPE_META: Record<
  VoraAiMapOverlayPoint['dataType'],
  { icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  trend: { icon: 'flame', color: '#FF7043' },
  density: { icon: 'people', color: '#42A5F5' },
  live_event: { icon: 'calendar', color: '#AB47BC' },
  news_pin: { icon: 'newspaper', color: '#1E88E5' },
};

type VoraAiAnimatedPinProps = {
  point: VoraAiMapOverlayPoint;
  selected?: boolean;
};

export function VoraAiAnimatedPin({ point, selected }: VoraAiAnimatedPinProps) {
  const meta = TYPE_META[point.dataType] ?? TYPE_META.trend;
  const scale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    ringOpacity.value = withRepeat(
      withSequence(withTiming(0.15, { duration: 900 }), withTiming(0.55, { duration: 900 })),
      -1,
      false,
    );
  }, [ringOpacity, scale]);

  const pinStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: 1.4 + (point.intensity ?? 0.3) * 0.4 }],
  }));

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[
          styles.ring,
          ringStyle,
          { backgroundColor: meta.color, borderColor: meta.color },
        ]}
      />
      <Animated.View
        style={[
          styles.pin,
          pinStyle,
          {
            backgroundColor: selected ? VORA_AI_ACCENT : meta.color,
            borderColor: '#fff',
          },
        ]}
      >
        <Ionicons name={meta.icon} size={14} color="#fff" />
      </Animated.View>
      {selected ? (
        <View style={[styles.label, { backgroundColor: meta.color }]}>
          <Text variant="caption" style={styles.labelText} numberOfLines={1}>
            {point.label}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
  },
  pin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    maxWidth: 120,
  },
  labelText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
