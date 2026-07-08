import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import type { StoryLinkManifest } from '@/features/stories/utils/storyLinks';
import { spacing } from '@/constants/theme';

type StorySwipeUpCtaProps = {
  link: StoryLinkManifest;
  onPress?: () => void;
  preview?: boolean;
};

export function StorySwipeUpCta({ link, onPress, preview = false }: StorySwipeUpCtaProps) {
  const bounce = useSharedValue(0);

  useEffect(() => {
    bounce.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [bounce]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounce.value }],
  }));

  return (
    <Pressable
      style={[styles.wrap, preview && styles.wrapPreview]}
      onPress={onPress}
      disabled={!onPress}
      pointerEvents={onPress ? 'auto' : 'box-none'}
      accessibilityRole="button"
      accessibilityLabel={`Yukarı kaydır: ${link.label}`}
    >
      <Animated.View style={[styles.chevron, chevronStyle]}>
        <Ionicons name="chevron-up" size={18} color="#fff" />
      </Animated.View>
      <View style={styles.pill}>
        <Ionicons name="link-outline" size={14} color="#fff" />
        <Text variant="caption" style={styles.pillText} numberOfLines={1}>
          {link.label}
        </Text>
        <View style={styles.divider} />
        <Text variant="caption" style={styles.hint}>
          Yukarı kaydır
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.xl + 40,
    alignItems: 'center',
    gap: 4,
    zIndex: 12,
  },
  wrapPreview: {
    bottom: spacing.lg,
  },
  chevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.52)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 999,
    maxWidth: '88%',
  },
  pillText: {
    color: '#fff',
    fontWeight: '800',
    flexShrink: 1,
  },
  divider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  hint: {
    color: 'rgba(255,255,255,0.82)',
    fontWeight: '600',
  },
});
